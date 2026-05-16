# @api-emulator/docusign

Docusign provides eSignature APIs for OAuth userinfo, users, templates, envelopes, recipients, and Connect webhooks.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/docusign
```

## Run

```bash
npx -p api-emulator api --plugin ./@docusign/api-emulator.mjs --service docusign
```

## Endpoints

- `GET /oauth/userinfo`
- `GET /restapi/v2.1/accounts/:accountId/users`
- `GET /restapi/v2.1/accounts/:accountId/templates`
- `GET /restapi/v2.1/accounts/:accountId/envelopes`
- `POST /restapi/v2.1/accounts/:accountId/envelopes`
- `GET /restapi/v2.1/accounts/:accountId/envelopes/:envelopeId`
- `GET /restapi/v2.1/accounts/:accountId/envelopes/:envelopeId/recipients`
- `GET /restapi/v2.1/accounts/:accountId/connect`
- `GET /inspect/contract`
- `GET /inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
docusign:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.docusign.com/docs/esign-rest-api/reference/)
- [api-emulator](https://github.com/jsj/api-emulator)
