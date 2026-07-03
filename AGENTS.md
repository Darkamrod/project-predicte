# Project Predicte Agent Instructions

These instructions are durable for this repository and summarize the master specification.

## Product Guardrails

- Build Project Predicte as a mobile-first private football prediction league app.
- Product UI copy is Italian for the MVP. Code, identifiers, commits, and technical docs are English.
- Work in controlled milestones. Do not start a later milestone without explicit authorization.
- Never implement real-money payments, entry fees, payouts, prize pools, paid/unpaid member status, betting, odds, wagering, gambling features, or advertising unless a future milestone explicitly authorizes and documents them.
- Do not connect real sports-provider APIs or request Sportmonks/provider credentials during Milestone 0.
- Do not expose sports-provider credentials or Supabase service-role credentials to the mobile client.

## Engineering Rules

- Use React Native, Expo, TypeScript strict mode, and Expo Router unless a documented technical reason changes the stack.
- Keep business logic out of route files and visual components.
- Keep domain modules pure, deterministic, and independently testable.
- Keep scoring values in configuration, not in calculation code.
- Keep competition formats data-driven. Do not hardcode World Cup logic in UI components.
- Prefer domain types over generic objects. Avoid `any`; isolate and justify it if unavoidable.
- Use Zod at external boundaries when real external data is introduced.
- Store timestamps in UTC and never trust device time for authoritative decisions.
- Use semantic design tokens instead of raw hex values in feature components.
- Keep UI strings centralized where practical for future localization.
- Add accessible labels to interactive controls and keep touch targets at least 44/48 points.

## Documentation and Testing

- Maintain `docs/DECISIONS.md` for architectural choices, assumptions, and deviations.
- Update docs when code behavior changes.
- Add tests for locking, scoring, leaderboard, and other critical domain behavior.
- At the end of each milestone, run lint, typecheck, and tests; report commands and results.
