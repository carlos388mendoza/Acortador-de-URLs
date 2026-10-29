import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const apiTarget =
    process.env.VITE_API_TARGET ||
    env.VITE_API_TARGET ||
    "http://localhost:3000";

  return {
    base: "/dashboard/",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "recharts",
                test: /node_modules[\\/]recharts[\\/]/,
                priority: 30,
              },
              {
                name: "qr-code-styling",
                test: /node_modules[\\/]qr-code-styling[\\/]/,
                priority: 30,
              },
              {
                name: "react-markdown",
                test: /node_modules[\\/]react-markdown[\\/]/,
                priority: 30,
              },
            ],
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true, secure: true },
      },
    },
  };
});
