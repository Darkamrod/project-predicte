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
