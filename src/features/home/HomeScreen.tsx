import { Link, useRouter } from "expo-router";
import { ChevronRight, Plus, UserPlus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function HomeScreen(): React.ReactNode {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { leagues, currentUser, competition, createLeague, joinLeague } = usePredicteMock();
  const activeLeague = leagues[0];
  const activePredictionSet = activeLeague?.predictionSets.find(
    (set) => set.userId === currentUser.id
  );
  const activeProgress = activePredictionSet
    ? calculatePredictionCompletion(activePredictionSet).percentComplete
    : 0;

  return (
    <AppScreen>
      <AppHeader title={strings.appName} subtitle={strings.copy.mockOnly} />
      <View style={styles.actions}>
        <PrimaryButton
          icon={Plus}
          label={strings.actions.createLeague}
          onPress={() => {
            const leagueId = createLeague();
            router.push({ pathname: "/league/[leagueId]", params: { leagueId } });
          }}
        />
        <SecondaryButton
          icon={UserPlus}
          label={strings.actions.joinLeague}
          onPress={() => {
            const leagueId = joinLeague("AMICI2030");
            router.push({ pathname: "/league/[leagueId]", params: { leagueId } });
          }}
        />
      </View>

      {activeLeague ? (
        <AppCard>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                {activeLeague.name}
              </Text>
              <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                {competition.edition.name}
              </Text>
            </View>
            <StatusBadge label={strings.status[activeLeague.status]} tone="primary" />
          </View>
          <DeadlineBanner deadlineAtUtc={activeLeague.deadlineAtUtc} status={activeLeague.status} />
          <ProgressBar value={activeProgress} label={strings.copy.predictionProgress} />
          <Link
            accessibilityRole="link"
            href={{ pathname: "/league/[leagueId]", params: { leagueId: activeLeague.id } }}
            style={[styles.link, { color: theme.colors.primary }]}
          >
            {strings.actions.open} <ChevronRight color={theme.colors.primary} size={16} />
          </Link>
        </AppCard>
      ) : (
        <EmptyState title={strings.copy.noLeagues} body="Crea una lega mock per iniziare." />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 20,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  link: {
    alignItems: "center",
    fontSize: 16,
    fontWeight: "800"
  }
});
