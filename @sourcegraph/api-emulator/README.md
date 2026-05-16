# @api-emulator/sourcegraph

Sourcegraph provides code search, GraphQL, Cody context, and LLM model APIs for developer tooling workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/sourcegraph
```

## Run

```bash
npx -p api-emulator api --plugin ./@sourcegraph/api-emulator.mjs --service sourcegraph
```

## Endpoints

- `POST /.api/graphql`
- `GET /.api/search/stream`
- `GET /.api/llm/models`
- `GET /.api/llm/models/:modelId`
- `POST /.api/cody/context`
- `GET /sourcegraph/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
sourcegraph:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://sourcegraph.com/docs/api)
- [api-emulator](https://github.com/jsj/api-emulator)
