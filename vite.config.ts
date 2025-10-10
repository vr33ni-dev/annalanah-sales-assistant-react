import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || "/", // Set VITE_BASE_PATH="/<repo>/" in build step for GH Pages.
  server: {
    host: "::",
    port: 5002,
    // proxy /api to backend (no CORS in dev)
    proxy: {
      "/auth": "http://localhost:8080",
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        // secure: false,
        // optional: rewrite if your backend doesn't include /api prefix
        // rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
