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
