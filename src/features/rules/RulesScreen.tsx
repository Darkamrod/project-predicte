import { History, ListChecks, Lock, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { ErrorState } from "@/components/ErrorState";
import { RuleValueField } from "@/components/RuleValueField";
import { StatusBadge } from "@/components/StatusBadge";
import { canEditScoringRules } from "@/domain/scoring/ruleVersions";
import type {
  AntepostScoringRule,
  ScoringRuleChange,
  ScoringStageKey,
  StageScoringRule
} from "@/domain/scoring/types";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

const stageOrder: ScoringStageKey[] = [
  "GROUP_STAGE",
  "PLAYOFF",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL"
];

const stageLabels: Record<ScoringStageKey, string> = {
  GROUP_STAGE: "Fase a gironi",
  PLAYOFF: "Playoff",
  ROUND_OF_32: "Sedicesimi",
  ROUND_OF_16: "Ottavi",
  QUARTER_FINAL: "Quarti",
  SEMI_FINAL: "Semifinali",
  THIRD_PLACE: "Finale 3° posto",
  FINAL: "Finale"
};

const stageFields: Array<keyof StageScoringRule> = [
  "correctOutcome",
  "exactScore",
  "correctGroupPosition",
  "stageQualification",
  "correctPairing",
  "extraTimeMethod",
  "penaltyMethod"
];

const stageFieldLabels: Record<keyof StageScoringRule, string> = {
  correctOutcome: "Segno 1/X/2 corretto",
  exactScore: "Risultato esatto",
  correctGroupPosition: "Posizione corretta nel girone",
  stageQualification: "Qualificazione alla fase",
  correctPairing: "Accoppiamento corretto",
  extraTimeMethod: "Qualificazione ai supplementari",
  penaltyMethod: "Qualificazione ai rigori"
};

const antepostFields: Array<keyof AntepostScoringRule> = [
  "tournamentWinner",
  "topScorer",
  "topScorerExactGoals"
];

const antepostFieldLabels: Record<keyof AntepostScoringRule, string> = {
  tournamentWinner: "Vincitrice torneo",
  topScorer: "Capocannoniere",
  topScorerExactGoals: "Capocannoniere con gol esatti"
};

export function RulesScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, getLeague, serverNowUtc, updateAntepostRuleValue, updateRuleValue } =
    usePredicteMock();
  const league = getLeague(leagueId);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  const locked = league.scoringRuleVersion.status === "locked";
  const currentRole =
    league.members.find((member) => member.userId === currentUser.id)?.role ?? "participant";
  const editable = canEditScoringRules(
    {
      leagueId: league.id,
      leagueStatus: league.status,
      deadlineAtUtc: league.deadlineAtUtc,
      ruleStatus: league.scoringRuleVersion.status,
      currentUserRole: currentRole
    },
    serverNowUtc
  );

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.rules} subtitle={league.name} />
      <AppCard>
        <View style={styles.row}>
          {locked ? (
            <Lock color={theme.colors.textSecondary} size={22} />
          ) : (
            <ShieldCheck color={theme.colors.primary} size={22} />
          )}
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {editable ? strings.copy.rulesEditable : strings.copy.rulesLocked}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              Versione {league.scoringRuleVersion.version}
              {league.scoringRuleVersion.checksum ? ` - ${league.scoringRuleVersion.checksum}` : ""}
            </Text>
            {!editable && !locked ? (
              <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                Modifica disponibile solo a owner/admin prima della deadline.
              </Text>
            ) : null}
          </View>
          <StatusBadge
            label={locked ? strings.status.locked : strings.status.draft}
            tone={locked ? "warning" : "success"}
          />
        </View>
      </AppCard>
      {stageOrder.map((stage) => {
        const rules = league.scoringRuleVersion.config.stages[stage];

        return (
          <AppCard key={stage}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {stageLabels[stage]}
            </Text>
            {stageFields.map((field) => (
              <RuleValueField
                key={field}
                label={stageFieldLabels[field]}
                value={rules[field]}
                disabled={!editable}
                onChange={(value) =>
                  updateRuleValue({
                    leagueId: league.id,
                    stage,
                    field,
                    value
                  })
                }
              />
            ))}
          </AppCard>
        );
      })}
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Antepost</Text>
        {antepostFields.map((field) => (
          <RuleValueField
            key={field}
            label={antepostFieldLabels[field]}
            value={league.scoringRuleVersion.config.antepost[field]}
            disabled={!editable}
            onChange={(value) =>
              updateAntepostRuleValue({
                leagueId: league.id,
                field,
                value
              })
            }
          />
        ))}
      </AppCard>
      <AppCard>
        <View style={styles.row}>
          <ListChecks color={theme.colors.primary} size={22} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Riepilogo</Text>
        </View>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Risultato esatto sostituisce 1X2:{" "}
          {league.scoringRuleVersion.config.stacking.exactScoreReplacesOutcome ? "si" : "no"}.
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Capocannoniere + gol esatti sostituisce capocannoniere:{" "}
          {league.scoringRuleVersion.config.stacking.topScorerExactGoalsReplacesTopScorer
            ? "si"
            : "no"}
          .
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Qualificazione, accoppiamento e bonus metodo possono sommarsi:{" "}
          {league.scoringRuleVersion.config.stacking.qualificationAndPairingAreIndependent
            ? "si"
            : "no"}
          .
        </Text>
      </AppCard>
      <AppCard>
        <View style={styles.row}>
          <History color={theme.colors.primary} size={22} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Storico modifiche</Text>
        </View>
        {league.scoringRuleHistory.length === 0 ? (
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Nessuna modifica registrata in questa sessione mock.
          </Text>
        ) : (
          league.scoringRuleHistory
            .slice()
            .reverse()
            .slice(0, 8)
            .map((change) => (
              <View
                key={change.id}
                style={[styles.historyRow, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.historyTitle, { color: theme.colors.textPrimary }]}>
                  {formatChangeTitle(change)}
                </Text>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                  {change.previousValue}
                  {" -> "}
                  {change.nextValue} - {change.actorDisplayName}
                </Text>
              </View>
            ))
        )}
      </AppCard>
    </AppScreen>
  );
}

function formatChangeTitle(change: ScoringRuleChange): string {
  const fieldLabel =
    change.scope === "antepost"
      ? antepostFieldLabels[change.field as keyof AntepostScoringRule]
      : stageFieldLabels[change.field as keyof StageScoringRule];
  const scopeLabel =
    change.scope === "antepost" ? "Antepost" : stageLabels[change.stage ?? "GROUP_STAGE"];

  return `${scopeLabel}: ${fieldLabel}`;
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
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    fontSize: 14,
    lineHeight: 20
  },
  historyRow: {
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 10
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800"
  }
});
