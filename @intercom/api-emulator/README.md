# @api-emulator/intercom

Intercom provides customer-support APIs for admins, contacts, conversations, replies, and inbox workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/intercom
```

## Run

```bash
npx -p api-emulator api --plugin ./@intercom/api-emulator.mjs --service intercom
```

## Endpoints

- `GET /admins`
- `GET /admins/:id`
- `GET /contacts`
- `POST /contacts`
- `GET /contacts/:id`
- `GET /conversations`
- `POST /conversations/search`
- `GET /conversations/:id`
- `POST /conversations/:id/reply`
- `POST /conversations/:id/parts`
- `GET /inspect/contract`
- `GET /inspect/state`
- `GET /inspect/now`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
intercom:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.intercom.com/docs/references/rest-api/api.intercom.io)
- [api-emulator](https://github.com/jsj/api-emulator)
