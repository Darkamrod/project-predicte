import { useLocalSearchParams } from "expo-router";

import { ParticipantsScreen } from "@/features/participants/ParticipantsScreen";

export default function ParticipantsRoute(): React.ReactNode {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();

  return <ParticipantsScreen leagueId={leagueId} />;
}
