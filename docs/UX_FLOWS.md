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
