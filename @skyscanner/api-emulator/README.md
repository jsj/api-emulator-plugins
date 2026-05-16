# @api-emulator/skyscanner

Skyscanner Travel APIs provide flights live search sessions, itinerary pricing, and refresh polling workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/skyscanner
```

## Run

```bash
npx -p api-emulator api --plugin ./@skyscanner/api-emulator.mjs --service skyscanner
```

## Endpoints

- `POST /apiservices/v3/flights/live/search/create`
- `POST /apiservices/v3/flights/live/search/poll/:sessionToken`
- `POST /apiservices/v3/flights/live/itineraryrefresh/create/:sessionToken`
- `GET /apiservices/v3/flights/live/itineraryrefresh/poll/:refreshSessionToken`
- `GET /skyscanner/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
skyscanner:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.skyscanner.net/api/flights-live-pricing)
- [api-emulator](https://github.com/jsj/api-emulator)
