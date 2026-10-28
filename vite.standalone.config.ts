import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The active app needs only React and bundled data. Keep this portable build
// independent of the Sites metadata, Vinext server and Cloudflare bindings.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  build: {
    outDir: "dist/standalone",
    emptyOutDir: true,
  },
});
