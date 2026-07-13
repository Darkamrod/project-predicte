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

# Milestone 11I personal prediction privacy

Before lock, the overview requests only the authenticated user's prediction-set summary. The user id
comes from the active session adapter rather than route input, and the query is scoped by both league
and user. It performs no writes and reads no profiles, auth metadata, email, or other members' sets.

## Milestone 11J-A - Safe Prediction Navigation and Capability Gating

The personal CTA adapter builds the existing prediction route with `leagueId` only. It never accepts or serializes a user id, profile data, email, auth metadata, or prediction-set id. The authenticated identity remains owned by the existing session/provider boundary.

The current prediction workflow is mock-backed, so real Supabase navigation remains disabled with a clear message. `not_started` also remains disabled because there is no separate explicit initialization operation. The generic `Pronostici` link uses the same capability gating as the personal card and cannot bypass `not_started`, locked lifecycle states, or an unavailable Supabase workflow. Milestone 11J-A adds no Supabase writes, RPC calls, schema or policy changes, service-role paths, scoring, leaderboard persistence, trusted worker behavior, or result ingestion.

Milestone 11J-A does not provide end-to-end compilation for real UUID leagues. Milestone 11J-B introduces the authenticated Supabase loader while keeping editing disabled until every real target is safely available.

## Milestone 11J-B Authenticated Loader Security

The UUID route performs its own checks and does not rely on overview navigation. It requires configured
Supabase, an authenticated session, an RLS-visible league, and active membership. The route contains
only `leagueId`; the personal `userId` comes from the active session and scopes the prediction-set
query together with `league_id`. Child predictions are read only through the resulting set id.

The UUID loader reads no `profiles`, `auth.users`, email, auth metadata, private metadata, or
service-role credentials. It ignores stale responses after league/session changes or unmount. It uses
the persisted lifecycle rather than device time and exposes locked/later states as read-only.

Milestone 11J-B adds no mutation, migration, RLS policy, grant, RPC, trusted worker, result ingestion,
official scoring, or leaderboard persistence. Existing personal prediction RPCs remain disconnected
until the authenticated read-side can provide every target required by the full editor.

## Milestone 11J-C1 Adapter Foundation and Stop Condition

The authenticated loader reads edition-scoped stages, groups, rounds, matches, and referenced teams
through the public client and existing RLS. Its pure adapter does not read profiles, `auth.users`,
email, private metadata, or service-role credentials, and it never uses mock targets for UUID leagues.

Existing client authorization does not expose `bracket_slots` or
`competition_antepost_definitions`. The UUID screen therefore remains read-only and reports the
catalog gap. No personal prediction RPC is called, no direct insert/update/upsert/delete is added, and
no lifecycle or deadline decision is delegated to device time. This milestone does not alter schema,
migrations, RLS, policies, grants, RPCs, trusted ingestion, official scoring, or leaderboard
persistence.

Milestone 11J-C2A is the separately authorized secure catalog read phase. It adds only
league-scoped, version-bound access to bracket slots, antepost definitions, static tie-break rules,
and bracket source metadata, while retaining session identity, active-membership checks, and
authenticated read-side RLS tests. It must not connect personal write RPCs.

Milestone 11J-C3 is the later write phase. Only after 11J-C2B validation may it connect explicit
prediction-set initialization where authorized and the existing personal prediction RPCs, with
server-side lifecycle/deadline and authenticated write RLS verification. Until then Quick and Expert
remain unavailable for real UUID editing.

## Milestone 11J-C2A Secure Catalog RPC

`get_prediction_target_catalog(uuid)` is a stable, security-definer read function with explicit
`search_path = pg_catalog, public`. It accepts only `league_id`, obtains the caller from `auth.uid()`,
requires an active `league_members` row, and derives edition and version scope from the league. It
rejects mismatched format, ruleset, or prediction-requirement versions.

Execution is revoked from `PUBLIC` and `anon` and granted only to `authenticated`. The function
returns minimal bracket, antepost, and static tie-break catalog fields; it exposes no profiles, auth
metadata, provider data, administrative records, or service-role credentials. It performs no writes
and does not call personal prediction, scoring, leaderboard, result-ingestion, or trusted RPCs.

Authenticated RLS tests cover anonymous, outsider, removed-member, active-member, cross-league,
edition/version scope, privileges, and mutation-free behavior. C2A is complete as a secure read path.

Milestone 11J-C2B will separately define and validate destination mappings. It must preserve the same
league/version scope and minimum privileges, introduce no personal writes, and keep the UUID editor
disabled. C3 remains unauthorized until C2B proves mapping completeness and uniqueness.

## Milestone 11J-C2B Bracket Catalog Integrity

Bracket destinations remain immutable catalog data for normal clients. `anon` and `authenticated`
retain no insert/update/delete privilege. Foreign keys, checks, unique indexes, and the deterministic
`validate_bracket_slot_destination` trigger reject invalid sides, missing targets, duplicate
destinations/sources, cross-edition references, mismatched rounds, and incompatible format versions.

The existing authenticated RPC remains the only client read path and returns destination metadata only
after session-derived identity and active membership checks. No service-role credential, personal
prediction write, scoring operation, leaderboard persistence, official result, or trusted ingestion
path is introduced.

## Milestone 11J-C2B1 Upgrade Safety

Destination catalog writes remain administrative migration work. Normal `anon` and `authenticated`
roles have no insert/update/delete access, and the catalog population helpers have execution revoked.
Supported versions are selected by stable UUID and reconciled before final constraints. Unknown,
ambiguous, orphaned, cross-edition, or cross-version legacy rows stop the migration with diagnostics;
they are never hidden with placeholders.

The authenticated RPC remains read-only, accepts only `league_id`, derives identity from `auth.uid()`,
and requires active membership. C2B1 adds no personal RPC, service-role client path, scoring,
leaderboard, result-ingestion, or trusted mutation.

Bracket nodes, fixed slots, and conditional best-third rows are format-version scoped. Composite
foreign keys reject same-edition cross-version node or matrix references. The catalog tables have RLS
enabled and no direct grants to client roles; only the membership-scoped read-only RPC exposes the
league's selected version. EURO and Champions catalogs are not populated by C2B1.

The combination trigger rejects duplicate, empty, out-of-range, non-canonical, or semantically
duplicate group sets. Deferred assignment validation prevents an administrative transaction from
leaving a combination partially assigned. Population helpers remain revoked from client roles. RPC
tests cover authorized World Cup contents, denied users, and a league using another format version.

## Milestone 11J-C2B2 Authenticated Read Model

`get_authenticated_prediction_read_model(uuid)` is `SECURITY DEFINER` with an explicit
`pg_catalog, public` search path. It accepts only `league_id`, derives identity from `auth.uid()`,
requires active membership, validates that every selected version belongs to the league edition, and
derives the personal prediction set from the caller. `PUBLIC` and `anon` execution are revoked;
`authenticated` receives execute only.

The function performs no writes and returns no arbitrary user id, profile, email, auth metadata,
provider data, administrative metadata, service-role credential, or other member's prediction set.
Repository calls remain batch RPC reads and contain no personal save RPC. Tests cover anonymous,
non-member, removed-member, cross-league, active-member, session-personal isolation, version scope,
minimum grants, and absence of mutation paths.

The World Cup 2026 team/group/M1-M72 catalog is factual, static, and migration-owned. It contains no
results, live state, standings, qualified teams, players, or statistics. Same-edition composite foreign
keys and a revoked material validator reject cross-edition teams/groups, incomplete participants,
duplicate pairings, malformed FIFA codes, and incomplete official match numbering. The authenticated
RPC remains the only client path and returns the catalog only after active membership and league-version
checks.

`ready_for_resolver` is not a write capability. Quick/Expert UUID controls remain disabled; no personal
RPC, prediction-set initialization, service-role path, or trusted result ingestion is connected. The
schedule provenance does not relabel the separately versioned rules metadata, which remains marked mock.

Because the authenticated read model and protected target catalog are separate concurrent RPC calls,
each response includes the full league/version envelope. The client compares league, edition, format,
ruleset, prediction requirements, and scoring preset before using either response. A mismatch exposes no
identifiers in UI diagnostics, produces a retryable error, and cannot be interpreted as resolver
readiness. Strict target parsing provides defense in depth against malformed, orphaned, cross-edition,
or cross-version catalog rows; it does not add writes or broaden client grants.
