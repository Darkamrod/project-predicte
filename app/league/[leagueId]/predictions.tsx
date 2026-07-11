import { useLocalSearchParams } from "expo-router";

import { PredictionWorkflowRouteScreen } from "@/features/predictions/PredictionWorkflowRouteScreen";

export default function PredictionsRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <PredictionWorkflowRouteScreen leagueId={leagueId} />;
}
