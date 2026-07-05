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
