import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'app/main/index.ts',
      formats: ['es'],
      fileName: () => 'main.js',
    },
  },
});
