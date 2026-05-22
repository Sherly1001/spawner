import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Build targets, selected via `--mode`:
 *   - default (popup): bundles the React popup from `index.html` into `dist/`
 *   - background:      bundles `src/background/main.ts` → `dist/background.js`
 *   - content:         bundles `src/content/virtual-session.ts` → `dist/content/virtual-session.js`
 *   - helper:          bundles `src/content/helper.ts` → `dist/content/helper.js`
 *
 * Background and content scripts must emit classic IIFE scripts: MV2 background
 * pages do not support ESM, and content scripts run in the page context without
 * a module loader.
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
        rollupOptions: { output: { extend: true } },
      },
    };
  }

  if (mode === "content") {
    return {
      build: {
        outDir: "dist/content",
        emptyOutDir: false,
        target: "es2020",
        lib: {
          entry: resolve(__dirname, "src/content/virtual-session.ts"),
          name: "SpawnerContent",
          formats: ["iife"],
          fileName: () => "virtual-session.js",
        },
        rollupOptions: { output: { extend: true } },
      },
    };
  }

  if (mode === "helper") {
    return {
      build: {
        outDir: "dist/content",
        emptyOutDir: false,
        target: "es2020",
        lib: {
          entry: resolve(__dirname, "src/content/helper.ts"),
          name: "SpawnerHelper",
          formats: ["iife"],
          fileName: () => "helper.js",
        },
        rollupOptions: { output: { extend: true } },
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
