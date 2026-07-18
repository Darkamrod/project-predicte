import { Eye, EyeOff, UsersRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppListItem } from "@/components/AppListItem";
import { AppScreen } from "@/components/AppScreen";
import { SecondaryButton } from "@/components/Buttons";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { canReadParticipantPredictions } from "@/domain/predictions/locks";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { isSupabasePreviewLeagueId } from "@/features/league/useSupabaseLeagueOverviewPreview";
import {
  useSupabaseLeagueMembersList,
  type SupabaseLeagueListState
} from "@/features/league/useSupabaseLeagueReadScreenLists";
import {
  formatMemberRole,
  formatMemberStatus,
  formatSafeUserIdentity
} from "@/features/league/userIdentity";
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
      <AppHeader
        eyebrow="Comunità"
        title={strings.leagueSections.participants}
        subtitle={league.name}
      />
      <SectionHeader
        title="Rosa della lega"
        subtitle={`${league.members.length} partecipanti nella demo`}
      />
      <View style={styles.list}>
        {league.members.map((member) => {
          const readable = canReadParticipantPredictions({
            leagueStatus: league.status,
            requesterUserId: currentUser.id,
            participantUserId: member.userId
          });
          const Icon = readable ? Eye : EyeOff;

          return (
            <AppListItem
              key={member.userId}
              leading={<ParticipantAvatar initials={member.avatarInitials} />}
              title={member.displayName}
              subtitle={formatMemberRole(member.role)}
              supporting={readable ? "Pronostici visibili" : "Pronostici nascosti fino al blocco"}
              trailing={
                <View style={styles.visibilityIcon}>
                  <Icon color={readable ? theme.colors.success : theme.colors.warning} size={18} />
                  <StatusBadge
                    label={readable ? "Visibili" : "Privati"}
                    tone={readable ? "success" : "warning"}
                  />
                </View>
              }
            />
          );
        })}
      </View>
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
      <AppHeader eyebrow="Comunità" title={title} subtitle={subtitle} />
      <AppCard variant="elevated">
        <View style={styles.headerRow}>
          <View style={styles.textBlock}>
            <View style={[styles.heroIcon, { backgroundColor: theme.colors.accentContainer }]}>
              <UsersRound color={theme.colors.onAccentContainer} size={24} />
            </View>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
              Rosa della lega
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Ruoli e stato dei partecipanti
            </Text>
          </View>
          <StatusBadge
            label={members.error ? "Errore" : `${members.pagination.totalItems} totali`}
            tone={members.error ? "error" : "primary"}
          />
        </View>
      </AppCard>

      {members.loading && members.items.length === 0 ? (
        <LoadingState title="Caricamento partecipanti" body="Sto preparando la rosa della lega." />
      ) : null}

      {members.error ? (
        <ErrorState
          message={`Impossibile caricare i partecipanti: ${members.error}`}
          onRetry={members.refresh}
        />
      ) : null}

      {!members.loading && !members.error && members.items.length === 0 ? (
        <EmptyState
          title="Nessun partecipante"
          body="Quando la lega avrà membri attivi, li troverai qui."
        />
      ) : null}

      {members.items.length > 0 ? (
        <>
          <SectionHeader
            title="Partecipanti"
            subtitle={`${members.items.length} di ${members.pagination.totalItems} caricati`}
          />
          <View style={styles.list}>
            {members.items.map((member) => (
              <SupabaseParticipantCard key={member.userId} member={member} />
            ))}
          </View>
        </>
      ) : null}

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
  const identity = formatSafeUserIdentity({
    userId: member.userId,
    displayName: member.publicIdentity?.displayName,
    username: member.publicIdentity?.username
  });

  return (
    <AppListItem
      leading={<ParticipantAvatar initials={identity.initials} />}
      title={identity.displayName}
      subtitle={identity.secondaryLabel}
      supporting={formatMemberRole(member.role)}
      trailing={
        <StatusBadge
          label={formatMemberStatus(member.status)}
          tone={member.status === "active" ? "success" : "neutral"}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  heroIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    marginBottom: 8,
    width: 48
  },
  textBlock: {
    flex: 1,
    gap: 3
  },
  title: {
    fontSize: 17,
    fontWeight: "800"
  },
  list: {
    gap: 8
  },
  body: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  visibilityIcon: {
    alignItems: "center",
    gap: 5
  },
  footerText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  }
});
