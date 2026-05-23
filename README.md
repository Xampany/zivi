# zivi

> **Zod as a Unix filter** — pipe JSON through a Zod schema for validation.

`@xampany/zivi` is a tiny CLI that reads JSON from stdin, validates it against a [Zod](https://zod.dev) schema written in TypeScript, and writes the validated JSON to stdout (or a formatted error to stderr with a non-zero exit). It's the `ajv-cli` of the Zod world — until now, missing from the ecosystem.

> **Status:** alpha — early. The wire shape (stdin JSON in / stdout JSON out, exit 0/1/2) is settled; CLI flags land in v1.

## Install

```bash
bun add -g @xampany/zivi
```

Bun is required at runtime in v0.x — zivi loads your schema via dynamic `import()` and uses Bun's stdin streaming. Single-file compiled binaries for Linux / macOS / Windows × x64 + arm64 ship in v0.2.

## Usage

Write a schema as a TypeScript file with a default export:

```ts
// simple.schema.ts
import { z } from "zod";

export default z.object({
  name: z.string(),
  age: z.number().int().nonnegative(),
  role: z.enum(["admin", "editor", "viewer"]),
});
```

Pipe JSON through it:

```bash
echo '{"name":"Ada","age":30,"role":"admin"}' \
  | zivi ./simple.schema.ts \
  > validated.json
echo $?   # 0
```

On schema mismatch, zivi writes the formatted Zod error to stderr and exits `1`:

```bash
echo '{"name":"Ada","age":-5,"role":"superuser"}' | zivi ./simple.schema.ts
# {
#   "_errors": [],
#   "age":  { "_errors": ["Number must be greater than or equal to 0"] },
#   "role": { "_errors": ["Invalid enum value..."] }
# }
echo $?   # 1
```

This composes with anything that emits JSON — `curl`, `docker run`, `jq`, log streams, AI-agent tool calls — making schema validation a single pipe stage.

## How it works

```
stdin (JSON)  ─►  JSON.parse  ─►  schema.safeParse  ─►  stdout (validated JSON)
                                         │
                                         └─►  stderr (formatted error)  +  exit 1
```

The schema file is loaded via dynamic `import()`, so the **full Zod surface** is available — `.refine`, `.transform`, `.preprocess`, schema composition, custom validators. Anything you write in a `.ts` file with `import { z } from "zod"` works. Transforms are reflected in stdout.

## Exit codes

| code | meaning                                                      |
| ---- | ------------------------------------------------------------ |
| `0`  | input validated against the schema                           |
| `1`  | input parsed as JSON but did not match the schema            |
| `2`  | usage error: missing arg, unloadable schema, or invalid JSON |

## Why this exists

The Zod ecosystem has every flavour of *argv parser built with Zod* (`@mizchi/zodcli`, `GregBrimble/zodcli`, `zod-opts`, `argzod`, `zodiarg`) and every flavour of *schema-to-schema conversion* (`json-schema-to-zod`) — but no Unix-style **validator filter**. `ajv-cli` exists for JSON Schema, and zivi fills the same gap for Zod.

The use case that surfaced it: piping the JSON output of a CLI tool through a Zod schema as a validation gate before handing it to a downstream consumer. Once you've already written the schema in TypeScript for use elsewhere in your codebase, keeping a duplicate JSON-Schema copy around just to validate shell-pipe output is drift waiting to happen. zivi closes the loop.

## Roadmap

- **v0.1.x** (current) — TypeScript source distribution via `bun add`. Single positional arg, no flags. Alpha.
- **v0.2** — single-file compiled binaries via `bun build --compile` on the five mainstream targets (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `windows-x64`), installable via `curl | sh` (Unix) or a PowerShell one-liner (Windows).
- **v1.0** — `--format json|pretty|tree`, `--export <name>` for non-default exports, `--coerce` to enable Zod coercion, proper `--help` / `--version`, esbuild-style `npm`-wrap so `npm install -g @xampany/zivi` works without Bun installed.

## Name

`zivi` (rhymes with *Stevie*) is a German nickname for a *Zivildienstleistender* — the conscientious-objector civilian who quietly does the work in the background. Befitting, for a small JSON validator that sits in a Unix pipe and silently passes data through when it's well-formed.

## License

[MIT](./LICENSE) © 2026 Xampany
