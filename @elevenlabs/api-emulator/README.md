# @api-emulator/elevenlabs

ElevenLabs provides voice AI APIs for text-to-speech, voices, models, generated audio history, and user subscription metadata.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/elevenlabs
```

## Run

```bash
npx -p api-emulator api --plugin ./@elevenlabs/api-emulator.mjs --service elevenlabs
```

## Endpoints

- See the emulator source for the supported local API surface.

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
elevenlabs:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://elevenlabs.io/docs/api-reference/introduction)
- [api-emulator](https://github.com/jsj/api-emulator)
