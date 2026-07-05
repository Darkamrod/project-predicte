import type { ResultProviderCode } from "./types";

export type ProviderImportFailureKind = "none" | "retryable" | "non_retryable";

export interface ProviderImportRetryCandidate {
  leagueId: string;
  provider: ResultProviderCode;
  externalFixtureKey: string;
  sourceResultKey: string;
  retryAttempt: number;
  maxRetries: number;
  nextRetryAtUtc: string;
  correctionOfSourceResultKey?: string | undefined;
  errorMessage?: string | undefined;
}

export interface ProviderImportRetryPlan {
  failureKind: ProviderImportFailureKind;
  retryAttempt: number;
  maxRetries: number;
  nextRetryAtUtc?: string | undefined;
}

export function classifyProviderImportFailure(params: {
  errorMessage?: string | undefined;
  retryAttempt: number;
  maxRetries: number;
  nextRetryAtUtc?: string | undefined;
}): ProviderImportFailureKind {
  if (params.retryAttempt < 0 || params.maxRetries < 0) {
    throw new Error("Retry metadata must be non-negative.");
  }

  if (isMissingCorrectionSource(params.errorMessage)) {
    return "non_retryable";
  }

  if (params.retryAttempt < params.maxRetries && Boolean(params.nextRetryAtUtc)) {
    return "retryable";
  }

  return "non_retryable";
}

export function createProviderImportRetryPlan(params: {
  errorMessage?: string | undefined;
  retryAttempt: number;
  maxRetries: number;
  nextRetryAtUtc?: string | undefined;
}): ProviderImportRetryPlan {
  const failureKind = classifyProviderImportFailure(params);

  return {
    failureKind,
    retryAttempt: params.retryAttempt,
    maxRetries: params.maxRetries,
    ...(failureKind === "retryable" && params.nextRetryAtUtc
      ? { nextRetryAtUtc: params.nextRetryAtUtc }
      : {})
  };
}

export function isRetryCandidateDue(
  candidate: ProviderImportRetryCandidate,
  nowUtc: string
): boolean {
  if (!candidate.nextRetryAtUtc.endsWith("Z") || !nowUtc.endsWith("Z")) {
    throw new Error("Retry timestamps must be UTC ISO strings.");
  }

  return (
    candidate.retryAttempt < candidate.maxRetries &&
    Date.parse(candidate.nextRetryAtUtc) <= Date.parse(nowUtc)
  );
}

function isMissingCorrectionSource(errorMessage: string | undefined): boolean {
  return (
    errorMessage?.toLowerCase().includes("correction source result key was not found") ?? false
  );
}
