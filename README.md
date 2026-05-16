![api-emulator cover](./.README/cover.png)

# api-emulator-registry

Plugin registry for [`api-emulator`](https://github.com/jsj/api-emulator): fake real APIs locally so your app can test integrations without touching production, sandboxes, or someone else's server.

Use this repo like an app store of provider emulators. Pick a plugin, run it on localhost with `api-emulator`, seed state, reset data, and test your app against stable fake APIs.

## Provider wall

<table>
  <tr>
    <td align="center"><a href="./@stripe/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=stripe.com&sz=64" width="32" height="32" alt=""><br>Stripe</a></td>
    <td align="center"><a href="./@github/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=github.com&sz=64" width="32" height="32" alt=""><br>GitHub</a></td>
    <td align="center"><a href="./@aws/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=64" width="32" height="32" alt=""><br>AWS</a></td>
    <td align="center"><a href="./@google/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=google.com&sz=64" width="32" height="32" alt=""><br>Google</a></td>
    <td align="center"><a href="./@microsoft/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=microsoft.com&sz=64" width="32" height="32" alt=""><br>Microsoft</a></td>
    <td align="center"><a href="./@vercel/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=vercel.com&sz=64" width="32" height="32" alt=""><br>Vercel</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@slack/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=slack.com&sz=64" width="32" height="32" alt=""><br>Slack</a></td>
    <td align="center"><a href="./@resend/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=resend.com&sz=64" width="32" height="32" alt=""><br>Resend</a></td>
    <td align="center"><a href="./@okta/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=okta.com&sz=64" width="32" height="32" alt=""><br>Okta</a></td>
    <td align="center"><a href="./@mongoatlas/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mongodb.com&sz=64" width="32" height="32" alt=""><br>MongoDB Atlas</a></td>
    <td align="center"><a href="./@supabase/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=supabase.com&sz=64" width="32" height="32" alt=""><br>Supabase</a></td>
    <td align="center"><a href="./@neon/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=neon.tech&sz=64" width="32" height="32" alt=""><br>Neon</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@posthog/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=posthog.com&sz=64" width="32" height="32" alt=""><br>PostHog</a></td>
    <td align="center"><a href="./@openai/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=openai.com&sz=64" width="32" height="32" alt=""><br>OpenAI</a></td>
    <td align="center"><a href="./@anthropic/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=anthropic.com&sz=64" width="32" height="32" alt=""><br>Anthropic</a></td>
    <td align="center"><a href="./@figma/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=figma.com&sz=64" width="32" height="32" alt=""><br>Figma</a></td>
    <td align="center"><a href="./@shopify/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=shopify.com&sz=64" width="32" height="32" alt=""><br>Shopify</a></td>
    <td align="center"><a href="./@discord/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=discord.com&sz=64" width="32" height="32" alt=""><br>Discord</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@twilio/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=twilio.com&sz=64" width="32" height="32" alt=""><br>Twilio</a></td>
    <td align="center"><a href="./@cloudflare/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=cloudflare.com&sz=64" width="32" height="32" alt=""><br>Cloudflare</a></td>
    <td align="center"><a href="./@netlify/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=netlify.com&sz=64" width="32" height="32" alt=""><br>Netlify</a></td>
    <td align="center"><a href="./@linear/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=linear.app&sz=64" width="32" height="32" alt=""><br>Linear</a></td>
    <td align="center"><a href="./@notion/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=notion.so&sz=64" width="32" height="32" alt=""><br>Notion</a></td>
    <td align="center"><a href="./@plaid/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=plaid.com&sz=64" width="32" height="32" alt=""><br>Plaid</a></td>
  </tr>
</table>

## Quick start

Clone this registry next to your app:

```bash
git clone https://github.com/jsj/api-emulator-plugins.git
```

Run one provider:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@posthog/api-emulator.mjs \
  --service posthog
```

Run multiple providers:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@github/api-emulator.mjs,./api-emulator-plugins/@apple/api-emulator.mjs \
  --service github,apple
```

Generate starter seed config:

```bash
npx -p api-emulator api init \
  --plugin ./api-emulator-plugins/@alpaca/api-emulator/src/index.ts \
  --service alpaca
```

## How it fits together

```text
Your app
  ↓
api-emulator on localhost
  ↓
Provider plugins from this registry
```

`api-emulator` is the runtime. This registry keeps provider behavior in separate plugins so public, private, and internal APIs can evolve independently.

## Provider layout

Most providers live under a scoped folder:

```text
@posthog/api-emulator.mjs
@github/api-emulator.mjs
@cloudflare/api-emulator/src/index.ts
```

New provider generation is handled by the repo's `create-api-emulator-plugin` agent skill; this README focuses on discovery and usage.

## Package README spec

Provider packages can also include their own README, like [`@vercel/api-emulator`](./@vercel/api-emulator/README.md), for provider-specific setup and endpoint coverage.

Recommended package README shape:

```md
# @emulators/<provider>

One-sentence description of what this provider emulates.

Part of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.

## Install

\`\`\`bash
npm install @emulators/<provider>
\`\`\`

## Run

\`\`\`bash
npx -p api-emulator api --plugin ./@<provider>/api-emulator.mjs --service <provider>
\`\`\`

## Endpoints

- \`GET /example\` — what this endpoint returns

## Auth

Describe accepted fake tokens, headers, workspace/team scoping, and pagination conventions.

## Seed Configuration

\`\`\`yaml
<provider>:
  key: value
\`\`\`

## Links

- [Official API docs](https://example.com/docs)
- [api-emulator](https://github.com/jsj/api-emulator)
```

## Fixtures

Stateful or stochastic providers can export a fixture after a useful run and restore it later:

```ts
const fixture = openai.exportFixture({ metadata: { name: "happy-path-chat" } })

openai.resetToFixture(fixture)
```

## Smoke testing

```bash
bun run smoke
node ./@posthog/smoke.mjs
```

## License

MIT. See [`LICENSE`](./LICENSE).
