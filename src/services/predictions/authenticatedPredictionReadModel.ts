import { z } from "zod";

const uuidSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const positiveIntegerSchema = z.number().int().positive();
const nullableUuidSchema = uuidSchema.nullable();

const rankingRuleCodeSchema = z.enum([
  "points",
  "head_to_head_points",
  "head_to_head_goal_difference",
  "goal_difference",
  "goals_for",
  "wins",
  "disciplinary",
  "drawing_of_lots",
  "coefficient"
]);

const templateStageSchema = z
  .object({
    code: nonEmptyStringSchema,
    kind: z.enum([
      "group_stage",
      "best_thirds_ranking",
      "league_phase",
      "knockout_single_leg",
      "knockout_two_leg",
      "final_single_leg",
      "third_place_final",
      "antepost"
    ]),
    name: nonEmptyStringSchema,
    tieMode: z.enum(["single_leg", "two_leg"]).optional()
  })
  .strict();

const rankingRuleSetSchema = z
  .object({
    code: nonEmptyStringSchema,
    rules: z.array(rankingRuleCodeSchema).min(1)
  })
  .strict();

const groupStageFormatSchema = z
  .object({
    teamCount: positiveIntegerSchema,
    initialStageKind: z.literal("group_stage"),
    groupCount: positiveIntegerSchema,
    teamsPerGroup: positiveIntegerSchema,
    automaticQualifiersPerGroup: nonNegativeIntegerSchema,
    bestThirdPlacedTeams: nonNegativeIntegerSchema,
    knockoutRounds: z.array(nonEmptyStringSchema)
  })
  .strict();

const leaguePhaseFormatSchema = z
  .object({
    teamCount: positiveIntegerSchema,
    initialStageKind: z.literal("league_phase"),
    leaguePhase: z
      .object({
        tableSize: positiveIntegerSchema,
        matchesPerTeam: positiveIntegerSchema,
        homeMatchesPerTeam: positiveIntegerSchema,
        awayMatchesPerTeam: positiveIntegerSchema
      })
      .passthrough(),
    bestThirdPlacedTeams: nonNegativeIntegerSchema,
    knockoutRounds: z.array(nonEmptyStringSchema)
  })
  .strict();

const officialRulesSourceSchema = z.object({ label: nonEmptyStringSchema }).passthrough();

const formatTemplateSchema = z
  .object({
    id: uuidSchema,
    version: nonEmptyStringSchema,
    status: nonEmptyStringSchema,
    official_rules_source: officialRulesSourceSchema,
    format: z.discriminatedUnion("initialStageKind", [
      groupStageFormatSchema,
      leaguePhaseFormatSchema
    ]),
    stages: z.array(templateStageSchema).min(1),
    ranking_rule_sets: z.array(rankingRuleSetSchema).min(1),
    bracket_mapping_strategy: nonEmptyStringSchema
  })
  .strict();

const rulesetSchema = z
  .object({
    id: uuidSchema,
    version: nonEmptyStringSchema,
    status: nonEmptyStringSchema,
    official_rules_source: officialRulesSourceSchema,
    rules_payload: z
      .object({ family: nonEmptyStringSchema, placeholder: z.boolean().optional() })
      .strict(),
    ranking_rule_set_codes: z.array(nonEmptyStringSchema).min(1)
  })
  .strict();

const predictionRequirementCodeSchema = z.enum([
  "MATCH_SCORE",
  "GROUP_STANDINGS",
  "LEAGUE_PHASE_STANDINGS",
  "BEST_THIRDS",
  "KNOCKOUT_QUALIFIER",
  "KNOCKOUT_ADVANCEMENT_METHOD",
  "TOURNAMENT_WINNER",
  "FINALISTS",
  "TOP_SCORER",
  "TOP_SCORER_GOALS"
]);

const versionSchema = z
  .object({ id: uuidSchema, version: nonEmptyStringSchema, status: nonEmptyStringSchema })
  .strict();

const readModelSchema = z
  .object({
    league: z
      .object({
        id: uuidSchema,
        name: nonEmptyStringSchema,
        status: z.enum(["draft", "open", "locked", "live", "completed", "archived", "cancelled"]),
        deadline_at: z.string().datetime({ offset: true }),
        competition_edition_id: uuidSchema,
        format_template_version_id: uuidSchema,
        ruleset_version_id: uuidSchema,
        prediction_requirement_version_id: uuidSchema,
        scoring_preset_version_id: uuidSchema,
        locked_competition_snapshot: z.unknown().nullable()
      })
      .strict(),
    edition: z
      .object({
        id: uuidSchema,
        name: nonEmptyStringSchema,
        season_label: nonEmptyStringSchema,
        edition_code: nonEmptyStringSchema.nullable(),
        data_completeness: nonEmptyStringSchema
      })
      .strict(),
    versions: z
      .object({
        format_template: formatTemplateSchema,
        ruleset: rulesetSchema,
        prediction_requirements: versionSchema
          .extend({ requirements: z.array(predictionRequirementCodeSchema).min(1) })
          .strict(),
        scoring_preset: versionSchema.extend({ config: z.unknown() }).strict()
      })
      .strict(),
    catalog: z
      .object({
        stages: z.array(
          z
            .object({
              id: uuidSchema,
              edition_id: uuidSchema,
              code: nonEmptyStringSchema,
              kind: nonEmptyStringSchema,
              name: nonEmptyStringSchema,
              sort_order: positiveIntegerSchema
            })
            .strict()
        ),
        groups: z.array(
          z
            .object({
              id: uuidSchema,
              edition_id: uuidSchema,
              stage_id: uuidSchema,
              code: nonEmptyStringSchema,
              name: nonEmptyStringSchema,
              sort_order: positiveIntegerSchema
            })
            .strict()
        ),
        rounds: z.array(
          z
            .object({
              id: uuidSchema,
              edition_id: uuidSchema,
              stage_id: uuidSchema,
              code: nonEmptyStringSchema,
              name: nonEmptyStringSchema,
              sort_order: positiveIntegerSchema
            })
            .strict()
        ),
        edition_teams: z.array(
          z
            .object({
              edition_id: uuidSchema,
              team_id: uuidSchema,
              seed_group_id: nullableUuidSchema,
              name: nonEmptyStringSchema,
              short_name: nonEmptyStringSchema,
              country_code: z.string().trim().min(2).max(3).nullable(),
              fifa_code: z
                .string()
                .regex(/^[A-Z]{3}$/)
                .nullable()
            })
            .strict()
        ),
        matches: z.array(
          z
            .object({
              id: uuidSchema,
              edition_id: uuidSchema,
              stage_id: uuidSchema,
              group_id: nullableUuidSchema,
              round_id: nullableUuidSchema,
              home_team_id: nullableUuidSchema,
              away_team_id: nullableUuidSchema,
              bracket_payload: z.unknown(),
              kickoff_at: z.string().datetime({ offset: true }).nullable(),
              status: z.enum([
                "NOT_STARTED",
                "LIVE",
                "HALFTIME",
                "FULL_TIME",
                "AFTER_EXTRA_TIME",
                "AFTER_PENALTIES",
                "POSTPONED",
                "SUSPENDED",
                "CANCELLED",
                "ABANDONED",
                "AWARDED",
                "UNKNOWN"
              ]),
              sort_order: positiveIntegerSchema,
              match_number: positiveIntegerSchema.nullable(),
              matchday: positiveIntegerSchema.nullable(),
              match_format: nonEmptyStringSchema.nullable(),
              leg: positiveIntegerSchema.nullable()
            })
            .strict()
        )
      })
      .strict(),
    personal: z
      .object({
        prediction_set: z
          .object({
            id: uuidSchema,
            league_id: uuidSchema,
            status: z.enum(["draft", "complete", "locked"]),
            total_required: nonNegativeIntegerSchema,
            completed_items: nonNegativeIntegerSchema,
            unsynced_items: nonNegativeIntegerSchema,
            last_server_synced_at: z.string().datetime({ offset: true }).nullable()
          })
          .strict()
          .nullable(),
        match_predictions: z.array(
          z
            .object({
              id: uuidSchema,
              prediction_set_id: uuidSchema,
              match_id: uuidSchema.nullable(),
              prediction_ref: nonEmptyStringSchema,
              stage_code: nonEmptyStringSchema,
              regulation_home_goals: nonNegativeIntegerSchema,
              regulation_away_goals: nonNegativeIntegerSchema,
              qualified_team_id: nullableUuidSchema,
              advancement_method: z.enum(["REGULATION", "EXTRA_TIME", "PENALTIES"]).nullable(),
              sync_status: z.enum(["SAVED", "SYNCING", "SYNCED", "SYNC_FAILED", "LOCAL"]),
              updated_at: z.string().datetime({ offset: true })
            })
            .strict()
        ),
        tiebreak_overrides: z.array(
          z
            .object({
              id: uuidSchema,
              prediction_set_id: uuidSchema,
              scope: z.enum(["GROUP", "BEST_THIRDS", "LEAGUE_PHASE"]),
              scope_ref: nonEmptyStringSchema,
              tie_group_id: nonEmptyStringSchema,
              tied_team_ids: z.array(uuidSchema).min(1),
              affected_positions: z.array(positiveIntegerSchema).min(1),
              ordered_team_ids: z.array(uuidSchema).min(1),
              reason: z.string(),
              sync_status: z.enum(["SAVED", "SYNCING", "SYNCED", "SYNC_FAILED", "LOCAL"]),
              created_at: z.string().datetime({ offset: true }),
              updated_at: z.string().datetime({ offset: true })
            })
            .strict()
            .superRefine((value, context) => {
              if (
                value.tied_team_ids.length !== value.ordered_team_ids.length ||
                value.tied_team_ids.some((teamId) => !value.ordered_team_ids.includes(teamId))
              ) {
                context.addIssue({
                  code: "custom",
                  message: "Tie-break order must contain the exact persisted tied-team set."
                });
              }
            })
        ),
        antepost_predictions: z.array(
          z
            .object({
              id: uuidSchema,
              prediction_set_id: uuidSchema,
              definition_id: uuidSchema,
              selected_payload: z.unknown(),
              sync_status: z.enum(["SAVED", "SYNCING", "SYNCED", "SYNC_FAILED", "LOCAL"]),
              updated_at: z.string().datetime({ offset: true })
            })
            .strict()
        )
      })
      .strict()
  })
  .strict()
  .superRefine((value, context) => {
    const editionId = value.edition.id;
    const stageIds = new Set(value.catalog.stages.map((stage) => stage.id));
    const groupIds = new Set(value.catalog.groups.map((group) => group.id));
    const roundIds = new Set(value.catalog.rounds.map((round) => round.id));
    const teamIds = new Set(value.catalog.edition_teams.map((team) => team.team_id));
    const predictionSetId = value.personal.prediction_set?.id;
    const initialStageCodes = new Set(
      value.versions.format_template.stages
        .filter((stage) => stage.kind === value.versions.format_template.format.initialStageKind)
        .map((stage) => stage.code)
    );
    const initialStageIds = new Set(
      value.catalog.stages
        .filter((stage) => initialStageCodes.has(stage.code))
        .map((stage) => stage.id)
    );
    const initialMatches = value.catalog.matches.filter((match) =>
      initialStageIds.has(match.stage_id)
    );
    const groupByTeamId = new Map(
      value.catalog.edition_teams.map((team) => [team.team_id, team.seed_group_id] as const)
    );

    if (
      value.league.competition_edition_id !== editionId ||
      value.versions.format_template.id !== value.league.format_template_version_id ||
      value.versions.ruleset.id !== value.league.ruleset_version_id ||
      value.versions.prediction_requirements.id !==
        value.league.prediction_requirement_version_id ||
      value.versions.scoring_preset.id !== value.league.scoring_preset_version_id
    ) {
      context.addIssue({ code: "custom", message: "League edition/version scope mismatch." });
    }

    if (
      value.catalog.stages.some((stage) => stage.edition_id !== editionId) ||
      value.catalog.groups.some(
        (group) => group.edition_id !== editionId || !stageIds.has(group.stage_id)
      ) ||
      value.catalog.rounds.some(
        (round) => round.edition_id !== editionId || !stageIds.has(round.stage_id)
      ) ||
      value.catalog.edition_teams.some(
        (team) =>
          team.edition_id !== editionId ||
          (team.seed_group_id !== null && !groupIds.has(team.seed_group_id))
      ) ||
      value.catalog.matches.some(
        (match) =>
          match.edition_id !== editionId ||
          !stageIds.has(match.stage_id) ||
          (match.group_id !== null && !groupIds.has(match.group_id)) ||
          (match.round_id !== null && !roundIds.has(match.round_id)) ||
          (match.home_team_id !== null && !teamIds.has(match.home_team_id)) ||
          (match.away_team_id !== null && !teamIds.has(match.away_team_id))
      ) ||
      value.personal.tiebreak_overrides.some(
        (override) =>
          override.tied_team_ids.some((teamId) => !teamIds.has(teamId)) ||
          override.ordered_team_ids.some((teamId) => !teamIds.has(teamId))
      )
    ) {
      context.addIssue({ code: "custom", message: "Catalog contains cross-scope references." });
    }

    if (
      initialMatches.some(
        (match) =>
          match.group_id === null ||
          match.home_team_id === null ||
          match.away_team_id === null ||
          match.match_number === null ||
          match.matchday === null ||
          match.match_format !== "REGULATION_90" ||
          match.leg !== 1
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Initial-stage match metadata and participants must be complete."
      });
    }

    const matchNumbers = new Set<number>();
    const pairingKeys = new Set<string>();
    for (const match of initialMatches) {
      if (
        match.home_team_id &&
        match.away_team_id &&
        (match.home_team_id === match.away_team_id ||
          groupByTeamId.get(match.home_team_id) !== match.group_id ||
          groupByTeamId.get(match.away_team_id) !== match.group_id)
      ) {
        context.addIssue({
          code: "custom",
          message: "Initial-stage participants must belong to the match group."
        });
      }

      if (match.match_number !== null) {
        if (matchNumbers.has(match.match_number)) {
          context.addIssue({ code: "custom", message: "Initial match numbers must be unique." });
        }
        matchNumbers.add(match.match_number);
      }

      if (match.home_team_id && match.away_team_id) {
        const pairingKey = [match.home_team_id, match.away_team_id].sort().join(":");
        if (pairingKeys.has(pairingKey)) {
          context.addIssue({ code: "custom", message: "Initial match pairings must be unique." });
        }
        pairingKeys.add(pairingKey);
      }
    }

    if (
      new Set(value.catalog.edition_teams.map((team) => team.fifa_code)).size !==
        value.catalog.edition_teams.length ||
      value.catalog.edition_teams.some((team) => team.fifa_code === null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Edition FIFA codes must be complete and unique."
      });
    }

    const personalRows = [
      ...value.personal.match_predictions,
      ...value.personal.tiebreak_overrides,
      ...value.personal.antepost_predictions
    ];
    if (
      (value.personal.prediction_set &&
        value.personal.prediction_set.league_id !== value.league.id) ||
      personalRows.some((row) => !predictionSetId || row.prediction_set_id !== predictionSetId)
    ) {
      context.addIssue({ code: "custom", message: "Personal prediction scope mismatch." });
    }
  });

export type AuthenticatedPredictionReadModel = z.infer<typeof readModelSchema>;

export function parseAuthenticatedPredictionReadModel(
  payload: unknown
): AuthenticatedPredictionReadModel {
  return readModelSchema.parse(payload);
}
