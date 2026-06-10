import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config
export default defineConfig({
  root: 'app/renderer',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app/renderer', import.meta.url)),
    },
  },
  build: {
    outDir: '../../.vite/renderer/main_window',
  },
  plugins: [react(), tailwindcss()],
});
