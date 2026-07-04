import { useLocalSearchParams } from "expo-router";

import { PredictionWorkflowScreen } from "@/features/predictions/PredictionWorkflowScreen";

export default function PredictionsRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <PredictionWorkflowScreen leagueId={leagueId} />;
}
