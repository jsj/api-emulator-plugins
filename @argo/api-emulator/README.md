# @api-emulator/argo

Argo Workflows provides workflow orchestration APIs for submitting, listing, inspecting, and deleting Kubernetes-native workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/argo
```

## Run

```bash
npx -p api-emulator api --plugin ./@argo/api-emulator.mjs --service argo
```

## Endpoints

- `GET /api/v1/info`
- `GET /api/v1/userinfo`
- `GET /api/v1/workflows/:namespace`
- `POST /api/v1/workflows/:namespace`
- `POST /api/v1/workflows/:namespace/submit`
- `GET /api/v1/workflows/:namespace/:name`
- `DELETE /api/v1/workflows/:namespace/:name`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
argo:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://argo-workflows.readthedocs.io/en/latest/swagger/)
- [api-emulator](https://github.com/jsj/api-emulator)
