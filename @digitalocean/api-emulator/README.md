# @api-emulator/digitalocean

DigitalOcean provides cloud infrastructure APIs for accounts, projects, droplets, networking, and managed resources.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/digitalocean
```

## Run

```bash
npx -p api-emulator api --plugin ./@digitalocean/api-emulator.mjs --service digitalocean
```

## Endpoints

- `GET /v2/account`
- `GET /v2/projects`
- `POST /v2/projects`
- `GET /v2/projects/:projectId`
- `GET /v2/droplets`
- `GET /v2/droplets/:dropletId`
- `GET /digitalocean/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
digitalocean:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.digitalocean.com/reference/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
