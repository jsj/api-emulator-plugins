# @api-emulator/samsara

Samsara provides connected operations APIs for fleets, vehicles, drivers, routes, sensors, safety, and telematics.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/samsara
```

## Run

```bash
npx -p api-emulator api --plugin ./@samsara/api-emulator.mjs --service samsara
```

## Endpoints

- `POST /fleet/routes`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
samsara:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.samsara.com/reference/overview)
- [api-emulator](https://github.com/jsj/api-emulator)
