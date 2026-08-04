import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Las rutas ya se dividen por código (React.lazy en App.jsx). Esto
    // complementa eso separando las librerías pesadas compartidas por
    // varias rutas (ej. xlsx lo usan Mantenimientos, Combustible,
    // Histórico y Auditoría) en un chunk propio, para que el navegador
    // lo descargue y cachee una sola vez en vez de duplicarlo dentro
    // de cada chunk de ruta.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("qrcode.react")) return "vendor-qrcode";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
