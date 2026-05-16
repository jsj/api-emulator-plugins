# @api-emulator/google-flights

Google Flights-style APIs provide deterministic airport search, flight offer search, and price insight responses for travel workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/google-flights
```

## Run

```bash
npx -p api-emulator api --plugin ./@google-flights/api-emulator.mjs --service google-flights
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
google-flights:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.google.com/travel/flights)
- [api-emulator](https://github.com/jsj/api-emulator)
