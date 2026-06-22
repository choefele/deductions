import { defineConfig } from 'vite';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfWorkerSource = path.join(
  __dirname,
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
);
const pdfWorkerDestination = path.join(
  __dirname,
  '.vite/build/pdf.worker.mjs',
);

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'app/main/index.ts',
      formats: ['es'],
      fileName: () => 'main.js',
    },
  },
  plugins: [
    {
      name: 'copy-pdfjs-worker',
      async closeBundle() {
        await copyFile(pdfWorkerSource, pdfWorkerDestination);
      },
    },
  ],
});
