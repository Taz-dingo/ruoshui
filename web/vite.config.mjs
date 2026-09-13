import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const mediaPublicBaseUrl = 'https://pub-5fbf37dd49b94b859c13e343effd0430.r2.dev';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true
      },
      '/edge-models': {
        target: mediaPublicBaseUrl,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/edge-models/, '/models')
      },
      '/edge-media': {
        target: mediaPublicBaseUrl,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/edge-media/, '')
      }
    }
  },
  preview: {
    host: '0.0.0.0'
  }
});
