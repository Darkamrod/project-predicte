import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260707010000_milestone11b_private_league_scale_indexes.sql"
  ),
  "utf8"
);
const dataModelDoc = readFileSync(join(process.cwd(), "docs/DATA_MODEL.md"), "utf8");
const decisionsDoc = readFileSync(join(process.cwd(), "docs/DECISIONS.md"), "utf8");
const roadmapDoc = readFileSync(join(process.cwd(), "docs/ROADMAP.md"), "utf8");
const securityDoc = readFileSync(join(process.cwd(), "docs/SECURITY.md"), "utf8");

const milestoneDocs = `${dataModelDoc}\n${decisionsDoc}\n${roadmapDoc}\n${securityDoc}`;

describe("Milestone 11B scale readiness migration", () => {
  it("adds scoped indexes for private league read paths with 500-participant headroom", () => {
    expect(migration).toContain("league_members_m11b_active_league_role_idx");
    expect(migration).toContain("on public.league_members (league_id, role, user_id)");
    expect(migration).toContain("where status = 'active'");
    expect(migration).toContain("league_invites_m11b_league_created_idx");
    expect(migration).toContain("prediction_sets_m11b_league_status_user_idx");
    expect(migration).toContain("match_predictions_m11b_set_updated_idx");
    expect(migration).toContain("leaderboard_snapshots_m11b_league_latest_idx");
    expect(migration).toContain("scoring_events_m11b_source_user_idx");
    expect(migration).toContain("scoring_breakdown_items_m11b_source_user_scope_idx");
    expect(migration).toContain("scoring_recalculation_runs_m11b_league_started_idx");
    expect(migration).toContain("result_ingestion_runs_m11b_league_created_idx");
  });

  it("keeps the migration limited to indexes and index metadata", () => {
    const statements = migration
      .split(";")
      .map((statement) => statement.replace(/--.*$/gm, "").trim())
      .filter(Boolean);

    expect(statements.length).toBeGreaterThan(0);
    expect(
      statements.every((statement) =>
        /^(create index if not exists|comment on index)\b/i.test(statement)
      )
    ).toBe(true);
  });

  it("does not change functional schema, RLS, RPCs, triggers, or trusted scoring authority", () => {
    expect(migration).not.toMatch(/\bcreate\s+table\b/i);
    expect(migration).not.toMatch(/\balter\s+table\b/i);
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+policy\b/i);
    expect(migration).not.toMatch(/\b(create|drop)\s+trigger\b/i);
    expect(migration).not.toMatch(/\bgrant\b|\brevoke\b/i);
    expect(migration).not.toMatch(/\bcreate\s+unique\s+index\b/i);
    expect(migration).not.toMatch(/\bcreate\s+(or\s+replace\s+)?function\b/i);
    expect(migration).not.toMatch(/\bdrop\s+function\b/i);
    expect(migration).not.toMatch(/\bsecurity\s+definer\b/i);
    expect(migration).not.toMatch(/persist_scoring_recalculation|record_provider_result_import/i);
  });

  it("documents the 200-participant real reference and 500-participant headroom", () => {
    expect(milestoneDocs).toContain("Milestone 11B");
    expect(milestoneDocs).toContain("about 200 participants");
    expect(milestoneDocs).toContain("up to 500 participants");
    expect(milestoneDocs).toContain("technical headroom");
    expect(milestoneDocs).not.toMatch(/target of about 500 participants/i);
    expect(milestoneDocs).not.toMatch(/readiness target is 500 participants/i);
  });

  it("documents DB/index-level readiness and future pagination/load verification work", () => {
    expect(milestoneDocs).toContain("DB/index-level readiness");
    expect(milestoneDocs).toContain("paginated Supabase read repositories");
    expect(milestoneDocs).toContain("UX pagination");
    expect(milestoneDocs).toContain("query plans");
    expect(milestoneDocs).toContain("load tests");
    expect(milestoneDocs).toContain("avoid overengineering");
    expect(milestoneDocs).toContain("no new client-side official scoring");
  });

  it("does not introduce excluded monetization, wagering, advertising, or provider features", () => {
    expect(migration).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling|Sportmonks/i
    );
  });
});
