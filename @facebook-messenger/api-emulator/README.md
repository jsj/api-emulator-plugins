# @api-emulator/facebook-messenger

Facebook Messenger Platform provides Graph API surfaces for pages, conversations, Send API messages, user profiles, and webhooks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/facebook-messenger
```

## Run

```bash
npx -p api-emulator api --plugin ./@facebook-messenger/api-emulator.mjs --service facebook-messenger
```

## Endpoints

- `GET /webhook`
- `GET /:version/me/accounts`
- `GET /:version/:pageId/conversations`
- `GET /:version/:conversationId/messages`
- `POST /:version/:pageId/messages`
- `POST /:version/me/messages`
- `GET /:version/:profileId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
facebook-messenger:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.facebook.com/docs/messenger-platform)
- [api-emulator](https://github.com/jsj/api-emulator)
