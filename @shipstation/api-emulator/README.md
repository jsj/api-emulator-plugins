# @api-emulator/shipstation

ShipStation provides shipping APIs for shipments, rates, labels, tracking, and fulfillment workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/shipstation
```

## Run

```bash
npx -p api-emulator api --plugin ./@shipstation/api-emulator.mjs --service shipstation
```

## Endpoints

- `GET /v2/shipments`
- `POST /v2/shipments`
- `GET /v2/shipments/:id`
- `POST /v2/rates`
- `POST /v2/labels`
- `GET /shipstation/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
shipstation:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.shipstation.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
