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
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import type { LeaderboardEntry } from "@/domain/leaderboard/types";
import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import type {
  LeaderboardEntryListItem,
  LeagueMemberListItem
} from "@/services/leagues/supabaseLeagueReadRepository";
import type { League, LeagueMember } from "@/services/leagues/types";
import { usePredicteMock } from "@/state/PredicteMockProvider";
import {
  isSupabasePreviewLeagueId,
  useSupabaseLeagueOverviewPreview,
  type SupabaseLeagueOverviewPreview
} from "./useSupabaseLeagueOverviewPreview";

const MOCK_PREVIEW_ROWS = 5;

export function LeagueOverviewScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, competition, getLeague, lockLeague, settleMockResult } = usePredicteMock();
  const league = getLeague(leagueId);
  const supabasePreview = useSupabaseLeagueOverviewPreview(leagueId);

  if (!league) {
    if (supabasePreview.enabled) {
      return <SupabaseLeaguePreviewOnlyScreen leagueId={leagueId} preview={supabasePreview} />;
    }

    if (isSupabasePreviewLeagueId(leagueId)) {
      return (
        <AppScreen>
          <ErrorState message="Supabase non configurato per questa preview." />
        </AppScreen>
      );
    }

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

      <ParticipantsPreviewCard league={league} preview={supabasePreview} />
      <LeaderboardPreviewCard league={league} preview={supabasePreview} />

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

function SupabaseLeaguePreviewOnlyScreen({
  leagueId,
  preview
}: {
  leagueId: string;
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppScreen>
      <AppHeader title="Lega Supabase" subtitle={`ID ${leagueId.slice(0, 8)}`} />
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Anteprima read-only</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Questa vista usa solo letture paginabili per membri e snapshot classifica esistenti. Le
          azioni demo restano disponibili solo sulle leghe mock.
        </Text>
      </AppCard>
      <ParticipantsPreviewCard preview={preview} />
      <LeaderboardPreviewCard preview={preview} />
    </AppScreen>
  );
}

function ParticipantsPreviewCard({
  league,
  preview
}: {
  league?: League | undefined;
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const isRealPreview = preview.enabled;
  const badgeLabel = isRealPreview
    ? `${preview.members.pagination.totalItems} totali`
    : `${league?.members.length ?? 0} demo`;

  return (
    <AppCard style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.flex}>
          <Text style={[styles.kicker, { color: theme.colors.primary }]}>
            {isRealPreview ? "Supabase paginato" : "Fallback demo"}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Partecipanti</Text>
          <Text style={[styles.previewSubtitle, { color: theme.colors.textSecondary }]}>
            Lettura per lega con pagine compatte, pronta per circa 200 partecipanti e headroom 500.
          </Text>
        </View>
        <StatusBadge label={badgeLabel} tone={preview.members.error ? "error" : "primary"} />
      </View>

      {isRealPreview ? (
        <SupabaseMembersPreview preview={preview} />
      ) : (
        <MockMembersPreview members={(league?.members ?? []).slice(0, MOCK_PREVIEW_ROWS)} />
      )}
    </AppCard>
  );
}

function LeaderboardPreviewCard({
  league,
  preview
}: {
  league?: League | undefined;
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const isRealPreview = preview.enabled;
  const snapshot = league?.leaderboardSnapshots.at(-1);
  const badgeLabel = isRealPreview
    ? preview.leaderboard.snapshot
      ? `${preview.leaderboard.pagination.totalItems} righe`
      : "Nessuno snapshot"
    : snapshot
      ? `${snapshot.entries.length} demo`
      : "In attesa";

  return (
    <AppCard style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.flex}>
          <Text style={[styles.kicker, { color: theme.colors.primary }]}>
            {isRealPreview ? "Snapshot Supabase read-only" : "Snapshot demo"}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Classifica preview
          </Text>
          <Text style={[styles.previewSubtitle, { color: theme.colors.textSecondary }]}>
            Mostra solo snapshot esistenti: nessun calcolo ufficiale viene eseguito nella UI.
          </Text>
        </View>
        <StatusBadge label={badgeLabel} tone={preview.leaderboard.error ? "error" : "primary"} />
      </View>

      {isRealPreview ? (
        <SupabaseLeaderboardPreview preview={preview} />
      ) : (
        <MockLeaderboardPreview entries={snapshot?.entries.slice(0, MOCK_PREVIEW_ROWS) ?? []} />
      )}
    </AppCard>
  );
}

function SupabaseMembersPreview({
  preview
}: {
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const members = preview.members.items;

  if (preview.members.loading && members.length === 0) {
    return <PreviewMessage message="Caricamento partecipanti reali..." />;
  }

  if (preview.members.error) {
    return (
      <>
        <PreviewMessage message={`Impossibile caricare i partecipanti: ${preview.members.error}`} />
        <SecondaryButton label="Riprova" onPress={preview.refresh} />
      </>
    );
  }

  if (members.length === 0) {
    return <PreviewMessage message="Nessun partecipante reale visibile per questa lega." />;
  }

  return (
    <>
      <View style={styles.previewList}>
        {members.map((member) => (
          <RealMemberPreviewRow key={member.userId} member={member} />
        ))}
      </View>
      {preview.members.pagination.hasNextPage ? (
        <SecondaryButton
          label={preview.members.loadingMore ? "Caricamento..." : "Carica altri partecipanti"}
          disabled={preview.members.loadingMore}
          onPress={preview.loadMoreMembers}
        />
      ) : (
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          Tutti i partecipanti caricati per questa pagina di anteprima.
        </Text>
      )}
    </>
  );
}

function MockMembersPreview({ members }: { members: LeagueMember[] }): React.ReactNode {
  if (members.length === 0) {
    return <PreviewMessage message="Nessun partecipante demo disponibile." />;
  }

  return (
    <View style={styles.previewList}>
      {members.map((member) => (
        <MockMemberPreviewRow key={member.userId} member={member} />
      ))}
    </View>
  );
}

function SupabaseLeaderboardPreview({
  preview
}: {
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const entries = preview.leaderboard.items;

  if (preview.leaderboard.loading && entries.length === 0) {
    return <PreviewMessage message="Caricamento snapshot classifica..." />;
  }

  if (preview.leaderboard.error) {
    return (
      <>
        <PreviewMessage
          message={`Impossibile caricare la classifica: ${preview.leaderboard.error}`}
        />
        <SecondaryButton label="Riprova" onPress={preview.refresh} />
      </>
    );
  }

  if (!preview.leaderboard.snapshot) {
    return (
      <PreviewMessage message="Nessuno snapshot leaderboard disponibile. La UI non calcola classifiche ufficiali lato client." />
    );
  }

  if (entries.length === 0) {
    return <PreviewMessage message="Snapshot presente, ma nessuna riga classifica visibile." />;
  }

  return (
    <>
      <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
        Aggiornata da {preview.leaderboard.snapshot.sourceResultKey}
      </Text>
      <View style={styles.previewList}>
        {entries.map((entry) => (
          <RealLeaderboardPreviewRow key={`${entry.snapshotId}-${entry.userId}`} entry={entry} />
        ))}
      </View>
      {preview.leaderboard.pagination.hasNextPage ? (
        <SecondaryButton
          label={preview.leaderboard.loadingMore ? "Caricamento..." : "Carica altre posizioni"}
          disabled={preview.leaderboard.loadingMore}
          onPress={preview.loadMoreLeaderboard}
        />
      ) : null}
    </>
  );
}

function MockLeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }): React.ReactNode {
  if (entries.length === 0) {
    return (
      <PreviewMessage message="Nessuno snapshot demo disponibile: simula un risultato per popolare la classifica." />
    );
  }

  return (
    <View style={styles.previewList}>
      {entries.map((entry) => (
        <MockLeaderboardPreviewRow key={entry.userId} entry={entry} />
      ))}
    </View>
  );
}

function RealMemberPreviewRow({ member }: { member: LeagueMemberListItem }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <ParticipantAvatar initials={initialsFromUserId(member.userId)} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {formatUserId(member.userId)}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {roleLabel(member.role)} · {memberStatusLabel(member.status)}
        </Text>
      </View>
      <StatusBadge
        label={memberStatusLabel(member.status)}
        tone={member.status === "active" ? "success" : "neutral"}
      />
    </View>
  );
}

function MockMemberPreviewRow({ member }: { member: LeagueMember }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <ParticipantAvatar initials={member.avatarInitials} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {member.displayName}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {roleLabel(member.role)} · Demo
        </Text>
      </View>
    </View>
  );
}

function RealLeaderboardPreviewRow({
  entry
}: {
  entry: LeaderboardEntryListItem;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <Text style={[styles.previewRank, { color: theme.colors.textPrimary }]}>#{entry.rank}</Text>
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {formatUserId(entry.userId)}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          Ultimo update: +{entry.latestPoints}
        </Text>
      </View>
      <View style={styles.previewPointsBlock}>
        <Text style={[styles.previewPoints, { color: theme.colors.textPrimary }]}>
          {entry.totalPoints}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {formatDelta(entry.positionDelta)}
        </Text>
      </View>
    </View>
  );
}

function MockLeaderboardPreviewRow({ entry }: { entry: LeaderboardEntry }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <Text style={[styles.previewRank, { color: theme.colors.textPrimary }]}>#{entry.rank}</Text>
      <ParticipantAvatar initials={entry.avatarInitials} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {entry.displayName}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          Ultimo update: +{entry.latestPoints}
        </Text>
      </View>
      <View style={styles.previewPointsBlock}>
        <Text style={[styles.previewPoints, { color: theme.colors.textPrimary }]}>
          {entry.totalPoints}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {formatDelta(entry.positionDelta)}
        </Text>
      </View>
    </View>
  );
}

function PreviewMessage({ message }: { message: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{message}</Text>;
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

function formatUserId(userId: string): string {
  return `Utente ${userId.slice(0, 8)}`;
}

function initialsFromUserId(userId: string): string {
  const compact = userId
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase();

  return compact || "UT";
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Admin",
    owner: "Owner",
    participant: "Partecipante"
  };

  return labels[role] ?? role;
}

function memberStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Attivo",
    removed: "Rimosso"
  };

  return labels[status] ?? status;
}

function formatDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
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
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
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
  },
  previewCard: {
    gap: 14
  },
  previewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  previewSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  previewList: {
    gap: 8
  },
  previewRow: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    padding: 10
  },
  previewTextBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  previewName: {
    fontSize: 15,
    fontWeight: "800"
  },
  previewMeta: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  previewRank: {
    fontSize: 17,
    fontWeight: "900",
    minWidth: 36,
    textAlign: "center"
  },
  previewPointsBlock: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 48
  },
  previewPoints: {
    fontSize: 18,
    fontWeight: "900"
  },
  flex: {
    flex: 1
  }
});
