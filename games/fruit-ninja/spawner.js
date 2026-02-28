// Wave-based fruit/bomb spawning with difficulty scaling

import { Fruit } from './fruit.js';
import { Bomb } from './bomb.js';

const INITIAL_SPAWN_INTERVAL = 90; // frames
const MIN_SPAWN_INTERVAL = 30;
const BOMB_CHANCE = 0.10;

export class Spawner {
  constructor(gameWidth, gameHeight) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.fruits = [];
    this.bombs = [];
    this.timer = 0;
    this.spawnInterval = INITIAL_SPAWN_INTERVAL;
    this.spawnCount = 0;
    this.maxPerWave = 1;
  }

  start() {
    this.timer = this.spawnInterval - 30; // spawn quickly at start
  }

  update(dt) {
    this.timer += dt;

    if (this.timer >= this.spawnInterval) {
      this.timer = 0;
      this.spawnWave();
    }

    // Update all entities
    for (const fruit of this.fruits) fruit.update(dt);
    for (const bomb of this.bombs) bomb.update(dt);
  }

  spawnWave() {
    const count = 1 + Math.floor(Math.random() * this.maxPerWave);

    for (let i = 0; i < count; i++) {
      const margin = 60;
      const x = margin + Math.random() * (this.gameWidth - margin * 2);

      // Launch upward from bottom
      const vx = (Math.random() - 0.5) * 4;
      const vy = -(18 + Math.random() * 6); // strong upward arc into top half

      if (Math.random() < BOMB_CHANCE) {
        this.bombs.push(new Bomb(x, this.gameHeight + 40, vx, vy));
      } else {
        this.fruits.push(new Fruit(x, this.gameHeight + 40, vx, vy));
      }
    }

    this.spawnCount++;

    // Increase difficulty every 10 spawns
    if (this.spawnCount % 10 === 0) {
      this.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, this.spawnInterval * 0.95);
      if (this.maxPerWave < 3) this.maxPerWave++;
    }
  }

  getFruits() {
    return this.fruits;
  }

  getBombs() {
    return this.bombs;
  }

  // Remove off-screen and fully-faded entities
  cleanup(gameHeight) {
    this.fruits = this.fruits.filter(f => !f.isOffScreen(gameHeight));
    this.bombs = this.bombs.filter(b => !b.isOffScreen(gameHeight));
  }

  // Return unsliced fruits that went off the bottom (missed)
  getMissedFruits() {
    return this.fruits.filter(f => !f.sliced && f.y > this.gameHeight + f.radius);
  }

  reset() {
    this.fruits = [];
    this.bombs = [];
    this.timer = 0;
    this.spawnInterval = INITIAL_SPAWN_INTERVAL;
    this.spawnCount = 0;
    this.maxPerWave = 1;
  }
}
