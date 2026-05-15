# Meta, Sentry, and Google Play CLI Emulator Strategy

Extend `npm run smoke:cli` with provider CLIs that exercise real user workflows against local emulators.

## Targets

| Surface | CLI | Emulator target | Status |
|---|---|---|---|
| Meta Ads | `meta-ads` from `pip install meta-ads` | `@meta` Marketing API / Graph API-compatible routes | Needs install + base URL probe |
| Meta Horizon / Oculus | `/usr/local/bin/ovr-platform-util` | New Meta Horizon app release/build emulator routes | CLI installed; base URL override unknown |
| Sentry | `sentry-cli` from `getsentry/sentry-cli` | Expand `@sentry` beyond webhook producer into Sentry REST subset | Needs install; likely supports `SENTRY_URL` |
| Google Play Console | `/Users/james/Developer/zzabandoned/play-console-cli` (`gplay`) | New Google Play Android Publisher emulator routes | Needs local binary/build + base URL patch/probe |
| fal / genmedia | `genmedia` | Existing `@fal` model, queue, assets, and platform routes | Installed; setup completed with auto env loading and no saved key |

## Meta Ads

Current `@meta` uses the ad-platform factory and should be the anchor. The CLI smoke should first verify whether `meta-ads` exposes an API host/base URL option or env var. If it does, wire a minimal flow:

1. List ad accounts.
2. Create a paused campaign.
3. Read it back.

If the CLI hardcodes Graph API hosts, patch/wrap the CLI like the Supabase plan and add a single explicit base URL env var.

## Oculus / Meta Horizon

`ovr-platform-util` is installed and exposes build/release-channel commands. This is less likely to expose a documented base URL override because it is a closed binary.

Strategy:

1. Probe flags/env/config for endpoint override.
2. If unavailable, treat this as a contract oracle only: inspect command payload expectations, then implement emulator routes for app builds, release channels, build upload metadata, and access-token flows.
3. If an endpoint override exists, add a smoke that calls `get-release-channel-data` and a non-destructive build/release-channel read path.

## Sentry

Current `@sentry` only emits webhook payloads. `sentry-cli` is a better compatibility test if the emulator adds REST routes for common CLI operations.

First CLI smoke:

1. Configure `SENTRY_URL=<emulator>`.
2. `sentry-cli projects list` or `sentry-cli releases list`.
3. Add source-map/upload dry-run style coverage if the CLI supports it without external state.

Emulator route candidates:

- `/api/0/organizations/`
- `/api/0/organizations/:org/projects/`
- `/api/0/organizations/:org/releases/`
- release file artifact upload/list endpoints

## Google Play Console

`gplay` wraps Android Publisher. This should become a dedicated Play Publisher emulator, not part of Google Workspace.

First emulator slice:

- Tracks list/update
- Edits insert/commit
- Reviews list/reply
- In-app products/subscriptions list
- Vitals issue list

First CLI smoke:

1. Build or locate the local `gplay` binary.
2. Patch/probe for an Android Publisher API base URL override.
3. Use temp credentials/profile and run a read-only JSON command such as tracks list or reviews list against the emulator.

## fal / genmedia

`genmedia` is installed and configured non-interactively with JSON output and `.env` auto-loading enabled. The setup intentionally did not save a key; CLI tests should inject a dummy `FAL_KEY` and emulator base URL through environment variables or a patched genmedia base-url flag.

First smoke target:

1. Start the `@fal` emulator.
2. Run `genmedia models --endpoint_id fal-ai/flux/dev`.
3. Run a deterministic `genmedia run fal-ai/flux/dev` request and assert the returned asset URL points at the emulator.
4. Run a video model request for `bytedance/seedance-2.0/fast/text-to-video` to exercise queue/result handling.

If genmedia hardcodes fal.ai hosts, patch the OSS CLI or add a wrapper env var before adding it to `npm run smoke:cli`.

## Common harness changes

- Keep CLI config in temp dirs.
- Prefer read/list commands first, then one create/update command only when the CLI can make safe paused/draft resources.
- Make missing base URL support explicit with a tracked skip and follow-up patch target.
- Add each CLI probe behind command availability checks so local development remains ergonomic.
