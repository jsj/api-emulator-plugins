# CLI Integration Smoke Strategy

Pointing real provider CLIs at local emulator base URLs is now a useful verification layer because it exercises the same URL shapes, headers, encodings, and discovery flows that real users hit.

## Current proof

`npm run smoke:cli` starts a local in-process emulator harness and verifies:

- Stripe CLI with `--api-base`
- AWS CLI with `--endpoint-url`
- `kubectl` with a generated kubeconfig server URL
- OpenAI CLI with `--api-base`
- Google Workspace `gws` using a temporary Discovery cache whose `rootUrl` points at the emulator

This already caught real compatibility bugs around route ordering, OpenAI base URL slash handling, Kubernetes discovery metadata, and Bun importing TS modules with runtime-only package references.

## Next direction

Turn this into a common integration-test pattern:

1. Each emulator advertises one or more external CLI probes.
2. A shared harness starts the emulator once, injects temporary CLI config, and asserts a small create/list/get flow.
3. Provider-specific shims stay explicit when a CLI needs discovery or profile files.
4. Missing CLI base-url support is tracked as a product gap, not silently skipped.

Supabase is the next likely target because the CLI is open source. The installed binary does not currently honor `API_URL` or `SUPABASE_API_URL` for management APIs, so the clean path is to patch or wrap the OSS CLI to accept a management API base URL and then add it to the same smoke suite.
