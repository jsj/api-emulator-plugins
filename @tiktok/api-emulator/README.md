# @api-emulator/tiktok

TikTok Ads provides Business API surfaces for advertisers, campaigns, ad groups, ads, creatives, audiences, pixels, and reports.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/tiktok
```

## Run

```bash
npx -p api-emulator api --plugin ./@tiktok/api-emulator.mjs --service tiktok
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
tiktok:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://business-api.tiktok.com/portal/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
