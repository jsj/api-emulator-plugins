# @api-emulator/snap

Snap Ads provides Marketing API surfaces for OAuth, organizations, ad accounts, campaigns, ads, and reporting.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/snap
```

## Run

```bash
npx -p api-emulator api --plugin ./@snap/api-emulator.mjs --service snap
```

## Endpoints

- `POST /login/oauth2/access_token`
- `GET /v1/me/organizations`
- `GET /v1/organizations/:organizationId/adaccounts`
- `GET /v1/adaccounts/:adAccountId/campaigns`
- `GET /v1/campaigns/:campaignId/stats`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
snap:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://marketingapi.snapchat.com/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
