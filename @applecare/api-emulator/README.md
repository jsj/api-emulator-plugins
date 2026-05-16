# @api-emulator/applecare

AppleCare coverage APIs provide organization device inventory, warranty coverage, service eligibility, and repair case workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/applecare
```

## Run

```bash
npx -p api-emulator api --plugin ./@applecare/api-emulator.mjs --service applecare
```

## Endpoints

- `GET /v1/orgDevices`
- `GET /v1/orgDevices/:deviceId`
- `GET /v1/orgDevices/:deviceId/appleCareCoverage`
- `GET /v1/coverage/:serialNumber`
- `POST /v1/repairCases`
- `GET /v1/repairCases/:caseId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
applecare:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://support.apple.com/guide/apple-business-manager/create-an-api-account-axm33189f66a/web)
- [api-emulator](https://github.com/jsj/api-emulator)
