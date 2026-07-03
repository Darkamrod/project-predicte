import { Eye, EyeOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { ErrorState } from "@/components/ErrorState";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { canReadParticipantPredictions } from "@/domain/predictions/locks";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function ParticipantsScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, getLeague } = usePredicteMock();
  const league = getLeague(leagueId);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.participants} subtitle={league.name} />
      {league.members.map((member) => {
        const readable = canReadParticipantPredictions({
          leagueStatus: league.status,
          requesterUserId: currentUser.id,
          participantUserId: member.userId
        });
        const Icon = readable ? Eye : EyeOff;

        return (
          <AppCard key={member.userId}>
            <View style={styles.row}>
              <ParticipantAvatar initials={member.avatarInitials} />
              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  {member.displayName}
                </Text>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                  Ruolo: {member.role}
                </Text>
              </View>
              <StatusBadge
                label={readable ? strings.copy.visibleAfterLock : strings.copy.hiddenUntilLock}
                tone={readable ? "success" : "warning"}
              />
            </View>
            <View style={styles.visibilityRow}>
              <Icon color={readable ? theme.colors.success : theme.colors.warning} size={18} />
              <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                {readable
                  ? "Dettaglio pronostici mock disponibile."
                  : "La privacy pre-lock viene simulata anche nel repository mock."}
              </Text>
            </View>
          </AppCard>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  textBlock: {
    flex: 1,
    gap: 3
  },
  title: {
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  visibilityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  }
});
