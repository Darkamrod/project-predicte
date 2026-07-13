import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ErrorState } from "@/components/ErrorState";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppTheme } from "@/design-system/theme";
import { adaptAuthenticatedPredictionTargets } from "@/domain/predictions/authenticatedTargetAdapter";
import { strings } from "@/i18n/strings";
import { resolveSupabasePredictionWorkflowCapability } from "./supabasePredictionWorkflowCapability";
import { useSupabasePredictionWorkflowLoader } from "./useSupabasePredictionWorkflowLoader";

export function SupabasePredictionWorkflowScreen({
  leagueId
}: {
  leagueId: string;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const loader = useSupabasePredictionWorkflowLoader(leagueId);
  const state = loader.state;

  if (state.kind === "loading") {
    return (
      <AppScreen>
        <AppHeader title={strings.leagueSections.predictions} subtitle="Supabase autenticato" />
        <AppCard>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Caricamento del contesto pronostici reale...
          </Text>
        </AppCard>
      </AppScreen>
    );
  }

  if (state.kind === "unconfigured") {
    return <WorkflowError message="Supabase non configurato per questo workflow." />;
  }

  if (state.kind === "unauthenticated") {
    return <WorkflowError message="Accedi per aprire i pronostici di questa lega." />;
  }

  if (state.kind === "inaccessible") {
    return <WorkflowError message={state.message} />;
  }

  if (state.kind === "error") {
    return <WorkflowError message={state.message} onRetry={loader.retry} />;
  }

  const { context } = state;
  const targetAdapter = adaptAuthenticatedPredictionTargets({
    leagueStatus: context.league.status,
    formatTemplatePayload: context.formatTemplateVersion?.payload,
    predictionRequirementPayload: context.predictionRequirementVersion?.payload,
    stages: context.catalogStages,
    groups: context.catalogGroups,
    rounds: context.catalogRounds,
    teams: context.catalogTeams,
    matches: context.catalogMatches,
    persistedMatchPredictions: context.matchPredictions,
    bracketSlots: context.targetCatalog.bracketSlots,
    antepostDefinitions: context.targetCatalog.antepostDefinitions,
    tiebreakRules: context.targetCatalog.tiebreakRules,
    catalogReadPathAvailable: true,
    bracketSlotDestinationsAvailable: context.targetCatalog.bracketSlots.every((slot) =>
      Boolean(slot.targetMatchId && slot.targetSide && slot.slotKey)
    )
  });
  const capability = resolveSupabasePredictionWorkflowCapability(context, targetAdapter);
  const predictionSet = context.predictionSet;
  const progress = predictionSet?.totalRequired
    ? Math.round((predictionSet.completedItems / predictionSet.totalRequired) * 100)
    : 0;

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.predictions} subtitle={context.league.name} />
      <DeadlineBanner deadlineAtUtc={context.league.deadlineAtUtc} status={context.league.status} />

      <AppCard>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>Supabase reale</Text>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {context.edition?.name ?? "Edizione non disponibile"}
            </Text>
          </View>
          <StatusBadge label={strings.status[context.league.status]} tone="primary" />
        </View>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Contesto versionato caricato per la sessione autenticata. Nessun dato mock viene usato per
          questo UUID.
        </Text>
        <VersionRow label="Format" value={context.formatTemplateVersion?.version} />
        <VersionRow label="Ruleset" value={context.rulesetVersion?.version} />
        <VersionRow label="Requisiti" value={context.predictionRequirementVersion?.version} />
        <VersionRow label="Preset scoring" value={context.scoringPresetVersion?.version} />
      </AppCard>

      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Il tuo prediction set
        </Text>
        {predictionSet ? (
          <>
            <ProgressBar value={progress} label="Avanzamento persistito" />
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              {predictionSet.completedItems}/{predictionSet.totalRequired} elementi completati ·{" "}
              {context.matchPredictions.length} risultati partita caricati.
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              Adapter reale: {targetAdapter.progress.completedTargets}/
              {targetAdapter.progress.totalTargets} target match persistiti.
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              Catalogo protetto: {targetAdapter.catalog.bracketSlotCount} slot bracket,{" "}
              {targetAdapter.catalog.supportedAntepostDefinitionIds.length} antepost MVP,{" "}
              {targetAdapter.catalog.tiebreakRuleCount} regole tie-break.
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              Nodi versionati: {context.targetCatalog.bracketNodes.length} · combinazioni migliori
              terze: {context.targetCatalog.bestThirdCombinations.length}.
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              Destinazioni bracket valide: {targetAdapter.catalog.destinationMappingCount}.
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              Catalogo iniziale: {context.resolverReadiness.counts.teams} squadre,{" "}
              {context.resolverReadiness.counts.groups} gruppi,{" "}
              {context.resolverReadiness.counts.initialMatches} partite.
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              Override tie-break persistiti: {context.tiebreakOverrides.length}.
            </Text>
          </>
        ) : (
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Prediction set non ancora inizializzato.
          </Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Disponibilità workflow
        </Text>
        <StatusBadge
          label={
            capability.kind === "locked"
              ? "Sola lettura"
              : capability.kind === "not_started"
                ? "Non inizializzato"
                : capability.kind === "ready_for_resolver"
                  ? "Input completi"
                  : "Dati insufficienti"
          }
          tone={
            capability.kind === "locked"
              ? "neutral"
              : capability.kind === "ready_for_resolver"
                ? "success"
                : "warning"
          }
        />
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {capability.message}
        </Text>
        {capability.kind === "unavailable" ? (
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
            Mancano: {capability.missingData.join(", ")}.
          </Text>
        ) : null}
      </AppCard>
    </AppScreen>
  );
}

function WorkflowError({
  message,
  onRetry
}: {
  message: string;
  onRetry?: (() => void) | undefined;
}): React.ReactNode {
  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.predictions} subtitle="Workflow Supabase" />
      <ErrorState message={message} />
      {onRetry ? <SecondaryButton label="Riprova" onPress={onRetry} /> : null}
    </AppScreen>
  );
}

function VersionRow({
  label,
  value
}: {
  label: string;
  value?: string | undefined;
}): React.ReactNode {
  const { theme } = useAppTheme();
  return (
    <View style={styles.versionRow}>
      <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>
        {value ?? "Non disponibile"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  flex: { flex: 1 },
  kicker: { fontSize: 12, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: "800" },
  body: { fontSize: 15, lineHeight: 21 },
  meta: { fontSize: 13, lineHeight: 18 },
  metaValue: { flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  versionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  }
});
