# Decisions

## 2026-07-03 - Milestone 0 Foundation

- Initialized a compact Expo Router app instead of a full generated template to keep the first milestone controlled and auditable.
- Used a small internal token-based component layer rather than React Native Paper. This keeps the base UI focused while still preserving Material-like touch targets and semantic tokens.
- Used Vitest for pure domain tests. React Native UI tests are deferred until more real UI behavior exists.
- Implemented mock adapters for auth, football data, and league state. No real Supabase, Sportmonks, advertising, payment, betting, odds, or gambling integration is present.
- Represented the World Cup-style tournament as generated configuration: 12 groups, 48 teams, 72 group-stage matches, knockout slot metadata, and antepost definitions.
- Kept scoring values in `worldCupDefaultScoringConfig`. The scoring engine receives configuration and does not hardcode point values.
- Preserved the semifinal pairing value of 5 points from the supplied preset.
- Used an in-memory mock repository for Milestone 0 autosave/sync simulation. Persistence across app restarts is deferred.
- Used a stable FNV-1a checksum for mock rule snapshots. A cryptographic hash can replace it server-side later.
- Created broad initial Supabase tables and representative RLS/trigger guards. Full database integration and policy tests are deferred to Milestone 1.

## Assumptions

- The mock competition may use generated team/player names because no production spreadsheet or official provider data is available in the repository.
- Milestone 0 only needs group-stage prediction entry in UI; knockout and antepost support are modeled for configuration and scoring but not fully exposed as flows yet.
- The local server time for mock write checks is fixed in state to keep the vertical slice deterministic.
- npm audit reports moderate transitive vulnerabilities after installing current packages; no forced breaking updates were applied during this milestone.

## 2026-07-03 - Milestone 1 Authentication and Secure Lifecycle

- Added Supabase Auth through a public anon-key client using Expo public environment variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Implemented Google and Apple login with Supabase OAuth and `expo-web-browser`. Provider setup is still completed in Supabase dashboard and native platform consoles, not through committed secrets.
- Kept the Milestone 0 mock flow as the default when Supabase is not configured. This preserves local demo behavior and avoids requiring credentials for development.
- Added `AuthProvider` separately from `PredicteMockProvider` so real auth can be introduced without coupling it to mock competition state.
- Added a Supabase league repository that uses RPCs for lifecycle writes instead of direct table mutations.
- Chose security-definer RPCs for league creation, invite creation, invite acceptance, role changes, member removal, deadline updates, and lock actions. This keeps complex authorization centralized in the database.
- Stored invite tokens as SHA-256 hashes. The plain invite token is returned only at creation time and used in `/invite/:token` links.
- Required lock to happen at or after the server deadline. Scheduled locking is represented by `lock_due_leagues()` and reserved for service-role execution.
- Added RLS helper functions to avoid recursive policies and to keep membership/role checks consistent.
- Added pure TypeScript policy/lifecycle tests plus static migration tests. Full Supabase local integration tests are still a future improvement because this environment does not run a local Supabase stack during the milestone.

## Milestone 1 Assumptions

- OAuth provider credentials and redirect URL registration are configured outside the repository in Supabase, Google, and Apple consoles.
- The mobile app may safely expose only the Supabase URL and anon key through Expo public env vars.
- The first real league lifecycle can use `total_required = 0` prediction sets until Milestone 2 completes full prediction requirements.
- Ownership transfer remains out of scope for Milestone 1; owner/admin/participant role management supports promotion/demotion for non-owner members only.

## 2026-07-04 - Milestone 1.1 Supabase Lifecycle Hardening

- Added a local Supabase seed catalog with one football sport, one World Cup-style template, one enabled mock edition, group-stage structure, mock teams, mock matches, antepost definitions, and an active scoring preset. This is only mock data for local lifecycle validation.
- Split the database lifecycle gates into `league_accepts_members` and `league_accepts_predictions`. Both require league status `open` and server time before `deadline_at`; `draft` no longer authorizes member invites, member management, or prediction writes.
- Updated the TypeScript lifecycle and RLS-equivalent policy helpers to mirror the server rule: prediction writes require `open` before deadline.
- Replaced broad `for all` RLS policies on `prediction_tiebreak_overrides` and `antepost_predictions` with explicit `select`, `insert`, and `update` policies. No client `delete` policy is granted for these records in Milestone 1.1; future UX should model removals as controlled updates or a dedicated RPC if deletion becomes necessary.
- Chose stricter invite semantics for `join_league_by_invite`: revoked, expired, full, or deadline-closed tokens are rejected before checking existing membership. If the token is still valid and the user is already an active member, the function returns the league id idempotently without incrementing invite usage.
- Left Milestone 2 prediction workflow features untouched. No real sports provider, payment, advertising, betting, odds, wagering, or gambling capability was added.

## Milestone 1.1 Assumptions

- Local end-to-end Supabase validation still requires Supabase CLI and Docker outside this repository.
- The mock seed intentionally uses deterministic UUIDs so migration and seed resets remain repeatable.
- The current no-delete policy for antepost and tiebreak prediction records is acceptable until the product defines an explicit "clear answer" UX.

## 2026-07-04 - Milestone 2 Complete Prediction Workflow

- Added the complete prediction workflow as pure TypeScript domain modules under `src/domain/predictions`: group standings with tie-break overrides, best-third selection, predicted bracket generation, knockout validation, dependency invalidation, antepost validation, and full completion status.
- Kept the competition workflow data-driven from `CompetitionSeed`. The UI consumes generated bracket/group/antepost structures and does not hardcode World Cup rounds inside route files.
- Used the existing mock World Cup seed as the Milestone 2 data source: 12 groups, 72 group matches, 8 best third-placed qualifiers, round of 32 through final, third-place match, and three antepost definitions.
- Chose sequential bracket pairing from configured `bracketSlots` for the mock World Cup model. This is sufficient for Milestone 2 mock workflow and should be replaced by explicit imported bracket match templates when real provider/import data arrives.
- Dependency invalidation now creates explicit warnings for impacted bracket matches and preserves existing predictions. No prediction data is deleted silently.
- Knockout predictions enforce the domain rule: non-draw 90-minute scores auto-resolve to `REGULATION`; drawn 90-minute scores require a qualified team plus `EXTRA_TIME` or `PENALTIES`.
- Added `SAVED` to the sync status model and surfaced all required sync states in the prediction review UI: saved, syncing, synced, sync failed, and local unsynced changes.
- Left Supabase schema unchanged for Milestone 2 because the existing `match_predictions`, `prediction_tiebreak_overrides`, and `antepost_predictions` tables already represent the required workflow concepts.
- No real sports provider, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 2 Assumptions

- The mock bracket order is deterministic but not an official FIFA bracket mapping.
- Supabase persistence for the full workflow remains a later integration step; Milestone 2 keeps the existing mock fallback working while preparing domain structures for backend wiring.
- The tie-break override UI stores the displayed order for the unresolved set. A richer manual reordering interaction can be added later without changing the stored domain model.

## 2026-07-04 - Milestone 3 Rule Editor and Complete Scoring Engine

- Added a pure tournament scoring orchestrator in `src/domain/scoring/tournamentScoring.ts`. It consumes prediction sets, competition config, official result sets, and scoring rule versions, then emits deterministic scoring events, leaderboard snapshots, and user breakdowns.
- Kept point values and stacking behavior in `ScoringRuleConfig`. The engine now covers group score, group position, stage qualification, pairing, knockout score, extra-time method, penalty method, tournament winner, top scorer, and top-scorer exact goals without hardcoded point values.
- Added `THIRD_PLACE` to the scoring stage config so the third-place final is scored through the same configurable path as other knockout rounds.
- Chose idempotent recalculation by `sourceResultVersion`: recalculation replaces events for the same source version and rebuilds the snapshot from the remaining event set plus the latest events.
- Extended rule editing to produce mock `ScoringRuleChange` history for stage and antepost point values. Real persistence can later use `audit_log` or a dedicated table; no new SQL migration was required in Milestone 3.
- Rule edits are allowed only for owner/admin, while the league is `open`, before the server deadline, and before rule lock. Locked rule snapshots clone their config and carry a checksum.
- Updated `supabase/seed.sql` scoring preset to match the TypeScript scoring config shape, including all stages, antepost values, and stacking flags.
- Kept the existing mock prediction workflow incomplete by default. Users can still complete bracket and antepost predictions; scoring only awards events for predictions actually present.
- No real sports provider, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 3 Assumptions

- The mock official result set is deterministic and exists only to exercise scoring end-to-end without sports-provider APIs.
- The mock rule history is in-memory and session-scoped until a backend persistence milestone defines the authoritative audit write path.
- Generated bracket match ids are acceptable for mock scoring; provider-backed bracket ids remain a future integration concern.

## 2026-07-04 - Milestone 3.1 Supabase pgcrypto Lint Fix

- Added a narrow Supabase migration that replaces invite token helpers with schema-qualified `extensions.digest` and `extensions.gen_random_bytes` calls.
- Kept invite token generation and SHA-256 hashing semantics unchanged.
- Left Milestone 4 backend work, payments, advertising, betting, odds, gambling, and real sports-provider APIs untouched.

## 2026-07-04 - Milestone 4 Supabase Persistence

- Added a dedicated Supabase migration for complete prediction, rule, scoring, and leaderboard persistence instead of changing UI components or mock state.
- Added `prediction_ref` to `match_predictions` so generated knockout bracket predictions can be stored even when they do not map to a real `matches.id` UUID yet. Real scheduled matches still use `match_id`.
- Added `prediction_sync_status` and sync-status columns for match predictions, tie-break overrides, and antepost predictions. The server stores the state supplied by the repository, while lock/deadline authorization remains database-enforced.
- Added RPCs for match prediction upsert, tie-break override upsert, antepost upsert, and prediction-set completion updates. These RPCs use the current user's active prediction set and reject writes after lock/deadline.
- Added persisted rule-change history in `league_scoring_rule_changes`, while also writing member-visible `audit_log` entries for rule edits and lock events.
- Added `lock_scoring_rule_snapshot` and updated league locking to use a schema-qualified SHA-256 checksum via `extensions.digest`. The locked rule snapshot is required before scoring persistence.
- Added idempotent scoring persistence keyed by `source_result_key`. A recalculation replaces scoring events, breakdown rows, and the leaderboard snapshot for the same source key in one RPC call.
- Kept direct client table writes unavailable for scoring events, leaderboard snapshots, leaderboard entries, scoring breakdowns, and rule-change history. Writes go through RPCs with owner/admin checks.
- Added Supabase repository classes for prediction persistence, rule edits, and scoring persistence. They are separate from UI and keep the existing mock flow untouched when Supabase is not configured.

## Milestone 4 Assumptions

- The current app still runs the pure TypeScript scoring engine locally for mock and repository contract tests. The database is authoritative for accepting, locking, auditing, and idempotently storing recalculation output. A future backend worker or Edge Function can execute the same domain engine server-side.
- Generated bracket IDs remain deterministic `prediction_ref` values until provider-backed bracket templates introduce stable real identifiers.
- Full Supabase integration tests with authenticated users are still represented by local `db reset`, `db lint`, static migration tests, and repository RPC contract tests.

## 2026-07-04 - Milestone 4.1 Scoring Recalculation Idempotency

- Changed the `scoring_recalculation_runs.snapshot_id` foreign key to `ON DELETE SET NULL`. This is the narrowest fix for repeated `persist_scoring_recalculation` calls with the same `source_result_key`.
- Historical recalculation runs remain available as audit metadata, but they release their previous snapshot reference when an idempotent recalculation replaces the leaderboard snapshot for the same source key.
- Kept the Milestone 4 replacement strategy: events, breakdown rows, and the leaderboard snapshot for one `source_result_key` are deleted and rebuilt so the final persisted state matches the latest recalculation payload.
- Added `supabase/.branches/` to ignored runtime paths alongside `supabase/.temp/`.

## 2026-07-05 - Milestone 5 Trusted Server Scoring Execution

- Added a server-side trusted scoring worker under `src/server/scoring`. It receives a mock/official result payload, validates it with Zod, loads a trusted scoring context, runs the pure `src/domain/scoring` engine, and persists the derived scoring artifacts.
- Kept the existing domain scoring engine as the single calculation implementation. The mobile client may still use mock scoring for local fallback UX, but official Supabase scoring persistence is now a server concern.
- Restricted `persist_scoring_recalculation` execution to `service_role` and revoked client execution. This prevents authenticated mobile users from submitting official scoring events, leaderboard snapshots, or point breakdown payloads.
- Added `result_ingestion_runs` plus `record_trusted_result_ingestion` as a service-role-only audit/foundation path for mock result ingestion, future provider imports, result corrections, retries, and result versioning.
- Preserved idempotency by `source_result_key`: the worker passes one stable key into the existing replacement strategy, and Milestone 4.1 `ON DELETE SET NULL` keeps repeated recalculations from being blocked by historical run references.
- For corrections that use a new source key, the worker excludes events from `correction_of_source_result_key` before generating the new leaderboard snapshot. Historical rows stay available for audit and future result-version views.
- Chose a TypeScript server worker foundation rather than wiring a deployed Edge Function in this milestone. The worker can be wrapped by an Edge Function or background job later without moving business logic into UI code.
- No real sports provider, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 5 Assumptions

- The trusted worker is exercised through unit tests and Supabase RPC contracts; deploying it to Supabase Edge Functions or another worker runtime is deferred.
- Result ingestion uses deterministic mock/server-side payloads only. Real provider payload normalization and provider credentials remain future work.
- Full authenticated RLS end-to-end tests are still limited by local test harness complexity; Milestone 5 adds static SQL contract tests plus local Supabase reset/lint verification.

## 2026-07-05 - Milestone 6 Provider Result Import Foundation

- Added a structured `MOCK_RESULTS` provider adapter under `src/server/results` instead of connecting a real sports provider. It returns raw mock payload metadata plus the normalized `OfficialTournamentResultSet` consumed by the trusted scoring worker.
- Kept the deployable runtime as TypeScript server modules rather than committing a Supabase Edge Function wrapper. `trustedScoringRuntime.ts` parses requests and stays free of service-role client creation; `trustedScoringRuntimeFactory.ts` wires server-only Supabase dependencies for a future worker/Edge deployment.
- Moved official scoring persistence from `src/services/scoring/supabaseScoringRepository.ts` to `src/server/scoring/supabaseScoringPersistenceRepository.ts`. This makes the service-role-only persistence boundary explicit and reduces accidental client imports.
- Added `SupabaseScoringContextLoader` so trusted server execution can load competition config, prediction sets, tie-break overrides, antepost predictions, locked rule snapshots, existing scoring events, and leaderboard context from Supabase.
- Added `record_provider_result_import` and `trusted_result_ingestion_exists` as service-role-only RPCs. Provider import, correction-source lookup, retry metadata, raw payload references, and audit rows remain server-side.
- Chose strict correction semantics: a correction with `correction_of_source_result_key` can be scored only if the corrected source key already exists as a scored ingestion for the league. Missing or unscored correction sources are recorded as failed imports and do not trigger scoring.
- Preserved scoring idempotency by `source_result_key`; repeated provider imports with the same key reuse the trusted recalculation path and the Milestone 4.1 snapshot FK behavior.
- No real sports provider, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 6 Assumptions

- The mock provider's `external_fixture_key` identifies a provider-side fixture/result reference for audit and future mapping, but it is not yet a real provider id.
- Retry scheduling metadata is stored and validated, but no scheduler or background retry queue is started in Milestone 6.
- The TypeScript runtime boundary can be wrapped by a Supabase Edge Function, Node worker, or scheduled job in a later milestone without moving scoring business logic into UI code.

## 2026-07-05 - Milestone 7 Trusted Worker Deployment and Authenticated Supabase Tests

- Wrapped the trusted provider/scoring runtime in a Supabase Edge Function at `supabase/functions/trusted-result-import/index.ts`. The wrapper is intentionally thin: request parsing and business orchestration remain in `src/server/scoring` and `src/server/results`.
- Added a Deno import map for shared server modules instead of duplicating scoring/provider logic inside the Edge Function.
- Kept `SUPABASE_SERVICE_ROLE_KEY` usage server-only. The Expo/mobile app still uses only public Supabase env vars and does not import `src/server/results` or server scoring persistence modules.
- Added explicit database revokes for `sync_runs` and `provider_payloads`, and repeated the same write-deny posture for trusted scoring/runtime tables.
- Added `failure_kind` to `sync_runs` and `result_ingestion_runs` so retryable provider-import failures are distinguishable from non-retryable failures.
- Chose `trusted_provider_retry_candidates` as a service-role-only retry queue foundation. It returns due retry candidates but does not schedule or execute background retries in Milestone 7.
- Kept missing correction sources non-retryable. A correction can be scored only when the referenced source result already exists as a scored ingestion for the same league.
- Added local authenticated Supabase RLS tests that run when the Docker-backed database is reachable and contains the Milestone 7 migration. They cover owner/admin/member/non-member/anon reads, client write denial, and service-role-only RPC grants.
- No real sports provider, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 7 Assumptions

- Deploying the Edge Function to a remote Supabase project remains an operational step outside the repository.
- Retry scheduling is represented by data model, pure helpers, and a service-role candidate RPC; a cron/scheduler is deferred.
- Edge Function runtime typechecking is covered by static tests and shared TypeScript module tests; `supabase/functions/**` is still excluded from the Expo app TypeScript program because it uses Deno globals.

## 2026-07-05 - Milestone 7.1 Versioned Multi-Competition Templates

- Modeled competitions as family plus edition plus versioned format/ruleset/prediction/scoring bundle. A family such as World Cup, EURO, or Champions League no longer implies a permanent structure.
- Added initial domain templates for `world_cup_2026`, `euro_2028`, and `champions_league_2026_27`, plus a future-compatible `world_cup_2030` mock edition to prove template supersession and independent edition versions.
- Chose JSON-backed Supabase template payloads for format, ruleset, prediction requirements, and scoring preset versions. This avoids overfitting the schema to one tournament family while the domain model is still evolving.
- Added immutable league competition snapshots at lock time. The snapshot includes the selected format template, prediction requirements, scoring preset, admin overrides, ruleset metadata, and checksum so later catalog updates cannot alter a locked league.
- Extended the bracket domain to support group-stage tournaments, league-phase tournaments, optional best-thirds ranking, optional playoff rounds, optional third-place finals, single-leg stages, and two-leg stage metadata.
- Added `PLAYOFF` as a scoring/prediction stage key for Champions League-style qualification rounds. Scoring values for the new stage remain preset configuration.
- Kept ranking-rule codes as structured metadata. FIFA-style, UEFA head-to-head-first, best-thirds, and Champions League table ranking are represented in templates; full official head-to-head implementation beyond existing deterministic tie-break handling remains future work.
- Updated the mock create-league flow to choose among available competition editions. The mock provider still keeps one active competition context in state, so simultaneous editing of multiple leagues from different editions remains a known local-demo limitation.
- No real sports provider, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 7.1 Assumptions

- Initial team names and fixtures for EURO and Champions League are mock data intended to validate shape, prediction workflow, and scoring compatibility, not official calendars.
- Champions League playoff and two-leg rounds are modeled structurally. Aggregate/two-leg scoring nuances beyond configured match-level predictions remain future work.
- Official source URLs are stored as metadata only. They do not connect to or scrape a real sports-provider API.

## 2026-07-05 - Milestone 7.2 Versioned Seed and League Creation Contract

- Replaced empty seeded `scoring_preset_versions` payloads with complete configs aligned with `src/domain/scoring/presets.ts` for World Cup, EURO, and Champions League.
- Updated `create_private_league` to derive league version references from `competition_editions` and `scoring_preset_versions`. A league cannot be created from an enabled edition unless format, ruleset, prediction requirement, and scoring preset version ids are present.
- Kept `scoring_presets` only as an explicit legacy override path for backward compatibility. New versioned leagues still store the edition's `scoring_preset_version_id`, and empty or incomplete rule configs are rejected instead of defaulting to `{}`.
- Completed the seeded `format_template_versions.stages` payloads so lock snapshots include all configured World Cup, EURO, and Champions League stages.
- Kept `world_cup_2030` as a future mock placeholder with complete draft version references, but set `enabled = false` so it cannot be used for league creation until intentionally activated.
- Updated the mock provider to resolve competition context per league when editing predictions, clearing dependency warnings, locking, and settling mock results. This removes the previous local-demo risk where simultaneous leagues of different editions could use the last selected competition.
- Left the Home create-league flow as a compact edition selector for now. Separate sport, family, edition, and preset selectors remain a future UX refinement.

## Milestone 7.2 Assumptions

- `world_cup_2030` uses mock placeholder metadata and draft version rows only; it is not an official calendar or enabled production edition.
- Versioned scoring presets are duplicated in the seed as JSON so local Supabase resets can validate league creation without requiring TypeScript runtime code inside SQL.

## 2026-07-05 - Milestone 8 Prediction Entry UX

- Added a pure `entryWorkflow` domain module for prediction-entry sequencing, Quick/Expert normalization, score chips, tie-break targets, knockout validation, derived antepost, and manual antepost completion. The UI consumes this module instead of encoding competition rules in components.
- Chose two entry modes with the same final data model. `QUICK` optimizes for large mobile cards and chips; `EXPERT` exposes direct numeric score inputs. Neither mode changes scoring or persistence semantics.
- Kept tournament winner and finalists as derived antepost values from the predicted bracket. Users manually enter only top scorer and top-scorer goals in this milestone.
- Added free-text top-scorer support via `AntepostPrediction.textValue` while preserving player-id selection when a mock catalog entry is chosen.
- Added a lightweight tie-break override step between initial predictions and bracket entry. It orders unresolved tied teams from the domain-generated target and writes the existing mock `PredictionTiebreakOverride` shape.
- Treated Champions League-style two-legged knockout rounds as one aggregate prediction placeholder. This avoids inventing leg-by-leg UX, aggregate tiebreak rules, or scoring changes before a dedicated milestone.
- Updated mock league initial prediction creation to populate all concrete initial-stage matches for league-phase editions, not just World Cup/EURO group fixtures.
- No real sports provider, Sportmonks integration, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 8 Assumptions

- Quick mode swipe support is additive to visible buttons; buttons remain the accessible primary path.
- League-phase tie-break handling is still simplified. The current validation blocks unresolved group-table ties; full official Champions League ranking override UX can be expanded once real edition/provider data is introduced.
- Two-legged rounds store one aggregate prediction in Milestone 8. Future leg-level predictions may require either child prediction records or an expanded prediction payload contract.

## 2026-07-05 - Milestone 8.1 Tie-Break Groups and Advancement Foundation

- Added a stable `tieGroupId` to prediction tie-break overrides. Multiple unresolved ties can now exist in the same scope, such as two separate pairs tied inside one group, without overwriting each other.
- Changed Supabase tie-break persistence from unique `(prediction_set_id, scope_ref)` to unique `(prediction_set_id, scope_ref, tie_group_id)`. Legacy rows are migrated with `tie_group_id = scope_ref` and `tied_team_ids = ordered_team_ids`.
- Kept `upsert_prediction_tiebreak_override` semantics unchanged for deadline/lock/security, but extended its payload with scope, tie group id, tied team ids, and affected positions.
- Best-thirds ranking now blocks impacted generated bracket slots when the qualifying/ranking tie is unresolved. A manual `BEST_THIRDS` override resolves that tie group instead of relying on deterministic fallback order.
- World Cup 2026, EURO 2028, and Champions League 2026/27 bracket mapping strategies are still marked as placeholders. The templates carry strategy codes, but official best-third matrices, UEFA ranking edge cases, seeded playoff draw logic, and full two-leg leg-by-leg prediction remain future work.
- The prediction entry screen now recomputes the workflow after successful match/tie-break/knockout saves before jumping to the next missing item, avoiding stale navigation from the previous render.

## 2026-07-06 - Milestone 9 Demo Flow Hardening and Visual Polish

- Kept Milestone 9 focused on demo readiness. The work improves Home/create-league clarity, Quick/Expert prediction cards, tie-break explanation, antepost validation, final review, leaderboard, and point breakdown without changing scoring semantics or connecting real providers.
- Added `getCompetitionDemoSummary` in the competition domain so Home and prediction mode copy can describe sport, family, edition, format facts, phases, scoring preset, and placeholder notes without hardcoding a World Cup-specific UI.
- Chose to make top-scorer goals strictly positive for completion. `0` is now treated as incomplete because the MVP prompt asks for positive numeric validation in the demo flow.
- Hardened `upsert_prediction_tiebreak_override` with a follow-up migration that requires `ordered_team_ids` and `tied_team_ids` to represent the same set, rejects extra teams, and rejects duplicates. This preserves the Milestone 8.1 `tieGroupId` semantics while closing the review's non-blocking data-integrity gap.
- Kept Champions League two-leg and seeded playoff/draw behavior as documented placeholders. The demo UI may show aggregate two-leg prediction notices, but it does not implement leg-by-leg entry or official draw logic in this milestone.
- No real sports provider, Sportmonks integration, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 9 Assumptions

- World Cup 2026 is the primary demo path. EURO 2028 remains usable when placeholder best-third mapping is acceptable for the demo audience.
- Champions League is present in the selector for multi-competition proof, but its two-leg and playoff/draw UX remains a clearly documented placeholder.
- Demo polish is intentionally UI-level and mock-data-level. Official scoring persistence remains trusted server-side, and the mobile app still does not persist official scoring artifacts directly.

## 2026-07-07 - Milestone 11B Private League Scale Readiness

- Kept the milestone technical and additive. The database change is a small index-only migration for private leagues where the current real reference scale is about 200 participants, with up to 500 participants as technical headroom rather than an immediate product requirement.
- Added scoped indexes for active league members, league invites, prediction-set summaries, per-user prediction reads, latest leaderboard snapshots, source-result scoring events, per-user scoring breakdowns, recalculation-run history, and result-ingestion history.
- Chose not to add new tables, RLS policies, RPCs, trusted-worker changes, or client-side official scoring. Existing service-role-only scoring and result ingestion boundaries remain unchanged.
- Existing mock screens still render in-memory members and leaderboard rows. That is acceptable for the demo path at this milestone, but real Supabase list screens should use paginated reads before larger production leagues are enabled.
- No real sports provider, Sportmonks integration, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 11B Assumptions

- The readiness baseline is the current real reference of about 200 participants per private league. Up to 500 participants is technical headroom used to avoid painting the schema into a corner, not the case base for current UX.
- Milestone 11B is DB/index-level readiness only. It does not add dedicated paginated Supabase read repositories, UX pagination, real query plans, or load tests.
- Supabase read repositories for members and leaderboard are still future work. When added, they should expose pagination or cursor/limit parameters with safe defaults instead of returning unbounded lists.
- The index migration intentionally does not change scoring, prediction, ruleset, provider-import, or leaderboard persistence semantics.
- The scope is intentionally narrow to avoid overengineering before production traffic proves which read paths need deeper optimization.

## 2026-07-09 - Milestone 11C Paginated Supabase Read Repositories

- Added a small shared pagination helper and a read-only Supabase league repository for potentially larger league-scoped lists: members, invites, prediction-set summaries, leaderboard snapshots, leaderboard entries, and scoring breakdown items.
- Kept the real scale context from Milestone 11B: about 200 participants is the current reference, while up to 500 participants is technical headroom. The repository uses a default page size of 50 and caps requests at 100 rows to avoid accidental unbounded client reads without overengineering the architecture.
- Chose not to wire the new repository into the current mock-first screens. Those screens still read in-memory demo state; real Supabase UI pagination can be introduced later without changing the read-service contract.
- Kept official scoring persistence, trusted result ingestion, trusted worker code, service-role paths, RLS, RPCs, policy/grant/revoke behavior, and functional schema untouched.
- No real sports provider, Sportmonks integration, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## Milestone 11C Assumptions

- `page` is one-based and Supabase `range(from, to)` is inclusive. With the default 50-row page, the current 200-participant reference fits in about four pages; the 500-participant headroom fits in about ten pages.
- The repository is read-only and relies on existing RLS. It does not create new member/profile visibility rules, so richer member display data may still require a future policy/RPC decision.
- Query plans, load tests, and full UX pagination remain future work. Milestone 11C only prevents obvious unbounded client read patterns in service boundaries.

## 2026-07-09 - Milestone 11D Paginated League Preview UI

- Wired the league overview to the read-only paginated Supabase repository for the first concrete real-data preview: active league members and the latest leaderboard snapshot entries.
- Added a repository method that lists leaderboard entries by `league_id` by first resolving the latest snapshot for that league. The UI does not accept an arbitrary `snapshot_id` as its primary source and does not calculate official standings client-side.
- Kept the mock fallback active for non-Supabase/demo league ids so the demo path still works without real Supabase data.
- Kept the full participants and leaderboard routes mock-first in this milestone. The new real-data integration is limited to league-overview previews.
- Guarded preview requests so stale responses from an older league id, unmounted component, or overlapping load-more action are ignored before state updates.
- Kept the scale framing unchanged: about 200 participants is the current real reference, and 500 participants remains technical headroom. The UI uses smaller 20-row preview pages while the repository still defaults to 50 and caps at 100.
- Left schema, RLS, RPCs, grants, trusted worker, trusted result ingestion, official scoring persistence, and leaderboard persistence unchanged.
- No real sports provider, Sportmonks integration, payment, advertising, betting, odds, wagering, gambling, entry fee, prize pool, or paid/unpaid member capability was added.

## 2026-07-09 - Milestone 11E Paginated League Read Screens

- Wired the full participants and leaderboard routes to read-only Supabase hooks when the league id is a UUID and the public Supabase client is configured.
- Kept mock/non-UUID league ids on the existing demo path. UUID routes without Supabase config now show clear configuration messages instead of claiming the mock league is missing.
- Leaderboard reads still use `listLatestLeaderboardEntriesForLeague(league_id, pagination)`, so the UI never accepts an arbitrary snapshot id as its primary source and never calculates official standings.
- Reused the Milestone 11D request guard for the full screens to ignore stale responses, avoid post-unmount state updates, and block overlapping load-more requests.
- Kept the scale framing unchanged: about 200 participants is the current real reference, while 500 participants remains technical headroom. Full production query-plan review, load tests, and richer profile/display-name policy remain future work.
- Left schema, RLS, RPCs, grants, trusted worker, trusted result ingestion, official scoring persistence, and leaderboard persistence unchanged.

## 2026-07-10 - Milestone 11F Safe Identity Presentation

- Added a shared safe identity presenter for Supabase-backed participants and leaderboard rows. It prefers a provided display name, then a username, then a short user-id fallback such as `Utente abcd1234`, with deterministic avatar initials.
- Chose not to join `profiles` from the mobile read screens. Current profile RLS is owner-only, so complete display names for other members need a future explicit profile visibility policy or read model before they can be shown safely.
- Rejected email-like values in the identity presenter. The full read screens do not read `auth.users`, email fields, user metadata, raw metadata, or private profile fields.
- Kept the 11E read path unchanged: public Supabase client, existing RLS, 20-row UI pages, latest leaderboard snapshot by `league_id`, and no client-side official scoring or leaderboard calculation.
- Kept schema, migrations, RLS, policies, grants, RPCs, trusted worker, result ingestion, service-role paths, official scoring persistence, and leaderboard persistence unchanged.

## 2026-07-10 - Milestone 11G Minimal Public Identity Read Model

- Added `public_user_profiles` as a separate minimal read model for league identity display. `profiles` remains owner-readable and owner-editable; the mobile screens still do not join or broaden `profiles`.
- Public identity rows contain only `user_id`, sanitized `display_name`, optional future `username`, optional future `avatar_url`, and `updated_at`. They intentionally exclude email, phone, auth metadata, raw metadata, external account identifiers, locale, timezone, and private profile fields.
- Chose a league-scoped RLS policy: authenticated users can read their own public identity and the public identities of active users who share an active league with them. This avoids a global public profile directory.
- Added a trigger-backed sync from `profiles.display_name` into `public_user_profiles`. The trigger uses a security-definer function so normal clients do not need direct write grants on the public read model; insert/update/delete remain unavailable to normal clients.
- Extended the read-only league repository to batch-load public identities for the current members/leaderboard page and attach them before the UI renders. This avoids N+1 reads and preserves the 20-row UI page size, 50-row repository default, and 100-row repository cap.
- Kept official scoring, trusted worker, result ingestion, service-role paths, leaderboard persistence, ruleset/scoring/bracket logic, payments, betting, advertising, and real sports APIs untouched.

## 2026-07-10 - Milestone 11H Prediction Completion Overview

- Added a league overview card for prediction completion status using read-only Supabase data: active members, prediction-set summaries, league status/deadline, and minimal public identities.
- Suppressed global completion counts while the persisted league status is `draft` or `open`. Existing RLS exposes only the current user's prediction set before lock, so hidden sets must not be misclassified as missing. The UI shows a post-lock availability message instead and does not widen prediction visibility.
- After lock, the repository loads active member ids in bounded 100-id batches and filters prediction-set reads to exactly that set. Removed or inactive members cannot increase complete, incomplete, or locked counts or reduce the missing count.
- Chose active-member pages as the base for the detail list. It shows non-complete users found in the pages loaded so far, with conservative page-level copy and load more; it is not a dedicated server-side incomplete-only query.
- Counts are derived from persisted `prediction_sets.status`, `total_required`, and `completed_items`; complete, incomplete, missing, and locked remain separate metrics. The client does not calculate scoring, standings, bracket outcomes, or official leaderboard data.
- Kept all reads scoped by `league_id`, reused the public Supabase client and RLS, and left schema, migrations, policies, RPCs, trusted worker, result ingestion, service-role paths, official scoring persistence, and leaderboard persistence unchanged.
- Preserved the scale framing: about 200 participants is the real reference and 500 is technical headroom. Query-plan review, load tests, and advanced admin filters remain future work.

# Milestone 11I — personal prediction progress before lock

The league overview may read only the authenticated user's prediction-set summary before lock.
It never creates a set automatically and never infers other members' completion. Global completion
remains post-lock only; this personal query is independent of the 200-member baseline and 500-member
headroom.

## 2026-07-11 - Milestone 11J-A - Safe Prediction Navigation and Capability Gating

- Reused `/league/[leagueId]/predictions` as the only prediction workflow route. Navigation parameters contain `leagueId` only and never accept a user id.
- Confirmed that the current `PredictionWorkflowScreen` is backed exclusively by `PredicteMockProvider`. A real Supabase UUID therefore cannot safely use that route yet because the screen has no authenticated client-side competition/prediction loader.
- Kept mock leagues connected to the existing workflow for incomplete and complete editable sets. Locked states expose no editing CTA.
- Kept `not_started` conservative: there is no separate explicit prediction-set initialization path, so the card shows a disabled `Compila pronostici` action and does not create a record implicitly.
- For real Supabase leagues, editable CTA labels remain visible but disabled with an explicit integration-gap message. No navigation success is simulated and no new write path, RPC, schema, RLS, scoring, or trusted behavior is introduced.
- The generic `Pronostici` link uses the same capability action as the personal card, so it cannot bypass `not_started`, locked lifecycle states, or an unavailable Supabase workflow.
- Milestone 11J-A provides navigation and capability gating only. Milestone 11J-B adds the authenticated Supabase loader; end-to-end UUID editing still depends on a complete real target adapter.

## 2026-07-11 - Milestone 11J-B - Authenticated Supabase Prediction Loader

- Routed non-UUID league ids to the unchanged `PredicteMockProvider` workflow and valid UUID league ids to a separate authenticated Supabase screen. The UUID branch never uses mock competition or prediction data.
- Added a read-only prediction workflow repository that verifies a visible league plus active membership, scopes the personal prediction-set query by both `league_id` and the session user id, and loads persisted match predictions, tie-break overrides, and antepost predictions only through that set id.
- Loaded persisted league lifecycle/deadline, edition reference, format/ruleset/prediction-requirement/scoring-preset version rows, locked snapshot metadata, and edition matches. The route still carries only `leagueId`; user identity comes from `AuthProvider.session`.
- Kept direct deep links independently guarded for Supabase configuration, session presence, RLS-visible league, active membership, stale responses, session/league changes, and unmount.
- Kept `not_started` explicit and side-effect free. Existing create/join flows normally create prediction sets, but no separate initialization RPC exists and the loader never inserts one.
- Confirmed that secure personal prediction RPCs already exist, but did not connect them. The current authenticated read-side does not expose a complete target catalog for the full Quick/Expert workflow, notably bracket slots and antepost definitions, so UUID editing remains conservatively unavailable instead of borrowing mock targets.
- Added no migration, policy, grant, RPC, direct table write, scoring path, leaderboard persistence, trusted worker behavior, or result ingestion behavior.

## 2026-07-11 - Milestone 11J-C1 - Authenticated Prediction Target Adapter Foundation

- Extended the authenticated read model with edition-scoped stages, groups, rounds, matches, and the teams referenced by those matches. The team lookup is batched and does not introduce N+1 reads.
- Added a pure, version-aware target adapter under `src/domain`. It orders real catalog matches, maps persisted normalized predictions, distinguishes initial-phase, single-leg, two-leg, and unsupported targets, and exposes conservative blockers and progress without importing React or Supabase.
- Kept Quick and Expert as two future presentations of the same normalized target collection. The UUID screen does not render either editor while the adapter reports an incomplete catalog.
- Applied the required stop condition. Existing client RLS does not provide readable `bracket_slots` or `competition_antepost_definitions`, so derived bracket participants, distinct tie-break targets, and MVP antepost targets cannot be assembled safely from real data.
- Kept two-leg knockout targets disabled because the authenticated adapter cannot yet verify aggregate and advancement semantics from the authorized catalog.
- Did not connect `save_match_prediction`, `upsert_prediction_tiebreak_override`, `upsert_antepost_prediction`, or `update_prediction_set_completion`. No write is allowed while the target model is incomplete, and no mock target is substituted for a UUID league.
- Added no migration, RLS policy, grant, RPC, direct mutation, scoring path, leaderboard persistence, trusted worker behavior, or result ingestion behavior. Milestone 11J-C1 is complete as a read-only adapter foundation, not as end-to-end authenticated prediction editing.
- Reserved Milestone 11J-C2A, Secure Prediction Target Catalog Read Path, for league/version-scoped access to bracket slots, antepost definitions, and static tie-break metadata, including authenticated read-side RLS tests. It must not connect personal write RPCs.
- Reserved Milestone 11J-C3, Safe Personal Prediction Write Integration, for explicit prediction-set initialization if supported and for the existing personal prediction RPCs, server-authoritative lifecycle/deadline enforcement, and authenticated write RLS tests. It may start only after 11J-C2B is complete and validated.

## 2026-07-12 - Milestone 11J-C2A - Secure Prediction Target Catalog Read Path

- Chose a single authenticated read-only RPC instead of broad table SELECT policies or a view. `bracket_slots`, `competition_antepost_definitions`, and `competition_tiebreak_rules` are edition catalog tables without `league_id`, so direct policies would not bind a request to one visible league.
- Added `get_prediction_target_catalog(p_league_id uuid)`. It accepts no user id, derives identity from `auth.uid()`, requires active membership, derives edition and version references from the league, validates that format/ruleset/requirements versions belong to that edition, and returns only the corresponding catalog rows.
- The security-definer function uses an explicit `pg_catalog, public` search path, revokes execution from `PUBLIC` and `anon`, grants only `authenticated`, and performs no writes.
- Extended the read repository with one batched RPC call and strict JSON parsing. Query errors remain errors; an empty catalog remains a valid empty array.
- Extended the pure adapter to consume bracket source metadata, antepost definitions, and static tie-break rules. Only `TOP_SCORER` and `TOP_SCORER_GOALS` are recognized as manual MVP antepost fields; unsupported definitions remain blocked.
- Kept the UUID workflow non-interactive. The current `bracket_slots` schema has `round_id`, `source_type`, and `source_payload`, but no explicit destination match or home/away position. Full participant placement cannot be inferred safely, so the adapter retains a blocker. C2A is complete as the secure catalog read path.
- Connected no personal write RPC and changed no scoring, leaderboard, result ingestion, trusted worker, or service-role path.
- Reserved Milestone 11J-C2B, Versioned Bracket Destination Mapping, for analysis and implementation of an unambiguous, versioned destination for every bracket source. It must evaluate additional slot columns, a separate destination-assignment table, or another normalized design before choosing a solution; it must not connect personal write RPCs.
- Milestone 11J-C3 may start only after C2B validates complete and unique destination mappings, including the required single-leg demo path without preventing future two-leg formats.

## 2026-07-12 - Milestone 11J-C2B - Versioned Bracket Destination Mapping

- Added `format_template_match_nodes` so stable bracket identities such as `M73`-`M104` belong to both an edition and a format-template version. `bracket_slots` targets these nodes through a composite version/node foreign key.
- Separated fixed source assignments from the conditional best-third catalog. Combination rows store the qualified group set; assignment rows store each explicit winner-group destination.
- Kept the model leg-aware without implementing aggregate two-leg semantics. Only the FIFA World Cup 2026 official catalog is ingested in C2B1; EURO ingestion is deferred and Champions League receives no bracket assignments.
- Derived the World Cup catalog from the FIFA World Cup 2026 Regulations (May 2026), Articles 12.6-12.11 and Annexe C. The acquired PDF SHA-256 is `BAD4EA83CF1F51055598B0C12C3DAB280A78777E08A623B9E9098508B4ECC8D9`; the PDF is not committed.
- Updated the authenticated catalog RPC to return version, target match, side, leg, and slot key in the same batch. The adapter validates destination existence, round consistency, and duplicate destinations while remaining pure and competition-agnostic.
- Did not connect personal prediction RPCs, initialize prediction sets, enable Quick/Expert UUID editing, or use official results to construct personal brackets.

## 2026-07-12 - Milestone 11J-C2B1 - Upgrade-Safe Official World Cup Bracket Catalog

- Split the uncommitted C2B migration into nullable structure, authoritative versioned catalog/backfill, and final validation migrations. `seed.sql` cannot backfill an upgrade because it runs only after all migrations.
- Deferred `NOT NULL` and unique indexes until supported legacy rows have been reconciled by semantic edition/version/source keys. Dedicated versioned nodes and conditional matrix tables prevent edition-scoped match UUIDs from acting as version identity.
- Made the data migration authoritative for World Cup 2026 only: 32 nodes, 64 sides (56 fixed and eight conditional), and all 495 explicit Annexe C rows. The seed only invokes idempotent population helpers.
- Unknown or conflicting legacy mappings fail with diagnostics rather than receiving placeholders. Champions League remains excluded because two-leg semantics are not modeled.
- Added a serial C2A-to-C2B1 upgrade test with positive preservation/backfill and negative diagnostic scenarios. C2B2 read-model completion, C2B3 participant resolution, and C3 writes remain unauthorized.
- Enforced combination integrity after ingestion: eight distinct `A`-`L` groups in canonical order, a matching canonical key, and a deferred eight-assignment invariant. Upgrade diagnostics now identify slot, edition, version, round, target, source type, payload, and violation type.
- Extended the authenticated TypeScript catalog contract to retain and validate bracket nodes, combinations, and every conditional assignment from the single read-only RPC. UUID diagnostics remain non-interactive.

## 2026-07-13 - Milestone 11J-C2B2 - Complete Authenticated Prediction Read Model

- Added `get_authenticated_prediction_read_model(p_league_id uuid)` as a read-only, session-derived batch path. It accepts no user id, requires active membership, derives edition and all selected versions from the league, and returns only the current caller's prediction set and children.
- Added strict Zod parsing for league/version scope, edition teams, group membership, matches, versioned format/ranking/requirement rules, complete persisted tie-group identity, and personal predictions. Cross-edition, cross-version, cross-prediction-set, malformed-rule, and incomplete initial-match payloads are errors rather than empty defaults.
- Added a pure domain readiness assessment. It checks configured team/group sizes, group membership, round-robin match counts, initial participants, versioned ranking/requirement data, and the existing best-third matrix without calculating standings, rankings, or a personal bracket.
- Ingested the factual initial catalog from the FIFA World Cup 2026 Match Schedule dated 12 July 2026: 48 teams, explicit groups A-L, four teams per group, and matches M1-M72 with stable participants, match number, matchday, 90-minute format, leg, sequence, and kickoff. The acquired PDF SHA-256 is `1FFA43834656742AA69B9D5B98F826052BBD26B2E353161F7FA83DC97416D4EB`; the PDF is not committed.
- Kept the migration as the single catalog authority. `seed.sql` invokes its idempotent helper after edition/version setup and does not duplicate the 48-team or 72-match payload. Material validation enforces the edition-specific 48/12/4/72/6/3 round-robin invariants without imposing World Cup cardinalities on other formats.
- Added generic same-edition foreign keys for stages, groups, rounds, and match participants, a stable FIFA-code constraint, distinct participants, and unique edition-scoped official match numbers. No results, standings, qualified teams, live state, players, or statistics are imported.
- C2B2 now produces `ready_for_resolver` only when initial catalog, versioned rules, prediction requirements, best-third matrix, and C2B1 bracket nodes/slots are materially available. The existing rules source metadata still labels those rules mock and is deliberately not renamed by the schedule provenance.
- Quick/Expert UUID controls remain non-interactive. No resolver, personal write RPC, automatic prediction-set initialization, scoring, trusted result ingestion, or mock fallback was added. C2B3 and C3 remain unauthorized.
- The two concurrent read RPCs now expose the same league, edition, format, ruleset, prediction-requirement, and scoring-preset envelope. The repository compares every field before constructing the workflow context and returns a retryable snapshot-mismatch error instead of combining data from different league-version states.
- Replaced permissive target-catalog mapping with a strict Zod boundary. UUIDs, positive integer fields, source payload discriminants, edition/version scope, node references, slot destinations, canonical best-third combinations, assignments, antepost definitions, and tie-break rows are validated before domain readiness is evaluated. Authorized empty protected sections remain valid.

## 2026-07-18 - Milestone 12 - UI Foundation and League Read Slice

- Evolved the existing Milestone 0 visual foundation instead of replacing the application shell or introducing a second design system.
- Added complete semantic light and dark palettes, with deep blue as the primary action color, turquoise as a supporting accent, and distinct success, warning, error, and information roles. Feature components remain free of raw color values.
- Kept theme selection system-driven for this milestone and made the resolver ready for a future explicit light, dark, or system preference without changing feature APIs.
- Standardized spacing, restrained radii, typography, borders, shadows, minimum touch targets, and responsive content width in shared tokens.
- Added reusable list, section-heading, loading, empty, error, card, button, header, badge, and screen primitives. Shared primitives do not import domain, Supabase, scoring, or trusted modules.
- Migrated the global Expo Router shell plus the Participants and Leaderboard screens as the first vertical slice. Their existing UUID/mock routing, read-only repositories, pagination, privacy fallback, stale-request guards, and leaderboard snapshot behavior are unchanged.
- Kept the scope deliberately small: Home, League Overview content, prediction entry, rules, profile, notifications, and remaining feature screens retain their current presentation for later authorized UI milestones.
- Added no new dependency; only SDK-required Expo patch versions were aligned. Added no backend change, schema change, migration, RLS/policy change, RPC, scoring path, trusted ingestion path, payment, betting, advertising, or sports-provider integration.
