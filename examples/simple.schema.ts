import { z } from "zod";

/**
 * Minimal smoke-test schema for the zivi CLI. The Phase 1 PR uses this as
 * the fixture for end-to-end tests; users can also point `zivi` at it
 * directly to sanity-check an install.
 *
 * Demonstrates the three shapes the CLI must handle: required string,
 * non-negative integer, and a literal enum.
 */
export default z.object({
  name: z.string(),
  age: z.number().int().nonnegative(),
  role: z.enum(["admin", "editor", "viewer"]),
});
