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

## Next Authorized Milestone

Milestone 2 should complete the prediction workflow: all stages, standings, tie-break overrides, bracket generation, antepost, dependency invalidation, offline/sync states, and full validation.

Do not start Milestone 2 without explicit authorization.
