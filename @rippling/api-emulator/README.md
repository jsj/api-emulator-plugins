# @api-emulator/rippling

Rippling provides workforce platform APIs for employees, groups, departments, devices, payroll, and identity data.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/rippling
```

## Run

```bash
npx -p api-emulator api --plugin ./@rippling/api-emulator.mjs --service rippling
```

## Endpoints

- `GET /apps/api/integrations`
- `POST /apps/api/integrations/find_paginated`
- `GET /apps/api/apps/:id`
- `POST /platform/api/employees`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
rippling:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.rippling.com/documentation/platform-api/)
- [api-emulator](https://github.com/jsj/api-emulator)
