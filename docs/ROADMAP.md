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

## Next Authorized Milestone

Milestone 5 should be defined by the next authorized prompt. Likely candidates are trusted server execution for scoring, result ingestion/import workflow, richer Supabase integration tests with authenticated users, and production-ready background recalculation plumbing.

Do not start Milestone 5 without explicit authorization.
