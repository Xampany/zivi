#!/usr/bin/env -S bun run

/**
 * zivi — Unix-pipeable Zod validator CLI.
 *
 * Reads JSON from stdin, validates it against a Zod schema loaded from a
 * TypeScript file via dynamic import, writes validated JSON to stdout on
 * success, or a formatted error to stderr on failure.
 *
 * Exit codes:
 *   0 — input validated against the schema
 *   1 — input parsed as JSON but did not match the schema
 *   2 — usage error: missing arg, unloadable schema, or invalid JSON
 */

import type { z } from "zod";

// ── Public entry ─────────────────────────────────────────────────────────────

/**
 * Run zivi against a list of CLI arguments and return the resulting exit code.
 *
 * Returns instead of calling `process.exit` so the function stays unit-testable;
 * the script footer at the bottom of this file is what actually exits the process.
 */
export async function runZivi(args: readonly string[]): Promise<number> {
  const schemaPath = args[0];
  if (!schemaPath) {
    console.error("usage: zivi <schema.ts>");
    return 2;
  }

  let schema: z.ZodType;
  try {
    const mod = await import(schemaPath);
    schema = mod.default as z.ZodType;
  } catch (e) {
    console.error(`could not load schema from ${schemaPath}:`, (e as Error).message);
    return 2;
  }

  const input = await Bun.stdin.text();
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch (e) {
    console.error("invalid JSON on stdin:", (e as Error).message);
    return 2;
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    console.error(JSON.stringify(result.error.format(), null, 2));
    return 1;
  }

  process.stdout.write(JSON.stringify(result.data, null, 2));
  return 0;
}

// ── Script entry ─────────────────────────────────────────────────────────────

process.exit(await runZivi(process.argv.slice(2)));
