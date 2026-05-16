# @api-emulator/stainless

Stainless provides SDK generation APIs for projects, branches, configs, builds, diagnostics, and generated target outputs.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/stainless
```

## Run

```bash
npx -p api-emulator api --plugin ./@stainless/api-emulator.mjs --service stainless
```

## Endpoints

- `GET /health`
- `POST /api/oauth/device`
- `POST /v0/oauth/token`
- `GET /v0/user`
- `GET /v0/orgs`
- `GET /v0/projects`
- `POST /v0/projects`
- `GET /v0/projects/:project`
- `PATCH /v0/projects/:project`
- `POST /v0/projects/:project/generate_commit_message`
- `GET /v0/projects/:project/configs`
- `POST /v0/projects/:project/configs/guess`
- `POST /v0/projects/:project/branches`
- `GET /v0/projects/:project/branches`
- `GET /v0/projects/:project/branches/:branch`
- `DELETE /v0/projects/:project/branches/:branch`
- `PUT /v0/projects/:project/branches/:branch/rebase`
- `PUT /v0/projects/:project/branches/:branch/reset`
- `GET /v0/builds`
- `POST /v0/builds`
- `GET /v0/builds/:id`
- `GET /v0/builds/:id/diagnostics`
- `POST /v0/builds/compare`
- `GET /v0/build_target_outputs`
- `POST /api/generate/spec`
- `GET /stainless/inspect/contract`
- `GET /stainless/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
stainless:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://www.stainless.com/docs/getting-started/quickstart-cli)
- [api-emulator](https://github.com/jsj/api-emulator)
