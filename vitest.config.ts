import { defineConfig } from "vitest/config";

const allTests = ["tests/**/*.test.ts"];
const sharedSupabaseTests = ["tests/**/*.supabase.test.ts"];

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          exclude: sharedSupabaseTests,
          include: allTests,
          name: "parallel",
          sequence: { groupOrder: 0 }
        }
      },
      {
        extends: true,
        test: {
          environment: "node",
          fileParallelism: false,
          include: sharedSupabaseTests,
          name: "supabase",
          sequence: { groupOrder: 1 }
        }
      }
    ]
  }
});
