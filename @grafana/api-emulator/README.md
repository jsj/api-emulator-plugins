# @api-emulator/grafana

Grafana provides observability dashboard APIs for organizations, datasources, folders, dashboard search, and dashboard management.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/grafana
```

## Run

```bash
npx -p api-emulator api --plugin ./@grafana/api-emulator.mjs --service grafana
```

## Endpoints

- `GET /api/health`
- `GET /api/org`
- `GET /api/datasources`
- `GET /api/search`
- `GET /api/dashboards/uid/:uid`
- `POST /api/dashboards/db`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
grafana:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://grafana.com/docs/grafana/latest/developers/http_api/)
- [api-emulator](https://github.com/jsj/api-emulator)
