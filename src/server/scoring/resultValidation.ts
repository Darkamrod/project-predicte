import { z } from "zod";

import type {
  OfficialAntepostResult,
  OfficialMatchResult,
  OfficialTournamentResultSet
} from "@/domain/scoring/types";

const stageKeySchema = z.enum([
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL"
]);

const advancementMethodSchema = z.enum(["REGULATION", "EXTRA_TIME", "PENALTIES"]);

const utcTimestampSchema = z
  .string()
  .min(1)
  .refine((value) => value.endsWith("Z") && !Number.isNaN(Date.parse(value)), {
    message: "Expected a UTC ISO timestamp ending in Z."
  });

const officialMatchResultSchema = z
  .object({
    matchId: z.string().min(1),
    stage: stageKeySchema,
    order: z.number().int().positive(),
    homeTeamId: z.string().min(1),
    awayTeamId: z.string().min(1),
    homeGoals: z.number().int().min(0),
    awayGoals: z.number().int().min(0),
    qualifiedTeamId: z.string().min(1).optional(),
    advancementMethod: advancementMethodSchema.optional()
  })
  .strict();

const officialGroupPositionSchema = z
  .object({
    groupCode: z.string().min(1),
    position: z.number().int().positive(),
    teamId: z.string().min(1)
  })
  .strict();

const officialStageQualificationSchema = z
  .object({
    stage: stageKeySchema,
    referenceId: z.string().min(1),
    teamIds: z.array(z.string().min(1))
  })
  .strict();

const officialPairingSchema = z
  .object({
    stage: stageKeySchema,
    referenceId: z.string().min(1),
    order: z.number().int().positive(),
    teamIds: z.tuple([z.string().min(1), z.string().min(1)])
  })
  .strict();

const officialAntepostResultSchema = z
  .object({
    winnerTeamId: z.string().min(1).optional(),
    topScorerPlayerIds: z.array(z.string().min(1)).optional(),
    topScorerGoals: z.number().int().min(0).optional()
  })
  .strict();

const officialTournamentResultSetSchema = z
  .object({
    sourceResultVersion: z.string().min(1),
    createdAtUtc: utcTimestampSchema,
    matchResults: z.array(officialMatchResultSchema),
    groupPositions: z.array(officialGroupPositionSchema),
    stageQualifications: z.array(officialStageQualificationSchema),
    pairings: z.array(officialPairingSchema),
    antepost: officialAntepostResultSchema.optional()
  })
  .strict();

type ParsedOfficialMatchResult = z.infer<typeof officialMatchResultSchema>;
type ParsedOfficialAntepostResult = z.infer<typeof officialAntepostResultSchema>;
type ParsedOfficialTournamentResultSet = z.infer<typeof officialTournamentResultSetSchema>;

export function parseOfficialTournamentResultSet(input: unknown): OfficialTournamentResultSet {
  const parsed = officialTournamentResultSetSchema.parse(input);
  assertUniqueKeys(
    parsed.matchResults.map((result) => `${result.stage}:${result.matchId}`),
    "Official match result"
  );
  assertUniqueKeys(
    parsed.groupPositions.map((position) => `${position.groupCode}:${String(position.position)}`),
    "Official group position"
  );
  assertUniqueKeys(
    parsed.stageQualifications.map((qualification) => qualification.referenceId),
    "Official stage qualification"
  );
  assertUniqueKeys(
    parsed.pairings.map((pairing) => `${pairing.stage}:${String(pairing.order)}`),
    "Official pairing"
  );

  return normalizeResultSet(parsed);
}

export function assertTrustedSourceResultKey(
  resultSet: OfficialTournamentResultSet,
  sourceResultKey: string
): void {
  const normalizedKey = sourceResultKey.trim();

  if (!normalizedKey) {
    throw new Error("sourceResultKey is required.");
  }

  if (resultSet.sourceResultVersion !== normalizedKey) {
    throw new Error("sourceResultKey must match resultSet.sourceResultVersion.");
  }
}

export function assertUtcTimestamp(value: string, fieldName: string): void {
  if (!value.endsWith("Z") || Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be a UTC ISO timestamp ending in Z.`);
  }
}

function normalizeResultSet(
  parsed: ParsedOfficialTournamentResultSet
): OfficialTournamentResultSet {
  return {
    sourceResultVersion: parsed.sourceResultVersion,
    createdAtUtc: parsed.createdAtUtc,
    matchResults: parsed.matchResults.map(normalizeMatchResult),
    groupPositions: parsed.groupPositions,
    stageQualifications: parsed.stageQualifications,
    pairings: parsed.pairings.map((pairing) => ({
      stage: pairing.stage,
      referenceId: pairing.referenceId,
      order: pairing.order,
      teamIds: [pairing.teamIds[0], pairing.teamIds[1]]
    })),
    ...(parsed.antepost ? { antepost: normalizeAntepostResult(parsed.antepost) } : {})
  };
}

function normalizeMatchResult(parsed: ParsedOfficialMatchResult): OfficialMatchResult {
  return {
    matchId: parsed.matchId,
    stage: parsed.stage,
    order: parsed.order,
    homeTeamId: parsed.homeTeamId,
    awayTeamId: parsed.awayTeamId,
    homeGoals: parsed.homeGoals,
    awayGoals: parsed.awayGoals,
    ...(parsed.qualifiedTeamId ? { qualifiedTeamId: parsed.qualifiedTeamId } : {}),
    ...(parsed.advancementMethod ? { advancementMethod: parsed.advancementMethod } : {})
  };
}

function normalizeAntepostResult(parsed: ParsedOfficialAntepostResult): OfficialAntepostResult {
  return {
    ...(parsed.winnerTeamId ? { winnerTeamId: parsed.winnerTeamId } : {}),
    ...(parsed.topScorerPlayerIds ? { topScorerPlayerIds: parsed.topScorerPlayerIds } : {}),
    ...(parsed.topScorerGoals !== undefined ? { topScorerGoals: parsed.topScorerGoals } : {})
  };
}

function assertUniqueKeys(keys: string[], label: string): void {
  const seen = new Set<string>();

  for (const key of keys) {
    if (seen.has(key)) {
      throw new Error(`${label} keys must be unique.`);
    }

    seen.add(key);
  }
}
