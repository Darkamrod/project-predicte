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
