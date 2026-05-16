# @api-emulator/flightradar24

Flightradar24 API provides live and historic flight positions, airport and airline lookup, flight summary, and track workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/flightradar24
```

## Run

```bash
npx -p api-emulator api --plugin ./@flightradar24/api-emulator.mjs --service flightradar24
```

## Endpoints

- `GET /api/live/flight-positions/count`
- `GET /api/static/airports/:code/light`
- `GET /api/static/airports/:code/full`
- `GET /api/static/airlines/:icao/light`
- `GET /api/flight-tracks`
- `GET /api/flight-summary/light`
- `GET /api/flight-summary/full`
- `GET /api/flight-summary/count`
- `GET /flightradar24/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
flightradar24:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://fr24api.flightradar24.com/docs/endpoints/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
