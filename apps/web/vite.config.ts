import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@writetogether/analytics": path.resolve(
        __dirname,
        "../../packages/analytics/src/index.ts",
      ),
      "@writetogether/schema": path.resolve(
        __dirname,
        "../../packages/schema/src/index.ts",
      ),
      "@writetogether/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}));
