import fs from 'fs';
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

import viteCompression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    viteCompression({
      algorithm: 'brotliCompress', // Use Brotli for better compression
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
    }),
    viteCompression({
      algorithm: 'gzip', // Also generate Gzip for fallback
      ext: '.gz',
      threshold: 1024,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@heroui/react', 'framer-motion'],
          'maps-vendor': ['react-simple-maps', 'd3-scale'], // Group map dependencies
        },
      },
    },
  },
})
