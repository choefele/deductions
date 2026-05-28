import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  root: 'app/renderer',
  build: {
    outDir: '../../.vite/renderer/main_window',
  },
  plugins: [react()],
});
