-- Milestone 11B: private league scale readiness indexes.
-- Target: keep league-member, leaderboard, and scoring read paths ready for
-- the current real reference scale of about 200 participants, with up to
-- 500 participants as technical headroom without changing product behavior.

create index if not exists league_members_m11b_active_league_role_idx
on public.league_members (league_id, role, user_id)
where status = 'active';

create index if not exists league_invites_m11b_league_created_idx
on public.league_invites (league_id, created_at desc);

create index if not exists prediction_sets_m11b_league_status_user_idx
on public.prediction_sets (league_id, status, user_id);

create index if not exists match_predictions_m11b_set_updated_idx
on public.match_predictions (prediction_set_id, updated_at desc);

create index if not exists leaderboard_snapshots_m11b_league_latest_idx
on public.leaderboard_snapshots (league_id, created_at desc, id desc);

create index if not exists scoring_events_m11b_source_user_idx
on public.scoring_events (league_id, source_result_key, participant_user_id);

create index if not exists scoring_breakdown_items_m11b_source_user_scope_idx
on public.scoring_breakdown_items (league_id, source_result_key, participant_user_id, scope);

create index if not exists scoring_recalculation_runs_m11b_league_started_idx
on public.scoring_recalculation_runs (league_id, started_at desc);

create index if not exists result_ingestion_runs_m11b_league_created_idx
on public.result_ingestion_runs (league_id, created_at desc);

comment on index public.league_members_m11b_active_league_role_idx
is 'Milestone 11B: supports active member listing and organizer role checks for larger private leagues.';

comment on index public.league_invites_m11b_league_created_idx
is 'Milestone 11B: supports organizer invite lists scoped to one league.';

comment on index public.prediction_sets_m11b_league_status_user_idx
is 'Milestone 11B: supports per-league prediction completion summaries without changing prediction data shape.';

comment on index public.match_predictions_m11b_set_updated_idx
is 'Milestone 11B: supports per-user prediction-set reads and sync-status inspection.';

comment on index public.leaderboard_snapshots_m11b_league_latest_idx
is 'Milestone 11B: supports fetching the latest leaderboard snapshot for a league.';

comment on index public.scoring_events_m11b_source_user_idx
is 'Milestone 11B: supports source-result scoped scoring event reads for trusted recalculation inspection.';

comment on index public.scoring_breakdown_items_m11b_source_user_scope_idx
is 'Milestone 11B: supports per-user point breakdown reads for one source-result snapshot.';

comment on index public.scoring_recalculation_runs_m11b_league_started_idx
is 'Milestone 11B: supports organizer audit/history reads for scoring recalculation runs.';

comment on index public.result_ingestion_runs_m11b_league_created_idx
is 'Milestone 11B: supports organizer audit/history reads for trusted result ingestion runs.';
