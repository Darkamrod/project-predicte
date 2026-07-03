import type { AuthAdapter, AuthUser } from "./types";

export const mockCurrentUser: AuthUser = {
  id: "user-current",
  displayName: "Tu",
  avatarInitials: "TU",
  locale: "it-IT",
  timezone: "Europe/Rome"
};

export class MockAuthAdapter implements AuthAdapter {
  async getCurrentUser(): Promise<AuthUser> {
    return mockCurrentUser;
  }
}
