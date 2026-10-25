import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'worker' } })],
  environments: {
    worker: { build: { sourcemap: true } },
  },
  server: {
    host: '0.0.0.0',
  },
});
