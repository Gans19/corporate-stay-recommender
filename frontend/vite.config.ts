import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend talks to the backend via VITE_API_BASE_URL (see .env.example).
// In development we also proxy /api to the local backend for convenience.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
