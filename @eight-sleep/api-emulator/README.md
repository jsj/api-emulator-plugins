# @api-emulator/eight-sleep

Eight Sleep provides health and smart-bed APIs for user profiles, devices, sleep trends, biometric intervals, and temperature control.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/eight-sleep
```

## Run

```bash
npx -p api-emulator api --plugin ./@eight-sleep/api-emulator.mjs --service eight-sleep
```

## Endpoints

- `POST /v1/tokens`
- `POST /v1/login`
- `GET /v1/users/me`
- `GET /v1/devices/:deviceId`
- `GET /v1/users/:userId/trends`
- `GET /v1/users/:userId/intervals/:sessionId`
- `GET /v1/users/:userId/temperature`
- `PUT /v1/users/:userId/temperature`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
eight-sleep:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/steipete/eightctl)
- [api-emulator](https://github.com/jsj/api-emulator)
