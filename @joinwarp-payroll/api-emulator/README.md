# @api-emulator/joinwarp-payroll

JoinWarp Payroll provides workforce APIs for departments, workplaces, workers, invitations, and time-off records.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/joinwarp-payroll
```

## Run

```bash
npx -p api-emulator api --plugin ./@joinwarp-payroll/api-emulator.mjs --service joinwarp-payroll
```

## Endpoints

- `POST /v1/departments`
- `PATCH /v1/departments/:id`
- `POST /v1/workplaces`
- `PATCH /v1/workplaces/:id`
- `POST /v1/workers/employee`
- `POST /v1/workers/contractor`
- `POST /v1/workers/:id/invite`
- `DELETE /v1/workers/:id`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
joinwarp-payroll:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.warp.co/api)
- [api-emulator](https://github.com/jsj/api-emulator)
