export type UserIdentitySource = "displayName" | "username" | "userId" | "unknown";

export interface SafeUserIdentityInput {
  userId?: string | null | undefined;
  displayName?: string | null | undefined;
  username?: string | null | undefined;
  avatarInitials?: string | null | undefined;
}

export interface SafeUserIdentity {
  displayName: string;
  fallbackName: string;
  initials: string;
  secondaryLabel: string;
  shortUserId: string;
  source: UserIdentitySource;
}

const UNKNOWN_SHORT_ID = "sconosciuto";

export function formatSafeUserIdentity(input: SafeUserIdentityInput): SafeUserIdentity {
  const shortUserId = createShortUserId(input.userId);
  const fallbackName =
    shortUserId === UNKNOWN_SHORT_ID ? "Utente sconosciuto" : `Utente ${shortUserId}`;
  const displayName = normalizePublicText(input.displayName);
  const username = normalizeUsername(input.username);
  const source = resolveIdentitySource(displayName, username, shortUserId);
  const resolvedDisplayName = displayName ?? username ?? fallbackName;
  const initials =
    normalizeInitials(input.avatarInitials) ??
    createFallbackInitials(source, shortUserId, resolvedDisplayName);

  return {
    displayName: resolvedDisplayName,
    fallbackName,
    initials,
    secondaryLabel: createSecondaryLabel(source, username, shortUserId),
    shortUserId,
    source
  };
}

export function formatMemberRole(role: string): string {
  const labels: Record<string, string> = {
    admin: "Admin",
    owner: "Owner",
    participant: "Partecipante"
  };

  return labels[role] ?? role;
}

export function formatMemberStatus(status: string): string {
  const labels: Record<string, string> = {
    active: "Attivo",
    removed: "Rimosso"
  };

  return labels[status] ?? status;
}

function resolveIdentitySource(
  displayName: string | undefined,
  username: string | undefined,
  shortUserId: string
): UserIdentitySource {
  if (displayName) {
    return "displayName";
  }

  if (username) {
    return "username";
  }

  return shortUserId === UNKNOWN_SHORT_ID ? "unknown" : "userId";
}

function createSecondaryLabel(
  source: UserIdentitySource,
  username: string | undefined,
  shortUserId: string
): string {
  if (source === "displayName" && username) {
    return username;
  }

  return shortUserId === UNKNOWN_SHORT_ID ? "ID non disponibile" : `ID ${shortUserId}`;
}

function createShortUserId(userId: string | null | undefined): string {
  const compact = (userId ?? "")
    .trim()
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8);

  return compact || UNKNOWN_SHORT_ID;
}

function normalizePublicText(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");

  if (!trimmed || looksLikePrivateIdentifier(trimmed)) {
    return undefined;
  }

  return trimmed.slice(0, 60);
}

function normalizeUsername(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim().replace(/^@+/, "");

  if (!trimmed || looksLikePrivateIdentifier(trimmed) || !/^[a-z0-9._-]{2,32}$/i.test(trimmed)) {
    return undefined;
  }

  return `@${trimmed}`;
}

function looksLikePrivateIdentifier(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

function normalizeInitials(value: string | null | undefined): string | undefined {
  const compact = (value ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase();

  return compact || undefined;
}

function createFallbackInitials(
  source: UserIdentitySource,
  shortUserId: string,
  displayName: string
): string {
  if (source === "userId") {
    return createInitials(shortUserId);
  }

  if (source === "unknown") {
    return "UT";
  }

  return createInitials(displayName);
}

function createInitials(value: string): string {
  const words = value
    .replace(/^@/, "")
    .split(/[\s._-]+/)
    .map((part) => part.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    const first = words[0]?.[0] ?? "";
    const second = words[1]?.[0] ?? "";

    return `${first}${second}`.toUpperCase();
  }

  const compact = words.join("").slice(0, 2).toUpperCase();

  return compact || "UT";
}
