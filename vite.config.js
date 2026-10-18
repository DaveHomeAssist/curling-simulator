import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// Static Pages cannot set route-specific HTTP headers. Apply supported document
// policy only to the production Horseshoes entry; preserve Curling and dev HMR.
const horseshoesPolicy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";

export default defineConfig({
  plugins: [{
    name: 'horseshoes-document-policy',
    apply: 'build',
    transformIndexHtml(html, context) {
      if (!context.filename.endsWith('/horseshoes.html')) return html;
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: horseshoesPolicy }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' }];
    },
  }],
  server: {
    host: '127.0.0.1',
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
