import { describe, expect, it } from "vitest";

import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant } from "@/domain/leaderboard/types";
import { lockScoringRuleVersion } from "@/domain/scoring/ruleVersions";
import type { OfficialTournamentResultSet } from "@/domain/scoring/types";
import { createMockResultIngestionRequest } from "@/server/scoring/mockResultIngestion";
import { executeTrustedScoringRecalculation } from "@/server/scoring/trustedScoringWorker";
import type {
  TrustedResultIngestionInput,
  TrustedScoringContext,
  TrustedScoringWorkerDependencies
} from "@/server/scoring/types";
import { createMockLeague } from "@/services/mock/mockLeagueFactory";
import type { PersistScoringRecalculationInput } from "@/server/scoring/supabaseScoringPersistenceRepository";

const leagueId = "league-trusted-scoring";
const requestedAtUtc = "2030-07-15T21:30:00.000Z";

describe("Milestone 5 trusted scoring worker", () => {
  it("validates a mock result, executes scoring server-side, and persists derived rows", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context);
    const result = await executeTrustedScoringRecalculation(
      createMockResultIngestionRequest({
        leagueId,
        competition: context.competition,
        sourceResultKey: "mock-result-v1",
        requestedAtUtc
      }),
      dependencies
    );

    expect(result.recalculationRunId).toBe("run-1");
    expect(result.snapshotId).toBe("snapshot-1");
    expect(result.scoringEventCount).toBeGreaterThan(0);
    expect(result.leaderboardEntryCount).toBe(context.participants.length);
    expect(result.breakdownCount).toBeGreaterThan(0);
    expect(calls.ingestions.map((item) => item.status)).toEqual(["accepted", "scored"]);
    expect(calls.persisted).toHaveLength(1);
    expect(calls.persisted[0]?.sourceResultKey).toBe("mock-result-v1");
    expect(calls.persisted[0]?.events.length).toBe(result.scoringEventCount);
  });

  it("can run twice with the same source_result_key without changing the final target key", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context);
    const request = createMockResultIngestionRequest({
      leagueId,
      competition: context.competition,
      sourceResultKey: "mock-result-v1",
      requestedAtUtc
    });

    await executeTrustedScoringRecalculation(request, dependencies);
    const second = await executeTrustedScoringRecalculation(request, dependencies);

    expect(second.recalculationRunId).toBe("run-2");
    expect(calls.persisted).toHaveLength(2);
    expect(calls.persisted.map((input) => input.sourceResultKey)).toEqual([
      "mock-result-v1",
      "mock-result-v1"
    ]);
    expect(calls.persisted[1]?.leaderboardSnapshot.sourceResultVersion).toBe("mock-result-v1");
  });

  it("keeps result correction explicit while preserving idempotency for the corrected source key", async () => {
    const context = createTrustedContext();
    const supersededEvent = createSupersededScoringEvent(context);
    const { dependencies, calls } = createDependencies(context);
    const request = createMockResultIngestionRequest({
      leagueId,
      competition: context.competition,
      sourceResultKey: "mock-result-v2",
      requestedAtUtc,
      correctionOfSourceResultKey: "mock-result-v1"
    });
    const correctedResultSet = correctFirstMatchScore(
      request.resultSet as OfficialTournamentResultSet
    );

    await executeTrustedScoringRecalculation(
      {
        ...request,
        resultSet: correctedResultSet
      },
      {
        ...dependencies,
        contextLoader: {
          loadContext: async () => ({
            ...context,
            existingEvents: [supersededEvent]
          })
        }
      }
    );

    expect(calls.ingestions[0]).toMatchObject({
      status: "accepted",
      correctionOfSourceResultKey: "mock-result-v1"
    });
    expect(calls.persisted[0]?.sourceResultKey).toBe("mock-result-v2");
    expect(
      calls.persisted[0]?.events.every((event) => event.sourceResultVersion === "mock-result-v2")
    ).toBe(true);
    expect(
      calls.persisted[0]?.leaderboardSnapshot.entries.every(
        (entry) => entry.totalPoints < supersededEvent.points
      )
    ).toBe(true);
  });

  it("rejects invalid result payloads before persistence", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context);
    const request = createMockResultIngestionRequest({
      leagueId,
      competition: context.competition,
      sourceResultKey: "mock-result-invalid",
      requestedAtUtc
    });
    const invalidResultSet = {
      ...(request.resultSet as OfficialTournamentResultSet),
      matchResults: [
        {
          ...(request.resultSet as OfficialTournamentResultSet).matchResults[0],
          homeGoals: -1
        }
      ]
    };

    await expect(
      executeTrustedScoringRecalculation(
        {
          ...request,
          resultSet: invalidResultSet
        },
        dependencies
      )
    ).rejects.toThrow();
    expect(calls.ingestions).toEqual([]);
    expect(calls.persisted).toEqual([]);
  });

  it("records a failed ingestion when the scoring rule snapshot is not locked", async () => {
    const context = createTrustedContext({ lockedRule: false });
    const { dependencies, calls } = createDependencies(context);

    await expect(
      executeTrustedScoringRecalculation(
        createMockResultIngestionRequest({
          leagueId,
          competition: context.competition,
          sourceResultKey: "mock-result-v1",
          requestedAtUtc
        }),
        dependencies
      )
    ).rejects.toThrow("Trusted scoring requires a locked scoring rule snapshot.");
    expect(calls.ingestions.map((item) => item.status)).toEqual(["accepted", "failed"]);
    expect(calls.ingestions[1]?.errorMessage).toContain("locked scoring rule snapshot");
    expect(calls.persisted).toEqual([]);
  });
});

function createTrustedContext(params: { lockedRule?: boolean } = {}): TrustedScoringContext {
  const competition = createWorldCup2030MockSeed();
  const league = createMockLeague({
    id: leagueId,
    name: "Trusted Scoring League",
    owner: {
      id: "user-owner",
      displayName: "Owner",
      avatarInitials: "OW",
      locale: "it-IT",
      timezone: "Europe/Rome"
    },
    competition
  });
  const participants: LeaderboardParticipant[] = league.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    avatarInitials: member.avatarInitials
  }));
  const previousSnapshot = createLeaderboardSnapshot({
    leagueId,
    createdAtUtc: "2030-07-15T18:00:00.000Z",
    sourceResultVersion: "before-ingestion",
    participants,
    allEvents: [],
    latestEvents: []
  });
  const lockedRuleVersion = lockScoringRuleVersion(
    league.scoringRuleVersion,
    "2030-06-08T18:30:00.000Z"
  );

  return {
    leagueId,
    competitionEditionId: league.competitionEditionId,
    competition,
    scoringRuleVersion: params.lockedRule === false ? league.scoringRuleVersion : lockedRuleVersion,
    predictionSets: league.predictionSets,
    participants,
    previousSnapshot
  };
}

function createDependencies(context: TrustedScoringContext): {
  dependencies: TrustedScoringWorkerDependencies;
  calls: {
    ingestions: TrustedResultIngestionInput[];
    persisted: PersistScoringRecalculationInput[];
  };
} {
  const calls = {
    ingestions: [] as TrustedResultIngestionInput[],
    persisted: [] as PersistScoringRecalculationInput[]
  };

  return {
    calls,
    dependencies: {
      contextLoader: {
        loadContext: async () => context
      },
      resultIngestionRepository: {
        recordResultIngestion: async (input) => {
          calls.ingestions.push(input);
          return `ingestion-${calls.ingestions.length}`;
        }
      },
      scoringPersistence: {
        persistTrustedRecalculation: async (input) => {
          calls.persisted.push(input);
          return {
            runId: `run-${calls.persisted.length}`,
            snapshotId: `snapshot-${calls.persisted.length}`
          };
        }
      }
    }
  };
}

function correctFirstMatchScore(
  resultSet: OfficialTournamentResultSet
): OfficialTournamentResultSet {
  return {
    ...resultSet,
    matchResults: resultSet.matchResults.map((match, index) =>
      index === 0
        ? {
            ...match,
            homeGoals: match.awayGoals,
            awayGoals: match.homeGoals + 1
          }
        : match
    )
  };
}

function createSupersededScoringEvent(context: TrustedScoringContext) {
  const participant = context.participants[0];

  if (!participant) {
    throw new Error("Expected at least one participant.");
  }

  return {
    id: `${leagueId}:${participant.userId}:superseded:mock-result-v1`,
    leagueId,
    participantUserId: participant.userId,
    competitionEditionId: context.competitionEditionId,
    referenceId: "superseded",
    scoringRuleVersionId: context.scoringRuleVersion.id,
    type: "MANUAL_CORRECTION" as const,
    points: 999,
    reason: "Superseded source result",
    calculationVersion: "test",
    createdAtUtc: requestedAtUtc,
    sourceResultVersion: "mock-result-v1"
  };
}
