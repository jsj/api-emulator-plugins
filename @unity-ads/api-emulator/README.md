# @api-emulator/unity-ads

Unity Ads provides Advertising Management, Advertising Statistics, and Monetization Stats APIs for apps, campaigns, and ad performance reports.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/unity-ads
```

## Run

```bash
npx -p api-emulator api --plugin ./@unity-ads/api-emulator.mjs --service unity-ads
```

## Endpoints

- `POST /auth/v1/token-exchange`
- `GET /advertise/v1/organizations/:organizationId/apps`
- `POST /advertise/v1/organizations/:organizationId/apps`
- `GET /advertise/v1/apps/:appId`
- `GET /advertise/v1/apps/:appId/campaigns`
- `POST /advertise/v1/apps/:appId/campaigns`
- `GET /advertise/v1/campaigns/:campaignId`
- `PATCH /advertise/v1/campaigns/:campaignId`
- `DELETE /advertise/v1/campaigns/:campaignId`
- `GET /stats/v1/operate/organizations/:organizationId`
- `GET /statistics/v2/organizations/:organizationId/reports`
- `GET /unity-ads/inspect/contract`
- `GET /unity-ads/inspect/state`
- `GET /unity-ads/inspect/hits`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
unity-ads:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://services.docs.unity.com/advertise/v1/)
- [api-emulator](https://github.com/jsj/api-emulator)
