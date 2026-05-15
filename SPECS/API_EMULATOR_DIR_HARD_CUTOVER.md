# Card: hard-cutover local emulator workspace directory

## Decision

Hard-cutover the local emulator workspace directory from `.emu/` to `.api-emulator/`.

## Scope

- Default Cloudflare D1 SQLite workspace path: `.api-emulator/d1`
- Git ignore pattern: `**/.api-emulator/`
- No automatic migration from `.emu/`
- Keep ignoring old `.emu/` directories so existing local workspaces do not pollute Git status.

## Rationale

`.api-emulator/` matches the package, CLI, and existing persistence examples in the related runtime repo. It is clearer than `.emu/` now that the project covers API and database emulator state.

## Compatibility

Users who need the old path can explicitly set `CLOUDFLARE_D1_EMU_DIR=.emu/d1`.
