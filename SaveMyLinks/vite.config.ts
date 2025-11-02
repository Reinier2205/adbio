import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''), // Uncomment if your backend does not use /api prefix
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
});
