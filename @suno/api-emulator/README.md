# @api-emulator/suno

SunoAPI-compatible APIs provide credits, asynchronous music generation tasks, record polling, and lyrics generation workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/suno
```

## Run

```bash
npx -p api-emulator api --plugin ./@suno/api-emulator.mjs --service suno
```

## Endpoints

- `GET /api/v1/generate/credit`
- `POST /api/v1/generate`
- `GET /api/v1/generate/record-info`
- `POST /api/v1/generate/extend`
- `POST /api/v1/wav/generate`
- `POST /api/v1/mp4/generate`
- `POST /api/v1/lyrics`
- `GET /api/v1/lyrics/record-info`
- `GET /suno/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
suno:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.sunoapi.org/)
- [api-emulator](https://github.com/jsj/api-emulator)
