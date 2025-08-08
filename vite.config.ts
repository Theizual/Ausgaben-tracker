import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@/shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@/features': fileURLToPath(new URL('./features', import.meta.url)),
      '@/contexts': fileURLToPath(new URL('./contexts', import.meta.url)),
      '@/processes': fileURLToPath(new URL('./processes', import.meta.url)),
    }
  }
})