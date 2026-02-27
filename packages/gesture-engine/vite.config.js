import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.js'),
      name: 'GestureEngine',
      fileName: 'gesture-engine',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@mediapipe/tasks-vision'],
    },
  },
});
