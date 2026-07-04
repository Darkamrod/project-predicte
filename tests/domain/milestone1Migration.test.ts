import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260703210000_milestone1_secure_lifecycle.sql"),
  "utf8"
);
const hardeningMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260704010000_milestone1_1_lifecycle_hardening.sql"),
  "utf8"
);
const pgcryptoLintFixMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260704020000_milestone3_1_pgcrypto_lint_fix.sql"),
  "utf8"
);
const seedSql = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

describe("Milestone 1 Supabase migration", () => {
  it("defines the secure lifecycle RPC surface", () => {
    expect(migration).toContain("create_private_league");
    expect(migration).toContain("create_league_invite");
    expect(migration).toContain("join_league_by_invite");
    expect(migration).toContain("set_league_member_role");
    expect(migration).toContain("update_league_deadline");
    expect(migration).toContain("lock_league");
    expect(migration).toContain("lock_due_leagues");
  });

  it("stores only hashed invite tokens and gates access through RLS helpers", () => {
    expect(migration).toContain("hash_invite_token");
    expect(migration).toContain("digest(p_token, 'sha256')");
    expect(pgcryptoLintFixMigration).toContain("extensions.digest(p_token, 'sha256'::text)");
    expect(pgcryptoLintFixMigration).toContain("extensions.gen_random_bytes(18)");
    expect(migration).toContain("current_user_is_league_member");
    expect(migration).toContain("prediction_set_is_visible");
    expect(migration).toContain("prediction_set_is_writable_by_current_user");
  });

  it("contains prediction visibility and write-lock policies", () => {
    expect(migration).toContain("prediction sets visible own or after lock");
    expect(migration).toContain("match predictions visible own or after lock");
    expect(migration).toContain("match predictions insert own before deadline");
    expect(migration).toContain("prevent_late_prediction_write");
  });

  it("does not introduce excluded money, advertising, or wagering features", () => {
    expect(
      `${migration}\n${hardeningMigration}\n${pgcryptoLintFixMigration}\n${seedSql}`
    ).not.toMatch(/payment|paid|payout|prize|advertising|betting|odds|wagering|gambling/i);
  });
});

describe("Milestone 1.1 Supabase hardening migration", () => {
  it("separates member lifecycle gates from prediction write gates", () => {
    expect(hardeningMigration).toContain("league_accepts_members");
    expect(hardeningMigration).toContain("league_accepts_predictions");
    expect(hardeningMigration).toContain("public.league_accepts_members(p_league_id)");
    expect(hardeningMigration).toContain("public.league_accepts_predictions(ps.league_id)");
    expect(hardeningMigration).toContain(
      "drop function if exists public.league_accepts_member_and_prediction_writes(uuid);"
    );

    const migrationWithoutDropStatement = hardeningMigration.replace(
      "drop function if exists public.league_accepts_member_and_prediction_writes(uuid);",
      ""
    );
    expect(migrationWithoutDropStatement).not.toContain(
      "league_accepts_member_and_prediction_writes"
    );
  });

  it("keeps draft leagues from accepting invites or prediction writes", () => {
    expect(hardeningMigration).toMatch(/l\.status = 'open'\s+and now\(\) < l\.deadline_at/);
    expect(hardeningMigration).toContain("if not public.league_accepts_members(p_league_id)");
    expect(hardeningMigration).toContain("not public.league_accepts_predictions(target_league_id)");
  });

  it("validates invite tokens before idempotently returning an existing membership", () => {
    const revokedTokenCheck = hardeningMigration.indexOf(
      "if invite_record.revoked_at is not null then"
    );
    const expiredTokenCheck = hardeningMigration.indexOf(
      "if invite_record.expires_at is not null and now() >= invite_record.expires_at then"
    );
    const alreadyActiveCheck = hardeningMigration.indexOf("into already_active;");

    expect(revokedTokenCheck).toBeGreaterThan(-1);
    expect(expiredTokenCheck).toBeGreaterThan(-1);
    expect(alreadyActiveCheck).toBeGreaterThan(-1);
    expect(revokedTokenCheck).toBeLessThan(alreadyActiveCheck);
    expect(expiredTokenCheck).toBeLessThan(alreadyActiveCheck);
  });

  it("uses explicit tiebreak and antepost policies without client delete grants", () => {
    expect(hardeningMigration).toContain("tiebreak overrides visible own or after lock");
    expect(hardeningMigration).toContain("tiebreak overrides insert own before deadline");
    expect(hardeningMigration).toContain("tiebreak overrides update own before deadline");
    expect(hardeningMigration).toContain("antepost predictions visible own or after lock");
    expect(hardeningMigration).toContain("antepost predictions insert own before deadline");
    expect(hardeningMigration).toContain("antepost predictions update own before deadline");
    expect(hardeningMigration).not.toMatch(/prediction_tiebreak_overrides for all/i);
    expect(hardeningMigration).not.toMatch(/antepost_predictions for all/i);
    expect(hardeningMigration).not.toMatch(/for delete/i);
  });

  it("provides a coherent minimum local seed for create_private_league", () => {
    expect(seedSql).toContain("public.sports");
    expect(seedSql).toContain("public.competition_templates");
    expect(seedSql).toContain("public.competition_editions");
    expect(seedSql).toContain("enabled");
    expect(seedSql).toContain("true");
    expect(seedSql).toContain("public.stages");
    expect(seedSql).toContain("public.groups");
    expect(seedSql).toContain("public.rounds");
    expect(seedSql).toContain("public.teams");
    expect(seedSql).toContain("public.edition_teams");
    expect(seedSql).toContain("public.matches");
    expect(seedSql).toContain("public.scoring_presets");
    expect(seedSql).toContain("00000000-0000-4000-8000-000000000003");
    expect(seedSql).toContain("WORLD_CUP_DEFAULT");
    expect(seedSql).toContain("THIRD_PLACE");
  });
});
