
import { defineConfig } from 'vite';

export default defineConfig({
  // This ensures all asset paths are prefixed with /InnoFix/
  base: '/InnoFix/',
  build: {
    outDir: 'dist',
  }
});
