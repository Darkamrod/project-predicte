# Decisions

## 2026-07-03 - Milestone 0 Foundation

- Initialized a compact Expo Router app instead of a full generated template to keep the first milestone controlled and auditable.
- Used a small internal token-based component layer rather than React Native Paper. This keeps the base UI focused while still preserving Material-like touch targets and semantic tokens.
- Used Vitest for pure domain tests. React Native UI tests are deferred until more real UI behavior exists.
- Implemented mock adapters for auth, football data, and league state. No real Supabase, Sportmonks, advertising, payment, betting, odds, or gambling integration is present.
- Represented the World Cup-style tournament as generated configuration: 12 groups, 48 teams, 72 group-stage matches, knockout slot metadata, and antepost definitions.
- Kept scoring values in `worldCupDefaultScoringConfig`. The scoring engine receives configuration and does not hardcode point values.
- Preserved the semifinal pairing value of 5 points from the supplied preset.
- Used an in-memory mock repository for Milestone 0 autosave/sync simulation. Persistence across app restarts is deferred.
- Used a stable FNV-1a checksum for mock rule snapshots. A cryptographic hash can replace it server-side later.
- Created broad initial Supabase tables and representative RLS/trigger guards. Full database integration and policy tests are deferred to Milestone 1.

## Assumptions

- The mock competition may use generated team/player names because no production spreadsheet or official provider data is available in the repository.
- Milestone 0 only needs group-stage prediction entry in UI; knockout and antepost support are modeled for configuration and scoring but not fully exposed as flows yet.
- The local server time for mock write checks is fixed in state to keep the vertical slice deterministic.
- npm audit reports moderate transitive vulnerabilities after installing current packages; no forced breaking updates were applied during this milestone.
