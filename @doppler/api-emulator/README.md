# @api-emulator/doppler

Doppler provides secrets management APIs for projects, configs, secret reads, and secret downloads.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/doppler
```

## Run

```bash
npx -p api-emulator api --plugin ./@doppler/api-emulator.mjs --service doppler
```

## Endpoints

- `GET /v3/projects`
- `GET /v3/configs`
- `GET /v3/configs/config/secrets`
- `GET /v3/configs/config/secret`
- `GET /v3/configs/config/secrets/download`
- `GET /doppler/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
doppler:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.doppler.com/reference/api)
- [api-emulator](https://github.com/jsj/api-emulator)
