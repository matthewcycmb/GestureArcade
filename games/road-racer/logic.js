// Pure game logic — no DOM dependencies. Imported by game.js and test.js.

// ============================================================
// CONSTANTS
// ============================================================
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// The ocean occupies the bottom ~22% of the screen — off limits.
export const OCEAN_Y = Math.floor(GAME_HEIGHT * 0.78);
const SKY_HEIGHT = OCEAN_Y;

// Sky lanes — birds fly in horizontal lanes in the sky area only.
export const LANE_COUNT = 3;
const LANE_MARGIN = 40;
export const LANE_HEIGHT = (SKY_HEIGHT - LANE_MARGIN * 2) / LANE_COUNT;

export const PLAYER_X = 160;
export const PLAYER_W = 90;
export const PLAYER_H = 70;
export const PLAYER_MAX_SPEED = 8;
export const MAX_HEALTH = 3;
export const INVINCIBILITY_FRAMES = 90; // 1.5 seconds at 60fps

export const ENEMY_BIRD_W = 70;
export const ENEMY_BIRD_H = 55;
export const ENEMY_BIG_W = 90;
export const ENEMY_BIG_H = 70;
export const BIG_CHANCE = 0.2;

export const COIN_SIZE = 30;
export const COIN_SPEED = 3;
export const COIN_SPAWN_INTERVAL = 90; // frames between coin spawns
export const COIN_POINTS = 5;

export const BASE_ENEMY_SPEED = 4;
export const BASE_SPAWN_INTERVAL = 60;
export const MIN_SPAWN_INTERVAL = 25;
const SPEED_SCALE_FACTOR = 1.08;
const SPAWN_REDUCE = 5;

const COLLISION_INSET = 12;

// ============================================================
// LANE GEOMETRY
// ============================================================
export function getLaneY(lane) {
  return LANE_MARGIN + LANE_HEIGHT * (lane + 0.5);
}

// ============================================================
// POINT TRACKING (index finger tip → target Y)
// ============================================================
export function computePointY(hand) {
  if (!hand || hand.length < 21) return null;
  const indexTip = hand[8];
  return indexTip.y;
}

export function pointYToGameY(normY) {
  const margin = PLAYER_H / 2;
  const maxY = OCEAN_Y - margin;
  return margin + normY * (maxY - margin);
}

// ============================================================
// WAVE PATTERNS
// ============================================================
const WAVE_PATTERNS = [
  // V-shape: 3 planes in a V formation
  { name: 'v-shape', enemies: [
    { lane: 1, xOffset: 0 },
    { lane: 0, xOffset: 80 },
    { lane: 2, xOffset: 80 },
  ]},
  // Wall with gap: 2 planes blocking 2 lanes, one lane open
  { name: 'wall-gap', generate() {
    const gap = Math.floor(Math.random() * 3);
    return [0, 1, 2].filter(l => l !== gap).map(l => ({ lane: l, xOffset: 0 }));
  }},
  // Zigzag: alternating lanes staggered
  { name: 'zigzag', enemies: [
    { lane: 0, xOffset: 0 },
    { lane: 2, xOffset: 60 },
    { lane: 0, xOffset: 120 },
    { lane: 2, xOffset: 180 },
  ]},
  // Column: all 3 lanes at once (must dodge through timing)
  { name: 'column', enemies: [
    { lane: 0, xOffset: 0 },
    { lane: 1, xOffset: 0 },
    // Leave one lane open
  ], generate() {
    const open = Math.floor(Math.random() * 3);
    return [0, 1, 2].filter(l => l !== open).map(l => ({ lane: l, xOffset: 0 }));
  }},
  // Staircase: diagonal line
  { name: 'staircase', enemies: [
    { lane: 0, xOffset: 0 },
    { lane: 1, xOffset: 70 },
    { lane: 2, xOffset: 140 },
  ]},
];

// ============================================================
// ENEMY MANAGER
// ============================================================
export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.framesSinceSpawn = 0;
    this.spawnInterval = BASE_SPAWN_INTERVAL;
    this.enemySpeed = BASE_ENEMY_SPEED;
    this.score = 0;
    this.waveCounter = 0; // counts spawns, triggers wave pattern every N spawns
  }

  reset() {
    this.enemies = [];
    this.framesSinceSpawn = 0;
    this.spawnInterval = BASE_SPAWN_INTERVAL;
    this.enemySpeed = BASE_ENEMY_SPEED;
    this.score = 0;
    this.waveCounter = 0;
  }

  scaleDifficulty(score) {
    const milestones = Math.floor(score / 10);
    this.enemySpeed = BASE_ENEMY_SPEED * Math.pow(SPEED_SCALE_FACTOR, milestones);
    this.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - milestones * SPAWN_REDUCE);
    return true; // signals speed-up occurred
  }

  spawnSingle() {
    const nearEdgeEnemies = this.enemies.filter(e => e.x > GAME_WIDTH - 150);
    const usedLanes = new Set(nearEdgeEnemies.map(e => e.lane));
    const availableLanes = [0, 1, 2].filter(l => !usedLanes.has(l));
    const pool = availableLanes.length > 0 ? availableLanes : [0, 1, 2];
    const lane = pool[Math.floor(Math.random() * pool.length)];

    const isBig = Math.random() < BIG_CHANCE;

    this.enemies.push({
      lane,
      x: GAME_WIDTH + 50,
      y: getLaneY(lane),
      isBig,
      width: isBig ? ENEMY_BIG_W : ENEMY_BIRD_W,
      height: isBig ? ENEMY_BIG_H : ENEMY_BIRD_H,
      scored: false,
    });
  }

  spawnWave() {
    const pattern = WAVE_PATTERNS[Math.floor(Math.random() * WAVE_PATTERNS.length)];
    const entries = pattern.generate ? pattern.generate() : pattern.enemies;

    for (const entry of entries) {
      this.enemies.push({
        lane: entry.lane,
        x: GAME_WIDTH + 50 + (entry.xOffset || 0),
        y: getLaneY(entry.lane),
        isBig: false,
        width: ENEMY_BIRD_W,
        height: ENEMY_BIRD_H,
        scored: false,
      });
    }
  }

  spawn() {
    this.waveCounter++;
    // Every 5th spawn is a wave pattern (after score 10)
    if (this.waveCounter % 5 === 0 && this.score >= 10) {
      this.spawnWave();
    } else {
      this.spawnSingle();
    }
  }

  update(dt) {
    this.framesSinceSpawn += dt;
    if (this.framesSinceSpawn >= this.spawnInterval) {
      this.framesSinceSpawn = 0;
      this.spawn();
    }

    let scored = false;
    let speedUp = false;
    for (const e of this.enemies) {
      e.x -= this.enemySpeed * dt;
      if (!e.scored && e.x < PLAYER_X - 50) {
        e.scored = true;
        this.score++;
        scored = true;
        if (this.score % 10 === 0) {
          speedUp = this.scaleDifficulty(this.score);
        }
      }
    }

    this.enemies = this.enemies.filter(e => e.x > -100);
    return { scored, speedUp };
  }
}

// ============================================================
// COIN MANAGER
// ============================================================
export class CoinManager {
  constructor() {
    this.coins = [];
    this.framesSinceSpawn = 0;
  }

  reset() {
    this.coins = [];
    this.framesSinceSpawn = 0;
  }

  spawn() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    this.coins.push({
      x: GAME_WIDTH + 20,
      y: getLaneY(lane) + (Math.random() - 0.5) * LANE_HEIGHT * 0.5,
      collected: false,
    });
  }

  update(dt) {
    this.framesSinceSpawn += dt;
    if (this.framesSinceSpawn >= COIN_SPAWN_INTERVAL) {
      this.framesSinceSpawn = 0;
      this.spawn();
    }

    for (const c of this.coins) {
      c.x -= COIN_SPEED * dt;
    }

    this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
  }
}

// ============================================================
// COLLISION
// ============================================================
export function checkCollision(playerY, enemies) {
  for (const e of enemies) {
    if (e.x > PLAYER_X + PLAYER_W || e.x + e.width < PLAYER_X - PLAYER_W / 2) continue;

    const px = PLAYER_X - PLAYER_W / 2 + COLLISION_INSET;
    const pw = PLAYER_W - COLLISION_INSET * 2;
    const py = playerY - PLAYER_H / 2 + COLLISION_INSET;
    const ph = PLAYER_H - COLLISION_INSET * 2;

    const ex = e.x - e.width / 2 + COLLISION_INSET;
    const ew = e.width - COLLISION_INSET * 2;
    const ey = e.y - e.height / 2 + COLLISION_INSET;
    const eh = e.height - COLLISION_INSET * 2;

    if (px < ex + ew && px + pw > ex && py < ey + eh && py + ph > ey) {
      return true;
    }
  }
  return false;
}

export function checkCoinCollision(playerY, coins) {
  const collected = [];
  for (const c of coins) {
    if (c.collected) continue;
    const dx = Math.abs(PLAYER_X - c.x);
    const dy = Math.abs(playerY - c.y);
    if (dx < (PLAYER_W / 2 + COIN_SIZE / 2) && dy < (PLAYER_H / 2 + COIN_SIZE / 2)) {
      c.collected = true;
      collected.push(c);
    }
  }
  return collected;
}
