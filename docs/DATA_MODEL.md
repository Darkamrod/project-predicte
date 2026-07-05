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

## Milestone 1.1 Local Seed

`supabase/seed.sql` now contains a minimum coherent local catalog for lifecycle testing:

- football sport and World Cup-style competition template;
- one enabled mock competition edition with maximum deadline;
- one group-stage stage, group, and round;
- four mock teams assigned to the edition;
- two mock group-stage matches;
- two antepost definitions;
- one active scoring preset linked to both the template and edition.

The seed is intentionally small. It exists so `create_private_league` can be exercised locally against an enabled edition and a valid scoring preset before Milestone 2 fills out the complete prediction workflow.

## Milestone 2 Prediction Workflow Model

Milestone 2 extends the TypeScript domain model without adding a new SQL migration:

- `MatchPrediction` now represents both group-stage and generated knockout predictions.
- `PredictionTiebreakOverride` stores an ordered set of teams for a group/stage scope when automatic tie-breaks cannot resolve predicted standings.
- `AntepostPrediction` stores team, player, or numeric antepost answers.
- `PredictionDependencyWarning` records bracket predictions that need review after upstream participants change.
- `PredictionCompletion` includes the next incomplete item so the UI can jump directly to it.

The existing Supabase tables already map to these concepts:

- `match_predictions`;
- `prediction_tiebreak_overrides`;
- `antepost_predictions`;
- `prediction_sets` completion counters.

Real persistence for generated bracket match identifiers and idempotent sync queues is deferred to the backend wiring milestone.

## Milestone 3 Scoring Model

Milestone 3 extends the TypeScript scoring model without adding a SQL migration:

- `OfficialTournamentResultSet` is the input boundary for official results used by scoring. The Milestone 3 implementation supplies a deterministic mock result set; real provider/import wiring remains future work.
- `ScoringRuleConfig` now includes `THIRD_PLACE` stage values and complete antepost values.
- `ScoringRuleChange` records stage and antepost rule edits in the mock league state.
- `UserScoringBreakdown` and `ScoringBreakdownItem` represent the UI-ready point breakdown generated from scoring events.

Existing Supabase tables already cover the future authoritative persistence path:

- `league_scoring_rule_versions` for draft and locked rule snapshots;
- `scoring_events` for detailed event rows;
- `leaderboard_snapshots` and `leaderboard_entries` for standings;
- `scoring_recalculation_runs` for future background/server recalculation metadata;
- `audit_log` as the likely storage path for rule-change history unless a future milestone introduces a dedicated history table.

`supabase/seed.sql` now uses the same scoring config shape as the TypeScript preset so locally created leagues do not start from a legacy preset payload.

## Milestone 4 Persistence Model

Milestone 4 adds the database fields and tables needed to persist the complete Milestone 2 and Milestone 3 workflow:

- `match_predictions.prediction_ref`: stable text key for generated knockout predictions. `match_id` is nullable and remains the FK path for real scheduled matches.
- `match_predictions.stage_code`, `home_team_id`, `away_team_id`, and `depends_on_prediction_refs`: metadata required to persist predicted bracket matches without hardcoding bracket structure in UI.
- `prediction_sync_status`: enum used by persisted match predictions, tie-break overrides, and antepost predictions.
- `prediction_tiebreak_overrides.updated_at` and unique `(prediction_set_id, scope_ref)`: enables safe upsert semantics.
- `league_scoring_rule_changes`: durable rule editor history for stage and antepost fields.
- `scoring_events.event_key` and `source_result_key`: stable idempotency keys for recalculation output.
- `leaderboard_snapshots.snapshot_key` and `source_result_key`: stable snapshot identity for one recalculation source.
- `scoring_breakdown_items`: persisted point breakdown rows linked to scoring events when available.
- `scoring_recalculation_runs.actor_user_id`, `source_result_key`, and `snapshot_id`: audit-friendly metadata for each recalculation request.

New RPCs own write access for the complete workflow:

- `save_match_prediction`;
- `upsert_prediction_tiebreak_override`;
- `upsert_antepost_prediction`;
- `update_prediction_set_completion`;
- `update_stage_scoring_rule_value`;
- `update_antepost_scoring_rule_value`;
- `lock_scoring_rule_snapshot`;
- `persist_scoring_recalculation`.

The mock TypeScript model remains the default local UX path. Supabase repositories map the same domain concepts into these RPCs when a real Supabase client is configured.

## Milestone 4.1 Recalculation Run Snapshot FK

`scoring_recalculation_runs.snapshot_id` now references `leaderboard_snapshots(id)` with `ON DELETE SET NULL`.

This preserves recalculation run rows as audit metadata while allowing `persist_scoring_recalculation` to replace the leaderboard snapshot for the same `source_result_key`. After a repeated recalculation, older runs can have `snapshot_id = null`; the latest successful run points at the current snapshot.

## Milestone 5 Result Ingestion Model

Milestone 5 adds the first trusted result-ingestion foundation:

- `result_ingestion_runs`: service-role-written audit rows for accepted, scored, or failed server-side result payloads.
- `result_ingestion_runs.source_result_key`: stable idempotency key shared with scoring events, leaderboard snapshots, breakdown rows, and recalculation runs.
- `result_ingestion_runs.correction_of_source_result_key`: optional pointer to the result source corrected by a later ingestion.
- `result_ingestion_runs.payload`: normalized mock/server-side result payload stored for audit and future retry/debug workflows.

`record_trusted_result_ingestion` is service-role-only and records ingestion state transitions. `persist_scoring_recalculation` remains the persistence RPC for derived scoring artifacts, but from Milestone 5 onward it is also service-role-only. Authenticated clients keep read access through RLS policies where appropriate; they do not insert, update, or delete scoring artifacts directly.

This keeps the database ready for future provider imports, corrections, retries, and result versioning without connecting a real sports-provider API in Milestone 5.
