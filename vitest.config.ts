import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@monitor/shared",
        replacement: path.resolve(__dirname, "packages/shared/src/index.ts")
      },
      {
        find: /^@monitor\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, "packages/shared/src/$1")
      }
    ]
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000
  }
});
