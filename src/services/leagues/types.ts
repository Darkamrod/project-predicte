import type { CompetitionSeed } from "@/domain/competitions/types";
import type { LeaderboardSnapshot } from "@/domain/leaderboard/types";
import type { LeagueStatus, PredictionSet } from "@/domain/predictions/types";
import type {
  ScoringEvent,
  ScoringRuleChange,
  ScoringRuleVersion,
  UserScoringBreakdown
} from "@/domain/scoring/types";

export type LeagueMemberRole = "owner" | "admin" | "participant";

export interface LeagueMember {
  userId: string;
  displayName: string;
  avatarInitials: string;
  role: LeagueMemberRole;
  joinedAtUtc: string;
}

export interface League {
  id: string;
  name: string;
  competitionEditionId: string;
  ownerUserId: string;
  status: LeagueStatus;
  deadlineAtUtc: string;
  inviteCode: string;
  members: LeagueMember[];
  scoringRuleVersion: ScoringRuleVersion;
  scoringRuleHistory: ScoringRuleChange[];
  predictionSets: PredictionSet[];
  scoringEvents: ScoringEvent[];
  scoringBreakdowns: UserScoringBreakdown[];
  leaderboardSnapshots: LeaderboardSnapshot[];
}

export interface MockLeagueState {
  competition: CompetitionSeed;
  leagues: League[];
}
