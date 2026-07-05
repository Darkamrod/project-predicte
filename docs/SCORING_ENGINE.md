# Scoring Engine

The scoring engine is pure TypeScript under `src/domain/scoring`.

Properties:

- deterministic inputs and outputs;
- no React or UI dependencies;
- scoring values read from `ScoringRuleConfig`;
- explicit scoring event types;
- exact score replaces 1/X/2 by configuration;
- top scorer plus exact goals replaces top scorer-only by configuration;
- rule versions can be locked with a stable checksum;
- locked rule versions reject updates.

The current preset preserves the supplied World Cup values, including semifinal pairing at 5 points.

## Milestone 3 Complete Engine

Milestone 3 connects rule editing and full-tournament recalculation to:

- group-stage result and exact score;
- group positions;
- stage qualification;
- knockout pairings;
- knockout 90-minute score and advancement method;
- third-place final when configured;
- tournament winner;
- top scorer;
- top-scorer exact goals.

`scorePredictionSetTournament` scores one participant against an `OfficialTournamentResultSet`.
`recalculateTournamentScoring` scores every participant, replaces events for the same source result version, creates a leaderboard snapshot, and builds per-user breakdowns.

Stacking rules currently enforced:

- exact score replaces 1/X/2 when `exactScoreReplacesOutcome` is true;
- top scorer with exact goals replaces top scorer-only when `topScorerExactGoalsReplacesTopScorer` is true;
- qualification, pairing, exact score, and advancement-method bonuses can all appear together when configured with positive values.

Rule lifecycle:

- draft rule versions can be edited before lock/deadline by owner/admin;
- locked versions clone the config and receive a checksum;
- locked versions reject further updates;
- mock rule changes are recorded as `ScoringRuleChange` entries for stage and antepost fields.

The engine remains configuration-driven. No point values are hardcoded into UI or prediction workflow code.

## Milestone 4 Persistence Contract

Milestone 4 keeps calculation in the pure `src/domain/scoring` modules and adds a Supabase persistence contract around its output:

- `SupabaseScoringPersistenceRepository.persistRecalculation` is the server-only adapter that serializes `ScoringEvent`, `LeaderboardSnapshot`, and `UserScoringBreakdown` values.
- `persist_scoring_recalculation` stores the payload only after the league and rule snapshot are locked.
- The RPC replaces all scoring rows for the same `source_result_key`, then writes fresh scoring events, one leaderboard snapshot, leaderboard entries, breakdown rows, and a recalculation run.
- Scoring event payloads must reference the locked scoring rule version. The database rejects events for a different rule version.
- Direct table writes remain unavailable to normal clients; leaderboard and breakdown data are derived artifacts.

This preserves deterministic idempotency from Milestone 3 while preparing the same domain engine to run from a trusted server worker in a later milestone.

## Milestone 4.1 Idempotency Fix

Repeated persistence for the same `source_result_key` uses the Milestone 4 replacement strategy and no longer conflicts with historical recalculation runs.

`scoring_recalculation_runs.snapshot_id` uses `ON DELETE SET NULL`, so deleting the previous leaderboard snapshot releases old run references while retaining run audit rows. The new recalculation then writes fresh scoring events, a fresh leaderboard snapshot, entries, breakdown rows, and a new successful run that points to the current snapshot.

## Milestone 5 Trusted Execution

Milestone 5 moves official scoring execution behind a server-side trusted worker:

- `src/server/scoring/trustedScoringWorker.ts` validates a result payload, loads the trusted league context, runs `recalculateTournamentScoring`, and persists the derived output.
- `src/server/scoring/resultValidation.ts` uses Zod at the ingestion boundary for UTC timestamps, non-negative scores, valid stages, unique result keys, and source-key consistency.
- `src/server/scoring/supabaseTrustedScoringRepository.ts` is the server adapter for service-role RPC calls. The service-role key is not used by the Expo/mobile client.
- `persist_scoring_recalculation` is now service-role-only for official persistence. Authenticated clients can read permitted scoring artifacts through RLS but cannot submit official scoring events or leaderboard snapshots.
- `record_trusted_result_ingestion` records accepted, scored, and failed ingestion runs in `result_ingestion_runs` for audit, retries, corrections, and future provider result versioning.

The recalculation remains deterministic and idempotent by `source_result_key`. Result corrections can use a new stable correction source key while setting `correction_of_source_result_key`; the worker excludes the superseded source's events from the new snapshot calculation, while historical rows remain available for audit. A correction can also intentionally reuse a source key when the desired final state is replacement of that source's scoring artifacts.

## Milestone 6 Provider Import Execution

Milestone 6 keeps the scoring engine unchanged and adds a provider-import wrapper around trusted execution:

- `MOCK_RESULTS` normalizes a structured mock provider payload into `OfficialTournamentResultSet`.
- `executeProviderResultImport` records provider import state, verifies correction sources, calls the trusted scoring worker, then records the scored or failed state with retry metadata.
- `SupabaseScoringContextLoader` supplies the trusted worker with persisted prediction sets, tie-break overrides, antepost predictions, locked scoring rules, existing scoring events, previous leaderboard snapshot, and competition context.
- `trustedScoringRuntime.ts` is the deployable-compatible parsing boundary; service-role wiring stays in `trustedScoringRuntimeFactory.ts`.

Official persisted scoring still happens only through service-role RPCs. Clients may read permitted scoring artifacts, but they do not calculate or persist official leaderboard state.

## Milestone 7 Deployable Trusted Entry Point

Milestone 7 wraps the existing trusted runtime in `supabase/functions/trusted-result-import/index.ts`:

- the Edge Function accepts a server-side POST request and forwards the body to `handleTrustedScoringRuntimeRequest`;
- `trustedScoringRuntimeFactory.ts` creates service-role Supabase dependencies inside the server runtime only;
- the scoring engine remains the pure `src/domain/scoring` implementation used by the trusted worker;
- `source_result_key` remains the idempotency key for provider import, trusted ingestion, scoring events, leaderboard snapshots, and recalculation runs;
- corrections still exclude superseded events from the new snapshot through the trusted scoring worker path.

Retry scheduling is not part of the scoring calculation. Milestone 7 adds `failure_kind` and `trusted_provider_retry_candidates` so a future scheduler can safely select due retryable imports without granting client write access to official scoring artifacts.

## Milestone 7.1 Versioned Presets

Milestone 7.1 keeps the engine pure and configuration-driven while adding multiple scoring presets:

- `WORLD_CUP_DEFAULT` for the 2026 World Cup template.
- `EURO_DEFAULT` for the 2028 EURO template.
- `CHAMPIONS_LEAGUE_DEFAULT` for the 2026/27 Champions League template.

The stage set now includes `PLAYOFF` so Champions League-style two-leg playoff rounds can be scored through the same configured stage map as round of 16, quarterfinals, semifinals, and finals. EURO and Champions League presets set unused stages such as round of 32 or third-place final to zero values instead of requiring UI or engine conditionals.

Versioned scoring preset payloads are stored in the competition bundle and copied into the league competition snapshot at lock. Rule editor overrides remain league-specific and are included in the locked snapshot checksum. The scoring engine still receives a `ScoringRuleConfig`; it does not know whether a rule came from World Cup, EURO, Champions League, or a future custom edition.

## Milestone 7.2 Versioned Preset Seed Contract

The Supabase seed now stores complete versioned scoring preset payloads for:

- `WORLD_CUP_DEFAULT`;
- `EURO_DEFAULT`;
- `CHAMPIONS_LEAGUE_DEFAULT`.

These JSON payloads mirror the TypeScript defaults in `src/domain/scoring/presets.ts`. Static tests parse `supabase/seed.sql` and compare the seeded configs to the domain presets so an empty `stages`, `antepost`, or `stacking` object fails fast.

## Milestone 8 Entry UX Boundary

Milestone 8 does not change official scoring calculation. The new Quick/Expert prediction entry workflow normalizes user input into the existing prediction model:

- initial group/league-phase scores;
- knockout scores, qualified team, and advancement method;
- tie-break override order;
- derived winner/finalists antepost values;
- manual top scorer and top-scorer goals.

Official scoring remains configuration-driven and server-authoritative through the trusted worker path introduced in earlier milestones. The mobile UI does not persist official scoring events or leaderboard snapshots.

Two-legged knockout rounds are still scored through the existing configured stage keys. Milestone 8 records one aggregate placeholder prediction for those rounds; leg-by-leg scoring or aggregate-specific bonuses remain out of scope.

`create_private_league` creates the draft league rule version from `scoring_preset_versions` and rejects incomplete configs. The legacy `scoring_presets` table can still be used only as an explicit compatibility override, not as the default source for new multi-competition leagues.
