export interface AuthUser {
  id: string;
  displayName: string;
  avatarInitials: string;
  locale: "it-IT";
  timezone: string;
}

export interface AuthAdapter {
  getCurrentUser(): Promise<AuthUser>;
}
