import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The admin API only answers browser requests from origins listed in
// PLAINMOTE_ADMIN_ORIGINS, so the dev server stays on a fixed port.
// BASE_PATH serves the page from a sub-path, e.g. /plainmote-admin/ on
// GitHub Pages; it defaults to the root.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { port: 5173, strictPort: true },
})
