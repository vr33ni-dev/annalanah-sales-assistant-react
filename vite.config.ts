import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base:
    process.env.NODE_ENV === "production"
      ? "/annalanah-sales-assistant-react/"
      : "/" /* npm run dev → base / → works fine on localhost:5002; npm run build in CI → base /<repo>/ → assets resolve correctly on GitHub Pages*/,
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
