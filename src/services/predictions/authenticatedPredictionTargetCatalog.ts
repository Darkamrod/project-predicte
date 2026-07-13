import { z } from "zod";

import type { Json } from "@/services/supabase/database.types";

const uuidSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);
const positiveIntegerSchema = z.number().int().positive();

const targetSideSchema = z.enum(["home", "away"]);
const groupCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_-]*$/);

const groupPositionSourceSchema = z
  .object({ groupCode: groupCodeSchema, position: positiveIntegerSchema })
  .strict();
const bestThirdSourceSchema = z.object({ winnerGroupCode: groupCodeSchema }).strict();
const leaguePositionSourceSchema = z.object({ position: positiveIntegerSchema }).strict();
const matchSourceSchema = z.object({ matchId: uuidSchema, nodeKey: nonEmptyStringSchema }).strict();

const bracketNodeSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    format_template_version_id: uuidSchema,
    node_key: nonEmptyStringSchema,
    round_id: uuidSchema,
    target_match_id: uuidSchema,
    sort_order: positiveIntegerSchema
  })
  .strict();

const bracketSlotSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    format_template_version_id: uuidSchema,
    round_id: uuidSchema,
    target_node_id: uuidSchema,
    target_match_id: uuidSchema,
    target_side: targetSideSchema,
    target_leg: positiveIntegerSchema,
    slot_key: nonEmptyStringSchema,
    source_type: z.enum([
      "GROUP_POSITION",
      "BEST_THIRD_MATRIX",
      "LEAGUE_POSITION",
      "WINNER_OF_MATCH",
      "LOSER_OF_MATCH"
    ]),
    source_payload: z.record(z.string(), z.unknown())
  })
  .strict()
  .superRefine((slot, context) => {
    const sourceSchemas = {
      GROUP_POSITION: groupPositionSourceSchema,
      BEST_THIRD_MATRIX: bestThirdSourceSchema,
      LEAGUE_POSITION: leaguePositionSourceSchema,
      WINNER_OF_MATCH: matchSourceSchema,
      LOSER_OF_MATCH: matchSourceSchema
    } as const;
    const result = sourceSchemas[slot.source_type].safeParse(slot.source_payload);
    if (!result.success) {
      context.addIssue({
        code: "custom",
        path: ["source_payload"],
        message: `Payload non valido per ${slot.source_type}.`
      });
    }
  });

const bestThirdAssignmentSchema = z
  .object({
    format_template_version_id: uuidSchema,
    target_node_id: uuidSchema,
    target_side: targetSideSchema,
    winner_group_code: groupCodeSchema,
    third_place_group_code: groupCodeSchema
  })
  .strict();

const bestThirdCombinationSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    format_template_version_id: uuidSchema,
    option_number: positiveIntegerSchema,
    combination_key: groupCodeSchema,
    qualified_group_codes: z.array(groupCodeSchema).min(1),
    assignments: z.array(bestThirdAssignmentSchema).min(1)
  })
  .strict();

const antepostDefinitionSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    code: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    value_type: z.enum(["PLAYER", "NUMBER"]),
    required: z.boolean()
  })
  .strict();

const tiebreakRuleSchema = z
  .object({
    id: uuidSchema,
    edition_id: uuidSchema,
    scope: nonEmptyStringSchema,
    sort_order: positiveIntegerSchema,
    rule_code: nonEmptyStringSchema,
    rule_payload: z.record(z.string(), z.unknown())
  })
  .strict();

const targetCatalogSchema = z
  .object({
    league_id: uuidSchema,
    edition_id: uuidSchema,
    format_template_version_id: uuidSchema,
    ruleset_version_id: uuidSchema,
    prediction_requirement_version_id: uuidSchema,
    scoring_preset_version_id: uuidSchema,
    bracket_nodes: z.array(bracketNodeSchema),
    bracket_slots: z.array(bracketSlotSchema),
    best_third_combinations: z.array(bestThirdCombinationSchema),
    antepost_definitions: z.array(antepostDefinitionSchema),
    tiebreak_rules: z.array(tiebreakRuleSchema)
  })
  .strict()
  .superRefine((catalog, context) => {
    const nodeById = new Map(catalog.bracket_nodes.map((node) => [node.id, node]));
    const nodeByKey = new Map(catalog.bracket_nodes.map((node) => [node.node_key, node]));
    const slotKeys = new Set<string>();
    const destinations = new Set<string>();

    catalog.bracket_nodes.forEach((node, index) => {
      requireScope(node, catalog, context, ["bracket_nodes", index]);
    });

    catalog.bracket_slots.forEach((slot, index) => {
      const path = ["bracket_slots", index] as const;
      requireScope(slot, catalog, context, path);
      const targetNode = nodeById.get(slot.target_node_id);
      if (!targetNode || targetNode.target_match_id !== slot.target_match_id) {
        addIssue(context, path, "Bracket slot con target node/match non appartenente al catalogo.");
      }
      if (slotKeys.has(slot.slot_key)) {
        addIssue(context, path, "Bracket slot key duplicata.");
      }
      slotKeys.add(slot.slot_key);
      const destination = `${slot.target_node_id}:${slot.target_side}:${slot.target_leg}`;
      if (destinations.has(destination)) {
        addIssue(context, path, "Destinazione bracket duplicata.");
      }
      destinations.add(destination);

      if (slot.source_type === "WINNER_OF_MATCH" || slot.source_type === "LOSER_OF_MATCH") {
        const payload = matchSourceSchema.parse(slot.source_payload);
        const sourceNode = nodeByKey.get(payload.nodeKey);
        if (!sourceNode || sourceNode.target_match_id !== payload.matchId) {
          addIssue(
            context,
            [...path, "source_payload"],
            "Sorgente bracket non appartenente al catalogo."
          );
        }
      }
    });

    catalog.best_third_combinations.forEach((combination, index) => {
      const path = ["best_third_combinations", index] as const;
      requireScope(combination, catalog, context, path);
      const groups = combination.qualified_group_codes;
      if (new Set(groups).size !== groups.length) {
        addIssue(context, path, "Combinazione con gruppi qualificati duplicati.");
      }
      if ([...groups].sort().join("") !== combination.combination_key) {
        addIssue(context, path, "Chiave combinazione non canonica.");
      }
      if (combination.assignments.length !== groups.length) {
        addIssue(context, path, "Combinazione con numero assignment incoerente.");
      }
      const sourceGroups = new Set<string>();
      const assignmentDestinations = new Set<string>();
      combination.assignments.forEach((assignment, assignmentIndex) => {
        const assignmentPath = [...path, "assignments", assignmentIndex] as const;
        if (assignment.format_template_version_id !== catalog.format_template_version_id) {
          addIssue(context, assignmentPath, "Assignment fuori dalla format version del catalogo.");
        }
        if (!nodeById.has(assignment.target_node_id)) {
          addIssue(
            context,
            assignmentPath,
            "Assignment con target node non appartenente al catalogo."
          );
        }
        if (!groups.includes(assignment.third_place_group_code)) {
          addIssue(context, assignmentPath, "Assignment con gruppo sorgente fuori combinazione.");
        }
        if (sourceGroups.has(assignment.third_place_group_code)) {
          addIssue(context, assignmentPath, "Assignment con gruppo sorgente duplicato.");
        }
        sourceGroups.add(assignment.third_place_group_code);
        const destination = `${assignment.target_node_id}:${assignment.target_side}`;
        if (assignmentDestinations.has(destination)) {
          addIssue(context, assignmentPath, "Assignment con destinazione duplicata.");
        }
        assignmentDestinations.add(destination);
      });
    });

    catalog.antepost_definitions.forEach((definition, index) => {
      if (definition.edition_id !== catalog.edition_id) {
        addIssue(context, ["antepost_definitions", index], "Antepost fuori edition scope.");
      }
    });
    catalog.tiebreak_rules.forEach((rule, index) => {
      if (rule.edition_id !== catalog.edition_id) {
        addIssue(context, ["tiebreak_rules", index], "Tie-break fuori edition scope.");
      }
    });
  });

type CatalogScopeRow = { edition_id: string; format_template_version_id: string };
type CatalogEnvelope = { edition_id: string; format_template_version_id: string };

function requireScope(
  row: CatalogScopeRow,
  catalog: CatalogEnvelope,
  context: z.RefinementCtx,
  path: readonly (string | number)[]
): void {
  if (
    row.edition_id !== catalog.edition_id ||
    row.format_template_version_id !== catalog.format_template_version_id
  ) {
    addIssue(context, path, "Riga fuori edition/format scope del catalogo.");
  }
}

function addIssue(
  context: z.RefinementCtx,
  path: readonly (string | number)[],
  message: string
): void {
  context.addIssue({ code: "custom", path: [...path], message });
}

export interface SupabasePredictionCatalogBracketSlot {
  id: string;
  editionId: string;
  formatTemplateVersionId: string;
  roundId: string;
  targetNodeId: string;
  targetMatchId: string;
  targetSide: "home" | "away";
  targetLeg: number;
  slotKey: string;
  sourceType: z.infer<typeof bracketSlotSchema>["source_type"];
  sourcePayload: Json;
}

export interface SupabasePredictionCatalogBracketNode {
  id: string;
  editionId: string;
  formatTemplateVersionId: string;
  nodeKey: string;
  roundId: string;
  targetMatchId: string;
  order: number;
}

export interface SupabasePredictionCatalogBestThirdAssignment {
  formatTemplateVersionId: string;
  targetNodeId: string;
  targetSide: "home" | "away";
  winnerGroupCode: string;
  thirdPlaceGroupCode: string;
}

export interface SupabasePredictionCatalogBestThirdCombination {
  id: string;
  editionId: string;
  formatTemplateVersionId: string;
  optionNumber: number;
  combinationKey: string;
  qualifiedGroupCodes: string[];
  assignments: SupabasePredictionCatalogBestThirdAssignment[];
}

export interface SupabasePredictionCatalogAntepostDefinition {
  id: string;
  editionId: string;
  code: string;
  label: string;
  valueType: "PLAYER" | "NUMBER";
  required: boolean;
}

export interface SupabasePredictionCatalogTiebreakRule {
  id: string;
  editionId: string;
  scope: string;
  order: number;
  ruleCode: string;
  rulePayload: Json;
}

export interface SupabasePredictionTargetCatalog {
  leagueId: string;
  editionId: string;
  formatTemplateVersionId: string;
  rulesetVersionId: string;
  predictionRequirementVersionId: string;
  scoringPresetVersionId: string;
  bracketNodes: SupabasePredictionCatalogBracketNode[];
  bracketSlots: SupabasePredictionCatalogBracketSlot[];
  bestThirdCombinations: SupabasePredictionCatalogBestThirdCombination[];
  antepostDefinitions: SupabasePredictionCatalogAntepostDefinition[];
  tiebreakRules: SupabasePredictionCatalogTiebreakRule[];
}

export function parseAuthenticatedPredictionTargetCatalog(
  payload: unknown
): SupabasePredictionTargetCatalog {
  const catalog = targetCatalogSchema.parse(payload);
  return {
    leagueId: catalog.league_id,
    editionId: catalog.edition_id,
    formatTemplateVersionId: catalog.format_template_version_id,
    rulesetVersionId: catalog.ruleset_version_id,
    predictionRequirementVersionId: catalog.prediction_requirement_version_id,
    scoringPresetVersionId: catalog.scoring_preset_version_id,
    bracketNodes: catalog.bracket_nodes.map((node) => ({
      id: node.id,
      editionId: node.edition_id,
      formatTemplateVersionId: node.format_template_version_id,
      nodeKey: node.node_key,
      roundId: node.round_id,
      targetMatchId: node.target_match_id,
      order: node.sort_order
    })),
    bracketSlots: catalog.bracket_slots.map((slot) => ({
      id: slot.id,
      editionId: slot.edition_id,
      formatTemplateVersionId: slot.format_template_version_id,
      roundId: slot.round_id,
      targetNodeId: slot.target_node_id,
      targetMatchId: slot.target_match_id,
      targetSide: slot.target_side,
      targetLeg: slot.target_leg,
      slotKey: slot.slot_key,
      sourceType: slot.source_type,
      sourcePayload: slot.source_payload as Json
    })),
    bestThirdCombinations: catalog.best_third_combinations.map((combination) => ({
      id: combination.id,
      editionId: combination.edition_id,
      formatTemplateVersionId: combination.format_template_version_id,
      optionNumber: combination.option_number,
      combinationKey: combination.combination_key,
      qualifiedGroupCodes: combination.qualified_group_codes,
      assignments: combination.assignments.map((assignment) => ({
        formatTemplateVersionId: assignment.format_template_version_id,
        targetNodeId: assignment.target_node_id,
        targetSide: assignment.target_side,
        winnerGroupCode: assignment.winner_group_code,
        thirdPlaceGroupCode: assignment.third_place_group_code
      }))
    })),
    antepostDefinitions: catalog.antepost_definitions.map((definition) => ({
      id: definition.id,
      editionId: definition.edition_id,
      code: definition.code,
      label: definition.label,
      valueType: definition.value_type,
      required: definition.required
    })),
    tiebreakRules: catalog.tiebreak_rules.map((rule) => ({
      id: rule.id,
      editionId: rule.edition_id,
      scope: rule.scope,
      order: rule.sort_order,
      ruleCode: rule.rule_code,
      rulePayload: rule.rule_payload as Json
    }))
  };
}
