---
name: create-api-emulator-plugin
description: Create a new api-emulator provider plugin by deriving routes from official specs and validating them through a real CLI or SDK pointed at localhost.
---

# Create API Emulator Plugin

Use this skill when adding a new provider under `@provider/` in this repository. The goal is not just route coverage; the goal is a local emulator that real tools can use without touching production APIs.

## Outcome

Create a provider plugin that:

- Exports `contract` and `plugin` from `@provider/api-emulator.mjs` or `@provider/api-emulator/src/index.ts`.
- Implements the smallest useful stateful REST/API slice from official contract sources.
- Adds the provider to `api-emulator.catalog.json`.
- Adds route smoke coverage, and when possible CLI-backed smoke coverage in `scripts/cli-verification-smoke.mjs`.
- Keeps all external CLI config, cloned repos, credentials, and patches in temporary directories.

## Discovery order

1. **Find the official API contract first**
   - Prefer official OpenAPI, Swagger, Postman collections, protobufs, generated SDK specs, or docs with response examples.
   - Search provider docs for `OpenAPI`, `Swagger`, `api reference`, `postman`, `schema`, `base URL`, and canonical endpoint paths.
   - Capture canonical base URLs, API versions, auth headers, pagination style, error shape, object IDs, timestamps, and webhook verification behavior.

2. **Find a compatibility oracle**
   - Prefer an official CLI.
   - If no official CLI exists, prefer an official SDK with a configurable base URL.
   - If neither exists, use a reputable OSS CLI or SDK discovered through GitHub code search.
   - Search by canonical base URL strings, not only package names. Examples:
     - `gh api search/code -f q='"api.provider.com/v1" "baseURL"'`
     - `gh api search/code -f q='"provider.googleapis.com" cli'`
     - `gh api search/code -f q='"https://api.provider.com" language:TypeScript'`

3. **Classify base URL control**
   - Best: documented env var or flag such as `PROVIDER_API_BASE_URL`, `--api-url`, `--instance-url`.
   - Good: SDK constructor or per-call URL override.
   - Acceptable for smoke tests: clone/build in a temp dir and patch centralized base URL constants.
   - Last resort: closed binary DNS/TLS interception. Keep this manual/gated only; never add default automation that edits `/etc/hosts`, trusts a CA, or binds privileged ports.

## Implementation workflow

1. **Choose the first emulator slice**
   - Start with read/list endpoints that CLIs need for login, identity, projects/accounts/resources, and one safe create/update flow.
   - Use draft, paused, fake, or emulator-only resources for write coverage.
   - Include webhook challenge endpoints if the provider has webhooks.

2. **Build deterministic state**
   - Store provider state under namespaced keys like `provider:state`.
   - Seed realistic IDs, timestamps, links, pagination fields, and nested objects that match the official schema.
   - Add `seedFromConfig(store, baseUrl, config)` when callers need custom IDs, accounts, users, tokens, projects, or webhook targets.
   - Add inspect/reset endpoints only when existing repo patterns support them for smoke assertions.

3. **Match wire shape before breadth**
   - Return provider-shaped errors, envelopes, timestamps, pagination cursors, and status codes.
   - Add compatibility shims for known CLI quirks, including login probes, userinfo calls, generated-client required fields, and alternate route aliases.
   - Prefer small exact payloads over broad approximate payloads.

4. **Register the plugin**
   - Add an `api-emulator.catalog.json` entry with `kind`, `packageName`, `specifier`, and a concise description.
   - Follow existing naming: folder `@provider`, package name `@api-emulator/provider`, plugin name `provider`.

5. **Add smoke coverage**
   - Add direct route smoke for the first slice.
   - Add CLI smoke behind availability/build checks so local development remains ergonomic.
   - For OSS CLIs, clone/build/patch in temp dirs and avoid mutating user config.
   - Inject dummy credentials and base URLs through env vars or temp config files.

## CLI smoke playbook

1. Start the plugin on a local ephemeral server.
2. Prepare isolated CLI state:
   - temp home/config/cache dirs
   - dummy tokens/keys
   - temp clone or temp binary copy if patching is required
3. Repoint the CLI:
   - first try official flag/env var
   - then SDK URL override
   - then temp patch of centralized base URL constants
4. Run read/list commands first.
5. Run one safe create/update/delete flow only when the emulator can verify state afterward.
6. Assert both CLI output and emulator state.
7. Skip with a clear reason when the CLI is unavailable or a base URL override is not safely possible.

## Lessons from existing provider strategies

- Meta-style Graph APIs often share canonical hosts but expose per-call or SDK-level URL overrides; use Graph-compatible route shapes when no product-specific CLI exists.
- Sentry-style CLIs may already support a service URL env var such as `SENTRY_URL`; use that before patching.
- Google/YouTube-style CLIs often centralize Data, Upload, and Analytics base constants in one source file; patch temp clones rather than changing global installs.
- Adyen/Alpaca/LinkedIn-style OSS CLIs are useful because generated clients reveal missing response fields that simple route smokes miss.
- Salesforce-style CLIs may require login/userinfo/setup probes before the command the smoke actually cares about; emulate those prerequisites.
- Oculus-style closed binaries can be validated with DNS/TLS interception, but this requires admin-level machine changes and must stay manual.

## Safety rules

- Never call production APIs from smoke tests.
- Never store real credentials, real profiles, or user CLI config in the repo.
- Never patch global binaries in place; copy or clone into a temp dir.
- Never automate `/etc/hosts`, trust-store, sudo, or privileged-port changes unless the user explicitly asks for a manual experiment.
- Keep generated fixtures deterministic and small.
- Do not add broad documentation unless explicitly requested; prefer code, tests, and concise inline notes.

## Done criteria

- Provider plugin exports load successfully.
- Catalog entry points at the implemented plugin.
- Direct smoke tests pass.
- CLI smoke passes, or is explicitly skipped with a tracked reason when no safe base URL control exists.
- `npm run smoke` or the relevant scoped smoke command passes after the change.
