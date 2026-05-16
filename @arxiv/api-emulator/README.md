# @api-emulator/arxiv

arXiv provides Atom feed APIs for scholarly paper search, metadata retrieval, and offset pagination workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/arxiv
```

## Run

```bash
npx -p api-emulator api --plugin ./@arxiv/api-emulator.mjs --service arxiv
```

## Endpoints

- `GET /api/query`
- `GET /arxiv/inspect/contract`
- `GET /arxiv/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
arxiv:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://info.arxiv.org/help/api/user-manual.html)
- [api-emulator](https://github.com/jsj/api-emulator)
