# @api-emulator/servicenow

ServiceNow provides customer-support and ITSM APIs for Table API incidents, users, groups, and workflow records.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/servicenow
```

## Run

```bash
npx -p api-emulator api --plugin ./@servicenow/api-emulator.mjs --service servicenow
```

## Endpoints

- `GET /api/now/table/:table`
- `POST /api/now/table/:table`
- `GET /api/now/table/:table/:sysId`
- `PATCH /api/now/table/:table/:sysId`
- `PUT /api/now/table/:table/:sysId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
servicenow:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.servicenow.com/docs/r/zurich/api-reference/rest-apis/c_TableAPI.html)
- [api-emulator](https://github.com/jsj/api-emulator)
