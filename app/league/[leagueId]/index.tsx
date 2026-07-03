import { useLocalSearchParams } from "expo-router";

import { LeagueOverviewScreen } from "@/features/league/LeagueOverviewScreen";

export default function LeagueOverviewRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <LeagueOverviewScreen leagueId={leagueId} />;
}
