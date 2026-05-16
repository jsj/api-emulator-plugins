# @api-emulator/whatsapp

WhatsApp Cloud API provides Graph API surfaces for business phone numbers, messages, media, templates, and webhooks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/whatsapp
```

## Run

```bash
npx -p api-emulator api --plugin ./@whatsapp/api-emulator.mjs --service whatsapp
```

## Endpoints

- `GET /webhook`
- `GET /:version/:businessAccountId/phone_numbers`
- `GET /:version/:businessAccountId/message_templates`
- `POST /:version/:phoneNumberId/messages`
- `GET /:version/:phoneNumberId/messages`
- `POST /:version/:phoneNumberId/media`
- `GET /:version/:mediaId`
- `DELETE /:version/:mediaId`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
whatsapp:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [api-emulator](https://github.com/jsj/api-emulator)
