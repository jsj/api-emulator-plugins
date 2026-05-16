# @api-emulator/imsg

imsg provides a stateful iMessage fakout API plus deterministic macOS Messages chat.db fixtures for testing chats, history, search, send, RPC, tapbacks, and attachments.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/imsg
```

## Run

```bash
npx -p api-emulator api --plugin ./@imsg/api-emulator.mjs --service imsg
```

## Endpoints

- `GET /imsg/inspect/contract`
- `GET /imsg/inspect/state`
- `GET /imsg/fixtures/chat-db.sql`
- `GET /imsg/status`
- `GET /imsg/account`
- `GET /imsg/chats`
- `GET /imsg/chats/:chatId/history`
- `GET /imsg/search`
- `POST /imsg/send`
- `POST /imsg/react`
- `POST /imsg/rpc`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
imsg:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/zmirror/imsg)
- [api-emulator](https://github.com/jsj/api-emulator)
