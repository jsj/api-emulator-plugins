# @api-emulator/crusoe

Crusoe Cloud provides cloud infrastructure APIs for projects, GPU instance types, virtual machines, SSH keys, and operations.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/crusoe
```

## Run

```bash
npx -p api-emulator api --plugin ./@crusoe/api-emulator.mjs --service crusoe
```

## Endpoints

- `GET /v1alpha5/featureflags`
- `GET /v1alpha5/projects`
- `GET /v1alpha5/organizations/projects`
- `GET /v1alpha5/projects/:project_id`
- `GET /v1alpha5/locations`
- `GET /v1alpha5/instance-types`
- `GET /v1alpha5/projects/:project_id/instances`
- `GET /v1alpha5/projects/:project_id/compute/vms`
- `GET /v1alpha5/compute/vms`
- `POST /v1alpha5/projects/:project_id/instances`
- `GET /v1alpha5/projects/:project_id/instances/:instance_id`
- `PATCH /v1alpha5/projects/:project_id/instances/:instance_id`
- `DELETE /v1alpha5/projects/:project_id/instances/:instance_id`
- `GET /v1alpha5/projects/:project_id/ssh-keys`
- `POST /v1alpha5/projects/:project_id/ssh-keys`
- `GET /v1alpha5/operations/:operation_id`
- `GET /crusoe/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
crusoe:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.crusoecloud.com/api/)
- [api-emulator](https://github.com/jsj/api-emulator)
