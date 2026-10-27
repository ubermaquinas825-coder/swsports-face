// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { NitroConfig } from "nitro/types";

const vercelNitro = { preset: "vercel", vercel: { functions: { maxDuration: 300 } } } satisfies NitroConfig;

export default defineConfig({
  ...(process.env["VERCEL"] === "1" ? { nitro: vercelNitro } : {}),
  vite: {
    build: {
      rolldownOptions: {
        output: {
          // Preserve module execution semantics while splitting the previously
          // oversized client entry into smaller route-aware chunks.
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                name: (moduleId) => (moduleId.includes("node_modules") ? "vendor" : "app"),
                minSize: 80_000,
                maxSize: 220_000,
                entriesAware: true,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
