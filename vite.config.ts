import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Replace this with your actual repository name
const REPO_NAME = "good-works-stopwatch";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  base: `/${REPO_NAME}/`, // This is critical for GitHub Pages
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
  },
});
