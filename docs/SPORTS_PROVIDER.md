# Sports Provider Adapter

No real sports provider is connected in Milestone 0.

The app defines a `FootballDataProvider` interface and implements `MockFootballDataProvider` for tests and development. The interface is shaped to support future adapters for:

- competition edition sync;
- fixtures and live fixtures;
- single fixture refresh;
- teams and players;
- provider capability checks.

Sportmonks or another provider must be added only in a later authorized milestone. Provider credentials must never be bundled into the mobile app.

## Milestone 6 Mock Result Import

Milestone 6 adds a server-side result-provider foundation without connecting a real sports API:

- `MOCK_RESULTS` is the only provider code currently configured.
- `MockResultProvider` returns a raw mock payload with `externalFixtureKey`, `sourceResultKey`, UTC request time, competition edition id, and optional correction metadata.
- The provider import worker normalizes the mock payload into the existing `OfficialTournamentResultSet` used by the trusted scoring engine.
- `record_provider_result_import` stores provider import state, raw payload linkage, retry metadata, and correction metadata through service-role-only RPCs.
- `trusted_result_ingestion_exists` checks that correction source keys already exist as scored ingestions before a correction import can be scored.

Future real provider adapters should implement the same server-side interface, keep credentials outside Expo public configuration, validate provider payloads with Zod or equivalent schemas, and preserve idempotency through `source_result_key`.
