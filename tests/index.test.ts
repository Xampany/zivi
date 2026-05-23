import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ZIVI = "src/index.ts";
const SCHEMA_URL = pathToFileURL(resolve(process.cwd(), "examples/simple.schema.ts")).href;

/**
 * Spawn the zivi CLI as a subprocess with the given argv and stdin, and
 * return the captured stdout, stderr, and exit code. Tests the actual CLI
 * surface end-to-end rather than the exported `runZivi` function alone,
 * so the shebang, argv slicing, and process-exit wiring are all in scope.
 */
async function spawnZivi(
  args: readonly string[],
  stdin: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", ZIVI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("zivi CLI", () => {
  test("exits 0 and echoes validated JSON on stdout when input matches the schema", async () => {
    const input = { name: "Ada", age: 30, role: "admin" };
    const { stdout, exitCode } = await spawnZivi([SCHEMA_URL], JSON.stringify(input));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual(input);
  });

  test("exits 1 and writes a formatted error to stderr on schema mismatch", async () => {
    const { stderr, exitCode } = await spawnZivi(
      [SCHEMA_URL],
      JSON.stringify({ name: "Ada", age: "thirty", role: "admin" }),
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("age");
  });

  test("exits 2 with a usage hint when the schema arg is missing", async () => {
    const { stderr, exitCode } = await spawnZivi([], "");
    expect(exitCode).toBe(2);
    expect(stderr).toContain("usage");
  });

  test("exits 2 when stdin is not valid JSON", async () => {
    const { stderr, exitCode } = await spawnZivi([SCHEMA_URL], "not json");
    expect(exitCode).toBe(2);
    expect(stderr).toContain("invalid JSON");
  });

  test("exits 2 when the schema path cannot be loaded", async () => {
    const bogus = pathToFileURL(resolve(process.cwd(), "examples/does-not-exist.ts")).href;
    const { stderr, exitCode } = await spawnZivi([bogus], JSON.stringify({}));
    expect(exitCode).toBe(2);
    expect(stderr).toContain("could not load");
  });
});
