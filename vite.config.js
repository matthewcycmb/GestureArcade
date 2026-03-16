import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        hub: 'hub/index.html',
        flappyBird: 'games/flappy-bird/index.html',
        roadRacer: 'games/road-racer/index.html',
        fruitNinja: 'games/fruit-ninja/index.html',
        pong: 'games/pong/index.html',
        pinchDash: 'games/pinch-dash/index.html',
      },
    },
  },
  server: {
    open: '/hub/index.html',
  },
});
