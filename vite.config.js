import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        curling: `${projectRoot}index.html`,
        horseshoes: `${projectRoot}horseshoes.html`,
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
