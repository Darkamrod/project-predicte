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

## 2026-07-03 - Milestone 1 Authentication and Secure Lifecycle

- Added Supabase Auth through a public anon-key client using Expo public environment variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Implemented Google and Apple login with Supabase OAuth and `expo-web-browser`. Provider setup is still completed in Supabase dashboard and native platform consoles, not through committed secrets.
- Kept the Milestone 0 mock flow as the default when Supabase is not configured. This preserves local demo behavior and avoids requiring credentials for development.
- Added `AuthProvider` separately from `PredicteMockProvider` so real auth can be introduced without coupling it to mock competition state.
- Added a Supabase league repository that uses RPCs for lifecycle writes instead of direct table mutations.
- Chose security-definer RPCs for league creation, invite creation, invite acceptance, role changes, member removal, deadline updates, and lock actions. This keeps complex authorization centralized in the database.
- Stored invite tokens as SHA-256 hashes. The plain invite token is returned only at creation time and used in `/invite/:token` links.
- Required lock to happen at or after the server deadline. Scheduled locking is represented by `lock_due_leagues()` and reserved for service-role execution.
- Added RLS helper functions to avoid recursive policies and to keep membership/role checks consistent.
- Added pure TypeScript policy/lifecycle tests plus static migration tests. Full Supabase local integration tests are still a future improvement because this environment does not run a local Supabase stack during the milestone.

## Milestone 1 Assumptions

- OAuth provider credentials and redirect URL registration are configured outside the repository in Supabase, Google, and Apple consoles.
- The mobile app may safely expose only the Supabase URL and anon key through Expo public env vars.
- The first real league lifecycle can use `total_required = 0` prediction sets until Milestone 2 completes full prediction requirements.
- Ownership transfer remains out of scope for Milestone 1; owner/admin/participant role management supports promotion/demotion for non-owner members only.
