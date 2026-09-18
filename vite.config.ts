import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    // Escucha en todas las interfaces de red (no solo localhost) para poder
    // probar desde el celular u otro dispositivo en la misma red Wi-Fi.
    host: true,
  },
});
