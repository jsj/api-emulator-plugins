# @api-emulator/quizlet

Quizlet API 2.0 provides education APIs for users, study sets, terms, and flashcard creation workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/quizlet
```

## Run

```bash
npx -p api-emulator api --plugin ./@quizlet/api-emulator.mjs --service quizlet
```

## Endpoints

- `GET /2.0/users/:username`
- `GET /2.0/users/:username/sets`
- `GET /2.0/search/sets`
- `GET /2.0/sets/:id`
- `GET /2.0/sets/:id/terms`
- `GET /2.0/sets`
- `POST /2.0/sets`
- `PUT /2.0/sets/:id`
- `DELETE /2.0/sets/:id`
- `GET /quizlet/inspect/contract`
- `GET /quizlet/inspect/state`

## Auth

No production credentials are required. Use fake local credentials in client tests.

## Seed Configuration

```yaml
quizlet:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://quizlet.com/api/2.0/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
