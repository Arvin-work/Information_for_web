import { defineConfig } from 'astro/config';
import { apiProxy } from './scripts/dev-proxy.mjs';
import preserveHtmlPaths from './scripts/preserve-html-paths.mjs';

export default defineConfig({
  site: 'https://www.altfork.com',
  output: 'static',
  integrations: [preserveHtmlPaths()],
  compressHTML: false,
  server: { host: 'localhost', port: 4321 },
  build: { format: 'directory' },
  vite: {
    server: { strictPort: true, proxy: { '/api/': apiProxy } },
    preview: { port: 4321, strictPort: true, proxy: { '/api/': apiProxy } },
  },
});
