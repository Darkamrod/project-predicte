import { describe, expect, it } from "vitest";

import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant } from "@/domain/leaderboard/types";
import { lockScoringRuleVersion } from "@/domain/scoring/ruleVersions";
import type { ScoringEvent } from "@/domain/scoring/types";
import { handleTrustedScoringRuntimeRequest } from "@/server/scoring/trustedScoringRuntime";
import { MockResultProvider } from "@/server/results/mockResultProvider";
import { executeProviderResultImport } from "@/server/results/providerResultImportWorker";
import type {
  ProviderImportRecordInput,
  ProviderResultImportWorkerDependencies
} from "@/server/results/types";
import { createMockLeague } from "@/services/mock/mockLeagueFactory";
import type { PersistScoringRecalculationInput } from "@/server/scoring/supabaseScoringPersistenceRepository";
import type { TrustedResultIngestionInput, TrustedScoringContext } from "@/server/scoring/types";

const leagueId = "league-provider-import";
const requestedAtUtc = "2030-07-16T21:00:00.000Z";

describe("Milestone 6 provider result import worker", () => {
  it("imports a mock provider result, runs trusted scoring, and records provider metadata", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context);
    const output = await executeProviderResultImport(createRequest(), dependencies);

    expect(output).toMatchObject({
      leagueId,
      provider: "MOCK_RESULTS",
      externalFixtureKey: "mock-fixture-world-cup-final",
      sourceResultKey: "mock-provider-result-v1",
      status: "scored"
    });
    expect(calls.providerImports.map((item) => item.status)).toEqual(["accepted", "scored"]);
    expect(calls.providerImports[0]).toMatchObject({
      provider: "MOCK_RESULTS",
      externalFixtureKey: "mock-fixture-world-cup-final",
      retryAttempt: 0
    });
    expect(calls.ingestions.map((item) => item.status)).toEqual(["accepted", "scored"]);
    expect(calls.persisted[0]?.sourceResultKey).toBe("mock-provider-result-v1");
  });

  it("records retry metadata when scoring persistence fails", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context, { failScoring: true });

    await expect(
      executeProviderResultImport(
        createRequest({
          sourceResultKey: "mock-provider-result-retry",
          retryAttempt: 1,
          maxRetries: 3,
          nextRetryAtUtc: "2030-07-16T21:05:00.000Z"
        }),
        dependencies
      )
    ).rejects.toThrow("Persist failed");

    expect(calls.providerImports.map((item) => item.status)).toEqual(["accepted", "failed"]);
    expect(calls.providerImports[1]).toMatchObject({
      retryAttempt: 1,
      maxRetries: 3,
      nextRetryAtUtc: "2030-07-16T21:05:00.000Z",
      errorMessage: "Persist failed"
    });
    expect(calls.ingestions.map((item) => item.status)).toEqual(["accepted", "failed"]);
  });

  it("requires an existing correction source and excludes superseded events from the snapshot", async () => {
    const context = createTrustedContext();
    const supersededEvent = createSupersededEvent(context);
    const { dependencies, calls } = createDependencies(
      {
        ...context,
        existingEvents: [supersededEvent]
      },
      { existingIngestionKeys: new Set(["mock-provider-result-v1"]) }
    );

    await executeProviderResultImport(
      createRequest({
        sourceResultKey: "mock-provider-result-v2",
        correctionOfSourceResultKey: "mock-provider-result-v1"
      }),
      dependencies
    );

    expect(calls.existsChecks).toEqual(["mock-provider-result-v1"]);
    expect(calls.providerImports.map((item) => item.status)).toEqual(["accepted", "scored"]);
    expect(calls.providerImports[0]?.correctionOfSourceResultKey).toBe("mock-provider-result-v1");
    expect(
      calls.persisted[0]?.leaderboardSnapshot.entries.every(
        (entry) => entry.totalPoints < supersededEvent.points
      )
    ).toBe(true);
  });

  it("fails before scoring when correction_of_source_result_key is missing", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context);

    await expect(
      executeProviderResultImport(
        createRequest({
          sourceResultKey: "mock-provider-result-v2",
          correctionOfSourceResultKey: "missing-source"
        }),
        dependencies
      )
    ).rejects.toThrow("Correction source result key was not found.");

    expect(calls.providerImports.map((item) => item.status)).toEqual(["failed"]);
    expect(calls.persisted).toEqual([]);
    expect(calls.ingestions).toEqual([]);
  });

  it("keeps repeated imports idempotent by source_result_key", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context);
    const request = createRequest({ sourceResultKey: "mock-provider-result-repeat" });

    await executeProviderResultImport(request, dependencies);
    await executeProviderResultImport(request, dependencies);

    expect(calls.persisted.map((item) => item.sourceResultKey)).toEqual([
      "mock-provider-result-repeat",
      "mock-provider-result-repeat"
    ]);
    expect(calls.providerImports.filter((item) => item.status === "scored")).toHaveLength(2);
  });

  it("keeps repeated corrections idempotent by corrected source_result_key", async () => {
    const context = createTrustedContext();
    const { dependencies, calls } = createDependencies(context, {
      existingIngestionKeys: new Set(["mock-provider-result-v1"])
    });
    const request = createRequest({
      sourceResultKey: "mock-provider-result-v2",
      correctionOfSourceResultKey: "mock-provider-result-v1"
    });

    await executeProviderResultImport(request, dependencies);
    await executeProviderResultImport(request, dependencies);

    expect(calls.persisted.map((item) => item.sourceResultKey)).toEqual([
      "mock-provider-result-v2",
      "mock-provider-result-v2"
    ]);
    expect(calls.providerImports.filter((item) => item.status === "scored")).toHaveLength(2);
  });

  it("normalizes mock provider output without calling a real sports API", async () => {
    const context = createTrustedContext();
    const provider = new MockResultProvider();
    const result = await provider.fetchResult({
      ...createRequest(),
      competition: context.competition
    });

    expect(result.rawPayload).toMatchObject({
      provider: "MOCK_RESULTS",
      externalFixtureKey: "mock-fixture-world-cup-final",
      sourceResultKey: "mock-provider-result-v1"
    });
    expect(result.normalizedResultSet.sourceResultVersion).toBe("mock-provider-result-v1");
    expect(result.normalizedResultSet.matchResults.length).toBeGreaterThan(0);
  });

  it("exposes a deployable-compatible runtime boundary", async () => {
    const context = createTrustedContext();
    const { dependencies } = createDependencies(context);
    const output = await handleTrustedScoringRuntimeRequest(
      {
        action: "import_provider_result",
        leagueId,
        provider: "MOCK_RESULTS",
        externalFixtureKey: "mock-runtime-fixture",
        sourceResultKey: "mock-runtime-result-v1",
        requestedAtUtc
      },
      dependencies
    );

    expect(output.sourceResultKey).toBe("mock-runtime-result-v1");
    await expect(
      handleTrustedScoringRuntimeRequest(
        {
          action: "import_provider_result",
          leagueId,
          provider: "MOCK_RESULTS",
          externalFixtureKey: "",
          sourceResultKey: "bad",
          requestedAtUtc
        },
        dependencies
      )
    ).rejects.toThrow();
  });
});

function createTrustedContext(): TrustedScoringContext {
  const competition = createWorldCup2030MockSeed();
  const league = createMockLeague({
    id: leagueId,
    name: "Provider Import League",
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

  return {
    leagueId,
    competitionEditionId: league.competitionEditionId,
    competition,
    scoringRuleVersion: lockScoringRuleVersion(
      league.scoringRuleVersion,
      "2030-06-08T18:30:00.000Z"
    ),
    predictionSets: league.predictionSets,
    participants,
    previousSnapshot: createLeaderboardSnapshot({
      leagueId,
      createdAtUtc: "2030-07-16T20:00:00.000Z",
      sourceResultVersion: "before-provider-import",
      participants,
      allEvents: [],
      latestEvents: []
    })
  };
}

function createDependencies(
  context: TrustedScoringContext,
  options: { existingIngestionKeys?: Set<string>; failScoring?: boolean } = {}
): {
  dependencies: ProviderResultImportWorkerDependencies;
  calls: {
    providerImports: ProviderImportRecordInput[];
    ingestions: TrustedResultIngestionInput[];
    persisted: PersistScoringRecalculationInput[];
    existsChecks: string[];
  };
} {
  const calls = {
    providerImports: [] as ProviderImportRecordInput[],
    ingestions: [] as TrustedResultIngestionInput[],
    persisted: [] as PersistScoringRecalculationInput[],
    existsChecks: [] as string[]
  };

  return {
    calls,
    dependencies: {
      providers: {
        MOCK_RESULTS: new MockResultProvider()
      },
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
          if (options.failScoring) {
            throw new Error("Persist failed");
          }

          calls.persisted.push(input);
          return {
            runId: `run-${calls.persisted.length}`,
            snapshotId: `snapshot-${calls.persisted.length}`
          };
        }
      },
      providerImportRepository: {
        resultIngestionExists: async (_leagueId, sourceResultKey) => {
          calls.existsChecks.push(sourceResultKey);
          return options.existingIngestionKeys?.has(sourceResultKey) ?? false;
        },
        recordProviderImport: async (input) => {
          calls.providerImports.push(input);
          return {
            syncRunId: `sync-${calls.providerImports.length}`,
            providerPayloadId: `payload-${calls.providerImports.length}`,
            ingestionRunId: `provider-ingestion-${calls.providerImports.length}`
          };
        }
      }
    }
  };
}

function createRequest(
  overrides: Partial<{
    sourceResultKey: string;
    externalFixtureKey: string;
    correctionOfSourceResultKey: string;
    retryAttempt: number;
    maxRetries: number;
    nextRetryAtUtc: string;
  }> = {}
) {
  return {
    leagueId,
    provider: "MOCK_RESULTS" as const,
    externalFixtureKey: overrides.externalFixtureKey ?? "mock-fixture-world-cup-final",
    sourceResultKey: overrides.sourceResultKey ?? "mock-provider-result-v1",
    requestedAtUtc,
    ...(overrides.correctionOfSourceResultKey
      ? { correctionOfSourceResultKey: overrides.correctionOfSourceResultKey }
      : {}),
    ...(overrides.retryAttempt !== undefined ? { retryAttempt: overrides.retryAttempt } : {}),
    ...(overrides.maxRetries !== undefined ? { maxRetries: overrides.maxRetries } : {}),
    ...(overrides.nextRetryAtUtc ? { nextRetryAtUtc: overrides.nextRetryAtUtc } : {})
  };
}

function createSupersededEvent(context: TrustedScoringContext): ScoringEvent {
  const participant = context.participants[0];

  if (!participant) {
    throw new Error("Expected participant.");
  }

  return {
    id: `${leagueId}:${participant.userId}:superseded:mock-provider-result-v1`,
    leagueId,
    participantUserId: participant.userId,
    competitionEditionId: context.competitionEditionId,
    referenceId: "superseded",
    scoringRuleVersionId: context.scoringRuleVersion.id,
    type: "MANUAL_CORRECTION",
    points: 999,
    reason: "Superseded provider source",
    calculationVersion: "test",
    createdAtUtc: requestedAtUtc,
    sourceResultVersion: "mock-provider-result-v1"
  };
}
