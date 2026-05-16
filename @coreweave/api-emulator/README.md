# @api-emulator/coreweave

CoreWeave provides Kubernetes Service APIs for CKS clusters, regions, node types, and kubeconfig workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/coreweave
```

## Run

```bash
npx -p api-emulator api --plugin ./@coreweave/api-emulator.mjs --service coreweave
```

## Endpoints

- `GET /v1beta1/cks/clusters`
- `POST /v1beta1/cks/clusters`
- `GET /v1beta1/cks/clusters/:id`
- `PATCH /v1beta1/cks/clusters/:id`
- `DELETE /v1beta1/cks/clusters/:id`
- `GET /v1beta1/cks/clusters/:id/kubeconfig`
- `GET /v1beta1/cks/regions`
- `GET /v1beta1/cks/node-types`
- `GET /coreweave/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
coreweave:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.coreweave.com/products/cks/reference/cks-api)
- [api-emulator](https://github.com/jsj/api-emulator)
