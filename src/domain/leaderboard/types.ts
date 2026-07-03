import type { ScoringEvent } from "@/domain/scoring/types";

export interface LeaderboardParticipant {
  userId: string;
  displayName: string;
  avatarInitials: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarInitials: string;
  rank: number;
  totalPoints: number;
  latestPoints: number;
  positionDelta: number;
  tied: boolean;
}

export interface LeaderboardSnapshot {
  id: string;
  leagueId: string;
  createdAtUtc: string;
  sourceResultVersion: string;
  entries: LeaderboardEntry[];
}

export interface LeaderboardInput {
  leagueId: string;
  createdAtUtc: string;
  sourceResultVersion: string;
  participants: LeaderboardParticipant[];
  allEvents: ScoringEvent[];
  latestEvents: ScoringEvent[];
  previousSnapshot?: LeaderboardSnapshot;
}
