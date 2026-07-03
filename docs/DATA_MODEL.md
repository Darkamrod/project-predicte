# Data Model

Milestone 0 models the concepts required by the master specification:

- identity: `profiles`, `push_tokens`;
- competition catalog: sports, templates, editions, stages, groups, rounds, teams, players, matches, bracket slots, tiebreak rules, antepost definitions;
- provider diagnostics: mappings, payloads, sync runs, result versions;
- leagues: leagues, members, invites;
- rules: scoring presets and league scoring rule versions;
- predictions: prediction sets, match predictions, tiebreak overrides, antepost predictions;
- scoring: scoring events, leaderboard snapshots, entries, recalculation runs;
- operational: audit log, notifications, feature flags.

The mock app uses TypeScript in-memory data with the same conceptual boundaries. Supabase migrations prepare the database shape for later server-authoritative milestones.

## Milestone 1 Lifecycle Tables

Milestone 1 keeps the Milestone 0 schema and hardens access around:

- `profiles`: automatically created from `auth.users` and editable only by the owner.
- `leagues`: created through `create_private_league`.
- `league_members`: managed through role-aware RPCs.
- `league_invites`: stores hashed tokens only; plain tokens are returned once by `create_league_invite`.
- `prediction_sets`, `match_predictions`, `prediction_tiebreak_overrides`, `antepost_predictions`: readable by owner before lock and by league members after lock; writable only by the prediction owner before the server deadline.

Direct client writes to scoring events, leaderboard snapshots, provider payloads, or official results remain unavailable.
