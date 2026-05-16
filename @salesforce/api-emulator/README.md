# @api-emulator/salesforce

Salesforce provides CRM APIs for org identity, SOQL queries, object metadata, and sObject record workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/salesforce
```

## Run

```bash
npx -p api-emulator api --plugin ./@salesforce/api-emulator.mjs --service salesforce
```

## Endpoints

- `GET /services/oauth2/userinfo`
- `GET /services/data`
- `GET /services/data/:version`
- `GET /services/data/:version/limits`
- `GET /services/data/:version/query`
- `GET /services/data/:version/sobjects`
- `GET /services/data/:version/sobjects/:sobject/describe`
- `GET /services/data/:version/sobjects/:sobject/:id`
- `POST /services/data/:version/sobjects/:sobject`
- `PATCH /services/data/:version/sobjects/:sobject/:id`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
salesforce:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm)
- [api-emulator](https://github.com/jsj/api-emulator)
