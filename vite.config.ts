import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Detect Lovable environment via env var or default to local dev port
const isLovable = process.env.LOVABLE === "true" || process.env.REPL_SLUG;
const serverPort = isLovable ? 8080 : 5002;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  build: { sourcemap: mode !== "prod" },
  server: {
    host: "::",
    port: serverPort,
    // proxy /api to backend (no CORS in dev) - only active locally
    proxy: isLovable
      ? undefined
      : {
          "/api": { target: "http://localhost:8080", changeOrigin: true },
          "/auth": { target: "http://localhost:8080", changeOrigin: true },
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
