import type { ScoringRuleConfig, StageScoringRule } from "./types";

const emptyStageRule: StageScoringRule = {
  correctOutcome: 0,
  exactScore: 0,
  correctGroupPosition: 0,
  stageQualification: 0,
  correctPairing: 0,
  extraTimeMethod: 0,
  penaltyMethod: 0
};

export const worldCupDefaultScoringConfig: ScoringRuleConfig = {
  schemaVersion: 1,
  presetCode: "WORLD_CUP_DEFAULT",
  maxPointsPerField: 999,
  stages: {
    GROUP_STAGE: {
      ...emptyStageRule,
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 3
    },
    ROUND_OF_32: {
      ...emptyStageRule,
      stageQualification: 2,
      correctPairing: 5,
      correctOutcome: 5,
      exactScore: 10,
      extraTimeMethod: 2,
      penaltyMethod: 5
    },
    ROUND_OF_16: {
      ...emptyStageRule,
      stageQualification: 4,
      correctPairing: 10,
      correctOutcome: 10,
      exactScore: 15,
      extraTimeMethod: 4,
      penaltyMethod: 10
    },
    QUARTER_FINAL: {
      ...emptyStageRule,
      stageQualification: 8,
      correctPairing: 15,
      correctOutcome: 15,
      exactScore: 30,
      extraTimeMethod: 8,
      penaltyMethod: 15
    },
    SEMI_FINAL: {
      ...emptyStageRule,
      stageQualification: 15,
      correctPairing: 5,
      correctOutcome: 25,
      exactScore: 50,
      extraTimeMethod: 15,
      penaltyMethod: 30
    },
    THIRD_PLACE: {
      ...emptyStageRule,
      stageQualification: 10,
      correctPairing: 10,
      correctOutcome: 20,
      exactScore: 40,
      extraTimeMethod: 10,
      penaltyMethod: 20
    },
    FINAL: {
      ...emptyStageRule,
      stageQualification: 20,
      correctPairing: 30,
      correctOutcome: 50,
      exactScore: 100,
      extraTimeMethod: 20,
      penaltyMethod: 30
    }
  },
  antepost: {
    tournamentWinner: 25,
    topScorer: 25,
    topScorerExactGoals: 50
  },
  stacking: {
    exactScoreReplacesOutcome: true,
    topScorerExactGoalsReplacesTopScorer: true,
    qualificationAndPairingAreIndependent: true,
    advancementMethodRequiresDrawAndQualifier: true
  }
};
