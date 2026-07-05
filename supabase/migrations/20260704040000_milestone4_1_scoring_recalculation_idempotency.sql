do $$
declare
  existing_constraint_name text;
begin
  select c.conname
  into existing_constraint_name
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid
   and a.attnum = any(c.conkey)
  where c.conrelid = 'public.scoring_recalculation_runs'::regclass
    and c.contype = 'f'
    and c.confrelid = 'public.leaderboard_snapshots'::regclass
    and a.attname = 'snapshot_id'
  limit 1;

  if existing_constraint_name is not null then
    execute format(
      'alter table public.scoring_recalculation_runs drop constraint %I',
      existing_constraint_name
    );
  end if;

  alter table public.scoring_recalculation_runs
    add constraint scoring_recalculation_runs_snapshot_id_fkey
    foreign key (snapshot_id)
    references public.leaderboard_snapshots (id)
    on delete set null;
end $$;

comment on constraint scoring_recalculation_runs_snapshot_id_fkey
on public.scoring_recalculation_runs
is 'Milestone 4.1: historical recalculation runs keep audit metadata but release snapshot references when an idempotent source_result_key recalculation replaces the leaderboard snapshot.';
