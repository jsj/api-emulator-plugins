# @api-emulator/google-forms

Google Forms provides form creation, form retrieval, batch updates, and response read APIs for Workspace survey workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/google-forms
```

## Run

```bash
npx -p api-emulator api --plugin ./@google-forms/api-emulator.mjs --service google-forms
```

## Endpoints

- `GET /$discovery/rest`
- `GET /discovery/v1/apis/forms/v1/rest`
- `POST /v1/forms`
- `GET /v1/forms/:formId`
- `POST /v1/forms/:formId:batchUpdate`
- `GET /v1/forms/:formId/responses`
- `GET /v1/forms/:formId/responses/:responseId`
- `GET /google-forms/inspect/contract`
- `GET /google-forms/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
google-forms:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developers.google.com/workspace/forms/api/reference/rest)
- [api-emulator](https://github.com/jsj/api-emulator)
