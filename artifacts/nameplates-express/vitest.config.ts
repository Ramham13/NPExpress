import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const projectRoot = import.meta.dirname;

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  test: {
    environment: "happy-dom",
    setupFiles: [path.resolve(projectRoot, "src/lib/__tests__/setup.ts")],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
});
