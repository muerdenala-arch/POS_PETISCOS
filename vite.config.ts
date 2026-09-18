import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-petiscos.jpeg', 'logo-petiscos.jpeg'],
      manifest: {
        name: 'Petiscos POS',
        short_name: 'Petiscos',
        description: 'Sistema POS de Petiscos',
        theme_color: '#137F48',
        background_color: '#137F48',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'es-BO',
        icons: [
          {
            src: '/favicon-petiscos.jpeg',
            sizes: '48x48',
            type: 'image/jpeg'
          },
          {
            src: '/logo-petiscos.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/logo-petiscos.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    host: true,
  },
});
