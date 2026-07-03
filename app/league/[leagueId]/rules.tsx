import { useLocalSearchParams } from "expo-router";

import { RulesScreen } from "@/features/rules/RulesScreen";

export default function RulesRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <RulesScreen leagueId={leagueId} />;
}
