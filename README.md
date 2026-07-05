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

## Trusted Worker Configuration

Milestone 7 adds a deployable Supabase Edge Function wrapper for server-side mock result import and trusted scoring:

- `supabase/functions/trusted-result-import/index.ts`
- `supabase/functions/import_map.json`

The Edge runtime must provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. These values are server-only and must not be exposed through Expo public variables or mobile client code.

## Milestone 0 Scope

This repository intentionally does not include payments, entry fees, prize pools, paid/unpaid member status, betting, odds, advertising SDKs, or real sports-provider connections.

The app still preserves mock flows for local development. Supabase migrations, server modules, and the Edge Function wrapper prepare the trusted backend path without connecting a real sports-provider API.
