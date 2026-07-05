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

## Next Authorized Milestone

Milestone 8 should be defined by the next authorized prompt. Likely candidates are scheduled retry execution, remote Edge Function deployment automation, richer result correction UX/audit views, or a separately authorized real provider adapter.

Do not start Milestone 8 without explicit authorization.
