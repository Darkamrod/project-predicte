import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260703210000_milestone1_secure_lifecycle.sql"),
  "utf8"
);

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
    expect(migration).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling/i
    );
  });
});
