import { describe, expect, it } from "vitest";

import {
  formatMemberRole,
  formatMemberStatus,
  formatSafeUserIdentity
} from "@/features/league/userIdentity";

describe("safe user identity formatting", () => {
  it("prefers a safe display name and uses username as secondary label", () => {
    expect(
      formatSafeUserIdentity({
        userId: "abcd1234-0000-4000-8000-000000000000",
        displayName: "Ada Lovelace",
        username: "ada"
      })
    ).toMatchObject({
      displayName: "Ada Lovelace",
      initials: "AL",
      secondaryLabel: "@ada",
      shortUserId: "abcd1234",
      source: "displayName"
    });
  });

  it("uses a safe username when display name is missing", () => {
    expect(
      formatSafeUserIdentity({
        userId: "12345678-0000-4000-8000-000000000000",
        username: "@calciofan"
      })
    ).toMatchObject({
      displayName: "@calciofan",
      initials: "CA",
      secondaryLabel: "ID 12345678",
      source: "username"
    });
  });

  it("falls back to a short user id with deterministic initials", () => {
    expect(
      formatSafeUserIdentity({
        userId: "fedcba98-0000-4000-8000-000000000000"
      })
    ).toMatchObject({
      displayName: "Utente fedcba98",
      fallbackName: "Utente fedcba98",
      initials: "FE",
      secondaryLabel: "ID fedcba98",
      source: "userId"
    });
  });

  it("handles missing or malformed user ids without exposing private fields", () => {
    expect(formatSafeUserIdentity({ userId: "???", avatarInitials: "x!" })).toMatchObject({
      displayName: "Utente sconosciuto",
      initials: "X",
      secondaryLabel: "ID non disponibile",
      source: "unknown"
    });

    expect(formatSafeUserIdentity({ userId: undefined })).toMatchObject({
      displayName: "Utente sconosciuto",
      initials: "UT",
      secondaryLabel: "ID non disponibile",
      source: "unknown"
    });
  });

  it("rejects email-like display names and usernames", () => {
    const identity = formatSafeUserIdentity({
      userId: "87654321-0000-4000-8000-000000000000",
      displayName: "ada@example.test",
      username: "ada@example.test"
    });

    expect(identity).toMatchObject({
      displayName: "Utente 87654321",
      secondaryLabel: "ID 87654321",
      source: "userId"
    });
    expect(JSON.stringify(identity)).not.toContain("ada@example.test");
  });

  it("formats member role and status labels for Italian UI copy", () => {
    expect(formatMemberRole("owner")).toBe("Owner");
    expect(formatMemberRole("participant")).toBe("Partecipante");
    expect(formatMemberStatus("active")).toBe("Attivo");
    expect(formatMemberStatus("removed")).toBe("Rimosso");
  });
});
