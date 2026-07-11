# Roadmap

## Completed in Milestone 0

- Expo Router foundation.
- Token-based light and dark themes.
- Reusable base components.
- Mock World Cup-style competition seed.
- Mock create/join league flow.
- Fast group-stage prediction entry.
- Pure scoring engine and leaderboard snapshot.
- Initial Supabase structure and migration.
- Unit tests for scoring, locking, and leaderboard behavior.

## Completed in Milestone 1

- Supabase client and OAuth Auth adapter for Google and Apple.
- Profile service and auth state provider with mock fallback.
- Secure league lifecycle RPC definitions.
- Hashed invite token lifecycle.
- Role-aware owner/admin/participant server helpers.
- Server-side deadline and lock enforcement migration.
- RLS-equivalent domain tests and migration coverage tests.

## Completed in Milestone 1.1

- Local Supabase seed expanded for `create_private_league` lifecycle validation.
- Member lifecycle and prediction write helpers split into separate server-side gates.
- Draft leagues prevented from accepting invites, member changes, and prediction writes.
- Antepost and tiebreak override RLS policies made explicit for select, insert, and update.
- Invite join semantics tightened so invalid tokens are rejected before idempotent membership return.

## Completed in Milestone 2

- Complete mock prediction workflow for group stage, predicted standings, best third-placed qualifiers, knockout bracket, third-place match, final, and antepost.
- Tie-break override model and domain handling for unresolved predicted standings.
- Knockout prediction validation for 90-minute score, qualified team, extra time, and penalties.
- Dependency invalidation warnings for upstream group or knockout changes.
- Full validation and completion status with next missing prediction navigation.
- Sync-state surface for saved, syncing, synced, failed, and local unsynced prediction states.

## Completed in Milestone 3

- Complete configurable scoring engine for group, knockout, third-place final, final, advancement method, phase qualification, pairings, and antepost.
- Rule editor for stage and antepost point values with owner/admin, deadline, and lock guards.
- Immutable locked rule snapshots with checksum.
- Mock rule-change history.
- Detailed scoring events, idempotent tournament recalculation, leaderboard snapshots, and user point breakdowns.
- Supabase seed scoring preset aligned with the TypeScript config shape.

## Completed in Milestone 4

- Supabase migration for complete prediction persistence, including generated knockout prediction references.
- RPC-backed persistence for match predictions, tie-break overrides, antepost predictions, and prediction-set completion.
- Persistent rule editor changes, audit entries, locked rule snapshot checksum, and rule lock RPC.
- Idempotent scoring recalculation persistence keyed by `source_result_key`.
- Persistent scoring events, leaderboard snapshots, leaderboard entries, scoring breakdown rows, and recalculation run metadata.
- Supabase repository classes for predictions, rules, and scoring while preserving the mock fallback flow.
- RLS read policies for new derived tables and no direct client write policies for scoring artifacts.

## Completed in Milestone 4.1

- Recalculation run snapshot FK changed to `ON DELETE SET NULL`.
- Repeated recalculations with the same `source_result_key` can replace the leaderboard snapshot without historical run FK conflicts.
- Supabase runtime folders `.temp` and `.branches` are ignored.

## Completed in Milestone 5

- Trusted TypeScript server worker foundation for result ingestion and scoring execution.
- Zod validation for server-side official/mock result payloads.
- Service-role-only result ingestion audit via `result_ingestion_runs` and `record_trusted_result_ingestion`.
- Official scoring persistence narrowed to service-role execution; authenticated clients no longer execute scoring persistence.
- Server Supabase repository for trusted scoring persistence and result ingestion.
- Tests for server-side scoring execution, repeated idempotent source keys, result corrections, failed ingestion, RPC contracts, and static RLS/grant expectations.

## Completed in Milestone 6

- Structured mock provider result import via `MOCK_RESULTS`.
- Provider import worker that records accepted, scored, and failed states before and after trusted scoring.
- Service-role-only RPCs for provider import recording and correction-source lookup.
- Provider payload, sync run, retry, correction, and result ingestion metadata linked in Supabase.
- Supabase scoring context loader for competition, predictions, locked rules, existing events, and leaderboard context.
- Server-only scoring persistence repository moved out of `src/services`.
- Deployable-compatible TypeScript runtime boundary and server-only dependency factory.
- Tests for mock provider normalization, runtime parsing, retries, corrections, idempotency, context loading, static RPC grants, and client import boundaries.

## Completed in Milestone 7

- Supabase Edge Function wrapper for trusted mock provider import and scoring execution.
- Deno import map for shared server-side TypeScript modules.
- Explicit client write revokes for provider sync/payload tables and trusted scoring/runtime tables.
- Retry failure classification on sync and result-ingestion runs.
- Service-role-only retry candidate RPC for due provider import retries.
- Pure retry queue helpers for retryable/non-retryable classification and UTC due checks.
- Authenticated local Supabase RLS/grant tests for owner/admin/member/non-member/anon/service-role behavior where local Docker Supabase is available.
- Static tests for the Edge Function boundary, import map, server-only imports, secrets boundary, and ignored runtime paths.

## Completed in Milestone 7.1

- Versioned competition family, edition, format template, ruleset, prediction requirement, and scoring preset domain model.
- Initial templates for World Cup 2026, EURO 2028, and Champions League 2026/27.
- Future-edition versioning proof with a separate World Cup 2030 mock template that supersedes the 2026 format version.
- Data-driven bracket generation for group-stage tournaments, best thirds, league phase, Champions League-style playoffs, optional third-place finals, and configured stage legs.
- Mock create-league edition selection with immutable competition snapshot capture at lock.
- Supabase migration and seed data for versioned template catalog tables and edition version references.
- Tests for template shape, versioning, immutable snapshots, competition-specific scoring presets, prediction requirements, migration contracts, and seed contracts.

## Completed in Milestone 7.2

- Complete seeded versioned scoring presets for World Cup 2026, EURO 2028, Champions League 2026/27, and draft World Cup 2030 placeholder references.
- Complete seeded format stage payloads for World Cup, EURO, and Champions League lock snapshots.
- `create_private_league` updated to use edition-specific version references and reject incomplete scoring configs.
- `world_cup_2030` kept as a disabled future placeholder with draft version references instead of an enabled incomplete edition.
- Static tests added for seed scoring config parity, stage completeness, version-reference mapping, and the league creation contract.
- Mock provider operations now resolve competition context per league for multi-edition local demo safety.

## Completed in Milestone 8

- Mobile-first prediction entry now starts with Quick or Expert mode selection.
- Quick mode provides outcome buttons, score chips, manual `Altro` score entry, and swipe-compatible side selection while keeping visible accessible controls.
- Expert mode provides numeric score entry and explicit knockout draw resolution.
- The prediction workflow now uses a pure domain entry orchestrator for initial phase, tie-break overrides, knockout, derived antepost, manual antepost, review, and next-missing navigation.
- Tournament winner and finalists are derived from the predicted bracket; top scorer and top-scorer goals remain manual.
- Mock prediction updates preserve dependency warnings and automatically refresh derived antepost values.
- League-phase mock competitions receive initial predictions through the mock factory, and two-legged knockout stages are shown as documented aggregate placeholders.
- Tests cover Quick/Expert normalization, initial/knockout validation, extra time, penalties, two-legged placeholders, derived/manual antepost, tie-break routing, World Cup/EURO/Champions flows, and UI hardcode guards.

## Completed in Milestone 8.1

- Tie-break overrides now include stable tie-group identity so multiple unresolved ties in the same group, best-thirds ranking, or league-phase scope do not overwrite one another.
- Supabase persistence now stores tie-break `scope`, `tie_group_id`, `tied_team_ids`, and `affected_positions`, with a unique key on `(prediction_set_id, scope_ref, tie_group_id)`.
- Best-thirds ties that affect qualification or bracket placement require a dedicated override before impacted bracket slots are filled.
- World Cup, EURO, and Champions League bracket mapping strategies expose placeholder metadata for official matrix/draw rules that are not implemented yet.
- Prediction-entry navigation now recomputes the workflow after successful saves before jumping to the next missing item.
- Tests cover multiple tie groups in one scope, best-thirds tie overrides, Supabase RPC contract changes, migration contract changes, server-side context loading, and placeholder mapping metadata.

## Completed in Milestone 9

- Demo-ready Home/create-league flow with edition cards, format facts, phase labels, scoring preset context, and documented placeholder notes.
- Data-driven competition demo summaries in `src/domain/competitions/demoSummary.ts` so UI polish remains template-aware and avoids World Cup-specific hardcoding.
- Prediction workflow polish for mode selection, progress metrics, Quick mode cards, Expert mode score preview and +/- controls, target status/sync indicators, and clearer confirm progression.
- Tie-break UX now presents scope, affected positions, tied teams, and icon-based ordering for the exact `tieGroupId`.
- Antepost flow now keeps winner/finalists derived and read-only while validating positive top-scorer goals.
- Final review now includes completion metrics, missing/warning counts, bracket-derived facts, manual antepost values, edit, warning review, and local confirmation.
- Leaderboard now presents snapshot metadata, leader metrics, readable rank rows, and grouped breakdown by match/stage/antepost.
- Supabase tie-break RPC hardening now requires `ordered_team_ids` and `tied_team_ids` to be the same set and rejects duplicates.
- Tests cover demo summary generation, UI source contracts for demo surfaces, positive top-scorer goal completion, and the new tie-break exact-set migration contract.

## Completed in Milestone 10

- Prediction-entry UX hardened for mobile Quick and Expert modes while keeping scoring, ranking, bracket, and leaderboard authority out of UI components.
- Knockout single-leg entry uses the existing 90-minute score plus `qualifiedTeamId` and `advancementMethod`; no post-extra-time result or penalty-score fields were added.
- Demo/source tests guard the UI contract without introducing a fragile React Native e2e setup.

## Completed in Milestone 11A

- Knockout advancement derivation and prediction-entry completion status were extracted from `PredictionWorkflowScreen.tsx` into pure domain helpers in `src/domain/predictions/entryWorkflow.ts`.
- UI components now consume domain helpers for derived qualified teams, advancement method resolution, and target completion state.
- Domain tests cover home/away 90-minute wins, draw resolution requirements, initial-phase behavior, and absence of post-extra-time or penalty-score fields.

## Completed in Milestone 11B

- Added an index-only Supabase migration for private league scale readiness. The current real reference is about 200 participants per league; up to 500 participants is technical headroom, not an immediate requirement.
- Indexed active member, invite, prediction-set, latest leaderboard snapshot, scoring-event, scoring-breakdown, recalculation-run, and result-ingestion read paths.
- Kept RLS, RPCs, trusted result ingestion, official scoring persistence, prediction model, and product UX unchanged.
- Documented that the milestone is DB/index-level readiness only: paginated Supabase read repositories, UX pagination, query plans, and load tests remain future work.
- Kept the scope intentionally narrow to avoid overengineering before production traffic validates deeper optimization needs.

## Completed in Milestone 11C

- Added shared pagination helpers with safe defaults for client-side Supabase reads.
- Added a read-only Supabase league repository for members, invites, prediction summaries, leaderboard snapshots, leaderboard entries, and scoring breakdown items.
- Used a default page size of 50 and max page size of 100, matching the current about-200 participant reference scale while leaving up-to-500 participant technical headroom.
- Kept current mock-first screens unchanged; future real Supabase screens can consume the repository and add UX pagination without changing the data contract.
- Left schema, RLS, RPCs, trusted worker, result ingestion, official scoring persistence, and leaderboard persistence unchanged.

## Completed in Milestone 11D

- Connected the league overview to paginated read-only Supabase previews for league members and latest leaderboard entries.
- Added a safe latest-leaderboard-by-league repository read so UI code does not need to accept or trust arbitrary snapshot ids.
- Kept mock fallback for demo leagues and showed clear loading, empty, error, and load-more states for real Supabase reads.
- Preserved the 200-participant real reference scale and 500-participant headroom framing; full production UX pagination, query-plan review, and load tests remain future work.
- Left schema, RLS, RPCs, trusted worker, result ingestion, official scoring persistence, and leaderboard persistence unchanged.

## Completed in Milestone 11E

- Connected the full participants screen to paginated read-only Supabase member reads when a real UUID league and Supabase config are available.
- Connected the full leaderboard screen to latest-snapshot read-only Supabase entries without accepting arbitrary snapshot ids or calculating official standings client-side.
- Reused stale/unmount/load-more protections from the league overview preview path.
- Kept mock/non-UUID leagues on the existing demo flow and kept schema, RLS, RPCs, trusted worker, result ingestion, official scoring persistence, and leaderboard persistence unchanged.
- Left richer profile/display-name policy, query-plan review, load tests, and advanced production UX pagination as future work.

## Completed in Milestone 11F

- Added shared safe identity formatting for Supabase-backed participant and leaderboard rows.
- Improved real read screens with short user-id fallback labels, deterministic avatar initials, readable member role/status labels, position, points, and existing delta metadata.
- Kept profile enrichment conservative: no client profile join or metadata read was added because current profile RLS is owner-only.
- Rejected email-like identity values and kept email/private metadata out of the screen contracts.
- Preserved the 200-participant real reference scale and 500-participant technical headroom framing while leaving full profile visibility policy, query-plan review, and load tests as future work.

## Completed in Milestone 11G

- Added `public_user_profiles`, a minimal public identity read model scoped by league-member RLS.
- Kept `profiles` owner-only while exposing only sanitized public display fields needed by participants and leaderboard rows.
- Batch-loaded public identities in the read-only league repository so current pages avoid N+1 profile reads.
- Updated participants and leaderboard screens to prefer public display identity while preserving the 11F fallback labels.
- Kept email, auth metadata, service-role paths, official scoring, trusted ingestion, leaderboard persistence, payments, betting, advertising, Sportmonks, and real sports APIs out of scope.

## Completed in Milestone 11H

- Added a prediction completion overview to the league overview for real Supabase leagues and mock fallback leagues.
- Kept the global overview unavailable before lock so RLS-hidden prediction sets are not mislabeled as missing.
- Used read-only, league-scoped active-member and prediction-set summary data after lock to show separate complete, incomplete, missing, and locked metrics.
- Batched active-member ids and prediction-set reads without including removed/inactive members or introducing N+1 queries.
- Kept the action list paginated over loaded member pages with conservative page-level empty copy.
- Reused minimal public identities and safe fallback labels for the real overview.
- Kept client-side scoring, official leaderboard calculation, trusted ingestion, service-role paths, schema changes, RLS/policy changes, payments, betting, advertising, Sportmonks, and real sports APIs out of scope.
- Left query-plan review, load tests, advanced filters, and production-grade admin reporting as future work.

## Next Authorized Milestone

The next milestone should be defined by a future authorized prompt. Likely candidates remain official advancement matrix implementation, scheduled retry execution, remote Edge Function deployment automation, richer result correction UX/audit views, full leg-by-leg two-match knockout prediction support, or a separately authorized real provider adapter.

Do not start a later milestone without explicit authorization.

# Milestone 11I — completed scope

- Personal read-only prediction progress is available before and after lock.
- The compile/continue action is disabled once the persisted league lifecycle is locked or later.
- No automatic prediction-set creation and no pre-lock global aggregation were introduced.

## Completed in Milestone 11J-A - Safe Prediction Navigation and Capability Gating

- Added a single navigation adapter for personal prediction CTA labels and the existing `/league/[leagueId]/predictions` route.
- Kept route parameters limited to `leagueId`; authenticated identity still comes from the existing session/provider boundary.
- Connected editable mock prediction sets to the existing workflow and removed editing navigation after lock.
- Kept `not_started` and real Supabase workflows explicitly unavailable instead of creating prediction sets or simulating a working real-data workflow.
- Left a future authorized task to connect `PredictionWorkflowScreen` to an authenticated Supabase competition/prediction loader and the already-existing secure prediction RPC repository.
- Applied the same capability action to the generic `Pronostici` link and the personal card, preventing alternate navigation for `not_started`, locked lifecycle states, and real Supabase leagues without a loader.
- Milestone 11J-B is the explicit follow-up for the authenticated Supabase loader; end-to-end compilation for real UUID leagues is not part of 11J-A.

## Completed in Milestone 11J-B - Authenticated Supabase Prediction Loader

- Added independent route selection: non-UUID ids retain the complete mock workflow, while UUID ids use an authenticated Supabase loader with no mock fallback.
- Added deep-link guards for configuration, session, league visibility, active membership, persisted lifecycle, stale requests, user/league changes, and unmount.
- Loaded versioned league context, the session user's prediction set, persisted personal predictions, and edition matches through read-only, league-scoped queries.
- Kept locked/live/completed/archived states read-only and kept a missing prediction set explicit without automatic initialization.
- Did not connect the existing secure prediction RPCs because a complete authenticated target catalog/adapter is still missing. Full UUID Quick/Expert editing remains future work and must not reuse mock targets.
