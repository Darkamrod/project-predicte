# Sports Provider Adapter

No real sports provider is connected in Milestone 0.

The app defines a `FootballDataProvider` interface and implements `MockFootballDataProvider` for tests and development. The interface is shaped to support future adapters for:

- competition edition sync;
- fixtures and live fixtures;
- single fixture refresh;
- teams and players;
- provider capability checks.

Sportmonks or another provider must be added only in a later authorized milestone. Provider credentials must never be bundled into the mobile app.
