import { Link, useRouter } from "expo-router";
import { CheckCircle2, ChevronRight, Plus, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { getCompetitionDemoSummary } from "@/domain/competitions/demoSummary";
import type { CompetitionSeed } from "@/domain/competitions/types";
import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function HomeScreen(): React.ReactNode {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { leagues, currentUser, competition, competitions, createLeague, joinLeague } =
    usePredicteMock();
  const [selectedEditionId, setSelectedEditionId] = useState(competition.edition.id);
  const selectedCompetition =
    competitions.find((item) => item.edition.id === selectedEditionId) ?? competition;
  const selectedSummary = getCompetitionDemoSummary(selectedCompetition);
  const activeLeague = leagues.at(-1);
  const activeCompetition =
    competitions.find((item) => item.edition.id === activeLeague?.competitionEditionId) ??
    competition;
  const activeSummary = getCompetitionDemoSummary(activeCompetition);
  const activePredictionSet = activeLeague?.predictionSets.find(
    (set) => set.userId === currentUser.id
  );
  const activeProgress = activePredictionSet
    ? calculatePredictionCompletion(activePredictionSet).percentComplete
    : 0;

  return (
    <AppScreen>
      <AppHeader title={strings.appName} subtitle={strings.copy.mockOnly} />
      <AppCard style={styles.heroCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>Crea lega demo</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
              Scegli competizione ed edizione
            </Text>
          </View>
          <StatusBadge label={selectedSummary.sportLabel} tone="primary" />
        </View>

        <View style={styles.editionGrid}>
          {competitions.map((item) => (
            <EditionOptionCard
              key={item.edition.id}
              competition={item}
              selected={selectedEditionId === item.edition.id}
              onPress={() => setSelectedEditionId(item.edition.id)}
            />
          ))}
        </View>

        <View style={[styles.summaryPanel, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {selectedSummary.editionLabel}
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            {selectedSummary.familyLabel} - {selectedSummary.seasonLabel} -{" "}
            {selectedSummary.formatHeadline}
          </Text>
          <SummaryFactGrid
            facts={[`Preset scoring: ${selectedSummary.presetLabel}`, selectedSummary.rulesetLabel]}
          />
          <SummaryFactGrid facts={selectedSummary.facts} />
          <View style={styles.phaseRail}>
            {selectedSummary.phaseLabels.slice(0, 8).map((label) => (
              <MiniPill key={label} label={label} />
            ))}
          </View>
          {selectedSummary.placeholderNotes.length > 0 ? (
            <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>
              Demo: {selectedSummary.placeholderNotes.join(" - ")}
            </Text>
          ) : null}
        </View>
      </AppCard>
      <View style={styles.actions}>
        <PrimaryButton
          icon={Plus}
          label="Crea lega demo"
          onPress={() => {
            const leagueId = createLeague({ competitionEditionId: selectedEditionId });
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
                {activeCompetition.edition.name}
              </Text>
            </View>
            <StatusBadge label={strings.status[activeLeague.status]} tone="primary" />
          </View>
          <SummaryFactGrid facts={activeSummary.facts.slice(0, 3)} />
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

function EditionOptionCard({
  competition,
  selected,
  onPress
}: {
  competition: CompetitionSeed;
  selected: boolean;
  onPress(): void;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const summary = getCompetitionDemoSummary(competition);

  return (
    <Pressable
      accessibilityLabel={`Seleziona ${competition.edition.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.editionOption,
        {
          backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.84 : 1
        }
      ]}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionTitleBlock}>
          <Text
            numberOfLines={2}
            style={[
              styles.optionTitle,
              { color: selected ? theme.colors.onPrimaryContainer : theme.colors.textPrimary }
            ]}
          >
            {summary.editionLabel}
          </Text>
          <Text
            style={[
              styles.caption,
              { color: selected ? theme.colors.onPrimaryContainer : theme.colors.textSecondary }
            ]}
          >
            {summary.familyLabel}
          </Text>
        </View>
        {selected ? <CheckCircle2 color={theme.colors.primary} size={20} /> : null}
      </View>
      <Text
        style={[
          styles.caption,
          { color: selected ? theme.colors.onPrimaryContainer : theme.colors.textSecondary }
        ]}
      >
        {summary.facts.slice(0, 2).join(" - ")}
      </Text>
    </Pressable>
  );
}

function SummaryFactGrid({ facts }: { facts: string[] }): React.ReactNode {
  return (
    <View style={styles.factGrid}>
      {facts.map((fact) => (
        <MiniPill key={fact} label={fact} />
      ))}
    </View>
  );
}

function MiniPill({ label }: { label: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.miniPill, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.miniPillText, { color: theme.colors.textPrimary }]}>{label}</Text>
    </View>
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
  caption: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  editionGrid: {
    gap: 10
  },
  editionOption: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 92,
    padding: 14
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  heroCard: {
    gap: 16
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  miniPill: {
    borderRadius: 999,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  miniPillText: {
    fontSize: 13,
    fontWeight: "800"
  },
  optionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21
  },
  optionTitleBlock: {
    flex: 1,
    gap: 3
  },
  phaseRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  summaryPanel: {
    borderRadius: 8,
    gap: 10,
    padding: 14
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
