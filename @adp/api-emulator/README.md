# @api-emulator/adp

ADP provides Human Capital Management APIs for workers, payroll events, organizations, time, and pay data.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/adp
```

## Run

```bash
npx -p api-emulator api --plugin ./@adp/api-emulator.mjs --service adp
```

## Endpoints

- `GET /hr/v2/workers`
- `GET /hr/v2/workers/:associateOid`
- `POST /events/hr/v1/worker.hire`
- `POST /payroll/v1/pay-data-input`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
adp:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.adp.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
