import type { ScoringRuleConfig, ScoringRuleVersion, ScoringStageKey } from "./types";

export function createDraftScoringRuleVersion(params: {
  leagueId: string;
  config: ScoringRuleConfig;
  createdAtUtc: string;
}): ScoringRuleVersion {
  return {
    id: `${params.leagueId}-rules-v1`,
    leagueId: params.leagueId,
    version: 1,
    status: "draft",
    schemaVersion: params.config.schemaVersion,
    config: cloneConfig(params.config),
    createdAtUtc: params.createdAtUtc
  };
}

export function lockScoringRuleVersion(
  draft: ScoringRuleVersion,
  lockedAtUtc: string
): ScoringRuleVersion {
  if (draft.status === "locked") {
    return draft;
  }

  return {
    ...draft,
    status: "locked",
    checksum: createConfigChecksum(draft.config),
    lockedAtUtc
  };
}

export function updateStageRuleValue(
  ruleVersion: ScoringRuleVersion,
  stage: ScoringStageKey,
  field: keyof ScoringRuleConfig["stages"][ScoringStageKey],
  value: number
): ScoringRuleVersion {
  if (ruleVersion.status === "locked") {
    throw new Error("Locked scoring rules are immutable.");
  }

  if (!Number.isInteger(value) || value < 0 || value > ruleVersion.config.maxPointsPerField) {
    throw new Error("Scoring value is outside the allowed range.");
  }

  return {
    ...ruleVersion,
    config: {
      ...ruleVersion.config,
      stages: {
        ...ruleVersion.config.stages,
        [stage]: {
          ...ruleVersion.config.stages[stage],
          [field]: value
        }
      }
    }
  };
}

export function createConfigChecksum(config: ScoringRuleConfig): string {
  const input = stableStringify(config);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function cloneConfig(config: ScoringRuleConfig): ScoringRuleConfig {
  return JSON.parse(JSON.stringify(config)) as ScoringRuleConfig;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
}
