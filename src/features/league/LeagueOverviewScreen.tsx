import { Link } from "expo-router";
import {
  BarChart3,
  ClipboardList,
  Lock,
  PlayCircle,
  ShieldCheck,
  Users
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ErrorState } from "@/components/ErrorState";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function LeagueOverviewScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, competition, getLeague, lockLeague, settleMockResult } = usePredicteMock();
  const league = getLeague(leagueId);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  const predictionSet = league.predictionSets.find((set) => set.userId === currentUser.id);
  const completion = predictionSet
    ? calculatePredictionCompletion(predictionSet)
    : {
        completedItems: 0,
        incompleteItems: 0,
        percentComplete: 0,
        totalRequired: 0,
        unsyncedItems: 0,
        validationIssues: []
      };
  const latestSnapshot = league.leaderboardSnapshots.at(-1);
  const currentUserRank = latestSnapshot?.entries.find((entry) => entry.userId === currentUser.id);

  return (
    <AppScreen>
      <AppHeader title={league.name} subtitle={competition.edition.name} />
      <AppCard>
        <View style={styles.headerRow}>
          <StatusBadge label={strings.status[league.status]} tone="primary" />
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
            {league.members.length} partecipanti
          </Text>
        </View>
        <DeadlineBanner deadlineAtUtc={league.deadlineAtUtc} status={league.status} />
        <ProgressBar value={completion.percentComplete} label={strings.copy.predictionProgress} />
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {completion.completedItems}/{completion.totalRequired} pronostici completati.{" "}
          {completion.unsyncedItems === 0 ? strings.status.synced : strings.status.local}.
        </Text>
      </AppCard>

      <View style={styles.grid}>
        <LeagueLink
          href={{ pathname: "/league/[leagueId]/predictions", params: { leagueId } }}
          icon={<ClipboardList color={theme.colors.primary} size={22} />}
          title={strings.leagueSections.predictions}
        />
        <LeagueLink
          href={{ pathname: "/league/[leagueId]/leaderboard", params: { leagueId } }}
          icon={<BarChart3 color={theme.colors.primary} size={22} />}
          title={strings.leagueSections.leaderboard}
        />
        <LeagueLink
          href={{ pathname: "/league/[leagueId]/participants", params: { leagueId } }}
          icon={<Users color={theme.colors.primary} size={22} />}
          title={strings.leagueSections.participants}
        />
        <LeagueLink
          href={{ pathname: "/league/[leagueId]/rules", params: { leagueId } }}
          icon={<ShieldCheck color={theme.colors.primary} size={22} />}
          title={strings.leagueSections.rules}
        />
      </View>

      {currentUserRank ? (
        <AppCard>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>La tua posizione</Text>
          <Text style={[styles.rank, { color: theme.colors.textPrimary }]}>
            #{currentUserRank.rank} - {currentUserRank.totalPoints} punti
          </Text>
        </AppCard>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          icon={PlayCircle}
          label={strings.actions.settleResult}
          onPress={() => settleMockResult(league.id)}
        />
        <SecondaryButton
          icon={Lock}
          label={strings.actions.lockLeague}
          disabled={league.status !== "open"}
          onPress={() => lockLeague(league.id)}
        />
      </View>
    </AppScreen>
  );
}

function LeagueLink({
  href,
  icon,
  title
}: {
  href: Parameters<typeof Link>[0]["href"];
  icon: React.ReactNode;
  title: string;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Link href={href} asChild>
      <AppCard style={styles.linkCard}>
        {icon}
        <Text style={[styles.linkTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      </AppCard>
    </Link>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  meta: {
    fontSize: 14,
    fontWeight: "700"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  title: {
    fontSize: 18,
    fontWeight: "800"
  },
  rank: {
    fontSize: 24,
    fontWeight: "900"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  linkCard: {
    flexBasis: "47%",
    minHeight: 104
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  }
});
