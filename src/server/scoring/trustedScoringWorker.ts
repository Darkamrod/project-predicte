import { recalculateTournamentScoring } from "@/domain/scoring/tournamentScoring";
import type { OfficialTournamentResultSet } from "@/domain/scoring/types";
import {
  assertTrustedSourceResultKey,
  assertUtcTimestamp,
  parseOfficialTournamentResultSet
} from "@/server/scoring/resultValidation";
import type {
  TrustedScoringContext,
  TrustedScoringExecutionResult,
  TrustedScoringRequest,
  TrustedScoringWorkerDependencies
} from "@/server/scoring/types";

export async function executeTrustedScoringRecalculation(
  request: TrustedScoringRequest,
  dependencies: TrustedScoringWorkerDependencies
): Promise<TrustedScoringExecutionResult> {
  assertUtcTimestamp(request.requestedAtUtc, "requestedAtUtc");

  const resultSet = parseOfficialTournamentResultSet(request.resultSet);
  assertTrustedSourceResultKey(resultSet, request.sourceResultKey);

  const acceptedIngestionRunId = await dependencies.resultIngestionRepository.recordResultIngestion(
    {
      leagueId: request.leagueId,
      sourceResultKey: request.sourceResultKey,
      payload: resultSet,
      status: "accepted",
      correctionOfSourceResultKey: request.correctionOfSourceResultKey
    }
  );

  try {
    const context = await dependencies.contextLoader.loadContext({
      leagueId: request.leagueId,
      sourceResultKey: request.sourceResultKey
    });

    assertTrustedContext(context, request.leagueId);
    const activeExistingEvents = getActiveExistingEvents(
      context.existingEvents,
      request.correctionOfSourceResultKey
    );

    const recalculation = recalculateTournamentScoring({
      competition: context.competition,
      leagueId: request.leagueId,
      competitionEditionId: context.competitionEditionId,
      scoringRuleVersion: context.scoringRuleVersion,
      predictionSets: context.predictionSets,
      participants: context.participants,
      resultSet,
      ...(activeExistingEvents ? { existingEvents: activeExistingEvents } : {}),
      ...(context.previousSnapshot ? { previousSnapshot: context.previousSnapshot } : {})
    });

    const persisted = await dependencies.scoringPersistence.persistTrustedRecalculation({
      leagueId: request.leagueId,
      sourceResultKey: request.sourceResultKey,
      calculationVersion: getCalculationVersion(recalculation.latestEvents, resultSet),
      events: recalculation.latestEvents,
      leaderboardSnapshot: recalculation.leaderboardSnapshot,
      breakdowns: recalculation.breakdowns,
      reason: request.reason
    });

    const scoredIngestionRunId = await dependencies.resultIngestionRepository.recordResultIngestion(
      {
        leagueId: request.leagueId,
        sourceResultKey: request.sourceResultKey,
        payload: resultSet,
        status: "scored",
        correctionOfSourceResultKey: request.correctionOfSourceResultKey
      }
    );

    return {
      leagueId: request.leagueId,
      sourceResultKey: request.sourceResultKey,
      ingestionRunId: scoredIngestionRunId || acceptedIngestionRunId,
      recalculationRunId: persisted.runId,
      snapshotId: persisted.snapshotId,
      scoringEventCount: recalculation.latestEvents.length,
      leaderboardEntryCount: recalculation.leaderboardSnapshot.entries.length,
      breakdownCount: recalculation.breakdowns.reduce(
        (total, breakdown) => total + breakdown.items.length,
        0
      )
    };
  } catch (error) {
    await dependencies.resultIngestionRepository.recordResultIngestion({
      leagueId: request.leagueId,
      sourceResultKey: request.sourceResultKey,
      payload: resultSet,
      status: "failed",
      correctionOfSourceResultKey: request.correctionOfSourceResultKey,
      errorMessage: error instanceof Error ? error.message : "Unknown scoring worker failure."
    });

    throw error;
  }
}

function assertTrustedContext(context: TrustedScoringContext, leagueId: string): void {
  if (context.leagueId !== leagueId) {
    throw new Error("Trusted scoring context leagueId does not match the request.");
  }

  if (context.scoringRuleVersion.status !== "locked") {
    throw new Error("Trusted scoring requires a locked scoring rule snapshot.");
  }
}

function getActiveExistingEvents(
  existingEvents: TrustedScoringContext["existingEvents"],
  correctionOfSourceResultKey: string | undefined
): TrustedScoringContext["existingEvents"] {
  if (!existingEvents || !correctionOfSourceResultKey) {
    return existingEvents;
  }

  return existingEvents.filter(
    (event) => event.sourceResultVersion !== correctionOfSourceResultKey
  );
}

function getCalculationVersion(
  events: Array<{ calculationVersion: string }>,
  resultSet: OfficialTournamentResultSet
): string {
  return events[0]?.calculationVersion ?? `trusted-scoring:${resultSet.sourceResultVersion}`;
}
