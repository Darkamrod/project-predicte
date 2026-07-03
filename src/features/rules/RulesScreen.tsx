import { Lock, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { ErrorState } from "@/components/ErrorState";
import { RuleValueField } from "@/components/RuleValueField";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function RulesScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { getLeague, updateRuleValue } = usePredicteMock();
  const league = getLeague(leagueId);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  const locked = league.scoringRuleVersion.status === "locked";
  const groupRules = league.scoringRuleVersion.config.stages.GROUP_STAGE;
  const semifinalRules = league.scoringRuleVersion.config.stages.SEMI_FINAL;

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
              {locked ? strings.copy.rulesLocked : strings.copy.rulesEditable}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              Versione {league.scoringRuleVersion.version}
              {league.scoringRuleVersion.checksum ? ` - ${league.scoringRuleVersion.checksum}` : ""}
            </Text>
          </View>
          <StatusBadge label={locked ? "Locked" : "Draft"} tone={locked ? "warning" : "success"} />
        </View>
      </AppCard>
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Fase a gironi</Text>
        <RuleValueField
          label="Segno 1/X/2 corretto"
          value={groupRules.correctOutcome}
          disabled={locked}
          onChange={(value) =>
            updateRuleValue({
              leagueId: league.id,
              stage: "GROUP_STAGE",
              field: "correctOutcome",
              value
            })
          }
        />
        <RuleValueField
          label="Risultato esatto"
          value={groupRules.exactScore}
          disabled={locked}
          onChange={(value) =>
            updateRuleValue({
              leagueId: league.id,
              stage: "GROUP_STAGE",
              field: "exactScore",
              value
            })
          }
        />
        <RuleValueField
          label="Posizione squadra nel girone"
          value={groupRules.correctGroupPosition}
          disabled={locked}
          onChange={(value) =>
            updateRuleValue({
              leagueId: league.id,
              stage: "GROUP_STAGE",
              field: "correctGroupPosition",
              value
            })
          }
        />
      </AppCard>
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Valore sorgente preservato
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Accoppiamento semifinale: {semifinalRules.correctPairing} punti.
        </Text>
      </AppCard>
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
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    fontSize: 14,
    lineHeight: 20
  }
});
