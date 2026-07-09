import { Eye, EyeOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { SecondaryButton } from "@/components/Buttons";
import { ErrorState } from "@/components/ErrorState";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { canReadParticipantPredictions } from "@/domain/predictions/locks";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { isSupabasePreviewLeagueId } from "@/features/league/useSupabaseLeagueOverviewPreview";
import {
  useSupabaseLeagueMembersList,
  type SupabaseLeagueListState
} from "@/features/league/useSupabaseLeagueReadScreenLists";
import type { LeagueMemberListItem } from "@/services/leagues/supabaseLeagueReadRepository";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function ParticipantsScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, getLeague } = usePredicteMock();
  const league = getLeague(leagueId);
  const supabaseMembers = useSupabaseLeagueMembersList(leagueId);

  if (!league) {
    if (supabaseMembers.enabled) {
      return (
        <SupabaseParticipantsScreen
          title={strings.leagueSections.participants}
          subtitle={`Lega ${leagueId.slice(0, 8)}`}
          members={supabaseMembers}
        />
      );
    }

    if (isSupabasePreviewLeagueId(leagueId)) {
      return (
        <AppScreen>
          <ErrorState message="Supabase non configurato per questa lista partecipanti." />
        </AppScreen>
      );
    }

    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  if (supabaseMembers.enabled) {
    return (
      <SupabaseParticipantsScreen
        title={strings.leagueSections.participants}
        subtitle={league.name}
        members={supabaseMembers}
      />
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

function SupabaseParticipantsScreen({
  title,
  subtitle,
  members
}: {
  title: string;
  subtitle: string;
  members: SupabaseLeagueListState<LeagueMemberListItem>;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppScreen>
      <AppHeader title={title} subtitle={subtitle} />
      <AppCard>
        <View style={styles.headerRow}>
          <View style={styles.textBlock}>
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>Supabase paginato</Text>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {members.pagination.totalItems} partecipanti
            </Text>
          </View>
          <StatusBadge
            label={members.error ? "Errore" : `${members.items.length} caricati`}
            tone={members.error ? "error" : "primary"}
          />
        </View>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Lettura read-only per lega. I profili completi restano futuri; qui mostriamo ruolo e stato
          disponibili.
        </Text>
      </AppCard>

      {members.loading && members.items.length === 0 ? (
        <ParticipantMessage message="Caricamento partecipanti..." />
      ) : null}

      {members.error ? (
        <AppCard>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Impossibile caricare i partecipanti: {members.error}
          </Text>
          <SecondaryButton label="Riprova" onPress={members.refresh} />
        </AppCard>
      ) : null}

      {!members.loading && !members.error && members.items.length === 0 ? (
        <ParticipantMessage message="Nessun partecipante reale visibile per questa lega." />
      ) : null}

      {members.items.map((member) => (
        <SupabaseParticipantCard key={member.userId} member={member} />
      ))}

      {members.pagination.hasNextPage && !members.error ? (
        <SecondaryButton
          label={members.loadingMore ? "Caricamento..." : "Carica altri partecipanti"}
          disabled={members.loadingMore || members.loading}
          onPress={members.loadMore}
        />
      ) : !members.loading && members.items.length > 0 ? (
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Fine lista partecipanti.
        </Text>
      ) : null}
    </AppScreen>
  );
}

function SupabaseParticipantCard({ member }: { member: LeagueMemberListItem }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppCard>
      <View style={styles.row}>
        <ParticipantAvatar initials={initialsFromUserId(member.userId)} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {formatUserId(member.userId)}
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Ruolo: {roleLabel(member.role)}
          </Text>
        </View>
        <StatusBadge
          label={memberStatusLabel(member.status)}
          tone={member.status === "active" ? "success" : "neutral"}
        />
      </View>
    </AppCard>
  );
}

function ParticipantMessage({ message }: { message: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppCard>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{message}</Text>
    </AppCard>
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

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
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
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
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
  },
  footerText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  }
});
