import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const functionPath = join(process.cwd(), "supabase/functions/trusted-result-import/index.ts");
const importMapPath = join(process.cwd(), "supabase/functions/import_map.json");

describe("Milestone 7 trusted result import Edge Function", () => {
  it("wraps the trusted runtime without exposing service-role wiring to the mobile client", () => {
    expect(existsSync(functionPath)).toBe(true);
    const source = readFileSync(functionPath, "utf8");

    expect(source).toContain("Deno.serve");
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain("handleTrustedScoringRuntimeRequest");
    expect(source).toContain("createTrustedScoringRuntimeDependencies");
    expect(source).not.toContain("EXPO_PUBLIC_SUPABASE");
  });

  it("configures Deno import mapping for shared server modules only", () => {
    expect(existsSync(importMapPath)).toBe(true);
    const importMap = JSON.parse(readFileSync(importMapPath, "utf8")) as {
      imports: Record<string, string>;
    };

    expect(importMap.imports["@/"]).toBe("../../src/");
    expect(importMap.imports["@supabase/supabase-js"]).toContain("npm:@supabase/supabase-js");
    expect(importMap.imports.zod).toContain("npm:zod");
  });

  it("keeps runtime folders ignored and service-role secrets out of client source", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");

    expect(gitignore).toContain("dist/");
    expect(gitignore).toContain("supabase/.temp/");
    expect(gitignore).toContain("supabase/.branches/");

    const clientSource = listSourceFiles([
      "app",
      "src/components",
      "src/features",
      "src/services",
      "src/state"
    ])
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(clientSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(clientSource).not.toContain("serviceRoleKey");
  });
});

function listSourceFiles(relativeRoots: string[]): string[] {
  return relativeRoots.flatMap((root) => {
    const absoluteRoot = join(process.cwd(), root);

    if (!existsSync(absoluteRoot)) {
      return [];
    }

    return walk(absoluteRoot);
  });
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return walk(path);
    }

    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}
