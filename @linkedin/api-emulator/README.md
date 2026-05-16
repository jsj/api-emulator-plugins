# @api-emulator/linkedin

LinkedIn provides profile, organization, posting, advertising, analytics, and OAuth APIs for professional network workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/linkedin
```

## Run

```bash
npx -p api-emulator api --plugin ./@linkedin/api-emulator.mjs --service linkedin
```

## Endpoints

- `POST /oauth/v2/accessToken`
- `GET /v2/me`
- `POST /v2/ugcPosts`
- `GET /v2/ugcPosts`
- `GET /v2/organizations`
- `GET /v2/adAccountsV2`
- `GET /v2/adCampaignsV2`
- `GET /rest/adAccounts`
- `GET /rest/adCampaigns`
- `GET /linkedin/inspect/contract`
- `GET /linkedin/inspect/state`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
linkedin:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://learn.microsoft.com/linkedin/)
- [api-emulator](https://github.com/jsj/api-emulator)
