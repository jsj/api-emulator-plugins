# @api-emulator/figma

Figma provides REST APIs for user identity, design files, image rendering, comments, teams, and collaboration workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/figma
```

## Run

```bash
npx -p api-emulator api --plugin ./@figma/api-emulator.mjs --service figma
```

## Endpoints

- `GET /v1/me`
- `GET /v1/files/:key`
- `GET /v1/images/:key`
- `GET /v1/files/:key/comments`
- `POST /v1/files/:key/comments`
- `GET /figma/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
figma:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.figma.com/docs/rest-api/)
- [api-emulator](https://github.com/jsj/api-emulator)
