import { defineConfig } from "vitest/config";
import path from "path";

const projectRoot = import.meta.dirname;

export default defineConfig({
  root: projectRoot,
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@workspace/db": path.resolve(projectRoot, "src/test/mock-workspace-db.ts"),
      "drizzle-orm": path.resolve(projectRoot, "src/test/mock-drizzle.ts"),
    },
  },
});
