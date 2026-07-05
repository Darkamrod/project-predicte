import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const milestone6Migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260705020000_milestone6_provider_import_foundation.sql"
  ),
  "utf8"
);
const milestone7Migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260705030000_milestone7_worker_deployment_auth_tests.sql"
  ),
  "utf8"
);
const docs = [
  "docs/ARCHITECTURE.md",
  "docs/DATA_MODEL.md",
  "docs/DECISIONS.md",
  "docs/SCORING_ENGINE.md",
  "docs/SECURITY.md",
  "docs/SPORTS_PROVIDER.md"
]
  .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
  .join("\n");

describe("Milestone 6 provider result import migration contract", () => {
  it("adds provider import metadata, retry metadata, and correction metadata", () => {
    expect(milestone6Migration).toContain("external_fixture_key");
    expect(milestone6Migration).toContain("source_result_key");
    expect(milestone6Migration).toContain("correction_of_source_result_key");
    expect(milestone6Migration).toContain("retry_attempt");
    expect(milestone6Migration).toContain("max_retries");
    expect(milestone6Migration).toContain("next_retry_at");
    expect(milestone6Migration).toContain("correction_status");
    expect(milestone6Migration).toContain("provider_payload_id");
    expect(milestone6Migration).toContain("sync_run_id");
    expect(milestone7Migration).toContain("failure_kind");
    expect(milestone7Migration).toContain("trusted_provider_retry_candidates");
  });

  it("keeps provider import and correction lookup RPCs service-role-only", () => {
    expect(milestone6Migration).toContain("trusted_result_ingestion_exists");
    expect(milestone6Migration).toContain("record_provider_result_import");
    expect(milestone6Migration).toContain("Provider result import requires service role");
    expect(milestone6Migration).toContain("Trusted result lookup requires service role");
    expect(milestone6Migration).toContain("and rir.status = 'scored'");
    expect(milestone6Migration).toMatch(
      /grant execute on function public\.record_provider_result_import[\s\S]*to service_role/i
    );
    expect(milestone6Migration).toMatch(
      /grant execute on function public\.trusted_result_ingestion_exists[\s\S]*to service_role/i
    );
    expect(milestone6Migration).not.toMatch(
      /grant execute on function public\.record_provider_result_import[\s\S]*to authenticated/i
    );
    expect(milestone6Migration).not.toMatch(
      /grant execute on function public\.trusted_result_ingestion_exists[\s\S]*to authenticated/i
    );
    expect(milestone7Migration).toMatch(
      /grant execute on function public\.trusted_provider_retry_candidates[\s\S]*to service_role/i
    );
    expect(milestone7Migration).not.toMatch(
      /grant execute on function public\.trusted_provider_retry_candidates[\s\S]*to authenticated/i
    );
  });

  it("adds explicit provider runtime revokes and retry classification", () => {
    expect(milestone7Migration).toContain(
      "revoke insert, update, delete on public.sync_runs from anon, authenticated"
    );
    expect(milestone7Migration).toContain(
      "revoke insert, update, delete on public.provider_payloads from anon, authenticated"
    );
    expect(milestone7Migration).toContain("grant select on public.scoring_events to authenticated");
    expect(milestone7Migration).toContain(
      "grant select on public.leaderboard_entries to authenticated"
    );
    expect(milestone7Migration).toContain("failure_kind in ('none', 'retryable', 'non_retryable')");
    expect(milestone7Migration).toContain("and rir.failure_kind = 'retryable'");
  });

  it("documents the mock provider import and server-only scoring persistence boundary", () => {
    expect(docs).toContain("Milestone 6");
    expect(docs).toContain("MOCK_RESULTS");
    expect(docs).toContain("record_provider_result_import");
    expect(docs).toContain("SupabaseScoringContextLoader");
    expect(docs).toContain("src/server/scoring/supabaseScoringPersistenceRepository.ts");
    expect(docs).toContain("Milestone 7");
    expect(docs).toContain("trusted_provider_retry_candidates");
  });

  it("does not keep the official scoring persistence adapter in client services", () => {
    expect(
      existsSync(join(process.cwd(), "src/services/scoring/supabaseScoringRepository.ts"))
    ).toBe(false);

    const clientSource = listSourceFiles([
      "app",
      "src/components",
      "src/features",
      "src/services",
      "src/state"
    ])
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(clientSource).not.toContain("@/server/scoring/supabaseScoringPersistenceRepository");
    expect(clientSource).not.toContain("@/server/results/");
  });

  it("does not introduce excluded money, advertising, wagering, or real sports API features", () => {
    expect(milestone6Migration).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling|Sportmonks/i
    );
    expect(milestone7Migration).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling|Sportmonks/i
    );
  });
});

function listSourceFiles(relativeRoots: string[]): string[] {
  return relativeRoots.flatMap((root) => {
    const absoluteRoot = join(process.cwd(), root);

    if (!existsSync(absoluteRoot)) {
      return [];
    }

    return walk(absoluteRoot);
  });
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return walk(path);
    }

    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}
