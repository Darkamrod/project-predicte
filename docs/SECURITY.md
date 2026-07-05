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

## Milestone 3 Rule and Scoring Security

Milestone 3 keeps scoring and rule lifecycle aligned with the server-authoritative model:

- mock rule edits require owner/admin role, league status `open`, server time before deadline, and draft rule status;
- locked rule versions reject point-value changes and keep a checksum snapshot;
- scoring recalculation consumes official result sets as inputs and does not trust device time for lock/deadline decisions;
- leaderboard snapshots and scoring breakdowns are derived from scoring events, not edited directly in UI components;
- no client write path was added for official results, scoring events, leaderboard snapshots, provider data, or provider secrets.

The implementation remains mock-only for official results. Real scoring execution should run through server-side jobs or RPCs in a future backend milestone so service-role access and audit logging stay outside the mobile client.

## Milestone 4 Persistence Security

Milestone 4 moves the complete prediction and scoring workflow onto RPC-backed Supabase persistence:

- prediction writes use `save_match_prediction`, `upsert_prediction_tiebreak_override`, `upsert_antepost_prediction`, and `update_prediction_set_completion`;
- each prediction RPC resolves the current user's active prediction set server-side and reuses `prediction_set_is_writable_by_current_user`;
- generated knockout match predictions are stored with `prediction_ref`, but still pass through the same league deadline and lock checks as real match predictions;
- scoring rule edits use owner/admin-only RPCs and require league status `open`, server time before deadline, and draft rule status;
- `lock_scoring_rule_snapshot` requires owner/admin and server time at or after deadline, locks prediction sets, and writes a checksum snapshot;
- `lock_due_leagues()` remains service-role only for scheduled locking;
- scoring events, scoring breakdown items, leaderboard snapshots, leaderboard entries, rule changes, and recalculation runs have read policies only. Prediction and rule client writes are performed through security-definer RPCs;
- `persist_scoring_recalculation` stores scoring output only for a locked league with a locked scoring rule snapshot. Milestone 5 narrows official execution to `service_role` so mobile clients cannot submit official scoring payloads.

The repository does not expose service-role credentials to the mobile client. Future automated result ingestion should run from a trusted backend worker that calls the same database contract or a narrower service-role-only variant.

## Milestone 5 Trusted Scoring Security

Milestone 5 makes the trusted backend worker the official scoring actor:

- the service-role key is used only by server code under `src/server/scoring` and is never read from Expo public environment variables;
- `record_trusted_result_ingestion` is service-role-only and writes `result_ingestion_runs` for accepted, scored, and failed server result payloads;
- `persist_scoring_recalculation` is revoked from `anon` and `authenticated` and granted only to `service_role`;
- direct client insert/update/delete grants are revoked for scoring events, leaderboard snapshots, leaderboard entries, scoring breakdown items, and recalculation runs;
- result payloads are validated before scoring and must use UTC timestamps and a matching `source_result_key`;
- the database still verifies locked league/rule state before accepting persisted scoring output.

Authenticated clients should read official results, leaderboard snapshots, and point breakdowns through RLS. They should not calculate or persist official standings.

## Milestone 6 Provider Import Security

Milestone 6 keeps provider import and official scoring persistence server-only:

- `record_provider_result_import` and `trusted_result_ingestion_exists` both require `auth.role() = 'service_role'`.
- provider raw payload references, sync runs, retry metadata, correction metadata, and result ingestion state are written by server code only.
- `src/server/scoring/supabaseScoringPersistenceRepository.ts` replaces the old client-service location for official scoring persistence.
- `trustedScoringRuntime.ts` validates the runtime request shape, while `trustedScoringRuntimeFactory.ts` is the only module that creates service-role Supabase dependencies.
- correction imports must reference an existing scored source result key before scoring can run. Missing or unscored corrections are recorded as failed provider imports.
- no provider credential, service-role key, or real sports-provider integration is added to the mobile client.

The mock fallback UX remains available, but it is not an authority for official Supabase scoring artifacts.
