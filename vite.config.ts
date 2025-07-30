import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"; // Disabled to prevent DOM conflicts

export default defineConfig({
  plugins: [
    react(),
    // runtimeErrorOverlay(), // Disabled to prevent DOM manipulation conflicts
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      overlay: false, // Disable error overlay that can cause DOM conflicts
    },
  },
  optimizeDeps: {
    exclude: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-portal',
      '@radix-ui/react-tabs',
      '@radix-ui/react-form',
      '@hookform/resolvers'
    ], // Prevent pre-bundling of problematic components
  },
});
