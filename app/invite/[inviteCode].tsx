import { useLocalSearchParams, useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";

import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton } from "@/components/Buttons";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export default function InviteRoute(): React.ReactNode {
  const router = useRouter();
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const { joinLeague } = usePredicteMock();

  return (
    <AppScreen>
      <AppHeader title="Invito lega" subtitle={`Codice mock: ${inviteCode}`} />
      <PrimaryButton
        icon={UserPlus}
        label="Unisciti alla lega mock"
        onPress={() => {
          const leagueId = joinLeague(inviteCode);
          router.replace({ pathname: "/league/[leagueId]", params: { leagueId } });
        }}
      />
    </AppScreen>
  );
}
