import { isSupabaseUuid } from "@/services/supabase/identifiers";
import { PredictionWorkflowScreen } from "./PredictionWorkflowScreen";
import { SupabasePredictionWorkflowScreen } from "./SupabasePredictionWorkflowScreen";

export function PredictionWorkflowRouteScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  if (isSupabaseUuid(leagueId)) {
    return <SupabasePredictionWorkflowScreen leagueId={leagueId} />;
  }

  return <PredictionWorkflowScreen leagueId={leagueId} />;
}
