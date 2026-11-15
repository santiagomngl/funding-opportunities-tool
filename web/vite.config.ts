import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { loadSiteData } from "./build/load-data.mjs";

const webDir = path.dirname(fileURLToPath(import.meta.url));
// The folder that holds data/, resources/ and templates/: the repository root.
const repoRoot = path.resolve(webDir, "..");
const dataDirs = ["data", "resources"].map((dir) => path.join(repoRoot, dir));

/**
 * Makes the agent data available to the app as `virtual:funding-data`.
 * The files are read when the site is built, so the result is a static site.
 */
function fundingData(): Plugin {
  const id = "virtual:funding-data";
  const resolved = "\0" + id;
  return {
    name: "funding-data",
    resolveId: (source) => (source === id ? resolved : undefined),
    load(moduleId) {
      if (moduleId !== resolved) return;
      const { data, warnings, counts } = loadSiteData(repoRoot);
      for (const { file, problem } of warnings) {
        console.warn(`\n[funding-data] WARNING ${file}: ${problem}`);
      }
      console.log(
        `\n[funding-data] ${counts.shown} funding opportunities on the site, ` +
          `${counts.notRelevant} not relevant left out, ${warnings.length} warning(s).`,
      );
      return `export default ${JSON.stringify(data)};`;
    },
    // Local development: reload when a data file changes.
    configureServer(server) {
      server.watcher.add(dataDirs);
      server.watcher.on("all", (_event, file) => {
        if (!dataDirs.some((dir) => file.startsWith(dir + path.sep))) return;
        const module = server.moduleGraph.getModuleById(resolved);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fundingData()],
  resolve: {
    alias: { "@": path.join(webDir, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
