import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all API requests to the backend server
      '/api': 'http://localhost:4000',
    },
  },
});