import { useLocalSearchParams } from "expo-router";

import { LeaderboardScreen } from "@/features/leaderboard/LeaderboardScreen";

export default function LeaderboardRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <LeaderboardScreen leagueId={leagueId} />;
}
