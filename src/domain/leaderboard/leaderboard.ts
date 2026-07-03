import type {
  LeaderboardEntry,
  LeaderboardInput,
  LeaderboardParticipant,
  LeaderboardSnapshot
} from "./types";

export function createLeaderboardSnapshot(input: LeaderboardInput): LeaderboardSnapshot {
  const previousRankByUserId = new Map(
    input.previousSnapshot?.entries.map((entry) => [entry.userId, entry.rank]) ?? []
  );
  const totalPointsByUserId = sumPointsByUser(input.allEvents);
  const latestPointsByUserId = sumPointsByUser(input.latestEvents);

  const sortedEntries = input.participants
    .map((participant) =>
      createUnrankedEntry(
        participant,
        totalPointsByUserId,
        latestPointsByUserId,
        previousRankByUserId
      )
    )
    .sort(
      (left, right) =>
        right.totalPoints - left.totalPoints || left.displayName.localeCompare(right.displayName)
    );

  const rankedEntries = assignCompetitionRanks(sortedEntries);

  return {
    id: `${input.leagueId}:leaderboard:${input.sourceResultVersion}`,
    leagueId: input.leagueId,
    createdAtUtc: input.createdAtUtc,
    sourceResultVersion: input.sourceResultVersion,
    entries: rankedEntries
  };
}

function createUnrankedEntry(
  participant: LeaderboardParticipant,
  totalPointsByUserId: Map<string, number>,
  latestPointsByUserId: Map<string, number>,
  previousRankByUserId: Map<string, number>
): LeaderboardEntry {
  const previousRank = previousRankByUserId.get(participant.userId);

  return {
    userId: participant.userId,
    displayName: participant.displayName,
    avatarInitials: participant.avatarInitials,
    rank: 0,
    totalPoints: totalPointsByUserId.get(participant.userId) ?? 0,
    latestPoints: latestPointsByUserId.get(participant.userId) ?? 0,
    positionDelta: previousRank === undefined ? 0 : previousRank,
    tied: false
  };
}

function assignCompetitionRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  let previousPoints: number | undefined;
  let previousRank = 0;
  const pointCounts = new Map<number, number>();

  for (const entry of entries) {
    pointCounts.set(entry.totalPoints, (pointCounts.get(entry.totalPoints) ?? 0) + 1);
  }

  return entries.map((entry, index) => {
    const rank = previousPoints === entry.totalPoints ? previousRank : index + 1;
    const previousRankValue = entry.positionDelta;
    previousPoints = entry.totalPoints;
    previousRank = rank;

    return {
      ...entry,
      rank,
      positionDelta: previousRankValue === 0 ? 0 : previousRankValue - rank,
      tied: (pointCounts.get(entry.totalPoints) ?? 0) > 1
    };
  });
}

function sumPointsByUser(
  events: { participantUserId: string; points: number }[]
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const event of events) {
    totals.set(event.participantUserId, (totals.get(event.participantUserId) ?? 0) + event.points);
  }

  return totals;
}
