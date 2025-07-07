import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
});
