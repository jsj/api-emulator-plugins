# @api-emulator/listenlabs

Listen Labs provides AI research APIs for studies, questions, participant responses, transcripts, summaries, and research insights.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/listenlabs
```

## Run

```bash
npx -p api-emulator api --plugin ./@listenlabs/api-emulator.mjs --service listenlabs
```

## Endpoints

- `GET /api/public/list_surveys`
- `GET /api/public/list_studies`
- `GET /api/public/responses`
- `POST /api/public/responses`
- `GET /api/public/responses/:responseId`
- `GET /api/public/study_questions`
- `GET /api/public/questions`
- `GET /api/public/insights`
- `GET /listenlabs/inspect/contract`
- `GET /listenlabs/inspect/state`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
listenlabs:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://docs.listenlabs.ai/get-started)
- [api-emulator](https://github.com/jsj/api-emulator)
