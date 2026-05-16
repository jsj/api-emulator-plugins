# @api-emulator/gusto

Gusto provides payroll and HR APIs for companies, employees, contractors, payrolls, benefits, and onboarding.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/gusto
```

## Run

```bash
npx -p api-emulator api --plugin ./@gusto/api-emulator.mjs --service gusto
```

## Endpoints

- `GET /v1/me`
- `GET /v1/companies/:companyId/employees`
- `POST /v1/companies/:companyId/employees`
- `GET /v1/companies/:companyId/payrolls`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
gusto:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.gusto.com/app-integrations/reference)
- [api-emulator](https://github.com/jsj/api-emulator)
