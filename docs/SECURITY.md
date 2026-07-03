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
