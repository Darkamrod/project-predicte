# Architecture

The Milestone 0 app uses Expo, React Native, TypeScript strict mode, and Expo Router.

## Layers

- `app/`: route files and navigation only.
- `src/features/`: screen-level composition for product flows.
- `src/components/`: reusable token-based UI components.
- `src/design-system/`: semantic color tokens, spacing, radius, touch targets, and theme provider.
- `src/domain/`: pure business logic for competitions, predictions, scoring, and leaderboard.
- `src/services/`: adapter interfaces and mock implementations.
- `src/state/`: in-memory mock app state wiring adapters to UI.
- `supabase/`: local project structure and deterministic initial migration.

Domain code does not import React Native UI. Scoring values live in configuration and are passed into pure functions.

## Milestone 1 Additions

- `src/services/supabase/`: public Supabase client, OAuth Auth flow, profile service, and typed RPC surface.
- `src/state/AuthProvider.tsx`: app-level auth state. It uses Supabase when public Expo env vars are present and falls back to the Milestone 0 mock user otherwise.
- `src/services/leagues/supabaseLeagueRepository.ts`: secure lifecycle adapter that calls database RPCs instead of writing protected tables directly.
- `src/domain/leagues` and `src/domain/security`: pure lifecycle and RLS-equivalent policy rules used by tests and documentation.

The mock vertical slice remains available while the real backend is introduced behind explicit configuration.

## Milestone 2 Additions

- `src/domain/predictions/bracket.ts`: predicted group tables, best third-placed qualifiers, and generated knockout bracket.
- `src/domain/predictions/validation.ts`: full prediction-set validation for groups, tie-breaks, knockout, antepost, dependency warnings, and sync state.
- `src/domain/predictions/invalidation.ts`: downstream bracket impact detection that preserves predictions and emits review warnings.
- `src/features/predictions/PredictionWorkflowScreen.tsx`: mobile-first workflow hub that composes domain results into group, standings, knockout, antepost, and review sections.

The prediction workflow remains mock-backed unless Supabase is configured. Business rules stay in `src/domain`.

## Milestone 3 Additions

- `src/domain/scoring/tournamentScoring.ts`: pure full-tournament scoring orchestration, idempotent recalculation, leaderboard snapshot generation, and point breakdown generation.
- `src/services/mock/mockResults.ts`: deterministic official-result mock adapter used only to exercise scoring without real sports-provider APIs.
- `src/features/rules/RulesScreen.tsx`: complete stage and antepost rule editor wired to domain/provider guards.
- `src/features/leaderboard/LeaderboardScreen.tsx`: displays domain-generated point breakdowns.

Rule editing and scoring remain separated from route files and UI components. The mock provider coordinates state updates, while scoring calculations stay in `src/domain/scoring`.

## Milestone 4 Additions

- `src/services/predictions/supabasePredictionRepository.ts`: RPC-backed adapter for match predictions, tie-break overrides, antepost predictions, and completion counters.
- `src/services/rules/supabaseRuleRepository.ts`: RPC-backed adapter for scoring rule edits and locked rule snapshots.
- `src/services/supabase/rpcClient.ts`: small injectable RPC client boundary used by repositories and tests.
- `supabase/migrations/20260704030000_milestone4_prediction_scoring_persistence.sql`: persistence, RLS, RPC, checksum, and idempotency migration for the complete workflow.

The UI still uses the mock provider by default. Real Supabase persistence is available through service adapters and can be wired into screens without moving business logic out of `src/domain`.

## Milestone 5 Additions

- `src/server/scoring/trustedScoringWorker.ts`: trusted server orchestration for validating result payloads, loading scoring context, running the pure scoring engine, and persisting derived artifacts.
- `src/server/scoring/resultValidation.ts`: Zod validation for mock/official result ingestion boundaries.
- `src/server/scoring/supabaseTrustedScoringRepository.ts`: service-role-only Supabase adapter for result ingestion runs and scoring persistence.
- `src/server/scoring/supabaseTrustedServerClient.ts`: server-only Supabase client factory for service-role execution.
- `src/server/scoring/mockResultIngestion.ts`: deterministic mock result request factory for worker tests and future local server flows.
- `supabase/migrations/20260705010000_milestone5_trusted_scoring_execution.sql`: service-role-only result ingestion audit table/RPC and official scoring persistence hardening.

The mobile app remains mock-first unless Supabase is configured, and it does not receive service-role credentials. Official scoring artifacts are produced by trusted server code and read by clients through RLS.

## Milestone 6 Additions

- `src/server/results/providerResultImportWorker.ts`: server-side provider import orchestration for mock provider payloads, correction checks, trusted scoring execution, and retry metadata.
- `src/server/results/mockResultProvider.ts`: structured `MOCK_RESULTS` adapter that normalizes deterministic result data without connecting to any real sports API.
- `src/server/results/supabaseProviderResultImportRepository.ts`: service-role-only RPC adapter for provider import metadata and correction-source lookup.
- `src/server/scoring/supabaseScoringContextLoader.ts`: Supabase server-side context loader for league, competition, predictions, locked rule snapshot, existing events, and leaderboard context.
- `src/server/scoring/supabaseScoringPersistenceRepository.ts`: server-only RPC adapter for persisted scoring events, leaderboard snapshots, and point breakdowns. It was moved out of `src/services` so mobile/client modules do not accidentally import official scoring persistence.
- `src/server/scoring/trustedScoringRuntime.ts`: deployable-compatible request parsing boundary for provider result imports.
- `src/server/scoring/trustedScoringRuntimeFactory.ts`: server-only factory that wires service-role Supabase dependencies for a future Edge Function or worker runtime.
- `supabase/migrations/20260705020000_milestone6_provider_import_foundation.sql`: provider import metadata, retry/correction fields, service-role RPCs, and audit linkage.

Milestone 6 still uses mock provider data only. The trusted runtime is ready to wrap in a deployed worker, but no service-role key or provider credential is exposed to the Expo/mobile app.

## Milestone 7 Additions

- `supabase/functions/trusted-result-import/index.ts`: Supabase Edge Function wrapper around `handleTrustedScoringRuntimeRequest`. It reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only from the server runtime.
- `supabase/functions/import_map.json`: Deno import map for shared TypeScript server modules and pinned npm imports used by the Edge runtime.
- `src/server/results/retryQueue.ts`: pure retry classification and due-candidate helpers for provider import retries.
- `trusted_provider_retry_candidates`: service-role-only RPC that selects retryable failed provider imports by UTC `next_retry_at`.
- `supabase/migrations/20260705030000_milestone7_worker_deployment_auth_tests.sql`: explicit client write revokes for provider/scoring runtime tables, retry classification columns, and retry candidate RPC.
- `tests/server/supabaseAuthenticatedRls.test.ts`: authenticated local Supabase RLS/grant test harness for owner/admin/member/non-member/anon/service-role behavior when the local database is available and migrated.

The deployed-entrypoint shape is now concrete, but the provider remains `MOCK_RESULTS` only. The mobile app still uses public Supabase credentials only and does not import server-side provider/scoring persistence modules.

## Milestone 7.1 Additions

- `src/domain/competitions/versionedTemplates.ts`: versioned football catalog for competition families, edition-specific format templates, rulesets, prediction requirements, scoring preset versions, official source metadata, and immutable lock snapshots.
- `src/domain/scoring/presets.ts`: scoring presets for World Cup, EURO, and Champions League editions. Point values remain configuration data and are not embedded in scoring logic.
- `src/domain/predictions/bracket.ts`: data-driven bracket generator that supports group-stage tournaments, best-third rankings, league-phase competitions, optional playoffs, optional third-place finals, and configured single-leg or two-leg stage metadata.
- `src/services/mock/mockLeagueFactory.ts` and `src/state/PredicteMockProvider.tsx`: mock league creation can now select a competition edition and carry the associated version bundle into league state.
- `src/features/home/HomeScreen.tsx`: the mock create-league flow surfaces available football editions instead of assuming a single World Cup-like format.
- `supabase/migrations/20260705040000_milestone7_1_versioned_competition_templates.sql`: versioned catalog tables and league lock-snapshot fields/triggers.

The architecture now treats World Cup, EURO, Champions League, and future football tournaments as competition families with edition-specific template versions. UI components consume configured competition seeds; they do not own permanent tournament-format rules.

## Milestone 8 Additions

- `src/domain/predictions/entryWorkflow.ts`: pure prediction-entry orchestration for mode selection, initial-phase targets, tie-break targets, knockout targets, derived antepost, manual antepost requirements, and validation-friendly normalized prediction payloads.
- `src/features/predictions/PredictionWorkflowScreen.tsx`: mobile-first Quick/Expert entry shell. It renders the same domain targets in simplified card/chip mode or expert numeric-input mode without owning competition-format logic.
- `src/state/PredicteMockProvider.tsx`: mock prediction writes now apply derived antepost values after upstream match or knockout edits, while preserving explicit manual top-scorer fields.
- `src/services/mock/mockLeagueFactory.ts`: initial mock prediction creation uses the concrete initial competition stage rather than assuming only one tournament shape, so league-phase editions are populated for local flows.

The Milestone 8 UI is still mock-first when Supabase is not configured. It does not calculate official scoring, connect provider APIs, or expose server credentials. Two-legged knockout rounds are represented as an aggregate prediction placeholder until a future milestone defines leg-by-leg UX and scoring semantics.
