# Architecture

The Milestone 0 app uses Expo, React Native, TypeScript strict mode, and Expo Router.

## Layers

- `app/`: route files and navigation only.
- `src/features/`: screen-level composition for product flows.
- `src/components/`: reusable token-based UI components.
- `src/design-system/`: semantic color tokens, spacing, radius, touch targets, and theme provider.
- `src/domain/`: pure business logic for competitions, predictions, scoring, and leaderboard.
- `src/services/`: adapter interfaces and mock implementations.
- `src/state/`: in-memory mock app state wiring adapters to UI.
- `supabase/`: local project structure and deterministic initial migration.

Domain code does not import React Native UI. Scoring values live in configuration and are passed into pure functions.

## Milestone 1 Additions

- `src/services/supabase/`: public Supabase client, OAuth Auth flow, profile service, and typed RPC surface.
- `src/state/AuthProvider.tsx`: app-level auth state. It uses Supabase when public Expo env vars are present and falls back to the Milestone 0 mock user otherwise.
- `src/services/leagues/supabaseLeagueRepository.ts`: secure lifecycle adapter that calls database RPCs instead of writing protected tables directly.
- `src/domain/leagues` and `src/domain/security`: pure lifecycle and RLS-equivalent policy rules used by tests and documentation.

The mock vertical slice remains available while the real backend is introduced behind explicit configuration.

## Milestone 2 Additions

- `src/domain/predictions/bracket.ts`: predicted group tables, best third-placed qualifiers, and generated knockout bracket.
- `src/domain/predictions/validation.ts`: full prediction-set validation for groups, tie-breaks, knockout, antepost, dependency warnings, and sync state.
- `src/domain/predictions/invalidation.ts`: downstream bracket impact detection that preserves predictions and emits review warnings.
- `src/features/predictions/PredictionWorkflowScreen.tsx`: mobile-first workflow hub that composes domain results into group, standings, knockout, antepost, and review sections.

The prediction workflow remains mock-backed unless Supabase is configured. Business rules stay in `src/domain`.

## Milestone 3 Additions

- `src/domain/scoring/tournamentScoring.ts`: pure full-tournament scoring orchestration, idempotent recalculation, leaderboard snapshot generation, and point breakdown generation.
- `src/services/mock/mockResults.ts`: deterministic official-result mock adapter used only to exercise scoring without real sports-provider APIs.
- `src/features/rules/RulesScreen.tsx`: complete stage and antepost rule editor wired to domain/provider guards.
- `src/features/leaderboard/LeaderboardScreen.tsx`: displays domain-generated point breakdowns.

Rule editing and scoring remain separated from route files and UI components. The mock provider coordinates state updates, while scoring calculations stay in `src/domain/scoring`.
