import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/UberEats/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        portal: resolve(__dirname, 'index.html'),
        customer: resolve(__dirname, 'customer/index.html'),
        driver: resolve(__dirname, 'driver/index.html'),
        merchant: resolve(__dirname, 'merchant/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
});
