import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@monitor/shared": path.resolve(rootDirectory, "../shared/src/index.ts"),
      "@monitor/shared/": path.resolve(rootDirectory, "../shared/src/"),
      "@": path.resolve(rootDirectory, "./src")
    }
  },
  server: {
    port: 3000,
    host: "0.0.0.0"
  }
});

