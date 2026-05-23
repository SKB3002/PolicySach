import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: "default",
    // Vitest 4 worker-isolation bug surfaces as "Cannot read properties of
    // undefined (reading 'config')" when 2+ files run in parallel workers.
    // Disabling isolation makes all files share one runner — fine for pure-
    // function tests like ours.
    isolate: false,
  },
});
