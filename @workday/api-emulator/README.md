# @api-emulator/workday

Workday provides enterprise HR, finance, and planning APIs for workers, organizations, jobs, reports, and business processes.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/workday
```

## Run

```bash
npx -p api-emulator api --plugin ./@workday/api-emulator.mjs --service workday
```

## Endpoints

- `POST /ccx/oauth2/:tenant/token`
- `GET /ccx/service/customreport2/:tenant/:reportOwner/:reportName`
- `POST /ccx/api/v1/:tenant/workers`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
workday:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://community.workday.com/rest-api)
- [api-emulator](https://github.com/jsj/api-emulator)
