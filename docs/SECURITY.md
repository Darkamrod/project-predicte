# Security Notes

Milestone 0 is mock-only, but the schema and domain follow server-authoritative rules:

- prediction writes must be rejected after deadline or lock;
- scoring rules become immutable after lock;
- members can only see other participants' predictions after league lock;
- official results, scoring events, and leaderboard snapshots are not client-writable in the target architecture;
- provider payloads and secrets are not exposed to the mobile client.

The initial migration enables RLS and adds representative read policies plus trigger guards. Full policy coverage and integration tests are Milestone 1 work.

## Milestone 1 Security Model

Milestone 1 adds a second migration with:

- profile creation trigger on `auth.users`;
- helper functions for active membership and owner/admin role checks;
- hashed invite tokens using `pgcrypto.digest`;
- security-definer RPCs for creating leagues, creating invites, joining by invite, changing member roles, removing members, updating deadlines, and locking due leagues;
- prediction visibility policies: users can read their own predictions before lock, while active league members can read all predictions only after lock;
- write policies and triggers that reject prediction writes after deadline or lock;
- immutable locked scoring rule behavior;
- `lock_due_leagues()` reserved for service-role/scheduled execution.

Client code must use the anon key only. Service-role credentials remain server-only.

## Milestone 1.1 Hardening

Milestone 1.1 narrows lifecycle checks after the Milestone 1 review:

- `league_accepts_members(league_id)` is the only database helper for invite creation, role changes, and member removal. It returns true only while the league is `open` and before the server deadline.
- `league_accepts_predictions(league_id)` is the only database helper for prediction-set and prediction-item writes. It returns true only while the league is `open` and before the server deadline.
- The older combined member/prediction write helper is dropped by the hardening migration after dependent functions and policies are replaced.
- `prediction_tiebreak_overrides` and `antepost_predictions` now have explicit RLS policies for `select`, `insert`, and `update`. The client has no `delete` policy for these tables in Milestone 1.1.
- `join_league_by_invite` validates revoked, expired, full, and deadline-closed tokens before returning an existing active membership. Idempotent joins are allowed only when the presented invite token is still valid.

The local seed remains mock-only and does not grant client writes to official results, scoring events, leaderboard snapshots, provider payloads, or provider sync tables.
