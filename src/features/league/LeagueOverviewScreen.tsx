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
import {
  resolvePredictionCompletionOverviewAvailability,
  type PredictionCompletionOverviewState
} from "@/domain/predictions/completionOverview";
import {
  resolvePersonalPredictionCompletion,
  type PersonalPredictionCompletion
} from "@/domain/predictions/personalCompletion";
import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import type {
  LeaderboardEntryListItem,
  LeagueMemberListItem,
  PredictionCompletionParticipantItem
} from "@/services/leagues/supabaseLeagueReadRepository";
import type { League, LeagueMember } from "@/services/leagues/types";
import { usePredicteMock } from "@/state/PredicteMockProvider";
import { formatMemberRole, formatMemberStatus, formatSafeUserIdentity } from "./userIdentity";
import {
  resolvePersonalPredictionWorkflowAction,
  type PersonalPredictionWorkflowAction
} from "./personalPredictionWorkflowNavigation";
import {
  isSupabasePreviewLeagueId,
  useSupabaseLeagueOverviewPreview,
  type SupabaseLeagueOverviewPreview
} from "./useSupabaseLeagueOverviewPreview";

const MOCK_PREVIEW_ROWS = 5;

interface PredictionCompletionSummaryView {
  completePredictionSets: number;
  incompletePredictionSets: number;
  lockedPredictionSets: number;
  missingPredictionSets: number;
  totalParticipants: number;
}

interface MockPredictionCompletionItem {
  avatarInitials: string;
  completedItems: number;
  completionState: PredictionCompletionOverviewState;
  displayName: string;
  missingItems: number;
  percentComplete: number;
  totalRequired: number;
  unsyncedItems: number;
  userId: string;
}

interface MockPredictionCompletionSummary extends PredictionCompletionSummaryView {
  items: MockPredictionCompletionItem[];
}

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
  const personalCompletion = resolvePersonalPredictionCompletion(predictionSet, league.status);
  const personalWorkflowAction = resolvePersonalPredictionWorkflowAction({
    leagueId: league.id,
    state: personalCompletion.state,
    workflowAvailable: Boolean(predictionSet)
  });
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

      <PersonalPredictionStatusCard
        action={personalWorkflowAction}
        completion={personalCompletion}
        deadlineAtUtc={league.deadlineAtUtc}
      />
      <PredictionCompletionPreviewCard league={league} preview={supabasePreview} />

      <View style={styles.grid}>
        <PredictionWorkflowLink
          action={personalWorkflowAction}
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
      <PersonalPredictionCard leagueId={leagueId} preview={preview} />
      <PredictionCompletionPreviewCard preview={preview} />
      <ParticipantsPreviewCard preview={preview} />
      <LeaderboardPreviewCard preview={preview} />
    </AppScreen>
  );
}

function PersonalPredictionCard({
  leagueId,
  preview
}: {
  leagueId: string;
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const personal = preview.personalPredictions;

  if (personal.loading) {
    return (
      <AppCard>
        <PreviewMessage message="Caricamento dei tuoi pronostici..." />
      </AppCard>
    );
  }

  if (personal.error || !personal.completion) {
    return (
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>I miei pronostici</Text>
        <PreviewMessage message={personal.error ?? "Stato personale non disponibile."} />
        <SecondaryButton label="Riprova" onPress={preview.refresh} />
      </AppCard>
    );
  }

  const completion = personal.completion;
  const personalWorkflowAction = resolvePersonalPredictionWorkflowAction({
    leagueId,
    state: completion.state,
    workflowAvailable: false
  });

  return (
    <PersonalPredictionStatusCard
      action={personalWorkflowAction}
      completion={completion}
      deadlineAtUtc={personal.deadlineAtUtc}
    />
  );
}

function PersonalPredictionStatusCard({
  action,
  completion,
  deadlineAtUtc
}: {
  action: PersonalPredictionWorkflowAction;
  completion: PersonalPredictionCompletion;
  deadlineAtUtc: string | undefined;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const stateLabel =
    completion.state === "not_started"
      ? "Non hai ancora iniziato"
      : completion.state === "complete"
        ? "Pronostici completi"
        : completion.state === "locked"
          ? "Pronostici bloccati"
          : `Ti mancano ${completion.missingItems} elementi`;

  return (
    <AppCard>
      <View style={styles.previewHeader}>
        <View style={styles.flex}>
          <Text style={[styles.kicker, { color: theme.colors.primary }]}>Solo il tuo stato</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>I miei pronostici</Text>
        </View>
        <StatusBadge
          label={stateLabel}
          tone={completion.state === "locked" ? "neutral" : "primary"}
        />
      </View>
      <ProgressBar value={completion.percentComplete} label="Avanzamento personale" />
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        {completion.completedItems}/{completion.totalRequired} elementi completati
        {completion.totalRequired > 0 ? ` · ${completion.missingItems} mancanti` : ""}.
      </Text>
      {deadlineAtUtc ? (
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          Deadline: {new Date(deadlineAtUtc).toLocaleString("it-IT")}
        </Text>
      ) : null}
      {action.kind === "navigate" ? (
        <Link href={action.href} asChild>
          <PrimaryButton label={action.label} />
        </Link>
      ) : action.kind === "unavailable" ? (
        <>
          <SecondaryButton disabled label={action.label} />
          <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
            {action.message}
          </Text>
        </>
      ) : (
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {action.message}
        </Text>
      )}
    </AppCard>
  );
}

function PredictionCompletionPreviewCard({
  league,
  preview
}: {
  league?: League | undefined;
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const isRealPreview = preview.enabled;
  const mockSummary = league ? createMockPredictionCompletionSummary(league) : undefined;
  const availability = isRealPreview
    ? preview.predictions.availability
    : resolvePredictionCompletionOverviewAvailability(league?.status);
  const summary =
    availability === "available"
      ? isRealPreview
        ? preview.predictions.summary
        : mockSummary
      : undefined;
  const badgeLabel =
    availability === "pre_lock"
      ? "Dopo il blocco"
      : summary
        ? `${summary.completePredictionSets}/${summary.totalParticipants} completi`
        : "In attesa";

  return (
    <AppCard style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.flex}>
          <Text style={[styles.kicker, { color: theme.colors.primary }]}>
            {isRealPreview ? "Supabase read-only" : "Fallback demo"}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Avanzamento pronostici
          </Text>
          <Text style={[styles.previewSubtitle, { color: theme.colors.textSecondary }]}>
            Stato compilazione per lega: usa solo completion fields persistiti, senza calcolare
            punteggi o classifiche.
          </Text>
        </View>
        <StatusBadge label={badgeLabel} tone={preview.predictions.error ? "error" : "primary"} />
      </View>

      {summary ? <PredictionCompletionSummaryGrid summary={summary} /> : null}
      {isRealPreview ? (
        <SupabasePredictionCompletionPreview preview={preview} />
      ) : availability === "pre_lock" ? (
        <PreviewMessage message="L'avanzamento complessivo sarà disponibile dopo il blocco dei pronostici." />
      ) : league && mockSummary ? (
        <MockPredictionCompletionPreview summary={mockSummary} />
      ) : (
        <PreviewMessage message="Nessun dato compilazione disponibile per questa lega." />
      )}
    </AppCard>
  );
}

function PredictionCompletionSummaryGrid({
  summary
}: {
  summary: PredictionCompletionSummaryView;
}): React.ReactNode {
  return (
    <View style={styles.summaryGrid}>
      <SummaryMetric label="Partecipanti" value={String(summary.totalParticipants)} />
      <SummaryMetric label="Completi" value={String(summary.completePredictionSets)} />
      <SummaryMetric label="Incompleti" value={String(summary.incompletePredictionSets)} />
      <SummaryMetric label="Senza pronostico" value={String(summary.missingPredictionSets)} />
      <SummaryMetric label="Bloccati" value={String(summary.lockedPredictionSets)} />
    </View>
  );
}

function SupabasePredictionCompletionPreview({
  preview
}: {
  preview: SupabaseLeagueOverviewPreview;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const predictions = preview.predictions;
  const openItems = predictions.items.filter((item) => item.completionState !== "complete");

  if (predictions.loading && predictions.items.length === 0) {
    return <PreviewMessage message="Caricamento stato pronostici..." />;
  }

  if (predictions.error) {
    return (
      <>
        <PreviewMessage
          message={`Impossibile caricare lo stato pronostici: ${predictions.error}`}
        />
        <SecondaryButton label="Riprova" onPress={preview.refresh} />
      </>
    );
  }

  if (predictions.availability === "pre_lock") {
    return (
      <>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {formatLeaguePredictionLockText(predictions.league)}
        </Text>
        <PreviewMessage message="L'avanzamento complessivo sarà disponibile dopo il blocco dei pronostici." />
      </>
    );
  }

  return (
    <>
      <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
        {formatLeaguePredictionLockText(predictions.league)}
      </Text>
      <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
        La lista mostra gli utenti non completi trovati nelle pagine membri caricate. Carica altre
        pagine per continuare la verifica.
      </Text>
      {predictions.items.length === 0 ? (
        <PreviewMessage message="Nessun membro attivo visibile per lo stato pronostici." />
      ) : openItems.length === 0 ? (
        <PreviewMessage message="Nessun utente da completare in questa pagina." />
      ) : (
        <View style={styles.previewList}>
          {openItems.map((item) => (
            <RealPredictionCompletionRow key={item.userId} item={item} />
          ))}
        </View>
      )}
      {predictions.pagination.hasNextPage ? (
        <SecondaryButton
          label={predictions.loadingMore ? "Caricamento..." : "Carica altri stati pronostici"}
          disabled={predictions.loadingMore}
          onPress={preview.loadMorePredictions}
        />
      ) : predictions.items.length > 0 ? (
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          Tutte le pagine membri sono state analizzate.
        </Text>
      ) : null}
    </>
  );
}

function MockPredictionCompletionPreview({
  summary
}: {
  summary: MockPredictionCompletionSummary;
}): React.ReactNode {
  const openItems = summary.items.filter((item) => item.completionState !== "complete");

  if (openItems.length === 0) {
    return <PreviewMessage message="Tutti i partecipanti demo hanno completato i pronostici." />;
  }

  return (
    <View style={styles.previewList}>
      {openItems.slice(0, MOCK_PREVIEW_ROWS).map((item) => (
        <MockPredictionCompletionRow key={item.userId} item={item} />
      ))}
    </View>
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
  const identity = formatSafeUserIdentity({
    userId: member.userId,
    displayName: member.publicIdentity?.displayName,
    username: member.publicIdentity?.username
  });

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <ParticipantAvatar initials={identity.initials} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {identity.displayName}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {formatMemberRole(member.role)} - {formatMemberStatus(member.status)}
        </Text>
      </View>
      <StatusBadge
        label={formatMemberStatus(member.status)}
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
          {formatMemberRole(member.role)} - Demo
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
  const identity = formatSafeUserIdentity({
    userId: entry.userId,
    displayName: entry.publicIdentity?.displayName,
    username: entry.publicIdentity?.username
  });

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <Text style={[styles.previewRank, { color: theme.colors.textPrimary }]}>#{entry.rank}</Text>
      <ParticipantAvatar initials={identity.initials} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {identity.displayName}
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

function RealPredictionCompletionRow({
  item
}: {
  item: PredictionCompletionParticipantItem;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const identity = formatSafeUserIdentity({
    userId: item.userId,
    displayName: item.publicIdentity?.displayName,
    username: item.publicIdentity?.username
  });

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <ParticipantAvatar initials={identity.initials} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {identity.displayName}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {formatPredictionCompletionDetail(item)}
        </Text>
      </View>
      <StatusBadge
        label={predictionCompletionStateLabel(item.completionState)}
        tone={predictionCompletionStateTone(item.completionState)}
      />
    </View>
  );
}

function MockPredictionCompletionRow({
  item
}: {
  item: MockPredictionCompletionItem;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.previewRow, { borderColor: theme.colors.border }]}>
      <ParticipantAvatar initials={item.avatarInitials} />
      <View style={styles.previewTextBlock}>
        <Text style={[styles.previewName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>
          {formatPredictionCompletionDetail(item)}
        </Text>
      </View>
      <StatusBadge
        label={predictionCompletionStateLabel(item.completionState)}
        tone={predictionCompletionStateTone(item.completionState)}
      />
    </View>
  );
}

function PreviewMessage({ message }: { message: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{message}</Text>;
}

function SummaryMetric({ label, value }: { label: string; value: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.summaryMetric, { borderColor: theme.colors.border }]}>
      <Text style={[styles.previewMeta, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryMetricValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
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

function PredictionWorkflowLink({
  action,
  icon,
  title
}: {
  action: PersonalPredictionWorkflowAction;
  icon: React.ReactNode;
  title: string;
}): React.ReactNode {
  const { theme } = useAppTheme();

  if (action.kind === "navigate") {
    return <LeagueLink href={action.href} icon={icon} title={title} />;
  }

  return (
    <AppCard style={styles.disabledLinkCard}>
      {icon}
      <Text style={[styles.linkTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.disabledLinkMessage, { color: theme.colors.textSecondary }]}>
        {action.message}
      </Text>
    </AppCard>
  );
}

function formatDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
}

function createMockPredictionCompletionSummary(league: League): MockPredictionCompletionSummary {
  const items = league.members.map((member) => {
    const predictionSet = league.predictionSets.find((set) => set.userId === member.userId);
    const completion = predictionSet ? calculatePredictionCompletion(predictionSet) : undefined;
    const isComplete = Boolean(completion && completion.incompleteItems === 0);
    const completionState: PredictionCompletionOverviewState = predictionSet
      ? isComplete
        ? "complete"
        : league.status === "open"
          ? "incomplete"
          : "locked"
      : "missing";

    return {
      avatarInitials: member.avatarInitials,
      completedItems: completion?.completedItems ?? 0,
      completionState,
      displayName: member.displayName,
      missingItems: completion?.incompleteItems ?? 0,
      percentComplete: completion?.percentComplete ?? 0,
      totalRequired: completion?.totalRequired ?? 0,
      unsyncedItems: completion?.unsyncedItems ?? 0,
      userId: member.userId
    };
  });

  return {
    completePredictionSets: items.filter((item) => item.completionState === "complete").length,
    incompletePredictionSets: items.filter((item) => item.completionState === "incomplete").length,
    items,
    lockedPredictionSets: items.filter((item) => item.completionState === "locked").length,
    missingPredictionSets: items.filter((item) => item.completionState === "missing").length,
    totalParticipants: league.members.length
  };
}

function formatLeaguePredictionLockText(
  league: SupabaseLeagueOverviewPreview["predictions"]["league"]
): string {
  if (!league) {
    return "Stato lega non disponibile nei dati visibili.";
  }

  return `Stato lega: ${strings.status[league.status]}. Deadline: ${new Date(
    league.deadlineAtUtc
  ).toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  })}`;
}

function formatPredictionCompletionDetail({
  completedItems,
  completionState,
  missingItems,
  percentComplete,
  totalRequired,
  unsyncedItems
}: Pick<
  PredictionCompletionParticipantItem | MockPredictionCompletionItem,
  | "completedItems"
  | "completionState"
  | "missingItems"
  | "percentComplete"
  | "totalRequired"
  | "unsyncedItems"
>): string {
  if (completionState === "missing") {
    return "Nessun prediction set visibile.";
  }

  const syncText = unsyncedItems > 0 ? ` - ${unsyncedItems} non sincronizzati` : "";

  return `${completedItems}/${totalRequired} completati (${percentComplete}%)${
    missingItems > 0 ? ` - ${missingItems} mancanti` : ""
  }${syncText}`;
}

function predictionCompletionStateLabel(state: PredictionCompletionOverviewState): string {
  const labels: Record<PredictionCompletionOverviewState, string> = {
    complete: "Completo",
    incomplete: "Da completare",
    locked: "Bloccato",
    missing: "Manca set"
  };

  return labels[state];
}

function predictionCompletionStateTone(
  state: PredictionCompletionOverviewState
): "error" | "neutral" | "success" | "warning" {
  if (state === "complete") {
    return "success";
  }

  if (state === "locked") {
    return "neutral";
  }

  return state === "missing" ? "error" : "warning";
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
  disabledLinkCard: {
    flexBasis: "47%",
    minHeight: 104,
    opacity: 0.7
  },
  disabledLinkMessage: {
    fontSize: 12,
    lineHeight: 17
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  summaryMetric: {
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 112,
    padding: 10
  },
  summaryMetricValue: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2
  },
  flex: {
    flex: 1
  }
});
