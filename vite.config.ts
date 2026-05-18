import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Two build targets share this config, selected via `--mode background`:
 *   - default: bundles the React popup from `index.html` into `dist/`
 *   - background: bundles `src/background/main.ts` into `dist/background.js`
 *
 * The background target must emit a classic script (IIFE) because MV2
 * persistent background pages do not support ES modules.
 */
export default defineConfig(({ mode }) => {
  if (mode === "background") {
    return {
      build: {
        outDir: "dist",
        emptyOutDir: false,
        target: "es2020",
        lib: {
          entry: resolve(__dirname, "src/background/main.ts"),
          name: "SpawnerBackground",
          formats: ["iife"],
          fileName: () => "background.js",
        },
        rollupOptions: {
          output: { extend: true },
        },
      },
    };
  }

  return {
    plugins: [react()],
    base: "./",
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name].[ext]",
        },
      },
    },
  };
});
