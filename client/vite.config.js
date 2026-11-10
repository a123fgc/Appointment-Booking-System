import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      // Frontend se /api/... ki har request Express backend ko jayegi
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Staff ki profile pictures bhi backend se aayengi
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});