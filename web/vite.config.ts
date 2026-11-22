import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/UberEats/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
