# @api-emulator/huggingface

Hugging Face provides Hub APIs for users, models, datasets, Spaces, repository metadata, files, OAuth, and repo creation workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/huggingface
```

## Run

```bash
npx -p api-emulator api --plugin ./@huggingface/api-emulator.mjs --service huggingface
```

## Endpoints

- `GET /.well-known/openid-configuration`
- `GET /.well-known/jwks.json`
- `GET /api/whoami-v2`
- `GET /api/users/:user/likes`
- `GET /api/${plural}`
- `GET /api/${plural}/:namespace/:repo`
- `GET /api/${plural}/:repo`
- `GET /api/${plural}/:namespace/:repo/tree/:rev`
- `GET /api/${plural}/:namespace/:repo/tree/:rev/:path{.+}`
- `GET /api/${plural}/:namespace/:repo/likers`
- `POST /api/${plural}/:namespace/:repo/like`
- `GET /api/${plural}/:namespace/:repo/refs`
- `POST /api/repos/create`
- `GET /oauth/authorize`
- `POST /oauth/register`
- `POST /oauth/device`
- `POST /oauth/token`
- `GET /oauth/userinfo`
- `POST /oauth/userinfo`
- `GET /huggingface/inspect/state`
- `POST /huggingface/reset`
- `GET /inspect/contract`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
huggingface:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://huggingface.co/docs/hub/api)
- [api-emulator](https://github.com/jsj/api-emulator)
