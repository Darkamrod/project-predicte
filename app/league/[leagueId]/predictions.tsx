import { useLocalSearchParams } from "expo-router";

import { GroupPredictionsScreen } from "@/features/predictions/GroupPredictionsScreen";

export default function PredictionsRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <GroupPredictionsScreen leagueId={leagueId} />;
}
