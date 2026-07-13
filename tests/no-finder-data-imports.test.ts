// Guards the Stage 2B acceptance: no customer production module may import
// the demo fixture data at runtime. If this test fails, a component or
// context file is leaking the old hardcoded catalogue back into the bundle.

import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield p;
  }
}

describe("finder-data.ts is not referenced by customer production code", () => {
  it("has no runtime import in src/", async () => {
    const offenders: string[] = [];
    const root = path.resolve(__dirname, "..", "src");
    for await (const file of walk(root)) {
      const text = await fs.readFile(file, "utf8");
      // Look for actual import statements, not comments.
      const importRe = /(?:^|\n)\s*import[^;]*from\s+["'][^"']*finder-data[^"']*["']/;
      if (importRe.test(text)) offenders.push(path.relative(root, file));
    }
    expect(offenders).toEqual([]);
  });

  it("has been removed from src/lib", async () => {
    await expect(fs.access(path.resolve(__dirname, "..", "src/lib/finder-data.ts"))).rejects.toThrow();
  });
});
