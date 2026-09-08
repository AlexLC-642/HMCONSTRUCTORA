import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
    // bcrypt at cost 12 (see src/modules/auth/application/password.ts) is
    // deliberately slow, and running many test files in parallel workers can
    // starve a single bcrypt call past the 5s default under load - raise the
    // ceiling rather than weaken the hash cost just to keep tests fast.
    testTimeout: 15000
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});