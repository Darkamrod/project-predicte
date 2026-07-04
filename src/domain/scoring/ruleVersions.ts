import type {
  AntepostScoringRule,
  ScoringRuleChange,
  ScoringRuleConfig,
  ScoringRuleVersion,
  ScoringStageKey,
  StageScoringRule
} from "./types";

export interface ScoringRuleEditState {
  leagueId: string;
  leagueStatus: "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";
  deadlineAtUtc: string;
  ruleStatus: ScoringRuleVersion["status"];
  currentUserRole: "owner" | "admin" | "participant";
}

export interface ScoringRuleUpdateWithHistoryParams {
  ruleVersion: ScoringRuleVersion;
  stage: ScoringStageKey;
  field: keyof StageScoringRule;
  value: number;
  actorUserId: string;
  actorDisplayName: string;
  changedAtUtc: string;
}

export interface AntepostRuleUpdateWithHistoryParams {
  ruleVersion: ScoringRuleVersion;
  field: keyof AntepostScoringRule;
  value: number;
  actorUserId: string;
  actorDisplayName: string;
  changedAtUtc: string;
}

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
    config: cloneConfig(draft.config),
    checksum: createConfigChecksum(draft.config),
    lockedAtUtc
  };
}

export function updateStageRuleValue(
  ruleVersion: ScoringRuleVersion,
  stage: ScoringStageKey,
  field: keyof StageScoringRule,
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

export function updateStageRuleValueWithHistory(params: ScoringRuleUpdateWithHistoryParams): {
  ruleVersion: ScoringRuleVersion;
  change: ScoringRuleChange;
} {
  const previousValue = params.ruleVersion.config.stages[params.stage][params.field];
  const ruleVersion = updateStageRuleValue(
    params.ruleVersion,
    params.stage,
    params.field,
    params.value
  );

  return {
    ruleVersion,
    change: {
      id: `${params.ruleVersion.id}:${params.stage}:${String(params.field)}:${params.changedAtUtc}`,
      leagueId: params.ruleVersion.leagueId,
      ruleVersionId: params.ruleVersion.id,
      actorUserId: params.actorUserId,
      actorDisplayName: params.actorDisplayName,
      changedAtUtc: params.changedAtUtc,
      scope: "stage",
      stage: params.stage,
      field: params.field,
      previousValue,
      nextValue: params.value
    }
  };
}

export function updateAntepostRuleValue(
  ruleVersion: ScoringRuleVersion,
  field: keyof AntepostScoringRule,
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
      antepost: {
        ...ruleVersion.config.antepost,
        [field]: value
      }
    }
  };
}

export function updateAntepostRuleValueWithHistory(params: AntepostRuleUpdateWithHistoryParams): {
  ruleVersion: ScoringRuleVersion;
  change: ScoringRuleChange;
} {
  const previousValue = params.ruleVersion.config.antepost[params.field];
  const ruleVersion = updateAntepostRuleValue(params.ruleVersion, params.field, params.value);

  return {
    ruleVersion,
    change: {
      id: `${params.ruleVersion.id}:antepost:${String(params.field)}:${params.changedAtUtc}`,
      leagueId: params.ruleVersion.leagueId,
      ruleVersionId: params.ruleVersion.id,
      actorUserId: params.actorUserId,
      actorDisplayName: params.actorDisplayName,
      changedAtUtc: params.changedAtUtc,
      scope: "antepost",
      field: params.field,
      previousValue,
      nextValue: params.value
    }
  };
}

export function canEditScoringRules(state: ScoringRuleEditState, serverNowUtc: string): boolean {
  const roleCanEdit = state.currentUserRole === "owner" || state.currentUserRole === "admin";
  const leagueAcceptsEdits = state.leagueStatus === "open";
  const beforeDeadline = Date.parse(serverNowUtc) < Date.parse(state.deadlineAtUtc);

  return roleCanEdit && leagueAcceptsEdits && beforeDeadline && state.ruleStatus === "draft";
}

export function assertScoringRulesWritable(
  state: ScoringRuleEditState,
  serverNowUtc: string
): void {
  if (!canEditScoringRules(state, serverNowUtc)) {
    throw new Error("Scoring rules can only be edited by owner/admin before lock and deadline.");
  }
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
