# @api-emulator/hubspot

HubSpot provides CRM and developer APIs for accounts, contacts, companies, deals, properties, CMS tables, files, and secrets.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/hubspot
```

## Run

```bash
npx -p api-emulator api --plugin ./@hubspot/api-emulator.mjs --service hubspot
```

## Endpoints

- `GET /oauth/v1/access-tokens/:token`
- `GET /account-info/v3/details`
- `GET /crm/v3/objects/:objectType`
- `POST /crm/v3/objects/:objectType`
- `GET /crm/v3/objects/:objectType/:objectId`
- `PATCH /crm/v3/objects/:objectType/:objectId`
- `POST /crm/v3/objects/:objectType/search`
- `GET /crm/v3/properties/:objectType`
- `GET /crm/v3/properties/:objectType/:propertyName`
- `GET /cms/v3/hubdb/tables`
- `GET /files/v3/files/search`
- `GET /developer/v3/secrets`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
hubspot:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.hubspot.com/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
