# @api-emulator/proton-mail

Proton Mail provides mail APIs for labels, messages, mailbox state, and read/unread workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/proton-mail
```

## Run

```bash
npx -p api-emulator api --plugin ./@proton-mail/api-emulator.mjs --service proton-mail
```

## Endpoints

- `GET /core/v4/labels`
- `POST /core/v4/labels`
- `GET /mail/v4/messages`
- `GET /mail/v4/messages/:messageId`
- `PUT /mail/v4/messages/read`
- `PUT /mail/v4/messages/unread`
- `GET /proton-mail/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
proton-mail:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://github.com/ProtonMail/go-proton-api)
- [api-emulator](https://github.com/jsj/api-emulator)
