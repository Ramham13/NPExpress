import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@workspace/db": path.resolve(import.meta.dirname, "src/test/mock-workspace-db.ts"),
      "drizzle-orm": path.resolve(import.meta.dirname, "src/test/mock-drizzle.ts"),
    },
  },
});
