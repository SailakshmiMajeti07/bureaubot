import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/chat": "http://127.0.0.1:8000",
      "/eligibility": "http://127.0.0.1:8000",
      "/documents": "http://127.0.0.1:8000",
      "/services": "http://127.0.0.1:8000",
      "/auth": "http://127.0.0.1:8000",
      "/users": "http://127.0.0.1:8000",
      "/admin": "http://127.0.0.1:8000",
      "/applications": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});

