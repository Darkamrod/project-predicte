import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AntepostDefinition,
  BracketSlot,
  CompetitionEdition,
  CompetitionFormat,
  CompetitionSeed,
  CompetitionTemplate,
  Group,
  Match,
  MatchStatus,
  Player,
  Round,
  Sport,
  Stage,
  StageCode,
  StageKind,
  Team
} from "@/domain/competitions/types";
import type { LeaderboardEntry, LeaderboardParticipant } from "@/domain/leaderboard/types";
import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionSet,
  PredictionSyncStatus
} from "@/domain/predictions/types";
import type {
  ScoringEvent,
  ScoringEventType,
  ScoringRuleConfig,
  ScoringRuleVersion
} from "@/domain/scoring/types";
import type { Database, Json } from "@/services/supabase/database.types";
import type { TrustedScoringContext, TrustedScoringContextLoader } from "./types";

type TableName = keyof Database["public"]["Tables"];
type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export class SupabaseScoringContextLoader implements TrustedScoringContextLoader {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async loadContext(request: {
    leagueId: string;
    sourceResultKey: string;
  }): Promise<TrustedScoringContext> {
    const league = await this.getSingle<Row<"leagues">>(
      this.client.from("leagues").select("*").eq("id", request.leagueId).single(),
      "League not found"
    );

    if (!league.current_scoring_rule_version_id) {
      throw new Error("League does not have a current scoring rule version.");
    }

    const [competition, scoringRuleVersion, predictionSets, participants, existingEvents] =
      await Promise.all([
        this.loadCompetition(league.competition_edition_id),
        this.loadScoringRuleVersion(league.current_scoring_rule_version_id),
        this.loadPredictionSets(league.id),
        this.loadParticipants(league.id),
        this.loadExistingEvents(league.id)
      ]);
    const previousSnapshot = await this.loadPreviousSnapshot(league.id, participants);

    return {
      leagueId: league.id,
      competitionEditionId: league.competition_edition_id,
      competition,
      scoringRuleVersion,
      predictionSets,
      participants,
      existingEvents,
      ...(previousSnapshot ? { previousSnapshot } : {})
    };
  }

  private async loadCompetition(editionId: string): Promise<CompetitionSeed> {
    const edition = await this.getSingle<Row<"competition_editions">>(
      this.client.from("competition_editions").select("*").eq("id", editionId).single(),
      "Competition edition not found"
    );
    const template = await this.getSingle<Row<"competition_templates">>(
      this.client.from("competition_templates").select("*").eq("id", edition.template_id).single(),
      "Competition template not found"
    );
    const sport = await this.getSingle<Row<"sports">>(
      this.client.from("sports").select("*").eq("id", template.sport_id).single(),
      "Sport not found"
    );
    const [stages, groups, rounds, editionTeams, matches, bracketSlots, antepostDefinitions] =
      await Promise.all([
        this.getMany(
          this.client.from("stages").select("*").eq("edition_id", editionId).order("sort_order")
        ),
        this.getMany(
          this.client.from("groups").select("*").eq("edition_id", editionId).order("sort_order")
        ),
        this.getMany(
          this.client.from("rounds").select("*").eq("edition_id", editionId).order("sort_order")
        ),
        this.getMany(this.client.from("edition_teams").select("*").eq("edition_id", editionId)),
        this.getMany(
          this.client.from("matches").select("*").eq("edition_id", editionId).order("sort_order")
        ),
        this.getMany(this.client.from("bracket_slots").select("*").eq("edition_id", editionId)),
        this.getMany(
          this.client
            .from("competition_antepost_definitions")
            .select("*")
            .eq("edition_id", editionId)
        )
      ]);
    const teamIds = uniqueStrings([
      ...editionTeams.map((row) => row.team_id),
      ...matches.flatMap((row) => [row.home_team_id, row.away_team_id]).filter(isString)
    ]);
    const teams = teamIds.length
      ? await this.getMany(this.client.from("teams").select("*").in("id", teamIds))
      : [];
    const players = teamIds.length
      ? await this.getMany(this.client.from("players").select("*").in("team_id", teamIds))
      : [];

    return {
      sport: mapSport(sport),
      template: mapTemplate(template),
      edition: mapEdition(edition),
      stages: stages.map(mapStage),
      groups: groups.map(mapGroup),
      rounds: rounds.map(mapRound),
      teams: teams.map(mapTeam),
      players: players.map(mapPlayer).filter((player): player is Player => Boolean(player)),
      matches: matches.map(mapMatch).filter((match): match is Match => Boolean(match)),
      bracketSlots: bracketSlots
        .map((slot) => mapBracketSlot(slot, rounds))
        .filter((slot): slot is BracketSlot => Boolean(slot)),
      antepostDefinitions: antepostDefinitions.map(mapAntepostDefinition)
    };
  }

  private async loadScoringRuleVersion(ruleVersionId: string): Promise<ScoringRuleVersion> {
    const row = await this.getSingle<Row<"league_scoring_rule_versions">>(
      this.client.from("league_scoring_rule_versions").select("*").eq("id", ruleVersionId).single(),
      "Scoring rule version not found"
    );

    if (row.status !== "locked") {
      throw new Error("Scoring rule version must be locked before trusted scoring.");
    }

    return {
      id: row.id,
      leagueId: row.league_id,
      version: row.version,
      status: row.status,
      schemaVersion: 1,
      config: row.config as unknown as ScoringRuleConfig,
      ...(row.checksum ? { checksum: row.checksum } : {}),
      createdAtUtc: row.created_at,
      ...(row.locked_at ? { lockedAtUtc: row.locked_at } : {})
    };
  }

  private async loadPredictionSets(leagueId: string): Promise<PredictionSet[]> {
    const sets = await this.getMany(
      this.client.from("prediction_sets").select("*").eq("league_id", leagueId)
    );
    const setIds = sets.map((set) => set.id);

    if (setIds.length === 0) {
      return [];
    }

    const [matches, tiebreaks, antepost] = await Promise.all([
      this.getMany(
        this.client.from("match_predictions").select("*").in("prediction_set_id", setIds)
      ),
      this.getMany(
        this.client
          .from("prediction_tiebreak_overrides")
          .select("*")
          .in("prediction_set_id", setIds)
      ),
      this.getMany(
        this.client.from("antepost_predictions").select("*").in("prediction_set_id", setIds)
      )
    ]);

    return sets.map((set) => ({
      id: set.id,
      leagueId: set.league_id,
      userId: set.user_id,
      status: set.status,
      totalRequired: set.total_required,
      completedItems: set.completed_items,
      unsyncedItems: set.unsynced_items,
      matchPredictions: matches
        .filter((prediction) => prediction.prediction_set_id === set.id)
        .map(mapMatchPrediction),
      tiebreakOverrides: tiebreaks
        .filter((override) => override.prediction_set_id === set.id)
        .map(mapTiebreakOverride),
      antepostPredictions: antepost
        .filter((prediction) => prediction.prediction_set_id === set.id)
        .map(mapAntepostPrediction),
      ...(set.last_server_synced_at ? { lastServerSyncedAtUtc: set.last_server_synced_at } : {})
    }));
  }

  private async loadParticipants(leagueId: string): Promise<LeaderboardParticipant[]> {
    const members = await this.getMany(
      this.client
        .from("league_members")
        .select("*")
        .eq("league_id", leagueId)
        .eq("status", "active")
    );
    const userIds = members.map((member) => member.user_id);

    if (userIds.length === 0) {
      return [];
    }

    const profiles = await this.getMany(this.client.from("profiles").select("*").in("id", userIds));

    return members.map((member) => {
      const profile = profiles.find((item) => item.id === member.user_id);
      const displayName = profile?.display_name ?? "Partecipante";

      return {
        userId: member.user_id,
        displayName,
        avatarInitials: createInitials(displayName)
      };
    });
  }

  private async loadExistingEvents(leagueId: string): Promise<ScoringEvent[]> {
    const events = await this.getMany(
      this.client.from("scoring_events").select("*").eq("league_id", leagueId)
    );

    return events.map((event) => ({
      id: event.event_key,
      leagueId: event.league_id,
      participantUserId: event.participant_user_id,
      competitionEditionId: event.competition_edition_id,
      referenceId: event.reference_id,
      scoringRuleVersionId: event.scoring_rule_version_id,
      type: event.event_type as ScoringEventType,
      points: event.points,
      reason: event.reason,
      calculationVersion: event.calculation_version,
      createdAtUtc: event.created_at,
      sourceResultVersion: event.source_result_key
    }));
  }

  private async loadPreviousSnapshot(
    leagueId: string,
    participants: LeaderboardParticipant[]
  ): Promise<TrustedScoringContext["previousSnapshot"]> {
    const snapshots = await this.getMany(
      this.client
        .from("leaderboard_snapshots")
        .select("*")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .limit(1)
    );
    const snapshot = snapshots[0];

    if (!snapshot) {
      return undefined;
    }

    const entries = await this.getMany(
      this.client.from("leaderboard_entries").select("*").eq("snapshot_id", snapshot.id)
    );
    const participantById = new Map(
      participants.map((participant) => [participant.userId, participant])
    );

    return {
      id: snapshot.id,
      leagueId: snapshot.league_id,
      createdAtUtc: snapshot.created_at,
      sourceResultVersion: snapshot.source_result_key,
      entries: entries.map((entry): LeaderboardEntry => {
        const participant = participantById.get(entry.user_id);

        return {
          userId: entry.user_id,
          displayName: participant?.displayName ?? "Partecipante",
          avatarInitials: participant?.avatarInitials ?? "PA",
          rank: entry.rank,
          totalPoints: entry.total_points,
          latestPoints: entry.latest_points,
          positionDelta: entry.position_delta,
          tied: entry.tied
        };
      })
    };
  }

  private async getSingle<T>(
    promise: PromiseLike<QueryResult<T>>,
    message: string
  ): Promise<NonNullable<T>> {
    const { data, error } = await promise;

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(message);
    }

    return data;
  }

  private async getMany<T>(promise: PromiseLike<QueryResult<T[]>>): Promise<T[]> {
    const { data, error } = await promise;

    if (error) {
      throw error;
    }

    return data ?? [];
  }
}

function mapSport(row: Row<"sports">): Sport {
  return {
    id: row.id,
    code: row.code,
    name: row.name
  };
}

function mapTemplate(row: Row<"competition_templates">): CompetitionTemplate {
  return {
    id: row.id,
    sportId: row.sport_id,
    code: row.code,
    name: row.name
  };
}

function mapEdition(row: Row<"competition_editions">): CompetitionEdition {
  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    seasonLabel: row.season_label,
    enabled: row.enabled,
    firstKickoffAtUtc: row.first_kickoff_at ?? "",
    maximumDeadlineAtUtc: row.maximum_deadline_at ?? "",
    dataCompleteness: normalizeCompleteness(row.data_completeness),
    format: row.format as unknown as CompetitionFormat
  };
}

function mapStage(row: Row<"stages">): Stage {
  return {
    id: row.id,
    editionId: row.edition_id,
    code: row.code as StageCode,
    kind: row.kind as StageKind,
    name: row.name,
    order: row.sort_order
  };
}

function mapGroup(row: Row<"groups">): Group {
  return {
    id: row.id,
    editionId: row.edition_id,
    stageId: row.stage_id,
    code: row.code,
    name: row.name,
    order: row.sort_order
  };
}

function mapRound(row: Row<"rounds">): Round {
  return {
    id: row.id,
    editionId: row.edition_id,
    stageId: row.stage_id,
    code: row.code as StageCode,
    name: row.name,
    order: row.sort_order
  };
}

function mapTeam(row: Row<"teams">): Team {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    countryCode: row.country_code ?? ""
  };
}

function mapPlayer(row: Row<"players">): Player | undefined {
  if (!row.team_id) {
    return undefined;
  }

  return {
    id: row.id,
    teamId: row.team_id,
    displayName: row.display_name
  };
}

function mapMatch(row: Row<"matches">): Match | undefined {
  if (!row.home_team_id || !row.away_team_id || !row.kickoff_at) {
    return undefined;
  }

  return {
    id: row.id,
    editionId: row.edition_id,
    stageId: row.stage_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    kickoffAtUtc: row.kickoff_at,
    status: normalizeMatchStatus(row.status),
    order: row.sort_order,
    ...(row.group_id ? { groupId: row.group_id } : {}),
    ...(row.round_id ? { roundId: row.round_id } : {})
  };
}

function mapBracketSlot(
  row: Row<"bracket_slots">,
  rounds: Row<"rounds">[]
): BracketSlot | undefined {
  const round = rounds.find((item) => item.id === row.round_id);

  if (!round) {
    return undefined;
  }

  return {
    id: row.id,
    editionId: row.edition_id,
    roundCode: round.code as BracketSlot["roundCode"],
    source: mapBracketSource(row.source_type, row.source_payload)
  };
}

function mapAntepostDefinition(row: Row<"competition_antepost_definitions">): AntepostDefinition {
  return {
    id: row.id,
    editionId: row.edition_id,
    code: row.code,
    label: row.label,
    valueType: row.value_type,
    required: row.required
  };
}

function mapMatchPrediction(row: Row<"match_predictions">): MatchPrediction {
  return {
    id: row.id,
    predictionSetId: row.prediction_set_id,
    matchId: row.prediction_ref,
    stageCode: row.stage_code as StageCode,
    homeGoals: row.regulation_home_goals,
    awayGoals: row.regulation_away_goals,
    syncStatus: row.sync_status,
    updatedAtUtc: row.updated_at,
    ...(row.qualified_team_id ? { qualifiedTeamId: row.qualified_team_id } : {}),
    ...(row.advancement_method ? { advancementMethod: row.advancement_method } : {})
  };
}

function mapTiebreakOverride(row: Row<"prediction_tiebreak_overrides">) {
  return {
    id: row.id,
    predictionSetId: row.prediction_set_id,
    scopeRef: row.scope_ref,
    orderedTeamIds: row.ordered_team_ids,
    reason: row.reason,
    syncStatus: row.sync_status,
    updatedAtUtc: row.updated_at
  };
}

function mapAntepostPrediction(row: Row<"antepost_predictions">): AntepostPrediction {
  const payload = asRecord(row.selected_payload);

  return {
    id: row.id,
    predictionSetId: row.prediction_set_id,
    definitionId: row.definition_id,
    syncStatus: row.sync_status as PredictionSyncStatus,
    updatedAtUtc: row.updated_at,
    ...(getString(payload.selectedTeamId)
      ? { selectedTeamId: getString(payload.selectedTeamId) }
      : {}),
    ...(getString(payload.selectedPlayerId)
      ? { selectedPlayerId: getString(payload.selectedPlayerId) }
      : {}),
    ...(getNumber(payload.numericValue) !== undefined
      ? { numericValue: getNumber(payload.numericValue) }
      : {})
  };
}

function mapBracketSource(sourceType: string, payload: Json): BracketSlot["source"] {
  const source = asRecord(payload);

  if (sourceType === "GROUP_POSITION") {
    return {
      type: "GROUP_POSITION",
      groupCode: getString(source.groupCode) ?? "",
      position: getNumber(source.position) ?? 1
    };
  }

  if (sourceType === "BEST_THIRD") {
    return {
      type: "BEST_THIRD",
      rank: getNumber(source.rank) ?? 1
    };
  }

  if (sourceType === "LOSER_OF_MATCH") {
    return {
      type: "LOSER_OF_MATCH",
      matchId: getString(source.matchId) ?? ""
    };
  }

  return {
    type: "WINNER_OF_MATCH",
    matchId: getString(source.matchId) ?? ""
  };
}

function normalizeCompleteness(value: string): CompetitionEdition["dataCompleteness"] {
  if (value === "MOCK_COMPLETE" || value === "COMPLETE" || value === "PARTIAL") {
    return value;
  }

  if (value.toLowerCase() === "partial") {
    return "PARTIAL";
  }

  if (value.toLowerCase() === "complete") {
    return "COMPLETE";
  }

  return "MOCK_COMPLETE";
}

function normalizeMatchStatus(status: Row<"matches">["status"]): MatchStatus {
  if (status === "HALFTIME") {
    return "LIVE";
  }

  if (status === "ABANDONED" || status === "AWARDED") {
    return "UNKNOWN";
  }

  return status;
}

function asRecord(value: Json): Record<string, Json | undefined> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getString(value: Json | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(value: Json | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function createInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(2, "A")
    .slice(0, 2);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}
