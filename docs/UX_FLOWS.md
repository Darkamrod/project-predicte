# UX Flows

Milestone 0 includes these mock flows:

1. Home shows the active mock league and primary create/join actions.
2. League overview shows competition, status, deadline, prediction progress, shortcuts, lock, and mock settlement actions.
3. Predictions show group-stage cards with plus/minus controls and quick score chips.
4. Group A predicted standings update from entered scores.
5. Leaderboard shows points, latest points, tied rank indicator, and position delta.
6. Participants show prediction visibility before and after lock.
7. Rules show editable draft fields and locked checksum after lock.
8. Profile allows theme mode switching.

The UI is intentionally compact and operational rather than marketing-oriented.

## Milestone 2 Prediction Workflow

The prediction route is now a single mobile-first workflow hub with these sections:

1. Gironi: fast 90-minute score entry, filters for all/incomplete/completed/Group A, quick chips, and existing autosave simulation.
2. Classifiche: all predicted group tables, unresolved tie indicators, and a mock tie-break override action.
3. Tabellone: generated knockout bracket from predicted qualifiers, with round of 32, round of 16, quarterfinals, semifinals, third-place match, and final.
4. Antepost: tournament winner, top scorer, and top-scorer goal total.
5. Riepilogo: final validation issues, predicted champion, sync-state visibility, and dependency warnings.

The primary action remains `Vai al prossimo mancante`; it moves the user to the section containing the next missing or invalid prediction item.

When a group or knockout edit changes downstream bracket participants, the app preserves existing predictions and shows explicit review warnings instead of silently deleting data.

## Milestone 3 Rules and Scoring UX

The rules route is now a full mock rule editor:

1. Owner/admin can edit stage point values and antepost point values while the league is open, before deadline, and before lock.
2. Participants or locked/late leagues see the same rules as read-only.
3. The screen shows rule version, checksum after lock, stacking summary, and recent mock rule-change history.

The leaderboard route now includes a points breakdown for the current user. The breakdown is produced by the scoring domain and grouped by event scope:

1. Match events: 1/X/2, exact score, extra-time method, penalty method.
2. Phase events: group position, stage qualification, and correct pairing.
3. Antepost events: tournament winner, top scorer, and top-scorer exact goals.

The mock result action recalculates events and leaderboard snapshots through the Milestone 3 engine. Repeating a recalculation for the same source result version is idempotent.

## Milestone 4 Persistence UX Impact

Milestone 4 does not change the visible mock-first UX. It adds Supabase repositories behind the complete prediction, rule, scoring, and leaderboard concepts so the same flows can be backed by real persistence when Supabase is configured.

The existing mock screens still simulate saved/synced states locally. Real sync error handling can now use the repository-level RPC failures without moving database logic into UI components.

## Milestone 7.1 Multi-Competition Create League Flow

The home route now exposes a compact mock edition selector before league creation:

1. The user chooses from the seeded football editions.
2. Creating a league stores the selected `competitionEditionId` and uses the edition's version bundle for format, prediction requirements, and scoring preset.
3. The active-league summary shows the selected competition display name and family metadata.
4. Locking a mock league captures an immutable competition snapshot and checksum.

The prediction workflow remains data-driven. It renders group-stage sections only when the selected competition has groups, generated bracket rounds only when they exist, optional third-place finals only when configured, and antepost fields from the edition requirements. The screen does not describe template mechanics in product copy; the technical details stay in domain configuration and documentation.

## Milestone 7.2 Multi-League Mock Context

The mock provider now resolves the competition context from each league's `competitionEditionId` when predictions are edited, dependency warnings are cleared, rules are locked, or mock results are settled. This keeps local demo leagues for different editions from accidentally using the last selected global competition context.

The create-league screen still uses one compact edition selector. Separate controls for sport, competition family, edition, and regulation preset are intentionally deferred so Milestone 7.2 stays focused on the blocking seed and creation contract fixes.

## Milestone 8 Prediction Entry UX

The prediction route now starts with `Come vuoi compilare?` and stores a local workflow mode:

1. `Modalita Semplificata`: large match cards, outcome buttons, score chips, an `Altro` manual score path, and swipe-compatible side selection. Initial group/league-phase predictions do not expose qualified team, extra time, or penalties.
2. `Modalita Esperto`: numeric score inputs for every match. Knockout non-draws derive the qualified team and regulation method; knockout draws require an explicit qualified team plus extra time or penalties.

Both modes write the same typed prediction model. The user can change mode before final confirmation without changing the stored data shape.

The guided order is:

1. initial phase, either group stage or league phase depending on the selected edition;
2. unresolved predicted standings, where the user can manually order tied teams before the bracket;
3. generated knockout bracket;
4. derived antepost facts such as winner and finalists;
5. manual antepost fields for top scorer and top-scorer goals;
6. final review and local confirmation.

The `Mancante` action jumps to the next domain-reported missing or invalid item. Dependency warnings are still explicit and never delete downstream predictions silently.

Two-legged knockout rounds, currently used by the Champions League mock template, are shown as an aggregate placeholder. The UI records one aggregate score, qualified team, and advancement method; leg-by-leg entry and aggregate-away-goal-style edge cases are deferred until a dedicated future milestone.

## Milestone 8.1 Prediction Entry Corrections

Tie-break steps now represent a specific tied-team group, not only a broad scope such as `group:A`. If a group table has two independent ties, the workflow shows and saves two distinct ordering tasks.

Best-thirds ties that affect qualification or bracket placement are also routed through the tie-break step. Until official World Cup/EURO best-third mapping matrices are implemented, the generated bracket marks these mappings as placeholder metadata and leaves impacted slots undefined when the ranking tie is unresolved.

After a successful match, tie-break, or knockout save, the screen waits for the updated workflow state and then jumps to the next missing target. This keeps `Mancante` and automatic progression aligned with newly resolved ties or newly generated bracket matches.

Champions League two-leg and playoff mapping remains an aggregate placeholder in the UI. The template exposes league-phase and playoff structure, but leg-by-leg entry and official seeded draw behavior remain future authorized work.

## Milestone 9 Demo Flow Hardening

The main demo flow is now optimized for a mobile walkthrough:

1. Home shows a compact edition-driven create-league panel with sport, family, edition, scoring preset, ruleset version, format facts, phase labels, and placeholder notes.
2. Creating a mock league keeps using the selected competition edition and opens the league flow without requiring real Supabase credentials.
3. The prediction route keeps the Quick/Expert mode choice, but now shows competition facts and a clearer progression header with completed items, missing items, tie-break count, bracket count, and manual antepost count.
4. Quick mode keeps large team cards, outcome buttons, score chips, `Altro`, and a visible confirm action. Swipe remains additive; tap controls remain the accessible path.
5. Expert mode now shows a central score preview and touch-friendly +/- controls around numeric inputs.
6. Tie-break steps show the scope, affected positions, tied teams, and icon controls for ordering the specific `tieGroupId`.
7. Antepost shows derived winner/finalists as read-only facts and asks only for top scorer and positive top-scorer goals.
8. The final review shows mode, completion, missing count, warning count, derived bracket facts, manual antepost values, edit, warning review, and local confirmation.
9. Leaderboard shows snapshot state, participants, leader, leader points, rank rows, and grouped point breakdown for match/stage/antepost scopes.

World Cup 2026 is the strongest demo path. EURO 2028 is usable with the documented best-thirds mapping placeholder. Champions League remains useful to demonstrate versioned multi-competition support, but two-legged rounds and seeded draw/playoff behavior stay aggregate/placeholder until a later authorized milestone.

## Milestone 9.1 Demo Cleanup

The Home summary now displays scoring preset and ruleset labels from the domain demo summary instead of leaving that context only in documentation. The final prediction review no longer repeats the mode or shows the old `Partite compilate` count; completion is represented by the normalized completed/required and missing counters.

## Milestone 11D League Overview Previews

The league overview now shows compact participant and leaderboard previews. Demo leagues still use in-memory mock state; real Supabase league ids use paginated read-only repository calls with loading, empty, error, and load-more states. The leaderboard preview only shows existing snapshots and never calculates official standings in the UI.

The full participants and leaderboard routes remain mock-first for Milestone 11D. The real Supabase integration is intentionally limited to the overview previews, which ignore stale responses if the user leaves the screen, changes league quickly, or taps load more more than once.

## Milestone 11E Full League Read Screens

The dedicated participants and leaderboard routes now use the same paginated Supabase read path for real UUID leagues. Mock leagues keep the demo flow. Both real screens show loading, empty, error, load-more, and end-of-list states. The leaderboard route only displays an existing latest snapshot; if none exists, it shows an empty state instead of calculating standings in the client.

## Milestone 11F Readable Identity Fallbacks

Supabase-backed participants and leaderboard rows now show a shared safe identity presentation: display name if a future safe read model provides it, username if available, otherwise a short fallback such as `Utente abcd1234`. Rows also show avatar initials derived from the safe label or user-id fallback, plus role/status for participants and position/points/delta where leaderboard data already exists.

The MVP still avoids profile joins for other members because current profile visibility is not public to league members. Mock leagues keep their richer demo names and avatars. The real read screens remain read-only, paginated, and suitable for the current about-200 participant reference scale with 500 as technical headroom.

## Milestone 11G Minimal Public Identities

Real Supabase participants and leaderboard rows now prefer the minimal public identity read model when a league member is allowed to read it. If the public row is missing or filtered by RLS, the same `Utente abcd1234` fallback remains in place.

This improves readability without turning profiles into a public directory. The UI still avoids email, metadata, global profile search, client-side scoring, and leaderboard calculation.

## Milestone 11H Prediction Completion Overview

The league overview now includes an `Avanzamento pronostici` card. Before lock, it shows that global progress will become available after predictions are blocked; it does not infer missing users from prediction sets hidden by RLS. Mock leagues keep a clear fallback without changing the rest of the demo flow.

After lock, real Supabase leagues show separate complete, incomplete, without-prediction, and locked metrics calculated from active members only. The detail list filters non-complete users from member pages already loaded, so its empty text is page-specific and load more may reveal additional users; it is not a dedicated server-side incomplete-only query. The card shows league status/deadline when visible and keeps load-more/error/empty states. It does not calculate scores, standings, brackets, or official leaderboard data in the client.

# Milestone 11I — I miei pronostici

For real Supabase leagues, the overview shows the authenticated user's persisted completion state,
missing count, progress, deadline and a compile/continue CTA before lock. After lock the same personal
state remains readable but editing is disabled, alongside the post-lock global overview. No state of
other members is exposed or inferred before lock.

## Milestone 11J-A - Safe Prediction Navigation and Capability Gating

The `I miei pronostici` card uses one CTA contract: incomplete mock sets open `Continua compilazione`, complete editable mock sets open `Modifica pronostici`, and locked states expose no editing action. The route carries only the current `leagueId`.

`Not started` displays a disabled `Compila pronostici` action because no explicit prediction-set initialization path exists. Real Supabase leagues also display the appropriate disabled label and an explicit message because the existing prediction workflow is still mock-backed. The UI does not silently navigate to a broken screen, create prediction sets, or claim that real persistence is connected.

The generic `Pronostici` link uses the same capability gating as the personal card. It cannot bypass `not_started`, locked lifecycle states, or an unavailable real Supabase workflow; when navigation is unavailable it renders as a non-interactive card with the resolver message.

Milestone 11J-A covers safe navigation and capability gating only. Milestone 11J-B introduces the authenticated Supabase loader, while full UUID editing remains unavailable until the real target adapter is complete.

## Milestone 11J-B - Authenticated Supabase Prediction Loader

The prediction route now selects its data source from the league id. Demo ids continue to open the
existing Quick/Expert mock workflow unchanged. A valid UUID opens a separate Supabase screen and never
falls back to mock competition or prediction data.

The UUID screen covers loading, missing configuration, missing session, inaccessible league, retryable
errors, missing prediction set, insufficient target data, and persisted locked/read-only lifecycle
states. It shows the real league, edition/version context, persisted completion counters, and the count
of personal match predictions already loaded.

Quick/Expert controls are not shown for UUID leagues yet. The authenticated client read-side does not
currently expose a complete target catalog for bracket and antepost editing, so presenting the mock
workflow would be misleading. A missing prediction set is reported explicitly and never created on
route open. Existing secure write RPCs remain unused until the real target adapter is complete.

## Milestone 11J-C1 - Authenticated Prediction Target Adapter Foundation

For UUID leagues, the screen now derives ordered match targets and progress from real edition stages,
groups, rounds, matches, teams, and persisted personal match predictions. Quick and Expert are planned
to consume this same normalized collection; they are not separate data models.

The screen remains read-only because the authorized catalog cannot currently supply bracket slots or
antepost definitions. It explains the missing catalog capability instead of opening a partial editor,
using mock placeholders, or saving incomplete data. Tie-break editing, manual antepost fields, derived
bracket progression, two-leg knockout editing, and every write RPC remain unavailable for UUID leagues.

Milestone 11J-C2A adds the secure, league/version-scoped read path for bracket slots, antepost
definitions, static tie-break rules, and bracket source metadata, with authenticated read-side RLS
tests and no writes. Milestone 11J-C3 may then connect explicit initialization and the existing
personal write RPCs only after C2B. The real UUID Quick/Expert workflow remains non-interactive until
the later milestones are completed and validated.

## Milestone 11J-C2A - Secure Prediction Target Catalog Read Path

The UUID screen now loads the protected bracket, antepost, and tie-break catalog through one
authenticated league-scoped read operation and can display catalog counts alongside real persisted
progress. Empty catalog arrays are distinct from access or query errors.

This does not make the workflow editable. The current bracket records describe participant sources
but do not identify a destination match side, so the UI continues to show a conservative blocker.
Quick and Expert remain non-interactive, no initialization/save CTA is shown, and no personal write
RPC is connected.

Milestone 11J-C2B will add the versioned destination mapping needed to place each source into a target
match and participant position without ambiguity. It will first evaluate the schema options, support
the required single-leg demo path without hardcoding one competition, and retain room for future
two-leg formats. Quick/Expert and all personal writes remain unavailable until C2B is validated and a
separate C3 milestone is authorized.

## Milestone 11J-C2B - Versioned Bracket Destination Mapping

The authenticated read model can identify the versioned bracket node, target match, home/away side,
leg, slot key, and participant source. World Cup 2026 uses the official fixed FIFA bracket plus the
separate 495-row conditional best-third matrix. EURO ingestion is deferred; Champions League remains
blocked because two-leg aggregate behavior is not supported.

The UUID screen may show destination mapping counts and conservative diagnostics. It still does not
render editable Quick/Expert controls, initialize prediction sets, or expose save actions. Personal
participants must ultimately come from the user's predicted standings and match advancement, never
from official results; unresolved rankings and prior predictions remain blockers.

### C2B1 scope

C2B1 makes the destination catalog upgrade-safe through separate nullable-structure, official-data,
and final-constraint migrations. The World Cup 2026 mapping is migration-owned and derived from FIFA
Articles 12.6-12.11 plus Annexe C; the seed only requests idempotent reconciliation. EURO catalog
ingestion is future work. Unsupported legacy rows produce diagnostics and Champions two-leg remains
blocked. C2B2, C2B3, and C3 are not started, personal participants remain unresolved, and UUID
Quick/Expert entry remains read-only.

The read-only UUID diagnostics consume all bracket catalog sections returned in one batch: versioned
nodes, source slots, and conditional best-third combinations with assignments. Malformed sections are
errors rather than silently becoming empty. No participant resolver, initialization, or save control
is enabled by C2B1.

This changes no interaction capability. UUID Quick/Expert remains read-only with no initialization or
save action. C2B2 will complete the authenticated inputs and C2B3 will resolve personal participants
before any separately authorized C3 write integration.
