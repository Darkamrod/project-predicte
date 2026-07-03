# Project Predicte
## Master Product Specification and Codex Prompt — Version 1.0

> Internal project name: **Project Predicte**  
> Product language for MVP: **Italian**  
> Code, identifiers, commits, technical documentation: **English**  
> Target platforms: **Android and iOS**  
> Development approach: **mobile-first, modular, testable, server-authoritative**

---

# COPY THIS ENTIRE DOCUMENT INTO CODEX

You are the lead software architect and senior mobile engineer for **Project Predicte**.

Your job is to create a maintainable, production-oriented mobile application for private football prediction leagues. Do not treat this as a one-shot prototype. Work in controlled milestones, preserve architectural decisions, add tests for critical business logic, and never silently invent missing product rules.

Before changing code:

1. Inspect the repository and existing files.
2. Read every `AGENTS.md`, README, architecture document, migration, and test.
3. If the repository is empty, initialize it according to this specification.
4. If an `AGENTS.md` file does not exist, create one that summarizes the durable engineering rules in this document.
5. Keep a decision log in `docs/DECISIONS.md`.
6. Do not implement real-money payment, entry-fee, betting, odds, wagering, prize-pool, or payout functionality.
7. Do not expose sports-provider credentials or Supabase service-role credentials to the mobile client.
8. Do not build the entire application in a single uncontrolled pass.

At the end of every milestone:

- run formatting, linting, type checking, and tests;
- report what changed;
- report commands executed and their results;
- list unresolved decisions, risks, and assumptions;
- stop before starting the next milestone unless explicitly instructed.

---

# 1. Product vision

Project Predicte is a mobile app that replaces complex Excel-based football prediction competitions with a fast, automatic, transparent, and visually clear experience.

The core value proposition is:

> Select an official competition, create a private league, invite participants, complete predictions quickly, lock everything at the league deadline, and let the app update real results, points, and rankings automatically.

The product must optimize for:

1. **Simplicity** — an inexperienced user must understand the main action within seconds.
2. **Speed** — completing a large tournament must require as few taps as reasonably possible.
3. **Automation** — calendars, teams, stages, results, standings, and scoring updates should not require manual organizer work.
4. **Transparency** — locked predictions, scoring rules, changes, and leaderboard calculations must be auditable.
5. **Reliability** — all scoring must be reproducible from immutable inputs.
6. **Mobile usability** — league organizers must manage their league entirely from the app.
7. **Scalability** — the data model must support hundreds or thousands of participants without redesign.

The main competitor is not only another prediction app. It is the existing Excel workflow.

---

# 2. MVP scope

## Included

- Android and iOS mobile app.
- Italian user interface.
- Google sign-in.
- Sign in with Apple.
- Official football competition catalog.
- Initially supported competition families:
  - FIFA World Cup;
  - UEFA European Championship;
  - UEFA Champions League.
- Competition editions, for example:
  - World Cup 2030;
  - Euro 2028;
  - Champions League 2027/28.
- Creation of private leagues linked to one competition edition.
- League owner and league administrator roles.
- Invite by:
  - universal/deep link;
  - system share sheet;
  - WhatsApp;
  - Telegram;
  - QR code.
- Global league prediction deadline.
- Prediction editing until the deadline.
- Irreversible prediction lock at the deadline.
- Visibility of other participants’ predictions only after lock.
- Competition-specific scoring presets.
- League-specific scoring customization before lock.
- Immutable scoring-rule snapshot after lock.
- Automatic schedule and result synchronization through a sports-data provider adapter.
- Support for:
  - 90-minute score;
  - extra time;
  - penalty shootouts;
  - postponed, suspended, cancelled, and corrected matches.
- Automatic scoring after each settled match.
- Live or near-live league leaderboard.
- Position change after each scoring update.
- Participant search and pinned current-user row.
- Participant prediction detail after lock.
- Push notifications.
- League archive and historical final standings.
- Light and dark themes.
- Accessibility and large-text support.
- Audit log for important administrative changes.

## Explicitly excluded from the public MVP

- Entry fees.
- Cash prizes.
- Payouts.
- Payment collection.
- “Paid / unpaid” participant tracking.
- Betting odds.
- Sports betting.
- Public wagering.
- Gambling terminology.
- Chat or social network.
- User-generated competitions entered match by match.
- Desktop organizer requirement.
- Advertising in the initial engineering milestone.
- AI-generated match tips.
- Multiple sports.

Design the architecture so some excluded features can be evaluated later, but do not implement them now.

---

# 3. User roles

## 3.1 Platform administrator

This is the Project Predicte operator, not a league organizer.

Responsibilities:

- enable or disable supported competition editions;
- review imported competition data;
- resolve provider mappings;
- confirm or override ambiguous official data;
- manage scoring presets;
- inspect sync failures;
- trigger controlled recalculation;
- manage app-wide feature flags.

For MVP, platform administration can be performed using secured Supabase administration tools and scripts. A public web back office is not required.

## 3.2 League owner

- creates the league;
- selects the competition edition;
- sets name and deadline;
- chooses or customizes the scoring preset;
- invites participants;
- promotes or removes league administrators;
- removes participants before lock;
- transfers ownership before lock;
- sees completion status;
- manages league configuration before lock;
- views the audit log.

## 3.3 League administrator

Permissions are granted by the owner.

Default permissions:

- invite participants;
- manage participants before lock;
- view completion status;
- edit scoring configuration before lock;
- view administrative audit history.

Only the owner can transfer ownership or delete the league.

## 3.4 Participant

- joins through an invite;
- completes and edits predictions before the deadline;
- sees a clear completion percentage;
- sees their own predictions at all times;
- sees other participants’ predictions only after lock;
- sees the leaderboard after scoring begins;
- sees their position change and points breakdown.

---

# 4. Core product flow

1. User opens the app.
2. Existing session is restored or the user signs in with Google/Apple.
3. Home shows active, upcoming, and archived leagues.
4. User chooses:
   - create a league;
   - join through an invite;
   - open an existing league.
5. To create a league:
   - select a supported competition edition;
   - enter league name;
   - choose deadline;
   - choose default scoring preset or customize it;
   - review;
   - create.
6. The league owner shares an invite.
7. Participants join and complete predictions.
8. Users may modify predictions until the server-side deadline.
9. At the deadline:
   - league state becomes locked;
   - predictions become immutable;
   - scoring rules become immutable;
   - predictions become visible to league members;
   - membership changes are blocked.
10. Sports data is synchronized automatically.
11. When a match is officially settled:
   - official result is normalized;
   - scoring events are calculated;
   - leaderboard snapshot is generated;
   - Realtime update is published;
   - relevant push notifications may be sent.
12. At competition end:
   - final antepost items are settled;
   - final leaderboard is generated;
   - league becomes completed and later archived.

---

# 5. League lifecycle and deadlines

Use server-authoritative UTC time.

League statuses:

- `draft`
- `open`
- `locked`
- `live`
- `completed`
- `archived`
- `cancelled`

Allowed transitions:

- `draft -> open`
- `open -> locked`
- `locked -> live`
- `live -> completed`
- `completed -> archived`
- `draft/open -> cancelled`

Rules:

- The deadline must not be later than the configured maximum deadline for the competition edition.
- Default deadline: a configurable amount before the first official match, initially 30 minutes.
- The owner may choose an earlier deadline.
- The owner may edit the deadline only while the league is open and the current server time is before both the old and new deadline.
- A passed deadline cannot be extended.
- Locking is irreversible through the normal app.
- Every write operation must verify `server_now < deadline_at`, not only rely on a status field.
- A scheduled server job updates status, but database policies/triggers must still prevent race-condition writes.
- If the official first kickoff changes, notify the owner. Do not silently move a league’s chosen deadline.
- A platform administrator may perform an exceptional audited correction only through a protected maintenance operation.

---

# 6. Competition model

Separate these concepts:

- `Sport`
- `CompetitionTemplate`
- `CompetitionEdition`
- `Stage`
- `Group`
- `Round`
- `Team`
- `Player`
- `Match`
- `BracketSlot`
- `ProviderMapping`

Examples:

- Sport: Football
- CompetitionTemplate: FIFA World Cup
- CompetitionEdition: FIFA World Cup 2030
- League: Predicte Friends 2030

Users do not manually create official competitions.

The platform imports a competition edition from a provider, validates it, and enables it for league creation.

A competition edition must contain:

- teams and identifiers;
- stages;
- groups if applicable;
- rounds;
- fixtures and kickoff times;
- qualification rules;
- tie-break rules;
- bracket-slot relationships;
- third-place qualification mapping when applicable;
- antepost prediction definitions;
- supported provider coverage;
- data-completeness status.

Competition formats must be data-driven. Do not hardcode World Cup logic inside screen components.

The initial development seed should model a World Cup-style tournament with:

- 12 groups of 4;
- 72 group-stage matches;
- ranking of group positions;
- eight best third-place teams;
- round of 32;
- round of 16;
- quarterfinals;
- semifinals;
- third-place match;
- final.

Use the supplied World Cup spreadsheet and regulation as a reference model, not as runtime production storage.

Champions League support must allow a different competition format, including a league phase and knockout stages, without rewriting the whole domain model.

---

# 7. Prediction model

## 7.1 Group or league-phase matches

For each match:

- predicted home goals after regulation time;
- predicted away goals after regulation time.

The app derives:

- 1/X/2;
- predicted standings;
- goal difference;
- goals scored;
- qualification positions.

The user does not manually enter standings unless a predicted tie cannot be resolved from match scores and configured competition tie-break rules.

## 7.2 Unresolved predicted ties

Some official tie-break criteria cannot be derived from score predictions, such as disciplinary points or drawing lots.

When two or more teams remain tied after all computable criteria:

- show a clear tie-resolution screen;
- ask the user to order only the unresolved teams;
- store a `prediction_tiebreak_override`;
- explain that the override is required to generate the predicted bracket.

## 7.3 Knockout matches

For each knockout match, store:

- home goals after 90 minutes;
- away goals after 90 minutes;
- predicted qualified team;
- predicted advancement method:
  - `REGULATION`
  - `EXTRA_TIME`
  - `PENALTIES`

Validation:

- if the 90-minute score is not a draw, qualified team is automatically the 90-minute winner and method is `REGULATION`;
- if the 90-minute score is a draw, the user must choose a qualified team and either `EXTRA_TIME` or `PENALTIES`;
- extra-time or penalty selection is invalid for a non-draw 90-minute score.

## 7.4 Antepost predictions

Support configurable antepost items.

Initial World Cup preset:

- tournament winner;
- top scorer;
- predicted top-scorer goal total.

Top-scorer settlement must support official joint winners or an official-award winner according to the competition configuration.

## 7.5 Dependency invalidation

Predicted bracket participants depend on previous predictions.

If the user changes a group-stage score after completing knockout predictions:

- calculate affected downstream slots;
- warn before applying the change;
- preserve unaffected predictions;
- invalidate only predictions whose participants are no longer valid;
- never silently delete data.

Apply the same rule when an earlier knockout prediction changes.

## 7.6 Completion state

Show:

- total required items;
- completed items;
- incomplete items;
- validation issues;
- percentage complete;
- direct action: “Vai al prossimo pronostico mancante”.

A prediction set is considered valid only when all required match and antepost fields are server-synchronized before the deadline.

Offline local edits are not valid until the server confirms synchronization. Display a strong unsynced warning.

---

# 8. Fast prediction-entry UX

The app must make a large tournament significantly faster to complete than Excel.

Required interaction principles:

- auto-save after each valid edit;
- no separate Save button for individual matches;
- clear saved/syncing/error state;
- large touch targets;
- use one hand comfortably;
- minimal keyboard use;
- next/previous match navigation;
- “next incomplete” action;
- group by stage, group, and date;
- sticky progress indicator;
- filters for:
  - all;
  - incomplete;
  - completed;
  - group/stage.
- common quick-score chips, configurable examples:
  - 0–0
  - 1–0
  - 0–1
  - 1–1
  - 2–0
  - 0–2
  - 2–1
  - 1–2
- plus/minus goal controls or a compact numeric picker;
- supported goal range 0–9, with an explicit “10+” path;
- never require tiny dropdowns;
- prevent accidental changes while scrolling;
- use haptic feedback sparingly for confirmed input;
- preserve scroll position.

For knockout screens:

- visually separate “Risultato dopo 90 minuti” from “Squadra qualificata”;
- show extra-time and penalty controls only when relevant;
- show the generated bracket clearly on mobile;
- provide a list alternative for accessibility.

---

# 9. Scoring engine

The scoring engine is critical domain logic and must be pure, deterministic, versioned, independently testable, and separated from the UI.

## 9.1 Scoring-rule lifecycle

Each supported competition edition has a default scoring preset.

When a league is created:

- copy the selected preset into a league-specific draft rule set;
- allow owner/admin customization while open;
- record every change in the audit log;
- validate configuration;
- show a human-readable preview;
- at lock, create an immutable version with:
  - schema version;
  - configuration JSON;
  - checksum/hash;
  - locked timestamp;
  - actor/system source.

Future changes to the global preset must not affect existing leagues.

## 9.2 Editable scoring fields

Allow points from 0 to a safe configurable maximum, initially 999.

No negative values.

For each stage, support:

- correct 1/X/2;
- exact regulation-time score;
- correct team reaching the stage;
- correct match pairing;
- correct extra-time qualification method;
- correct penalty-shootout qualification method;
- correct group position;
- antepost winner;
- correct top scorer;
- correct top scorer and exact goals.

## 9.3 Award stacking

The configuration must explicitly define stacking.

Default behavior:

- exact-score points replace 1/X/2 points for the same match; they are not added together;
- top-scorer-plus-exact-goals points replace top-scorer-only points; they are not added together;
- qualification and pairing points are independent and may be added;
- extra-time or penalty bonuses are added only when:
  - the 90-minute draw requirement is correct;
  - the qualified team is correct;
  - the advancement method is correct.

Represent these rules in configuration, not hidden conditionals.

## 9.4 Default World Cup scoring preset

Use this preset as the initial default.

### Group stage

- Correct 1/X/2: 5
- Exact score: 10
- Correct team position in group: 3

### Round of 32

- Correct team reaching round: 2
- Correct pairing: 5
- Correct 1/X/2: 5
- Exact score: 10
- Correct extra-time method: 2
- Correct penalty method: 5

### Round of 16

- Correct team reaching round: 4
- Correct pairing: 10
- Correct 1/X/2: 10
- Exact score: 15
- Correct extra-time method: 4
- Correct penalty method: 10

### Quarterfinals

- Correct team reaching round: 8
- Correct pairing: 15
- Correct 1/X/2: 15
- Exact score: 30
- Correct extra-time method: 8
- Correct penalty method: 15

### Semifinals

- Correct team reaching round: 15
- Correct pairing: 5
- Correct 1/X/2: 25
- Exact score: 50
- Correct extra-time method: 15
- Correct penalty method: 30

Important: preserve the semifinal pairing value of 5 because it is part of the supplied source preset. Make it visible and editable before lock rather than silently “correcting” it.

### Final

- Correct team reaching final: 20
- Correct pairing: 30
- Correct 1/X/2: 50
- Exact score: 100
- Correct extra-time method: 20
- Correct penalty method: 30

### Antepost

- Correct tournament winner: 25
- Correct top scorer: 25
- Correct top scorer and exact goal count: 50 total, not 75

## 9.5 Scoring concepts

Create explicit scoring-event types:

- `MATCH_OUTCOME`
- `EXACT_SCORE`
- `GROUP_POSITION`
- `STAGE_QUALIFICATION`
- `CORRECT_PAIRING`
- `EXTRA_TIME_METHOD`
- `PENALTY_METHOD`
- `TOURNAMENT_WINNER`
- `TOP_SCORER`
- `TOP_SCORER_EXACT_GOALS`
- `MANUAL_CORRECTION`

Each awarded event must store:

- league ID;
- participant/user ID;
- competition edition ID;
- match/stage/antepost reference;
- scoring rule version ID;
- event type;
- points;
- human-readable reason;
- calculation version;
- created timestamp;
- source result version.

## 9.6 Recalculation

Scoring must be idempotent.

When an official result changes:

- record a new normalized result version;
- invalidate affected scoring events;
- recalculate only affected participants and downstream antepost/qualification items;
- generate a new leaderboard snapshot;
- preserve previous snapshots for audit;
- notify users only if the correction changes points or position.

Never mutate history without recording why.

---

# 10. Ranking and leaderboard

The leaderboard must support at least 1,000 participants efficiently.

Display:

- rank;
- avatar;
- display name;
- total points;
- position delta since previous scoring snapshot;
- optional points gained in the latest update;
- tied rank indicator;
- last update timestamp.

Current user:

- highlight their row;
- optionally pin it below the top positions when off-screen.

Default tie policy:

- participants with equal points share the same rank;
- use competition ranking style: 1, 2, 2, 4;
- do not invent a prize-deciding tie-breaker in MVP.

Statistics shown in participant detail may include:

- exact scores;
- correct 1/X/2;
- qualification hits;
- latest points;
- total points.

After league lock, tapping a participant shows their complete predictions.

Before lock, the server must deny access to other users’ predictions even if the client is modified.

---

# 11. Sports-data integration

Use a provider adapter. Do not couple domain logic directly to one provider response.

Initial preferred provider candidate: **Sportmonks Football API v3**, because the adapter must support competition schedules, live/final match states, regulation score, extra time, penalties, groups, standings, and knockout structures.

Do not assume provider coverage. Implement a capability check per competition edition.

Create an interface similar to:

```ts
interface FootballDataProvider {
  syncCompetitionEdition(externalEditionId: string): Promise<NormalizedEdition>;
  syncFixtures(editionId: string, range?: DateRange): Promise<NormalizedFixture[]>;
  syncLiveFixtures(editionId: string): Promise<NormalizedFixture[]>;
  syncFixture(fixtureExternalId: string): Promise<NormalizedFixture>;
  syncTeams(editionId: string): Promise<NormalizedTeam[]>;
  syncPlayers(editionId: string): Promise<NormalizedPlayer[]>;
  getCapabilities(editionId: string): Promise<ProviderCapabilities>;
}
```

Provide:

- `MockFootballDataProvider` for development and tests;
- `SportmonksFootballDataProvider` behind environment configuration;
- ability to add another provider later.

## 11.1 Normalized match result

Store separately:

- status;
- home score at halftime;
- away score at halftime;
- home score after 90 minutes;
- away score after 90 minutes;
- extra-time score;
- penalty-shootout score;
- qualified team;
- advancement method;
- kickoff time UTC;
- provider updated timestamp;
- local received timestamp;
- raw payload reference;
- normalized-result version.

## 11.2 Match settlement

A match can score predictions only when considered settled.

Initial policy:

- provider reports a terminal state;
- fetch the full fixture;
- wait a configurable settlement delay, initially 5 minutes;
- normalize result;
- score once;
- run correction reconciliation later.

Handle:

- `NOT_STARTED`
- `LIVE`
- `HALFTIME`
- `FULL_TIME`
- `AFTER_EXTRA_TIME`
- `AFTER_PENALTIES`
- `POSTPONED`
- `SUSPENDED`
- `CANCELLED`
- `ABANDONED`
- `AWARDED`
- `UNKNOWN`

Cancelled, abandoned, or awarded fixtures require competition-specific handling or platform-admin review.

## 11.3 Sync schedule

Use scheduled server jobs, not mobile-client polling against the provider.

Suggested initial scheduling:

- competition metadata: every 6 hours before tournament;
- fixtures: every 6 hours, plus manual platform-admin sync;
- from 2 hours before a match until terminal status: every 60 seconds;
- full fixture confirmation after terminal status;
- correction reconciliation: every 6 hours and nightly.

All jobs must be:

- idempotent;
- observable;
- retryable;
- rate-limit aware;
- protected by server-side secrets.

Create `sync_runs` and `provider_payloads` tables for diagnostics.

---

# 12. Recommended technical stack

Use current stable versions at implementation time. Do not blindly pin versions from this document if the ecosystem has moved.

## Mobile

- React Native with Expo.
- TypeScript with strict mode.
- Expo Router.
- EAS Build.
- EAS Update with controlled channels and runtime-version discipline.
- React Native Paper or a small internal token-based component layer compatible with Material Design 3.
- TanStack Query for server state.
- React Hook Form and Zod for forms and validation.
- AsyncStorage or Expo SecureStore as appropriate.
- Expo Notifications.
- Expo Linking / universal links.
- QR-code library selected after checking current Expo compatibility.

## Backend

- Supabase Postgres.
- Supabase Auth.
- Supabase Realtime.
- Supabase Edge Functions.
- Supabase Cron / pg_cron.
- Supabase Storage only where required.
- Row Level Security on every exposed table.
- SQL migrations committed to the repository.

## Authentication

- Google sign-in.
- Sign in with Apple.
- Store only the minimum profile data required.
- Support account deletion from inside the app.
- Correctly handle Apple private relay email and the fact that user name may only be returned on first authorization.

## Quality

- ESLint.
- Prettier.
- TypeScript typecheck.
- Unit tests for pure domain logic.
- React Native Testing Library for critical UI behavior.
- Integration tests for database policies and server functions.
- End-to-end smoke tests for:
  - sign-in;
  - create league;
  - join league;
  - complete predictions;
  - lock;
  - result settlement;
  - leaderboard update.

Prefer simple, maintainable dependencies over fashionable complexity.

---

# 13. Repository structure

Use a clear feature/domain structure.

Suggested structure:

```text
/
  AGENTS.md
  README.md
  app/
    _layout.tsx
    (auth)/
    (tabs)/
    league/
    invite/
  src/
    components/
    design-system/
    features/
      auth/
      competitions/
      leagues/
      invites/
      predictions/
      scoring/
      leaderboard/
      notifications/
      profile/
    domain/
      competitions/
      predictions/
      scoring/
      leaderboard/
    services/
      supabase/
      sports-provider/
      notifications/
    hooks/
    lib/
    state/
    types/
    i18n/
  supabase/
    migrations/
    functions/
      sync-competition/
      sync-live-fixtures/
      settle-fixture/
      recompute-leaderboard/
      lock-due-leagues/
      send-notifications/
    seed.sql
    config.toml
  tests/
    fixtures/
    domain/
    integration/
  docs/
    PRD.md
    ARCHITECTURE.md
    DATA_MODEL.md
    SECURITY.md
    SPORTS_PROVIDER.md
    SCORING_ENGINE.md
    UX_FLOWS.md
    ROADMAP.md
    DECISIONS.md
    reference/
```

Avoid business logic inside route files or visual components.

---

# 14. Database model

Create SQL migrations for the following conceptual entities. Exact implementation can evolve, but document every deviation.

## Identity

### `profiles`

- `id uuid primary key references auth.users`
- `display_name`
- `avatar_url`
- `locale`
- `timezone`
- `created_at`
- `updated_at`
- `deleted_at`

### `push_tokens`

- user ID;
- platform;
- token;
- enabled;
- last seen;
- unique token constraint.

## Competition catalog

### `sports`
### `competition_templates`
### `competition_editions`
### `stages`
### `rounds`
### `groups`
### `teams`
### `players`
### `edition_teams`
### `matches`
### `match_sources` or `bracket_slots`
### `competition_tiebreak_rules`
### `competition_antepost_definitions`

Matches must support either fixed teams or participants derived from:

- group position;
- best-third-place mapping;
- winner of previous match;
- loser of previous match.

## Provider integration

### `provider_mappings`
### `provider_payloads`
### `sync_runs`
### `match_result_versions`

## Leagues

### `leagues`

- ID;
- competition edition ID;
- owner ID;
- name;
- status;
- deadline UTC;
- current scoring rule version ID;
- invite settings;
- created/updated timestamps.

### `league_members`

- league ID;
- user ID;
- role: owner/admin/participant;
- status;
- joined at;
- removed at;
- unique league/user constraint.

### `league_invites`

- league ID;
- hashed token;
- created by;
- expires at;
- max uses optional;
- uses;
- revoked at.

## Rules

### `scoring_presets`

- competition template/edition reference;
- name;
- schema version;
- config JSONB;
- active flag.

### `league_scoring_rule_versions`

- league ID;
- version;
- status draft/locked;
- schema version;
- config JSONB;
- checksum;
- created by;
- created at;
- locked at.

## Predictions

### `prediction_sets`

- league ID;
- user ID;
- status draft/complete/locked;
- completion counters;
- last server-synced at;
- submitted/completed at;
- unique league/user.

### `match_predictions`

- prediction set ID;
- match ID;
- regulation home goals;
- regulation away goals;
- qualified team ID nullable;
- advancement method;
- validation status;
- updated at;
- unique prediction-set/match.

### `prediction_tiebreak_overrides`

- prediction set ID;
- group/stage reference;
- ordered team IDs;
- reason/context.

### `antepost_predictions`

- prediction set ID;
- definition ID;
- selected team/player/value payload.

## Scoring

### `scoring_events`
### `leaderboard_snapshots`
### `leaderboard_entries`
### `scoring_recalculation_runs`

## Operational

### `audit_log`
### `notifications`
### `feature_flags`

Use foreign keys, check constraints, unique constraints, and indexes deliberately.

---

# 15. Row Level Security and server authority

RLS requirements:

- users can read and update their own profile;
- authenticated users can read enabled competition catalog data;
- league members can read their league and membership list;
- only owner/admin can update league settings before deadline;
- only owner can transfer ownership or cancel;
- a user can read/write only their own predictions before lock;
- after lock, league members can read all predictions in that league;
- no client may modify predictions after deadline;
- no client may write official results;
- no client may write scoring events or leaderboard snapshots;
- no client may use service-role privileges;
- provider raw payloads are not publicly readable;
- audit log is readable by league owner/admin, with a member-visible subset for rule/deadline changes.

Add database triggers or security-definer functions to enforce immutable state. UI-only restrictions are insufficient.

Invite joining should happen through a server function that:

- hashes and validates the token;
- checks revocation/expiry/usage;
- confirms league is open and before deadline;
- prevents duplicate membership;
- creates membership atomically;
- records audit event.

---

# 16. Design system

## 16.1 Visual direction

- clean;
- professional;
- sport-oriented without looking like a betting app;
- high information clarity;
- restrained use of color;
- no dense spreadsheet-like screens;
- no tiny controls;
- no excessive gradients;
- no decorative clutter;
- no green football cliché as the main brand color.

## 16.2 Typography

Use the native system font stack by default:

- iOS: San Francisco system font;
- Android: Roboto system font.

Do not add a custom font in MVP unless there is a measured branding or readability benefit.

Support dynamic text scaling. Avoid fixed-height components that clip large text.

## 16.3 Accessible color tokens

### Light theme

- `background`: `#F8FAFC`
- `surface`: `#FFFFFF`
- `surfaceVariant`: `#F1F5F9`
- `textPrimary`: `#111827`
- `textSecondary`: `#475569`
- `border`: `#CBD5E1`
- `primary`: `#1D4ED8`
- `onPrimary`: `#FFFFFF`
- `primaryContainer`: `#DBEAFE`
- `onPrimaryContainer`: `#1E3A8A`
- `success`: `#15803D`
- `onSuccess`: `#FFFFFF`
- `error`: `#B91C1C`
- `onError`: `#FFFFFF`
- `warning`: `#C2410C`
- `onWarning`: `#FFFFFF`
- `trophy`: `#A16207`
- `onTrophy`: `#FFFFFF`

### Dark theme

- `background`: `#0F172A`
- `surface`: `#1E293B`
- `surfaceVariant`: `#334155`
- `textPrimary`: `#F8FAFC`
- `textSecondary`: `#CBD5E1`
- `border`: `#475569`
- `primary`: `#60A5FA`
- `onPrimary`: `#0F172A`
- `success`: `#4ADE80`
- `error`: `#F87171`
- `warning`: `#FB923C`
- `trophy`: `#FBBF24`

Use semantic tokens, not raw hex values in feature components.

Never communicate state through color alone. Pair color with text, icon, shape, or movement.

## 16.4 Accessibility

- Aim for WCAG AA contrast.
- Standard text contrast at least 4.5:1.
- Large text at least 3:1.
- Android touch targets at least 48x48 dp.
- iOS primary controls should normally be at least 44x44 pt.
- Provide accessibility labels and hints.
- Support screen readers.
- Respect reduced motion.
- Avoid auto-dismissed critical messages.
- Support landscape where reasonable, but optimize phone portrait.
- Avoid red/green-only distinction.
- Make bracket content available in an accessible list form.

## 16.5 Component rules

Create reusable components:

- `AppScreen`
- `AppHeader`
- `PrimaryButton`
- `SecondaryButton`
- `IconButton`
- `AppCard`
- `StatusBadge`
- `ProgressBar`
- `EmptyState`
- `ErrorState`
- `MatchPredictionCard`
- `ScorePicker`
- `LeaderboardRow`
- `PositionDelta`
- `ParticipantAvatar`
- `RuleValueField`
- `DeadlineBanner`
- `SyncStatus`
- `ConfirmDialog`
- `BottomSheet`

One screen should have one clear primary action.

---

# 17. Main navigation and screens

Use bottom navigation for the highest-frequency destinations.

Suggested authenticated top-level tabs:

1. `Home`
2. `Le mie leghe`
3. `Notifiche`
4. `Profilo`

Inside a league, use a clear header and local tabs/sections:

- `Panoramica`
- `Pronostici`
- `Classifica`
- `Partecipanti`
- `Regolamento`

Required screens:

## Authentication

- splash/session restore;
- login;
- terms/privacy acknowledgment;
- profile-name completion if provider name unavailable.

## Home

- active leagues;
- upcoming deadlines;
- most relevant action;
- archived leagues;
- create/join actions.

## Competition selection

- cards for supported editions;
- search/filter;
- status such as available, coming soon, registration closed;
- competition details.

## League creation wizard

1. competition;
2. league details;
3. deadline;
4. scoring preset/customization;
5. review and create.

## League overview

Show:

- competition;
- status;
- deadline countdown;
- participant count;
- prediction completion;
- current user progress;
- current rank when available;
- latest update;
- organizer shortcuts when authorized.

## Participant management

- search;
- role;
- join date;
- completion state;
- invite action;
- promote/demote;
- remove before lock;
- no payment status.

## Prediction hub

- completion progress;
- group/league phase;
- knockout phase;
- antepost;
- validation issues;
- next incomplete.

## Group-stage entry

- virtualized match list;
- fast score input;
- filters;
- auto-save;
- predicted standings;
- unresolved ties.

## Knockout bracket

- mobile bracket visualization;
- accessible list alternative;
- score and qualification method input;
- dependency-change warnings.

## Antepost

- tournament winner;
- top scorer search;
- goals;
- validation.

## Final review before deadline

- missing items;
- invalid items;
- unsynced items;
- predicted champion;
- confirm completion status;
- reminder that edits remain possible until deadline.

## Locked predictions

- clear lock timestamp;
- own predictions;
- participant selector/search;
- comparison view optional after MVP.

## Leaderboard

- top positions;
- current user pinned;
- full list;
- search;
- position delta;
- latest update;
- points breakdown.

## Rules

- human-readable rule summary;
- edit mode for owner/admin before lock;
- change history;
- locked-state checksum/version after deadline.

## Profile/settings

- display name;
- avatar;
- theme;
- notification settings;
- privacy;
- account deletion;
- sign out.

---

# 18. Notifications

Use push notifications conservatively.

Initial notification types:

- joined league;
- invite accepted for organizers, optional digest;
- deadline in 24 hours;
- deadline in 3 hours;
- deadline in 30 minutes;
- league locked;
- prediction incomplete warning;
- leaderboard updated when user gained points or changed position;
- official result correction;
- competition completed.

Provide per-category preferences.

Avoid one notification per trivial event by default. Prefer a concise post-match notification:

> “Classifica aggiornata: +10 punti, sei salito dal 12° al 6° posto.”

Store notification records so the in-app notification center is consistent with push delivery.

Deep-link notifications to the correct league or match.

---

# 19. Realtime behavior

Supabase Realtime should publish new leaderboard snapshots and selected league-state changes.

The client must:

- subscribe only while relevant screens are active;
- update efficiently;
- show “Aggiornata alle HH:mm”;
- provide pull-to-refresh fallback;
- recover after connection loss;
- avoid duplicate animations;
- not calculate authoritative points locally.

The client may calculate a preview for UX, but the server result is final.

---

# 20. Offline and synchronization behavior

Read-only cached content should remain available offline.

Prediction editing may use a local pending queue, but:

- show `Saved locally`, `Syncing`, `Synced`, or `Sync failed`;
- retry safely;
- use idempotency keys;
- detect deadline rejection;
- do not claim completion until server confirms;
- unsynced predictions after the server deadline are rejected;
- display server time drift/status if relevant.

Conflict policy:

- before deadline, latest server-confirmed update wins;
- surface conflicts rather than silently overwriting substantial bracket changes.

---

# 21. Privacy and security

Use privacy by design and data minimization.

Collect only what is necessary:

- authenticated user ID;
- display name;
- optional avatar;
- email only as provided/needed by auth;
- locale/timezone;
- push tokens;
- league and prediction data.

Requirements:

- privacy policy;
- terms of service;
- account deletion;
- data export path to be planned;
- retention policy;
- audit logging;
- secure secrets;
- RLS;
- no provider API key in app bundle;
- no service-role key in app bundle;
- rate limiting;
- input validation;
- safe logging without tokens or personal data;
- delete or anonymize user data according to documented retention rules.

If advertising is added later, implement consent and tracking requirements before enabling it in EEA builds.

---

# 22. Advertising strategy — future feature

Advertising is not part of Milestone 0 or the initial functional MVP.

Prepare only an abstract feature flag and reserved placement strategy.

Future rules:

- never interrupt score entry;
- no unexpected interstitials;
- no app-open ad;
- banner/native ads only in secondary, non-critical screens;
- interstitial only at a natural break such as completing an entire stage, with strict frequency caps;
- no gambling ads;
- consent-management platform required where applicable;
- paid ad-free option can be evaluated later.

Do not add an ad SDK until explicitly instructed.

---

# 23. Error and edge cases

Design and test:

- duplicate invite use;
- expired/revoked invite;
- user already member;
- deadline passes during edit;
- device clock incorrect;
- offline at deadline;
- provider API unavailable;
- provider rate limit;
- fixture kickoff changed;
- team renamed;
- match postponed;
- match suspended;
- match abandoned;
- result corrected;
- penalties missing from first provider response;
- joint top scorers;
- official disciplinary/drawing-lots group tie;
- user changes group score after completing bracket;
- league with 0, 1, 148, 1,000 participants;
- equal points;
- owner leaves;
- administrator removed;
- account deleted;
- push token invalid;
- Realtime disconnected;
- dark mode;
- large fonts;
- screen reader;
- right-to-left readiness, even if not enabled in MVP.

---

# 24. Analytics and observability

Do not implement invasive analytics by default.

Create an abstraction for privacy-conscious product events, such as:

- sign-in completed;
- league created;
- invite joined;
- prediction stage completed;
- prediction set completed;
- sync failure;
- leaderboard viewed.

Operational observability should include:

- Edge Function logs;
- provider sync metrics;
- scoring run metrics;
- failed notification count;
- database error monitoring;
- app crash reporting only after a privacy review.

No sensitive prediction content in analytics payloads.

---

# 25. Testing requirements

## Scoring unit tests

Cover at minimum:

- correct outcome;
- exact score supersedes outcome;
- wrong result;
- group position;
- stage qualification;
- pairing unordered comparison;
- 90-minute draw plus extra-time qualifier;
- 90-minute draw plus penalty qualifier;
- wrong method;
- wrong qualified team;
- top scorer only;
- top scorer plus exact goals;
- joint scorer handling;
- rule customization;
- immutable rule version;
- result correction and recalculation;
- equal leaderboard ranks;
- position delta.

## Competition tests

- group standings;
- tie-break overrides;
- best third-place selection;
- bracket slot resolution;
- dependency invalidation;
- Champions-style format extensibility.

## Security tests

- participant cannot read others before lock;
- participant can read others after lock;
- participant cannot alter official results;
- participant cannot alter scoring events;
- admin cannot edit rules after lock;
- late prediction write rejected;
- expired invite rejected.

## UI tests

- large text does not clip key screens;
- score picker usable by accessibility label;
- lock banner visible;
- unsynced warning visible;
- participant prediction hidden before lock;
- current user pinned in leaderboard.

---

# 26. Initial development roadmap

## Milestone 0 — Foundation and verified vertical slice

Deliver:

- `AGENTS.md`;
- technical docs listed in repository structure;
- Expo TypeScript project;
- Expo Router navigation;
- design tokens and light/dark themes;
- reusable base components;
- Supabase local project structure and initial migrations;
- mock authentication adapter plus integration interfaces;
- seed World Cup-style competition;
- create/join mock league flow;
- fast group-stage prediction screen using mock data;
- pure scoring engine package/module;
- sample leaderboard from a settled mock match;
- tests for scoring and locking;
- lint, typecheck, tests passing.

Do not connect the real sports provider yet.
Do not add advertising.
Do not add payment fields.
Do not publish to stores.

Stop and report after Milestone 0.

## Milestone 1 — Authentication and secure league lifecycle

- Supabase Auth with Google and Apple;
- profiles;
- RLS;
- league creation;
- invites;
- roles;
- deadlines;
- lock job;
- account deletion.

## Milestone 2 — Complete prediction workflow

- all stages;
- standings;
- tiebreak overrides;
- bracket generation;
- antepost;
- dependency invalidation;
- offline/sync states;
- full validation.

## Milestone 3 — Rule editor and scoring

- preset selection;
- custom rule editor;
- audit history;
- immutable snapshot;
- server-authoritative scoring;
- leaderboard snapshots;
- breakdown.

## Milestone 4 — Sports provider integration

- Sportmonks adapter;
- competition import;
- fixture sync;
- result normalization;
- live polling jobs;
- settlement;
- corrections;
- provider diagnostics.

## Milestone 5 — Realtime and notifications

- live leaderboard;
- push tokens;
- reminders;
- post-match position changes;
- correction notifications.

## Milestone 6 — Polish and release readiness

- accessibility audit;
- performance;
- localization architecture;
- privacy/terms;
- error handling;
- EAS preview builds;
- store metadata and screenshots;
- security review.

## Milestone 7 — Advertising evaluation

Only after explicit authorization and compliance review.

---

# 27. Coding rules

- Use TypeScript strict mode.
- Prefer domain types over generic objects.
- No `any` unless isolated and justified.
- Use Zod at external boundaries.
- Keep provider DTOs separate from normalized domain models.
- Keep SQL migrations deterministic.
- Keep Edge Functions small and idempotent.
- Use transactions for lock, join, scoring, and snapshot operations.
- Store timestamps in UTC.
- Never trust device time.
- Never hardcode competition IDs in visual components.
- Never hardcode scoring values in calculation code.
- Never calculate official leaderboard totals only on the client.
- Never rely on hidden UI elements for authorization.
- Avoid premature abstractions, but isolate external services.
- Add comments for business reasons, not obvious syntax.
- Use accessible labels on interactive controls.
- Keep UI strings centralized for future localization.
- Avoid giant screen components.
- Prefer small, testable functions.
- Record meaningful architectural choices in `docs/DECISIONS.md`.

---

# 28. Acceptance criteria for the product foundation

Milestone 0 is accepted only if:

1. The app starts on Android and iOS development environments.
2. Navigation works.
3. Theme changes work.
4. Mock user can create or join a league.
5. Mock league is connected to a competition edition.
6. User can enter group-stage score predictions quickly.
7. Changes auto-save to a mock/local repository.
8. Predicted group standings update.
9. A mock match result can be settled.
10. Scoring engine awards the configured points.
11. A leaderboard snapshot is created.
12. Position delta is displayed.
13. Predictions are inaccessible to other mock users before lock.
14. They become accessible after lock.
15. Rules cannot be changed after lock.
16. Exact score does not also add 1/X/2 points under the default preset.
17. Tests pass.
18. No payment, gambling, odds, or ad SDK is present.
19. Documentation reflects actual code.
20. Codex provides a final report and stops.

---

# 29. First Codex task

Execute **Milestone 0 only**.

First produce a concise implementation plan based on the current repository. Then implement it.

When product details are ambiguous:

- do not invent silently;
- choose the safest reversible implementation;
- record the assumption in `docs/DECISIONS.md`;
- surface it in the final report.

Use mock adapters where credentials are missing.

Do not request sports-provider credentials during Milestone 0.

At completion, return:

- summary;
- file tree;
- architecture decisions;
- database migrations;
- test results;
- screenshots or simulator evidence where available;
- known limitations;
- exact recommended next prompt for Milestone 1.

# END OF CODEX PROMPT
