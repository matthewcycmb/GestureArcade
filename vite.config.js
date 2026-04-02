import { defineConfig } from 'vite';
import { cpSync } from 'fs';

function copyGameAssets() {
  return {
    name: 'copy-game-assets',
    closeBundle() {
      const games = ['flappy-bird', 'road-racer', 'pinch-dash'];
      for (const game of games) {
        try {
          cpSync(`games/${game}/assets`, `dist/games/${game}/assets`, { recursive: true });
        } catch (e) { /* skip if no assets dir */ }
      }
    },
  };
}

export default defineConfig({
  root: '.',
  plugins: [copyGameAssets()],
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
