# @api-emulator/attio

Attio provides CRM APIs for workspace identity, objects, attributes, records, searches, and lists.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/attio
```

## Run

```bash
npx -p api-emulator api --plugin ./@attio/api-emulator.mjs --service attio
```

## Endpoints

- `GET /v2/self`
- `GET /v2/objects`
- `GET /v2/objects/:object`
- `GET /v2/objects/:object/attributes`
- `POST /v2/objects/:object/records/query`
- `GET /v2/objects/:object/records/:recordId`
- `POST /v2/objects/:object/records`
- `PATCH /v2/objects/:object/records/:recordId`
- `GET /v2/lists`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
attio:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.attio.com/rest-api/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
