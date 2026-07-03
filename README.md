# Project Predicte

Project Predicte is a mobile-first Expo app for private football prediction leagues.

Milestone 0 establishes a verified vertical slice with mock adapters only:

- Expo Router navigation.
- Light and dark token-based themes.
- Reusable UI components.
- A data-driven World Cup-style mock competition.
- Mock auth, league, prediction, result, and leaderboard flows.
- A pure configurable scoring engine with unit tests.
- Initial Supabase project structure and migrations.

## Commands

```bash
npm install
npm run start
npm run lint
npm run typecheck
npm run test
```

## Supabase Auth Configuration

Milestone 1 supports real Supabase Auth when these public Expo variables are present:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Google and Apple OAuth providers must be enabled in Supabase and configured with the `predicte://auth/callback` redirect flow. Without these variables, the app keeps using the Milestone 0 mock flow.

## Milestone 0 Scope

This repository intentionally does not include payments, entry fees, prize pools, paid/unpaid member status, betting, odds, advertising SDKs, or real sports-provider connections.

The app currently uses in-memory mock adapters. Supabase is represented by deterministic local migrations and architecture docs for the next milestones.
