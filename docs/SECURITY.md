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

## Milestone 7 Worker Deployment Security

Milestone 7 adds a deployable server entrypoint while keeping the client boundary unchanged:

- `supabase/functions/trusted-result-import/index.ts` reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Edge runtime environment only.
- The mobile app does not read service-role env vars and does not import `src/server/results` or server-side scoring persistence modules.
- `record_provider_result_import`, `trusted_result_ingestion_exists`, and `trusted_provider_retry_candidates` are service-role-only RPCs.
- `sync_runs` and `provider_payloads` now have explicit insert/update/delete revokes for `anon` and `authenticated`.
- The same explicit client write-deny posture is repeated for result ingestion runs, scoring events, leaderboard snapshots, leaderboard entries, scoring breakdown items, and recalculation runs.
- Authenticated RLS tests verify member-readable scoring artifacts, organizer-only result ingestion visibility, non-member denial, client write denial, and service-role-only RPC execution when local Supabase is available.

Retry metadata remains auditable and UTC-based. `failure_kind = 'retryable'` only means a trusted server process may retry the import later; it does not grant any client write capability.

## Milestone 7.1 Template and Snapshot Security

Milestone 7.1 treats competition templates as read-only catalog data for normal clients:

- `competition_families`, `format_template_versions`, `ruleset_versions`, `prediction_requirement_versions`, and `scoring_preset_versions` grant read access to authenticated users and revoke direct client writes.
- Leagues reference the selected version ids when created. The database can populate missing version ids from the selected edition to keep local seed flows coherent.
- When a league status changes to locked, the database captures a competition snapshot and checksum from the versioned catalog. Future catalog edits or superseded templates do not mutate locked league history.
- The snapshot contains configuration and metadata only. It does not expose service-role secrets, provider credentials, payment data, or real sports-provider integrations.

Official scoring and provider import RPCs remain service-role-only. Template versioning does not reintroduce any client path for writing scoring artifacts or provider payloads.

## Milestone 8.1 Tie-Break Persistence Security

Milestone 8.1 extends `upsert_prediction_tiebreak_override` with tie-group metadata but keeps the same write boundary:

- authenticated users can write only through the RPC for their own current prediction set;
- the RPC still rejects writes after deadline or lock through `prediction_set_is_writable_by_current_user`;
- direct delete remains unavailable to normal clients under the existing explicit RLS policy set;
- tie-group identity prevents one unresolved tie in a scope from overwriting another, without broadening access to other users' predictions.

No scoring, provider import, payment, advertising, betting, odds, wagering, gambling, or real sports API write path is added.

## Milestone 9 Tie-Break Data Integrity

Milestone 9 keeps the Milestone 8.1 tie-break write boundary but tightens the RPC payload contract:

- `upsert_prediction_tiebreak_override` now requires `ordered_team_ids` and `tied_team_ids` to contain the same teams.
- The RPC rejects extra teams and duplicate team ids before writing the override.
- Deadline, lock, current-user prediction set lookup, and authenticated-only execution remain unchanged.

This is a data-integrity hardening change, not a broader client write grant.

## Milestone 11B Scale Security Posture

Milestone 11B adds index-only scale readiness for larger private leagues. The current real reference scale is about 200 participants, and up to 500 participants is technical headroom rather than a new immediate requirement. It does not add new RLS policies, grants, RPCs, client-side scoring writes, trusted result ingestion paths, provider integrations, or service-role exposure.

The existing security boundary remains in force:

- members read only league-scoped data allowed by RLS;
- owner/admin-only lifecycle and rule operations still go through existing security-definer RPCs;
- official scoring events, leaderboard snapshots, leaderboard entries, scoring breakdowns, recalculation runs, result ingestion runs, and provider import runs remain non-writable by normal clients;
- trusted result ingestion and official scoring persistence remain server/service-role concerns.

The remaining scale risk is operational rather than authorization-related: dedicated paginated Supabase read repositories, UX pagination, query plans, and load tests remain future work. Future real Supabase member, leaderboard, and breakdown list screens should use paginated reads with league-scoped filters.

## Milestone 11C Paginated Read Security Posture

Milestone 11C adds read-only Supabase repository methods for league-scoped lists. They use existing authenticated RLS and Supabase `range()` pagination; they do not add write grants, policy changes, service-role usage, trusted result ingestion paths, or client-side official scoring.

The repository can read member rows, prediction summaries, leaderboard metadata/entries, and scoring breakdown rows that the database already exposes through RLS. It does not broaden profile visibility or create a new leaderboard persistence path.

## Milestone 11D League Preview Security Posture

Milestone 11D wires the first league overview preview to those read-only repository methods. It does not add new policies, grants, RPCs, service-role usage, trusted worker paths, result ingestion behavior, client-side official scoring, or leaderboard persistence.

Leaderboard preview reads are league-scoped: the UI asks for a league id, the repository resolves the latest snapshot for that league, and entries are paged from that snapshot. If no snapshot is visible through RLS, the UI shows an empty state instead of calculating standings locally.

## Milestone 11E League Read Screen Security Posture

Milestone 11E extends the same read-only posture to the dedicated participants and leaderboard routes. These screens use the public Supabase client and existing RLS only; they do not add service-role usage, policies, grants, RPCs, schema changes, trusted worker paths, result ingestion behavior, client-side official scoring, or leaderboard persistence.

The full leaderboard route still resolves the latest visible snapshot by `league_id` before paging entries. A missing snapshot is rendered as an empty state rather than a client-side recalculation.

## Milestone 11F Identity Presentation Security Posture

Milestone 11F improves identity readability without broadening data access. The mobile read screens still read only the league member and leaderboard rows exposed through existing RLS. They do not join `profiles`, read `auth.users`, read email fields, read user metadata/raw metadata, add profile visibility policies, or call service-role paths.

Current profile RLS remains owner-oriented, so complete display names and real avatars for other members require a future explicit policy or read model. Until then, the UI uses safe fallback labels and deterministic initials from already-visible user ids. Email-like values are rejected by the formatter.

No schema, migration, policy, grant, RPC, trusted worker, result ingestion, official scoring persistence, or leaderboard persistence behavior changes in this milestone.

## Milestone 11G Public Identity Security Posture

Milestone 11G adds a separate `public_user_profiles` read model instead of weakening `profiles` owner-only RLS. The read model contains minimal display fields only and excludes email, phone, auth metadata, raw metadata, external account identifiers, locale, timezone, and private profile fields.

The RLS policy is league-scoped rather than globally public: authenticated users can read their own public identity and identities for active users who share an active league. Normal clients receive `select` only and no insert, update, or delete grant on `public_user_profiles`.

A trigger synchronizes sanitized `profiles.display_name` into the public read model. The trigger is security-definer so clients do not need direct write access to the read model; it does not read `auth.users` or raw metadata. Avatar URLs remain null in Milestone 11G until a dedicated public-avatar decision exists.

The mobile app still uses the public Supabase client only. It does not expose service-role keys, does not call new RPCs, does not calculate official scoring or leaderboard state, and does not touch trusted result ingestion.

## Milestone 11H Prediction Completion Overview Security Posture

Milestone 11H composes existing read-only, league-scoped data in the mobile client. Before lock, existing RLS exposes only the current user's prediction set, so the client does not request or display global completion metrics and never treats hidden rows as missing. The persisted league lifecycle status, rather than device time, controls availability.

After lock, the overview reads active member ids, prediction-set summaries filtered to those ids, league status/deadline, and minimal public identities through the public Supabase client and existing RLS. Removed and inactive members are excluded from every aggregate. Reads are batched and remain scoped by `league_id`; no policy, grant, RPC, or profile visibility is widened.

The client does not read `profiles`, `auth.users`, email fields, raw/user/private metadata, or service-role credentials. It does not write prediction state, scoring events, leaderboard snapshots, result ingestion rows, policies, grants, RPCs, or schema. Completion counts are based on persisted `prediction_sets` completion fields and are not official scoring or leaderboard calculations.
