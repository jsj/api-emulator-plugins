# @api-emulator/oculus

Oculus and Meta Horizon provide Graph API surfaces for app builds, release channels, redists, and platform utility workflows.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

```bash
npm install @api-emulator/oculus
```

## Run

```bash
npx -p api-emulator api --plugin ./@oculus/api-emulator.mjs --service oculus
```

## Endpoints

- `POST /graphql`
- `GET /:appId/release_channels`
- `GET /:appId/release_channel_data`
- `GET /:appId/release-channel-data`
- `GET /:appId/builds`
- `POST /:appId/builds`
- `GET /builds/:buildId`
- `POST /:appId/release_channels/:channelName/build`
- `POST /access_token`
- `POST /oauth/access_token`
- `GET /redists`
- `GET /horizon/apps/:appId/release-channel-data`
- `GET /horizon/apps/:appId/release_channels`
- `POST /horizon/apps/:appId/builds`
- `GET /inspect/contract`
- `GET /inspect/state`
- `POST /inspect/reset`

## Auth

Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.

## Seed Configuration

```yaml
oculus:
  # Add provider-specific seed state here.
```

## Links

- [Official API docs](https://developer.oculus.com/)
- [api-emulator](https://github.com/jsj/api-emulator)
