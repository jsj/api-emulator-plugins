# @api-emulator/anotes

anotes provides a stateful Apple Notes fakout API plus deterministic NoteStore.sqlite fixtures for testing note bodies, folders, search, JSON-RPC, and local CLI reads.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/anotes
```

## Run

```bash
npx -p api-emulator api --plugin ./@anotes/api-emulator.mjs --service anotes
```

## Endpoints

- `GET /anotes/inspect/contract`
- `GET /anotes/inspect/state`
- `GET /anotes/fixtures/note-store.sql`
- `GET /anotes/status`
- `GET /anotes/folders`
- `GET /anotes/notes`
- `GET /anotes/notes/:noteId`
- `GET /anotes/search`
- `POST /anotes/notes`
- `POST /anotes/rpc`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
anotes:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/zmirror/anotes-cli)
- [api-emulator](https://github.com/jsj/api-emulator)
