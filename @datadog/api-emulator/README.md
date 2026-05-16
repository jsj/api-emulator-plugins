# @api-emulator/datadog

Datadog provides observability APIs for metrics, monitors, logs, traces, hosts, dashboards, and events.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/datadog
```

## Run

```bash
npx -p api-emulator api --plugin ./@datadog/api-emulator.mjs --service datadog
```

## Endpoints

- `GET /api/v1/validate`
- `GET /api/v1/hosts`
- `GET /api/v1/monitor`
- `GET /api/v1/monitor/:id`
- `POST /api/v1/monitor`
- `GET /api/v2/metrics`
- `POST /api/v1/series`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
datadog:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.datadoghq.com/api/latest/)
- [api-emulator](https://github.com/jsj/api-emulator)
