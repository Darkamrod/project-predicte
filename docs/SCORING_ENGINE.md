# Scoring Engine

The scoring engine is pure TypeScript under `src/domain/scoring`.

Properties:

- deterministic inputs and outputs;
- no React or UI dependencies;
- scoring values read from `ScoringRuleConfig`;
- explicit scoring event types;
- exact score replaces 1/X/2 by configuration;
- top scorer plus exact goals replaces top scorer-only by configuration;
- rule versions can be locked with a stable checksum;
- locked rule versions reject updates.

The current preset preserves the supplied World Cup values, including semifinal pairing at 5 points.

## Milestone 3 Complete Engine

Milestone 3 connects rule editing and full-tournament recalculation to:

- group-stage result and exact score;
- group positions;
- stage qualification;
- knockout pairings;
- knockout 90-minute score and advancement method;
- third-place final when configured;
- tournament winner;
- top scorer;
- top-scorer exact goals.

`scorePredictionSetTournament` scores one participant against an `OfficialTournamentResultSet`.
`recalculateTournamentScoring` scores every participant, replaces events for the same source result version, creates a leaderboard snapshot, and builds per-user breakdowns.

Stacking rules currently enforced:

- exact score replaces 1/X/2 when `exactScoreReplacesOutcome` is true;
- top scorer with exact goals replaces top scorer-only when `topScorerExactGoalsReplacesTopScorer` is true;
- qualification, pairing, exact score, and advancement-method bonuses can all appear together when configured with positive values.

Rule lifecycle:

- draft rule versions can be edited before lock/deadline by owner/admin;
- locked versions clone the config and receive a checksum;
- locked versions reject further updates;
- mock rule changes are recorded as `ScoringRuleChange` entries for stage and antepost fields.

The engine remains configuration-driven. No point values are hardcoded into UI or prediction workflow code.
