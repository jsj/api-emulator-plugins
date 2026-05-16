# @api-emulator/mobbin

Mobbin provides MCP and Screens Search APIs for discovering mobile and web design reference screens.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/mobbin
```

## Run

```bash
npx -p api-emulator api --plugin ./@mobbin/api-emulator.mjs --service mobbin
```

## Endpoints

- `GET /.well-known/oauth-protected-resource/mcp`
- `POST /v1/screens/search`
- `POST /mcp`
- `GET /mobbin/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
mobbin:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://api.mobbin.com/mcp)
- [api-emulator](https://github.com/jsj/api-emulator)
