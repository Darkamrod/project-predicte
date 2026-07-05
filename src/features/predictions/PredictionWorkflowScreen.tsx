import { Check, ChevronRight, Edit3, Trophy } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState
} from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ErrorState } from "@/components/ErrorState";
import { ProgressBar } from "@/components/ProgressBar";
import type { AntepostDefinition, Player, Team } from "@/domain/competitions/types";
import { getTeamLabel } from "@/domain/predictions/bracket";
import {
  buildPredictionEntryWorkflow,
  deriveBracketAntepostPredictions,
  getInitialPhaseLabel,
  getScoreChips,
  getTeamInitials,
  normalizeInitialPhasePrediction,
  normalizeKnockoutPredictionInput,
  type EntryOutcome,
  type DerivedAntepostSummary,
  type MatchEntryContext,
  type PredictionEntryMode,
  type PredictionEntryPhase,
  type PredictionEntryTarget,
  type ScoreChip
} from "@/domain/predictions/entryWorkflow";
import type {
  AdvancementMethod,
  AntepostPrediction,
  PredictionValidationIssue
} from "@/domain/predictions/types";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

type EditablePhase = "INITIAL" | "TIEBREAK" | "KNOCKOUT" | "ANTEPOST" | "REVIEW";

const phaseLabels: Record<EditablePhase, string> = {
  INITIAL: "Fase iniziale",
  TIEBREAK: "Classifiche",
  KNOCKOUT: "Tabellone",
  ANTEPOST: "Antepost",
  REVIEW: "Riepilogo"
};

const modeLabels: Record<PredictionEntryMode, string> = {
  QUICK: "Modalità Semplificata",
  EXPERT: "Modalità Esperto"
};

export function PredictionWorkflowScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const {
    currentUser,
    competition,
    competitions,
    getLeague,
    updateMatchPrediction,
    updateKnockoutPrediction,
    updateAntepostPrediction,
    setTiebreakOverride,
    clearDependencyWarnings
  } = usePredicteMock();
  const league = getLeague(leagueId);
  const [mode, setMode] = useState<PredictionEntryMode | undefined>();
  const [phase, setPhase] = useState<EditablePhase>("INITIAL");
  const [cursorByPhase, setCursorByPhase] = useState<Record<EditablePhase, number>>({
    INITIAL: 0,
    TIEBREAK: 0,
    KNOCKOUT: 0,
    ANTEPOST: 0,
    REVIEW: 0
  });
  const [confirmed, setConfirmed] = useState(false);
  const [pendingJumpToNextMissing, setPendingJumpToNextMissing] = useState(false);

  const activeCompetition = league
    ? (competitions.find((item) => item.edition.id === league.competitionEditionId) ?? competition)
    : competition;
  const predictionSet = league?.predictionSets.find((set) => set.userId === currentUser.id);
  const workflow = predictionSet
    ? buildPredictionEntryWorkflow({
        competition: activeCompetition,
        predictionSet,
        mode
      })
    : undefined;

  const setPhaseCursor = (nextPhase: EditablePhase, nextCursor: number): void => {
    setPhase(nextPhase);
    setCursorByPhase((previous) => ({
      ...previous,
      [nextPhase]: Math.max(0, nextCursor)
    }));
  };
  const jumpToWorkflowTarget = (
    nextWorkflow: ReturnType<typeof buildPredictionEntryWorkflow> | undefined = workflow
  ): void => {
    if (!nextWorkflow) {
      return;
    }

    const nextPhase = editablePhaseFromWorkflow(nextWorkflow.phase);
    const nextTargets = getTargetsForPhase(nextWorkflow, nextPhase);
    const nextIndex = nextTargets.findIndex((item) => item.id === nextWorkflow.target.id);

    setPhaseCursor(nextPhase, nextIndex >= 0 ? nextIndex : 0);
  };

  useEffect(() => {
    if (!pendingJumpToNextMissing || !workflow) {
      return;
    }

    setPendingJumpToNextMissing(false);
    jumpToWorkflowTarget(workflow);
  }, [pendingJumpToNextMissing, workflow]);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  if (!predictionSet || !workflow) {
    return (
      <AppScreen>
        <ErrorState message="Prediction set mock non trovato." />
      </AppScreen>
    );
  }

  const teamsById = new Map(activeCompetition.teams.map((team) => [team.id, team]));
  const playersById = new Map(activeCompetition.players.map((player) => [player.id, player]));
  const phaseTargets = getTargetsForPhase(workflow, phase);
  const target = phaseTargets[Math.min(cursorByPhase[phase], Math.max(phaseTargets.length - 1, 0))];
  const derivedAntepost = deriveBracketAntepostPredictions({
    competition: activeCompetition,
    predictionSet,
    bracket: workflow.bracket
  });
  const manualAntepostPredictions = predictionSet.antepostPredictions ?? [];
  const blockingIssues = workflow.issues.filter((issue) => issue.severity === "error");

  if (!mode) {
    return (
      <AppScreen>
        <AppHeader title={strings.leagueSections.predictions} subtitle={league.name} />
        <DeadlineBanner deadlineAtUtc={league.deadlineAtUtc} status={league.status} />
        <ModeSelectionCard
          competitionName={activeCompetition.edition.name}
          onSelect={(nextMode) => {
            const nextWorkflow = buildPredictionEntryWorkflow({
              competition: activeCompetition,
              predictionSet,
              mode: nextMode
            });

            setMode(nextMode);
            jumpToWorkflowTarget(nextWorkflow);
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.predictions} subtitle={league.name} />
      <DeadlineBanner deadlineAtUtc={league.deadlineAtUtc} status={league.status} />

      <AppCard>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>
              {activeCompetition.edition.name}
            </Text>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {modeLabels[mode]}
            </Text>
          </View>
          <SecondaryButton
            accessibilityLabel="Cambia modalità"
            label="Cambia"
            onPress={() => setMode(undefined)}
            style={styles.compactButton}
          />
          <SecondaryButton
            accessibilityLabel="Vai al prossimo pronostico mancante"
            label="Mancante"
            onPress={() => jumpToWorkflowTarget()}
            style={styles.compactButton}
          />
        </View>
        <ProgressBar
          value={
            workflow.issues.some((issue) => issue.severity === "error")
              ? 100 - Math.min(blockingIssues.length * 5, 75)
              : 100
          }
          label="Avanzamento compilazione"
        />
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {getInitialPhaseLabel(activeCompetition)} · {workflow.knockoutTargets.length} match
          tabellone · {workflow.manualAntepostDefinitions.length} antepost manuali
        </Text>
      </AppCard>

      <PhaseTabs phase={phase} onChange={(nextPhase) => setPhaseCursor(nextPhase, 0)} />

      {phase === "INITIAL" && target ? (
        <PredictionMatchCard
          key={`${mode}:${target.id}`}
          mode={mode}
          target={target}
          teamsById={teamsById}
          onConfirm={(input) => {
            const result = normalizeInitialPhasePrediction(input);

            if (result.issues.length > 0 || !target.match) {
              return result.issues;
            }

            updateMatchPrediction({
              leagueId: league.id,
              matchId: target.match.id,
              homeGoals: result.input.homeGoals,
              awayGoals: result.input.awayGoals
            });
            setConfirmed(false);
            setPendingJumpToNextMissing(true);

            return [];
          }}
        />
      ) : null}

      {phase === "INITIAL" && !target ? (
        <CompletedPhaseCard
          title="Fase iniziale completa"
          body="Le classifiche previste alimentano automaticamente il tabellone."
          onNext={() =>
            setPhaseCursor(workflow.tiebreakTargets.length > 0 ? "TIEBREAK" : "KNOCKOUT", 0)
          }
        />
      ) : null}

      {phase === "TIEBREAK" && target?.kind === "TIEBREAK" ? (
        <TiebreakEntryCard
          target={target}
          teamsById={teamsById}
          onConfirm={(orderedTeamIds) => {
            if (!target.scopeRef) {
              return;
            }

            setTiebreakOverride({
              leagueId: league.id,
              scope: target.scope,
              scopeRef: target.scopeRef,
              tieGroupId: target.tieGroupId,
              tiedTeamIds: target.tiedTeamIds,
              affectedPositions: target.affectedPositions,
              orderedTeamIds,
              reason: "Milestone 8 manual override"
            });
            setConfirmed(false);
            setPendingJumpToNextMissing(true);
          }}
        />
      ) : null}

      {phase === "TIEBREAK" && !target ? (
        <CompletedPhaseCard
          title="Classifiche risolte"
          body="Il tabellone puo essere generato dai tuoi pronostici."
          onNext={() => setPhaseCursor("KNOCKOUT", 0)}
        />
      ) : null}

      {phase === "KNOCKOUT" && target ? (
        <PredictionMatchCard
          key={`${mode}:${target.id}`}
          mode={mode}
          target={target}
          teamsById={teamsById}
          onConfirm={(input) => {
            if (!target.bracketMatch || !target.tieMode) {
              return [];
            }

            const result = normalizeKnockoutPredictionInput({
              match: target.bracketMatch,
              homeGoals: input.homeGoals,
              awayGoals: input.awayGoals,
              qualifiedTeamId: input.qualifiedTeamId,
              advancementMethod: input.advancementMethod,
              tieMode: target.tieMode
            });

            if (result.issues.length > 0) {
              return result.issues;
            }

            updateKnockoutPrediction({
              leagueId: league.id,
              matchId: target.bracketMatch.id,
              homeGoals: result.input.homeGoals,
              awayGoals: result.input.awayGoals,
              qualifiedTeamId: result.input.qualifiedTeamId,
              advancementMethod: result.input.advancementMethod
            });
            setConfirmed(false);
            setPendingJumpToNextMissing(true);

            return [];
          }}
        />
      ) : null}

      {phase === "KNOCKOUT" && !target ? (
        <CompletedPhaseCard
          title="Tabellone completo"
          body="Vincitrice e finaliste vengono derivate dalla finale compilata."
          onNext={() => setPhaseCursor("ANTEPOST", 0)}
        />
      ) : null}

      {phase === "ANTEPOST" ? (
        <AntepostEntryCard
          definitions={workflow.manualAntepostDefinitions}
          predictions={manualAntepostPredictions}
          teamsById={teamsById}
          playersById={playersById}
          playerOptions={activeCompetition.players.slice(0, 12)}
          derived={derivedAntepost}
          onSave={(definition, value) => {
            updateAntepostPrediction({
              leagueId: league.id,
              definitionId: definition.id,
              selectedPlayerId: value.selectedPlayerId,
              textValue: value.textValue,
              numericValue: value.numericValue
            });
            setConfirmed(false);
          }}
          onNext={() => setPhaseCursor("REVIEW", 0)}
        />
      ) : null}

      {phase === "REVIEW" ? (
        <ReviewCard
          competitionName={activeCompetition.template.name}
          editionName={activeCompetition.edition.name}
          mode={mode}
          matchCount={workflow.initialTargets.length + workflow.knockoutTargets.length}
          missingCount={blockingIssues.length}
          derived={derivedAntepost}
          predictions={manualAntepostPredictions}
          definitions={workflow.manualAntepostDefinitions}
          teamsById={teamsById}
          playersById={playersById}
          warnings={workflow.issues.filter((issue) => issue.severity === "warning")}
          confirmed={confirmed}
          canConfirm={blockingIssues.length === 0}
          onEdit={() => setPhaseCursor("INITIAL", 0)}
          onClearWarnings={() => clearDependencyWarnings(league.id)}
          onConfirm={() => {
            setConfirmed(true);
          }}
        />
      ) : null}
    </AppScreen>
  );
}

function ModeSelectionCard({
  competitionName,
  onSelect
}: {
  competitionName: string;
  onSelect(mode: PredictionEntryMode): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppCard style={styles.heroCard}>
      <Text style={[styles.kicker, { color: theme.colors.primary }]}>Come vuoi compilare?</Text>
      <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
        Scegli il ritmo per {competitionName}
      </Text>
      <View style={styles.modeGrid}>
        <Pressable
          accessibilityLabel="Scegli Modalità Semplificata"
          accessibilityRole="button"
          onPress={() => onSelect("QUICK")}
          style={({ pressed }) => [
            styles.modeOption,
            {
              backgroundColor: theme.colors.primaryContainer,
              borderColor: theme.colors.primary,
              opacity: pressed ? 0.84 : 1
            }
          ]}
        >
          <ChevronRight color={theme.colors.primary} size={28} />
          <Text style={[styles.modeTitle, { color: theme.colors.onPrimaryContainer }]}>
            Modalità Semplificata
          </Text>
          <Text style={[styles.modeBody, { color: theme.colors.onPrimaryContainer }]}>
            Scelte rapide, card grandi e score chips dopo ogni esito.
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Scegli Modalità Esperto"
          accessibilityRole="button"
          onPress={() => onSelect("EXPERT")}
          style={({ pressed }) => [
            styles.modeOption,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.84 : 1
            }
          ]}
        >
          <Edit3 color={theme.colors.textPrimary} size={28} />
          <Text style={[styles.modeTitle, { color: theme.colors.textPrimary }]}>
            Modalità Esperto
          </Text>
          <Text style={[styles.modeBody, { color: theme.colors.textSecondary }]}>
            Input risultato precisi, qualificata derivata quando possibile.
          </Text>
        </Pressable>
      </View>
    </AppCard>
  );
}

function PhaseTabs({
  phase,
  onChange
}: {
  phase: EditablePhase;
  onChange(phase: EditablePhase): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.phaseTabs}>
      {(Object.keys(phaseLabels) as EditablePhase[]).map((item) => (
        <SecondaryButton
          key={item}
          accessibilityLabel={`Apri ${phaseLabels[item]}`}
          label={phaseLabels[item]}
          onPress={() => onChange(item)}
          style={[
            styles.phaseTab,
            phase === item
              ? {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.primary
                }
              : undefined
          ]}
        />
      ))}
    </View>
  );
}

function PredictionMatchCard({
  mode,
  target,
  teamsById,
  onConfirm
}: {
  mode: PredictionEntryMode;
  target: PredictionEntryTarget;
  teamsById: Map<string, Team>;
  onConfirm(input: {
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId?: string | undefined;
    advancementMethod?: AdvancementMethod | undefined;
  }): PredictionValidationIssue[];
}): React.ReactNode {
  const homeTeamId = target.match?.homeTeamId ?? target.bracketMatch?.homeTeamId;
  const awayTeamId = target.match?.awayTeamId ?? target.bracketMatch?.awayTeamId;
  const homeTeam = homeTeamId ? teamsById.get(homeTeamId) : undefined;
  const awayTeam = awayTeamId ? teamsById.get(awayTeamId) : undefined;
  const context = target.context ?? "INITIAL_GROUP_OR_LEAGUE";

  return mode === "QUICK" ? (
    <QuickMatchCard
      target={target}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      context={context}
      onConfirm={onConfirm}
    />
  ) : (
    <ExpertMatchCard
      target={target}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      context={context}
      onConfirm={onConfirm}
    />
  );
}

function TiebreakEntryCard({
  target,
  teamsById,
  onConfirm
}: {
  target: PredictionEntryTarget;
  teamsById: Map<string, Team>;
  onConfirm(orderedTeamIds: string[]): void;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const [orderedTeamIds, setOrderedTeamIds] = useState(target.orderedTeamIds ?? []);

  useEffect(() => {
    setOrderedTeamIds(target.orderedTeamIds ?? []);
  }, [target.id, target.orderedTeamIds]);

  const moveTeam = (teamId: string, direction: -1 | 1): void => {
    setOrderedTeamIds((previous) => {
      const index = previous.indexOf(teamId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      const item = next[index];
      const swappedItem = next[nextIndex];

      if (!item || !swappedItem) {
        return previous;
      }

      next[index] = swappedItem;
      next[nextIndex] = item;

      return next;
    });
  };

  return (
    <AppCard style={styles.entryCard}>
      <StepHeader target={target} />
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        Ordina le squadre pari merito: la prima sara davanti in classifica prevista.
      </Text>
      <View style={styles.fieldStack}>
        {orderedTeamIds.map((teamId, index) => (
          <View
            key={teamId}
            style={[
              styles.tiebreakRow,
              {
                borderColor: theme.colors.border
              }
            ]}
          >
            <Text style={[styles.progressPill, { color: theme.colors.primary }]}>{index + 1}</Text>
            <Text style={[styles.factValue, styles.flex, { color: theme.colors.textPrimary }]}>
              {getTeamLabel(teamsById, teamId)}
            </Text>
            <SecondaryButton
              accessibilityLabel={`Sposta su ${getTeamLabel(teamsById, teamId)}`}
              disabled={index === 0}
              label="Su"
              onPress={() => moveTeam(teamId, -1)}
              style={styles.compactButton}
            />
            <SecondaryButton
              accessibilityLabel={`Sposta giu ${getTeamLabel(teamsById, teamId)}`}
              disabled={index === orderedTeamIds.length - 1}
              label="Giu"
              onPress={() => moveTeam(teamId, 1)}
              style={styles.compactButton}
            />
          </View>
        ))}
      </View>
      <PrimaryButton
        accessibilityLabel="Conferma ordine classifica"
        label="Conferma ordine"
        onPress={() => onConfirm(orderedTeamIds)}
      />
    </AppCard>
  );
}

function QuickMatchCard({
  target,
  homeTeam,
  awayTeam,
  context,
  onConfirm
}: {
  target: PredictionEntryTarget;
  homeTeam?: Team | undefined;
  awayTeam?: Team | undefined;
  context: MatchEntryContext;
  onConfirm(input: {
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId?: string | undefined;
    advancementMethod?: AdvancementMethod | undefined;
  }): PredictionValidationIssue[];
}): React.ReactNode {
  const { theme } = useAppTheme();
  const [outcome, setOutcome] = useState<EntryOutcome | undefined>();
  const [score, setScore] = useState<ScoreChip | undefined>();
  const [manualHome, setManualHome] = useState("1");
  const [manualAway, setManualAway] = useState("0");
  const [showManualScore, setShowManualScore] = useState(false);
  const [qualifiedTeamId, setQualifiedTeamId] = useState<string | undefined>();
  const [advancementMethod, setAdvancementMethod] = useState<AdvancementMethod | undefined>();
  const [issues, setIssues] = useState<string[]>([]);
  const isInitial = context === "INITIAL_GROUP_OR_LEAGUE";
  const chosenOutcome =
    isInitial || !qualifiedTeamId ? outcome : qualifiedTeamId === homeTeam?.id ? "HOME" : "AWAY";
  const scoreChips = chosenOutcome
    ? getScoreChips({
        outcome: chosenOutcome,
        context
      })
    : [];
  const selectedHomeGoals = showManualScore ? Number.parseInt(manualHome, 10) : score?.homeGoals;
  const selectedAwayGoals = showManualScore ? Number.parseInt(manualAway, 10) : score?.awayGoals;
  const selectedScoreIsDraw = selectedHomeGoals === selectedAwayGoals;
  const panStartX = useRef(0);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          panStartX.current = event.nativeEvent.pageX;
        },
        onPanResponderRelease: (
          event: GestureResponderEvent,
          gesture: PanResponderGestureState
        ) => {
          const deltaX = event.nativeEvent.pageX - panStartX.current || gesture.dx;

          if (Math.abs(deltaX) < 60) {
            return;
          }

          if (deltaX > 0) {
            chooseSide("HOME");
          } else {
            chooseSide("AWAY");
          }
        }
      }),
    [awayTeam?.id, homeTeam?.id, isInitial]
  );

  useEffect(() => {
    setOutcome(undefined);
    setScore(undefined);
    setManualHome(String(target.prediction?.homeGoals ?? 1));
    setManualAway(String(target.prediction?.awayGoals ?? 0));
    setShowManualScore(false);
    setQualifiedTeamId(target.prediction?.qualifiedTeamId);
    setAdvancementMethod(target.prediction?.advancementMethod);
    setIssues([]);
  }, [target.id, target.prediction]);

  function chooseSide(nextOutcome: EntryOutcome): void {
    setOutcome(nextOutcome);
    setScore(undefined);
    setIssues([]);

    if (!isInitial) {
      setQualifiedTeamId(nextOutcome === "HOME" ? homeTeam?.id : awayTeam?.id);
      setAdvancementMethod(undefined);
    }
  }

  function submit(): void {
    if (selectedHomeGoals === undefined || selectedAwayGoals === undefined) {
      setIssues(["Scegli un risultato o usa Altro."]);
      return;
    }

    const method =
      isInitial || !selectedScoreIsDraw
        ? isInitial
          ? undefined
          : "REGULATION"
        : advancementMethod;
    const result = onConfirm({
      homeGoals: selectedHomeGoals,
      awayGoals: selectedAwayGoals,
      qualifiedTeamId: isInitial ? undefined : qualifiedTeamId,
      advancementMethod: method
    });

    setIssues(result.map((issue) => issue.message));
  }

  return (
    <AppCard style={styles.entryCard}>
      <StepHeader target={target} />
      {context === "KNOCKOUT_TWO_LEG" ? <TwoLegNotice /> : null}
      <View {...panResponder.panHandlers} style={styles.matchHero}>
        <TeamBadge team={homeTeam} align="left" />
        <View style={styles.versusBlock}>
          <Text style={[styles.scorePreview, { color: theme.colors.textPrimary }]}>
            {selectedHomeGoals ?? "-"} - {selectedAwayGoals ?? "-"}
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            {isInitial ? "Swipe o tap per l'esito" : "Scegli chi passa"}
          </Text>
        </View>
        <TeamBadge team={awayTeam} align="right" />
      </View>

      <View style={styles.choiceGrid}>
        <SecondaryButton
          accessibilityLabel={`Seleziona ${homeTeam?.name ?? "squadra casa"}`}
          label={homeTeam?.shortName ?? "Casa"}
          onPress={() => chooseSide("HOME")}
          style={
            outcome === "HOME" || qualifiedTeamId === homeTeam?.id ? styles.selectedChip : undefined
          }
        />
        {isInitial ? (
          <SecondaryButton
            accessibilityLabel="Seleziona pareggio"
            label="Pareggio"
            onPress={() => {
              setOutcome("DRAW");
              setScore(undefined);
              setIssues([]);
            }}
            style={outcome === "DRAW" ? styles.selectedChip : undefined}
          />
        ) : null}
        <SecondaryButton
          accessibilityLabel={`Seleziona ${awayTeam?.name ?? "squadra trasferta"}`}
          label={awayTeam?.shortName ?? "Trasferta"}
          onPress={() => chooseSide("AWAY")}
          style={
            outcome === "AWAY" || qualifiedTeamId === awayTeam?.id ? styles.selectedChip : undefined
          }
        />
      </View>

      {scoreChips.length > 0 ? (
        <View style={styles.scoreChipGrid}>
          {scoreChips.map((chip) => (
            <SecondaryButton
              key={`${chip.label}-${chip.outcome}`}
              accessibilityLabel={`Risultato ${chip.label}`}
              label={chip.label}
              onPress={() => {
                setScore(chip);
                setShowManualScore(false);
                setIssues([]);
              }}
              style={score?.label === chip.label ? styles.selectedChip : styles.scoreChip}
            />
          ))}
          <SecondaryButton
            accessibilityLabel="Inserisci altro risultato"
            label="Altro"
            onPress={() => {
              setShowManualScore(true);
              setScore(undefined);
            }}
            style={showManualScore ? styles.selectedChip : styles.scoreChip}
          />
        </View>
      ) : null}

      {showManualScore ? (
        <ManualScoreInputs
          homeLabel={homeTeam?.shortName ?? "Casa"}
          awayLabel={awayTeam?.shortName ?? "Trasferta"}
          homeValue={manualHome}
          awayValue={manualAway}
          onHomeChange={setManualHome}
          onAwayChange={setManualAway}
        />
      ) : null}

      {!isInitial && selectedScoreIsDraw && selectedHomeGoals !== undefined ? (
        <MethodSelector method={advancementMethod} onChange={setAdvancementMethod} />
      ) : null}

      <IssueList issues={issues} />
      <PrimaryButton accessibilityLabel="Conferma pronostico" label="Conferma" onPress={submit} />
    </AppCard>
  );
}

function ExpertMatchCard({
  target,
  homeTeam,
  awayTeam,
  context,
  onConfirm
}: {
  target: PredictionEntryTarget;
  homeTeam?: Team | undefined;
  awayTeam?: Team | undefined;
  context: MatchEntryContext;
  onConfirm(input: {
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId?: string | undefined;
    advancementMethod?: AdvancementMethod | undefined;
  }): PredictionValidationIssue[];
}): React.ReactNode {
  const [homeGoals, setHomeGoals] = useState(String(target.prediction?.homeGoals ?? 1));
  const [awayGoals, setAwayGoals] = useState(String(target.prediction?.awayGoals ?? 0));
  const [qualifiedTeamId, setQualifiedTeamId] = useState<string | undefined>(
    target.prediction?.qualifiedTeamId
  );
  const [advancementMethod, setAdvancementMethod] = useState<AdvancementMethod | undefined>(
    target.prediction?.advancementMethod
  );
  const [issues, setIssues] = useState<string[]>([]);
  const isInitial = context === "INITIAL_GROUP_OR_LEAGUE";
  const parsedHomeGoals = Number.parseInt(homeGoals, 10);
  const parsedAwayGoals = Number.parseInt(awayGoals, 10);
  const isDraw = parsedHomeGoals === parsedAwayGoals;
  const regulationWinnerId =
    parsedHomeGoals > parsedAwayGoals
      ? homeTeam?.id
      : parsedAwayGoals > parsedHomeGoals
        ? awayTeam?.id
        : undefined;

  useEffect(() => {
    setHomeGoals(String(target.prediction?.homeGoals ?? 1));
    setAwayGoals(String(target.prediction?.awayGoals ?? 0));
    setQualifiedTeamId(target.prediction?.qualifiedTeamId);
    setAdvancementMethod(target.prediction?.advancementMethod);
    setIssues([]);
  }, [target.id, target.prediction]);

  function submit(): void {
    const result = onConfirm({
      homeGoals: parsedHomeGoals,
      awayGoals: parsedAwayGoals,
      qualifiedTeamId: isInitial ? undefined : isDraw ? qualifiedTeamId : regulationWinnerId,
      advancementMethod: isInitial ? undefined : isDraw ? advancementMethod : "REGULATION"
    });

    setIssues(result.map((issue) => issue.message));
  }

  return (
    <AppCard style={styles.entryCard}>
      <StepHeader target={target} />
      {context === "KNOCKOUT_TWO_LEG" ? <TwoLegNotice /> : null}
      <View style={styles.expertTeams}>
        <TeamBadge team={homeTeam} align="left" />
        <TeamBadge team={awayTeam} align="right" />
      </View>
      <ManualScoreInputs
        homeLabel={homeTeam?.shortName ?? "Casa"}
        awayLabel={awayTeam?.shortName ?? "Trasferta"}
        homeValue={homeGoals}
        awayValue={awayGoals}
        onHomeChange={setHomeGoals}
        onAwayChange={setAwayGoals}
      />
      {!isInitial && isDraw ? (
        <>
          <View style={styles.choiceGrid}>
            <SecondaryButton
              accessibilityLabel={`Qualifica ${homeTeam?.name ?? "squadra casa"}`}
              label={homeTeam?.shortName ?? "Casa"}
              onPress={() => setQualifiedTeamId(homeTeam?.id)}
              style={qualifiedTeamId === homeTeam?.id ? styles.selectedChip : undefined}
            />
            <SecondaryButton
              accessibilityLabel={`Qualifica ${awayTeam?.name ?? "squadra trasferta"}`}
              label={awayTeam?.shortName ?? "Trasferta"}
              onPress={() => setQualifiedTeamId(awayTeam?.id)}
              style={qualifiedTeamId === awayTeam?.id ? styles.selectedChip : undefined}
            />
          </View>
          <MethodSelector method={advancementMethod} onChange={setAdvancementMethod} />
        </>
      ) : null}
      {!isInitial && !isDraw && regulationWinnerId ? (
        <ReadOnlyFact
          label="Qualificata derivata"
          value={
            regulationWinnerId === homeTeam?.id
              ? (homeTeam?.name ?? "Da definire")
              : (awayTeam?.name ?? "Da definire")
          }
        />
      ) : null}
      <IssueList issues={issues} />
      <PrimaryButton accessibilityLabel="Conferma pronostico" label="Conferma" onPress={submit} />
    </AppCard>
  );
}

function StepHeader({ target }: { target: PredictionEntryTarget }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.headerRow}>
      <View style={styles.flex}>
        <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>
          {target.kind === "INITIAL_MATCH"
            ? "Fase iniziale"
            : target.kind === "TIEBREAK"
              ? "Classifica prevista"
              : target.kind === "KNOCKOUT_MATCH"
                ? "Tabellone"
                : "Step"}
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{target.label}</Text>
      </View>
      <Text style={[styles.progressPill, { color: theme.colors.primary }]}>
        {target.currentIndex} di {target.totalCount}
      </Text>
    </View>
  );
}

function TeamBadge({
  team,
  align
}: {
  team?: Team | undefined;
  align: "left" | "right";
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.teamBadgeBlock, align === "right" ? styles.teamBadgeRight : undefined]}>
      <View style={[styles.teamLogo, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text style={[styles.teamLogoText, { color: theme.colors.onPrimaryContainer }]}>
          {getTeamInitials(team)}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={[
          styles.teamName,
          { color: theme.colors.textPrimary },
          align === "right" ? styles.textRight : undefined
        ]}
      >
        {team?.name ?? "Da definire"}
      </Text>
      <Text style={[styles.teamMeta, { color: theme.colors.textSecondary }]}>
        {team?.countryCode ?? "--"}
      </Text>
    </View>
  );
}

function ManualScoreInputs({
  homeLabel,
  awayLabel,
  homeValue,
  awayValue,
  onHomeChange,
  onAwayChange
}: {
  homeLabel: string;
  awayLabel: string;
  homeValue: string;
  awayValue: string;
  onHomeChange(value: string): void;
  onAwayChange(value: string): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.manualScoreRow}>
      <ScoreInput label={homeLabel} value={homeValue} onChange={onHomeChange} />
      <Text style={[styles.scoreDash, { color: theme.colors.textSecondary }]}>-</Text>
      <ScoreInput label={awayLabel} value={awayValue} onChange={onAwayChange} />
    </View>
  );
}

function ScoreInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.scoreInputBlock}>
      <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={`Gol ${label}`}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={(nextValue) => onChange(nextValue.replace(/\D/g, ""))}
        value={value}
        style={[
          styles.scoreInput,
          {
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary
          }
        ]}
      />
    </View>
  );
}

function MethodSelector({
  method,
  onChange
}: {
  method?: AdvancementMethod | undefined;
  onChange(method: AdvancementMethod): void;
}): React.ReactNode {
  return (
    <View style={styles.choiceGrid}>
      <SecondaryButton
        accessibilityLabel="Passa ai supplementari"
        label="Supplementari"
        onPress={() => onChange("EXTRA_TIME")}
        style={method === "EXTRA_TIME" ? styles.selectedChip : undefined}
      />
      <SecondaryButton
        accessibilityLabel="Passa ai rigori"
        label="Rigori"
        onPress={() => onChange("PENALTIES")}
        style={method === "PENALTIES" ? styles.selectedChip : undefined}
      />
    </View>
  );
}

function TwoLegNotice(): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.notice, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        Andata/ritorno: in questa milestone il pronostico usa un placeholder aggregato compatibile
        con il modello esistente.
      </Text>
    </View>
  );
}

function AntepostEntryCard({
  definitions,
  predictions,
  teamsById,
  playersById,
  playerOptions,
  derived,
  onSave,
  onNext
}: {
  definitions: AntepostDefinition[];
  predictions: AntepostPrediction[];
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
  playerOptions: Player[];
  derived: DerivedAntepostSummary;
  onSave(
    definition: AntepostDefinition,
    value: {
      selectedPlayerId?: string | undefined;
      textValue?: string | undefined;
      numericValue?: number | undefined;
    }
  ): void;
  onNext(): void;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const topScorerDefinition = definitions.find((definition) => definition.code === "TOP_SCORER");
  const topScorerGoalsDefinition = definitions.find(
    (definition) => definition.code === "TOP_SCORER_GOALS"
  );
  const topScorerPrediction = topScorerDefinition
    ? predictions.find((prediction) => prediction.definitionId === topScorerDefinition.id)
    : undefined;
  const goalsPrediction = topScorerGoalsDefinition
    ? predictions.find((prediction) => prediction.definitionId === topScorerGoalsDefinition.id)
    : undefined;
  const [topScorerText, setTopScorerText] = useState(
    topScorerPrediction?.textValue ??
      (topScorerPrediction?.selectedPlayerId
        ? playersById.get(topScorerPrediction.selectedPlayerId)?.displayName
        : "") ??
      ""
  );
  const [goalsText, setGoalsText] = useState(
    goalsPrediction?.numericValue !== undefined ? String(goalsPrediction.numericValue) : ""
  );

  useEffect(() => {
    setTopScorerText(
      topScorerPrediction?.textValue ??
        (topScorerPrediction?.selectedPlayerId
          ? playersById.get(topScorerPrediction.selectedPlayerId)?.displayName
          : "") ??
        ""
    );
    setGoalsText(
      goalsPrediction?.numericValue !== undefined ? String(goalsPrediction.numericValue) : ""
    );
  }, [goalsPrediction, playersById, topScorerPrediction]);

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Antepost</Text>
      <ReadOnlyFact
        label="Vincitrice prevista"
        value={getTeamLabel(teamsById, derived.winnerTeamId)}
      />
      <ReadOnlyFact
        label="Finaliste previste"
        value={
          (derived.finalistTeamIds ?? [])
            .map((teamId) => getTeamLabel(teamsById, teamId))
            .join(" - ") || "Da derivare"
        }
      />

      {topScorerDefinition ? (
        <View style={styles.fieldStack}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>
            Capocannoniere
          </Text>
          <TextInput
            accessibilityLabel="Capocannoniere"
            onBlur={() =>
              onSave(topScorerDefinition, {
                textValue: topScorerText.trim() || undefined
              })
            }
            onChangeText={(nextValue) => {
              setTopScorerText(nextValue);
              onSave(topScorerDefinition, {
                textValue: nextValue.trim() || undefined
              });
            }}
            placeholder="Nome giocatore"
            placeholderTextColor={theme.colors.textSecondary}
            value={topScorerText}
            style={[
              styles.textInput,
              { borderColor: theme.colors.border, color: theme.colors.textPrimary }
            ]}
          />
          {playerOptions.length > 0 ? (
            <View style={styles.scoreChipGrid}>
              {playerOptions.slice(0, 8).map((player) => (
                <SecondaryButton
                  key={player.id}
                  accessibilityLabel={`Seleziona ${player.displayName}`}
                  label={player.displayName}
                  onPress={() => {
                    setTopScorerText(player.displayName);
                    onSave(topScorerDefinition, {
                      selectedPlayerId: player.id,
                      textValue: player.displayName
                    });
                  }}
                  style={styles.playerChip}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {topScorerGoalsDefinition ? (
        <View style={styles.fieldStack}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>
            Gol capocannoniere
          </Text>
          <TextInput
            accessibilityLabel="Numero gol capocannoniere"
            keyboardType="number-pad"
            onBlur={() =>
              onSave(topScorerGoalsDefinition, {
                numericValue: goalsText.trim() ? Number.parseInt(goalsText, 10) : undefined
              })
            }
            onChangeText={(nextValue) => {
              const sanitizedValue = nextValue.replace(/\D/g, "");

              setGoalsText(sanitizedValue);
              onSave(topScorerGoalsDefinition, {
                numericValue: sanitizedValue ? Number.parseInt(sanitizedValue, 10) : undefined
              });
            }}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            value={goalsText}
            style={[
              styles.textInput,
              { borderColor: theme.colors.border, color: theme.colors.textPrimary }
            ]}
          />
        </View>
      ) : null}

      <PrimaryButton
        accessibilityLabel="Vai al riepilogo"
        label="Vai al riepilogo"
        onPress={onNext}
      />
    </AppCard>
  );
}

function ReviewCard({
  competitionName,
  editionName,
  mode,
  matchCount,
  missingCount,
  derived,
  predictions,
  definitions,
  teamsById,
  playersById,
  warnings,
  confirmed,
  canConfirm,
  onEdit,
  onClearWarnings,
  onConfirm
}: {
  competitionName: string;
  editionName: string;
  mode: PredictionEntryMode;
  matchCount: number;
  missingCount: number;
  derived: DerivedAntepostSummary;
  predictions: AntepostPrediction[];
  definitions: AntepostDefinition[];
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
  warnings: { message: string }[];
  confirmed: boolean;
  canConfirm: boolean;
  onEdit(): void;
  onClearWarnings(): void;
  onConfirm(): void;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const topScorerDefinition = definitions.find((definition) => definition.code === "TOP_SCORER");
  const goalsDefinition = definitions.find((definition) => definition.code === "TOP_SCORER_GOALS");
  const topScorerPrediction = topScorerDefinition
    ? predictions.find((prediction) => prediction.definitionId === topScorerDefinition.id)
    : undefined;
  const goalsPrediction = goalsDefinition
    ? predictions.find((prediction) => prediction.definitionId === goalsDefinition.id)
    : undefined;

  return (
    <AppCard>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>
            {competitionName}
          </Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{editionName}</Text>
        </View>
        <Trophy color={theme.colors.trophy} size={28} />
      </View>
      <ReadOnlyFact label="Modalità" value={modeLabels[mode]} />
      <ReadOnlyFact
        label="Partite compilate"
        value={`${matchCount - missingCount}/${matchCount}`}
      />
      <ReadOnlyFact
        label="Vincitrice derivata"
        value={getTeamLabel(teamsById, derived.winnerTeamId)}
      />
      <ReadOnlyFact
        label="Finaliste derivate"
        value={
          (derived.finalistTeamIds ?? [])
            .map((teamId) => getTeamLabel(teamsById, teamId))
            .join(" - ") || "Da derivare"
        }
      />
      <ReadOnlyFact
        label="Capocannoniere"
        value={
          topScorerPrediction?.textValue ??
          (topScorerPrediction?.selectedPlayerId
            ? playersById.get(topScorerPrediction.selectedPlayerId)?.displayName
            : undefined) ??
          "Mancante"
        }
      />
      <ReadOnlyFact
        label="Gol capocannoniere"
        value={
          goalsPrediction?.numericValue !== undefined
            ? String(goalsPrediction.numericValue)
            : "Mancante"
        }
      />
      {warnings.length > 0 ? (
        <View style={styles.notice}>
          {warnings.map((warning) => (
            <Text key={warning.message} style={[styles.body, { color: theme.colors.warning }]}>
              {warning.message}
            </Text>
          ))}
          <SecondaryButton
            accessibilityLabel="Cancella warning"
            label="Segna come rivisti"
            onPress={onClearWarnings}
          />
        </View>
      ) : null}
      {confirmed ? (
        <View style={[styles.confirmedBox, { backgroundColor: theme.colors.primaryContainer }]}>
          <Check color={theme.colors.primary} size={18} />
          <Text style={[styles.bodyStrong, { color: theme.colors.onPrimaryContainer }]}>
            Pronostici confermati localmente
          </Text>
        </View>
      ) : null}
      <View style={styles.choiceGrid}>
        <SecondaryButton
          accessibilityLabel="Modifica pronostici"
          label="Modifica"
          onPress={onEdit}
        />
        <PrimaryButton
          accessibilityLabel="Conferma pronostici"
          disabled={!canConfirm}
          label="Conferma"
          onPress={onConfirm}
        />
      </View>
    </AppCard>
  );
}

function CompletedPhaseCard({
  title,
  body,
  onNext
}: {
  title: string;
  body: string;
  onNext(): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>
      <PrimaryButton accessibilityLabel="Continua" label="Continua" onPress={onNext} />
    </AppCard>
  );
}

function ReadOnlyFact({ label, value }: { label: string; value: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.factRow}>
      <Text style={[styles.factLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function IssueList({ issues }: { issues: string[] }): React.ReactNode {
  const { theme } = useAppTheme();

  return issues.length > 0 ? (
    <View style={styles.notice}>
      {issues.map((issue) => (
        <Text key={issue} style={[styles.body, { color: theme.colors.error }]}>
          {issue}
        </Text>
      ))}
    </View>
  ) : null;
}

function getTargetsForPhase(
  workflow: ReturnType<typeof buildPredictionEntryWorkflow>,
  phase: EditablePhase
): PredictionEntryTarget[] {
  if (phase === "INITIAL") {
    return workflow.initialTargets;
  }

  if (phase === "TIEBREAK") {
    return workflow.tiebreakTargets;
  }

  if (phase === "KNOCKOUT") {
    return workflow.knockoutTargets.filter(
      (target) => target.bracketMatch?.homeTeamId && target.bracketMatch.awayTeamId
    );
  }

  return [];
}

function editablePhaseFromWorkflow(phase: PredictionEntryPhase): EditablePhase {
  if (phase === "MODE") {
    return "INITIAL";
  }

  return phase;
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  compactButton: {
    paddingHorizontal: 12
  },
  confirmedBox: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  entryCard: {
    gap: 16
  },
  expertTeams: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  factLabel: {
    fontSize: 13,
    fontWeight: "700"
  },
  factRow: {
    gap: 4
  },
  factValue: {
    fontSize: 17,
    fontWeight: "800"
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "800"
  },
  fieldStack: {
    gap: 8
  },
  flex: {
    flex: 1
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  heroCard: {
    gap: 18
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31
  },
  kicker: {
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  manualScoreRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12
  },
  matchHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 150
  },
  modeBody: {
    fontSize: 14,
    lineHeight: 20
  },
  modeGrid: {
    gap: 12
  },
  modeOption: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 152,
    padding: 16
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: "900"
  },
  notice: {
    borderRadius: 8,
    gap: 8,
    padding: 12
  },
  phaseTab: {
    flexGrow: 1,
    paddingHorizontal: 10
  },
  phaseTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  playerChip: {
    minHeight: 44,
    paddingHorizontal: 10
  },
  progressPill: {
    fontSize: 14,
    fontWeight: "900"
  },
  scoreChip: {
    minWidth: 76
  },
  scoreChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  scoreDash: {
    fontSize: 28,
    fontWeight: "900",
    paddingBottom: 12
  },
  scoreInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 34,
    fontWeight: "900",
    minHeight: 72,
    textAlign: "center"
  },
  scoreInputBlock: {
    flex: 1,
    gap: 6
  },
  scorePreview: {
    fontSize: 36,
    fontWeight: "900"
  },
  selectedChip: {
    borderWidth: 2,
    minWidth: 76
  },
  teamBadgeBlock: {
    flex: 1,
    gap: 6
  },
  teamBadgeRight: {
    alignItems: "flex-end"
  },
  teamLogo: {
    alignItems: "center",
    borderRadius: 8,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  teamLogoText: {
    fontSize: 18,
    fontWeight: "900"
  },
  teamMeta: {
    fontSize: 12,
    fontWeight: "800"
  },
  teamName: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 18,
    minHeight: 52,
    paddingHorizontal: 12
  },
  textRight: {
    textAlign: "right"
  },
  tiebreakRow: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 56,
    padding: 8
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26
  },
  versusBlock: {
    alignItems: "center",
    flex: 1,
    gap: 4
  }
});
