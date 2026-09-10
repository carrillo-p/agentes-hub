import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Durante desarrollo local, el frontend (puerto 5173) redirige las
// llamadas a /api hacia el runtime local de Azure Functions (func start,
// puerto 7071 por defecto), para no tener que hardcodear la URL nunca.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
});
