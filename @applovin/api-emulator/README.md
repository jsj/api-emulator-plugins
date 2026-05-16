# @api-emulator/applovin

AppLovin provides marketing and reporting APIs for campaigns, ads, revenue, spend, and performance metrics.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/applovin
```

## Run

```bash
npx -p api-emulator api --plugin ./@applovin/api-emulator.mjs --service applovin
```

## Endpoints

- `GET /report`
- `GET /maxReport`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
applovin:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.applovin.com)
- [api-emulator](https://github.com/jsj/api-emulator)
