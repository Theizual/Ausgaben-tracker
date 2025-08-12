import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    // This proxy forwards API requests (`/api/*`) to the Vercel serverless functions.
    // For local development, you need to run the Vercel development server
    // (using the `vercel dev` command), which serves the functions, typically on port 3000.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['recharts']
  }
});