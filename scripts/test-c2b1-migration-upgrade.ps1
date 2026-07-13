$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$container = "supabase_db_project-predicte"
$positiveFixture = Join-Path $root "tests/fixtures/c2b1_legacy_supported.sql"
$negativeFixture = Join-Path $root "tests/fixtures/c2b1_legacy_unsupported.sql"
$structuralMigration = Join-Path $root "supabase/migrations/20260712020000_milestone11j_c2b1_nullable_bracket_destination_schema.sql"
$catalogMigration = Join-Path $root "supabase/migrations/20260712021000_milestone11j_c2b1_versioned_bracket_destination_catalog.sql"
$constraintMigration = Join-Path $root "supabase/migrations/20260712022000_milestone11j_c2b1_bracket_destination_constraints.sql"
$primaryFailure = $null

function Invoke-Supabase([string[]] $Arguments) {
  $maximumAttempts = if ($Arguments.Count -ge 2 -and $Arguments[0] -eq "db" -and $Arguments[1] -eq "reset") { 3 } else { 1 }
  for ($attempt = 1; $attempt -le $maximumAttempts; $attempt++) {
    & npx supabase @Arguments
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -lt $maximumAttempts) {
      Write-Host "Supabase reset attempt $attempt failed; retrying after container recovery"
      Start-Sleep -Seconds 15
    }
  }
  throw "Supabase command failed after $maximumAttempts attempt(s): $($Arguments -join ' ')"
}

function Invoke-SqlFile([string] $Path) {
  Get-Content -Raw -LiteralPath $Path | docker exec -i $container psql -U postgres -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw "SQL file failed: $Path" }
}

function Query-Scalar([string] $Sql) {
  $value = docker exec $container psql -U postgres -d postgres -t -A -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "SQL assertion query failed" }
  return ($value | Out-String).Trim()
}

function Assert-Equal([string] $Label, $Actual, $Expected) {
  if ($Actual -ne $Expected) { throw "$Label mismatch: expected '$Expected', got '$Actual'" }
}

try {
  Write-Host "C2B1 positive upgrade fixture"
  Invoke-Supabase @("db", "reset", "--version", "20260712010000", "--no-seed")
  Invoke-SqlFile $positiveFixture
  Invoke-Supabase @("migration", "up", "--local")

  $legacy = Query-Scalar @"
select jsonb_build_object(
  'id',bs.id,'edition_id',bs.edition_id,'round_id',bs.round_id,'source_type',bs.source_type,
  'source_payload',bs.source_payload,'format_template_version_id',bs.format_template_version_id,
  'target_match_id',bs.target_match_id,'expected_target_match_id',n.target_match_id,
  'node_key',n.node_key,'target_side',bs.target_side,'target_leg',bs.target_leg,'slot_key',bs.slot_key
)::text from public.bracket_slots bs join public.format_template_match_nodes n on n.id=bs.target_node_id
where bs.id='10000000-0000-4000-8000-000000000099';
"@ | ConvertFrom-Json
  Assert-Equal "legacy id" $legacy.id "10000000-0000-4000-8000-000000000099"
  Assert-Equal "legacy edition" $legacy.edition_id "00000000-0000-4000-8000-000000000521"
  Assert-Equal "legacy round" $legacy.round_id "808fdaf5-6d32-487e-8e4d-59d6543ab6b5"
  Assert-Equal "legacy source type" $legacy.source_type "GROUP_POSITION"
  Assert-Equal "legacy source group" $legacy.source_payload.groupCode "A"
  Assert-Equal "legacy source position" $legacy.source_payload.position 1
  Assert-Equal "format version" $legacy.format_template_version_id "00000000-0000-4000-8000-000000000531"
  Assert-Equal "target match" $legacy.target_match_id $legacy.expected_target_match_id
  Assert-Equal "official node" $legacy.node_key "M79"
  Assert-Equal "target side" $legacy.target_side "home"
  Assert-Equal "target leg" $legacy.target_leg 1
  Assert-Equal "slot key" $legacy.slot_key "M79:home"

  Assert-Equal "node count" (Query-Scalar "select count(*) from public.format_template_match_nodes where format_template_version_id='00000000-0000-4000-8000-000000000531'") "32"
  Assert-Equal "node key coverage" (Query-Scalar "select count(*) from generate_series(73,104) n where exists(select 1 from public.format_template_match_nodes where node_key='M'||n)") "32"
  Assert-Equal "slot count" (Query-Scalar "select count(*) from public.bracket_slots where format_template_version_id='00000000-0000-4000-8000-000000000531'") "64"
  Assert-Equal "fixed slot count" (Query-Scalar "select count(*) from public.bracket_slots where format_template_version_id='00000000-0000-4000-8000-000000000531' and source_type<>'BEST_THIRD_MATRIX'") "56"
  Assert-Equal "conditional slot count" (Query-Scalar "select count(*) from public.bracket_slots where format_template_version_id='00000000-0000-4000-8000-000000000531' and source_type='BEST_THIRD_MATRIX'") "8"
  Assert-Equal "combination count" (Query-Scalar "select count(*) from public.format_template_best_third_combinations where format_template_version_id='00000000-0000-4000-8000-000000000531'") "495"
  Assert-Equal "assignment count" (Query-Scalar "select count(*) from public.format_template_best_third_assignments where format_template_version_id='00000000-0000-4000-8000-000000000531'") "3960"
  Assert-Equal "EURO mappings" (Query-Scalar "select count(*) from public.bracket_slots where edition_id='00000000-0000-4000-8000-000000000522'") "0"
  Assert-Equal "Champions mappings" (Query-Scalar "select count(*) from public.bracket_slots where edition_id='00000000-0000-4000-8000-000000000523'") "0"
  Assert-Equal "incomplete destinations" (Query-Scalar "select count(*) from public.format_template_match_nodes n left join public.bracket_slots bs on bs.target_node_id=n.id where n.format_template_version_id='00000000-0000-4000-8000-000000000531' group by n.id having count(bs.id)<>2") ""

  $snapshotSql = @"
select md5(jsonb_build_object(
 'nodes',(select jsonb_agg(jsonb_build_array(id,node_key,target_match_id) order by node_key) from public.format_template_match_nodes),
 'slots',(select jsonb_agg(jsonb_build_array(id,source_type,source_payload,target_node_id,target_side,target_leg,slot_key) order by id) from public.bracket_slots),
 'combinations',(select jsonb_agg(jsonb_build_array(id,combination_key,qualified_group_codes) order by id) from public.format_template_best_third_combinations),
 'assignments',(select jsonb_agg(jsonb_build_array(id,combination_id,target_node_id,target_side,winner_group_code,third_place_group_code) order by id) from public.format_template_best_third_assignments)
)::text);
"@
  $before = Query-Scalar $snapshotSql
  Query-Scalar "select public.populate_supported_bracket_destination_catalog('00000000-0000-4000-8000-000000000531'); select public.populate_world_cup_2026_best_third_matrix('00000000-0000-4000-8000-000000000531');" | Out-Null
  Query-Scalar "select public.populate_supported_bracket_destination_catalog('00000000-0000-4000-8000-000000000531');" | Out-Null
  $after = Query-Scalar $snapshotSql
  Assert-Equal "complete catalog idempotence signature" $after $before

  $constraints = Query-Scalar @"
select
  (to_regclass('public.bracket_slots_version_target_side_idx') is not null)::text||'|'||
  (exists(select 1 from pg_constraint where conname='bracket_slots_target_node_version_fkey'))::text||'|'||
  (exists(select 1 from pg_trigger where tgname='best_third_assignments_validate' and not tgisinternal))::text;
"@
  if ($constraints -ne "true|true|true") { throw "Final constraints are not active: $constraints" }

  Write-Host "C2B1 negative upgrade fixture"
  Invoke-Supabase @("db", "reset", "--version", "20260712010000", "--no-seed")
  Invoke-SqlFile $negativeFixture
  Invoke-SqlFile $structuralMigration
  Invoke-SqlFile $catalogMigration
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $failureOutput = (Get-Content -Raw -LiteralPath $constraintMigration |
    docker exec -i $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 | Out-String)
  $migrationExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($migrationExitCode -eq 0) { throw "Unsupported legacy mapping unexpectedly migrated" }
  $requiredDiagnostics = @(
    "Unresolved legacy bracket slot", "bracket_slot_id=20000000-0000-4000-8000-000000000099",
    "edition_id=20000000-0000-4000-8000-000000000521", "format_template_version_id=<null>",
    "round_id=20000000-0000-4000-8000-000000000030", "source_type=GROUP_POSITION",
    'source_payload={"position": 1, "groupCode": "Z"}'
  )
  if (@($requiredDiagnostics | Where-Object { $failureOutput -notlike "*$_*" }).Count -gt 0) {
    throw "Expected legacy diagnostic was not emitted: $failureOutput"
  }
}
catch {
  $primaryFailure = $_
}
finally {
  Write-Host "Restoring normal local database"
  try {
    Invoke-Supabase @("db", "reset")
  }
  catch {
    $message = "Final Supabase restore failed: $($_.Exception.Message)"
    if ($null -ne $primaryFailure) { $message = "$($primaryFailure.Exception.Message)`n$message" }
    throw $message
  }
}

if ($null -ne $primaryFailure) { throw $primaryFailure }
