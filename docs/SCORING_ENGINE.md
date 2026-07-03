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
