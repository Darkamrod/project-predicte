import { describe, expect, it } from "vitest";

import { parseAuthenticatedPredictionTargetCatalog } from "@/services/predictions/authenticatedPredictionTargetCatalog";

describe("parseAuthenticatedPredictionTargetCatalog", () => {
  it("accepts a semantically scoped catalog and maps its envelope", () => {
    const parsed = parseAuthenticatedPredictionTargetCatalog(createCatalog());

    expect(parsed).toMatchObject({
      leagueId,
      editionId,
      formatTemplateVersionId: formatVersionId,
      scoringPresetVersionId: scoringVersionId
    });
    expect(parsed.bracketSlots[0]).toMatchObject({ sourceType: "GROUP_POSITION", targetLeg: 1 });
  });

  it("preserves an authorized empty protected catalog", () => {
    const catalog = createCatalog();
    catalog.bracket_nodes = [];
    catalog.bracket_slots = [];
    catalog.best_third_combinations = [];
    catalog.antepost_definitions = [];
    catalog.tiebreak_rules = [];

    expect(parseAuthenticatedPredictionTargetCatalog(catalog).bracketNodes).toEqual([]);
  });

  it.each([
    ["envelope UUID", (value: CatalogFixture) => (value.league_id = "not-a-uuid")],
    ["node UUID", (value: CatalogFixture) => (value.bracket_nodes[0]!.id = "bad")],
    ["slot UUID", (value: CatalogFixture) => (value.bracket_slots[0]!.id = "bad")],
    ["zero node order", (value: CatalogFixture) => (value.bracket_nodes[0]!.sort_order = 0)],
    ["negative target leg", (value: CatalogFixture) => (value.bracket_slots[0]!.target_leg = -1)],
    [
      "decimal option",
      (value: CatalogFixture) => (value.best_third_combinations[0]!.option_number = 1.5)
    ],
    [
      "invalid target side",
      (value: CatalogFixture) => (value.bracket_slots[0]!.target_side = "center")
    ],
    [
      "invalid source type",
      (value: CatalogFixture) => (value.bracket_slots[0]!.source_type = "FREE_TEXT")
    ],
    [
      "invalid source payload",
      (value: CatalogFixture) =>
        delete (value.bracket_slots[0]!.source_payload as Record<string, unknown>).groupCode
    ],
    [
      "cross-edition node",
      (value: CatalogFixture) => (value.bracket_nodes[0]!.edition_id = otherId)
    ],
    [
      "cross-version slot",
      (value: CatalogFixture) => (value.bracket_slots[0]!.format_template_version_id = otherId)
    ],
    [
      "orphan target node",
      (value: CatalogFixture) => (value.bracket_slots[0]!.target_node_id = otherId)
    ],
    [
      "cross-version combination",
      (value: CatalogFixture) =>
        (value.best_third_combinations[0]!.format_template_version_id = otherId)
    ],
    [
      "non-canonical combination key",
      (value: CatalogFixture) => (value.best_third_combinations[0]!.combination_key = "B")
    ],
    [
      "assignment source outside combination",
      (value: CatalogFixture) =>
        (value.best_third_combinations[0]!.assignments[0]!.third_place_group_code = "B")
    ],
    [
      "orphan assignment node",
      (value: CatalogFixture) =>
        (value.best_third_combinations[0]!.assignments[0]!.target_node_id = otherId)
    ],
    [
      "cross-edition antepost",
      (value: CatalogFixture) => (value.antepost_definitions[0]!.edition_id = otherId)
    ],
    [
      "cross-edition tiebreak",
      (value: CatalogFixture) => (value.tiebreak_rules[0]!.edition_id = otherId)
    ]
  ])("rejects %s", (_label, mutate) => {
    const catalog = createCatalog();
    mutate(catalog);
    expect(() => parseAuthenticatedPredictionTargetCatalog(catalog)).toThrow();
  });

  it("rejects a winner source that references a node outside the catalog", () => {
    const catalog = createCatalog();
    catalog.bracket_slots[0]!.source_type = "WINNER_OF_MATCH";
    catalog.bracket_slots[0]!.source_payload = {
      matchId: otherId,
      nodeKey: "M99"
    } as unknown as CatalogFixture["bracket_slots"][number]["source_payload"];

    expect(() => parseAuthenticatedPredictionTargetCatalog(catalog)).toThrow(
      "Sorgente bracket non appartenente al catalogo"
    );
  });
});

const leagueId = "20000000-0000-4000-8000-000000000001";
const editionId = "20000000-0000-4000-8000-000000000002";
const formatVersionId = "20000000-0000-4000-8000-000000000003";
const rulesetVersionId = "20000000-0000-4000-8000-000000000004";
const requirementVersionId = "20000000-0000-4000-8000-000000000005";
const scoringVersionId = "20000000-0000-4000-8000-000000000006";
const nodeId = "20000000-0000-4000-8000-000000000007";
const roundId = "20000000-0000-4000-8000-000000000008";
const matchId = "20000000-0000-4000-8000-000000000009";
const otherId = "20000000-0000-4000-8000-000000000099";

function createCatalog() {
  return {
    league_id: leagueId,
    edition_id: editionId,
    format_template_version_id: formatVersionId,
    ruleset_version_id: rulesetVersionId,
    prediction_requirement_version_id: requirementVersionId,
    scoring_preset_version_id: scoringVersionId,
    bracket_nodes: [
      {
        id: nodeId,
        edition_id: editionId,
        format_template_version_id: formatVersionId,
        node_key: "M73",
        round_id: roundId,
        target_match_id: matchId,
        sort_order: 1
      }
    ],
    bracket_slots: [
      {
        id: "20000000-0000-4000-8000-000000000010",
        edition_id: editionId,
        format_template_version_id: formatVersionId,
        round_id: roundId,
        target_node_id: nodeId,
        target_match_id: matchId,
        target_side: "home",
        target_leg: 1,
        slot_key: "M73_HOME",
        source_type: "GROUP_POSITION",
        source_payload: { groupCode: "A", position: 1 }
      }
    ],
    best_third_combinations: [
      {
        id: "20000000-0000-4000-8000-000000000011",
        edition_id: editionId,
        format_template_version_id: formatVersionId,
        option_number: 1,
        combination_key: "A",
        qualified_group_codes: ["A"],
        assignments: [
          {
            format_template_version_id: formatVersionId,
            target_node_id: nodeId,
            target_side: "away",
            winner_group_code: "B",
            third_place_group_code: "A"
          }
        ]
      }
    ],
    antepost_definitions: [
      {
        id: "20000000-0000-4000-8000-000000000012",
        edition_id: editionId,
        code: "TOP_SCORER",
        label: "Capocannoniere",
        value_type: "PLAYER",
        required: true
      }
    ],
    tiebreak_rules: [
      {
        id: "20000000-0000-4000-8000-000000000013",
        edition_id: editionId,
        scope: "GROUP",
        sort_order: 1,
        rule_code: "points",
        rule_payload: {}
      }
    ]
  };
}

type CatalogFixture = ReturnType<typeof createCatalog>;
