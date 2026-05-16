# @api-emulator/oura

Oura Ring provides health APIs for personal info, daily sleep, readiness, activity, workouts, and heart-rate data.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/oura
```

## Run

```bash
npx -p api-emulator api --plugin ./@oura/api-emulator.mjs --service oura
```

## Endpoints

- `GET /v2/usercollection/personal_info`
- `GET /v2/usercollection/daily_sleep`
- `GET /v2/usercollection/sleep`
- `GET /v2/usercollection/daily_readiness`
- `GET /v2/usercollection/daily_activity`
- `GET /v2/usercollection/workout`
- `GET /v2/usercollection/heartrate`
- `GET /v2/sandbox/usercollection/daily_sleep`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
oura:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://cloud.ouraring.com/v2/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
