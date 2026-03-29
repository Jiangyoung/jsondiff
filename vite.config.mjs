import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function resolveBase() {
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const isGithubActions = process.env.GITHUB_ACTIONS === "true";
  const isUserPage = repository.toLowerCase().endsWith(".github.io");

  if (!isGithubActions || !repository || isUserPage) {
    return "/";
  }

  return `/${repository}/`;
}

const base = resolveBase();

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "mask-icon.svg"],
      manifest: {
        id: base,
        name: "JSON Diff Modern UI",
        short_name: "JSON Diff",
        description: "对比左右 JSON 差异的现代化可安装工具。",
        theme_color: "#f3f7fb",
        background_color: "#f3f7fb",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-maskable.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,png}"],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
