// Pure game logic — no DOM dependencies. Imported by game.js and test.js.

// ============================================================
// CONSTANTS
// ============================================================
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

export const ROAD_TOP = 120;
export const ROAD_BOTTOM = GAME_HEIGHT;
export const VANISH_X = GAME_WIDTH / 2;
export const ROAD_WIDTH_BOTTOM = 340;
export const ROAD_WIDTH_TOP = 40;
export const LANE_COUNT = 3;

export const PLAYER_Y = GAME_HEIGHT - 130;
export const PLAYER_CAR_W = 50;
export const PLAYER_CAR_H = 90;
export const PLAYER_MAX_SPEED = 7;

export const ENEMY_SEDAN_W = 50;
export const ENEMY_SEDAN_H = 80;
export const ENEMY_TRUCK_W = 65;
export const ENEMY_TRUCK_H = 100;
export const TRUCK_CHANCE = 0.2;

export const BASE_ENEMY_SPEED = 0.012;
export const BASE_SPAWN_INTERVAL = 70;
export const MIN_SPAWN_INTERVAL = 35;
const SPEED_SCALE_FACTOR = 1.08;
const SPAWN_REDUCE = 5;

const COLLISION_Z_MIN = 0.75;
const COLLISION_INSET = 8;

// ============================================================
// ROAD GEOMETRY
// ============================================================
export function getRoadXAtZ(z) {
  const y = ROAD_TOP + z * (ROAD_BOTTOM - ROAD_TOP);
  const w = ROAD_WIDTH_TOP + z * (ROAD_WIDTH_BOTTOM - ROAD_WIDTH_TOP);
  return { y, leftEdge: VANISH_X - w / 2, rightEdge: VANISH_X + w / 2, width: w };
}

export function getLaneX(lane, z) {
  const { leftEdge, width } = getRoadXAtZ(z);
  const laneW = width / LANE_COUNT;
  return leftEdge + laneW * (lane + 0.5);
}

export function scaleAtZ(z) {
  return 0.15 + z * 0.85;
}

// ============================================================
// POINT TRACKING (index finger tip → target X)
// ============================================================
// Returns normalized 0..1 horizontal position from index finger tip,
// mirrored for camera. Returns null when no hand detected.
export function computePointX(hand) {
  if (!hand || hand.length < 21) return null;
  const indexTip = hand[8]; // landmark 8 = index finger tip
  return 1 - indexTip.x;    // mirror for camera
}

// Map normalized 0..1 finger position to a target X on the road
export function pointXToRoadX(normX) {
  const road = getRoadXAtZ(1); // road bounds at player depth
  const margin = PLAYER_CAR_W / 2;
  return road.leftEdge + margin + normX * (road.width - PLAYER_CAR_W);
}

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
  }

  reset() {
    this.enemies = [];
    this.framesSinceSpawn = 0;
    this.spawnInterval = BASE_SPAWN_INTERVAL;
    this.enemySpeed = BASE_ENEMY_SPEED;
    this.score = 0;
  }

  scaleDifficulty(score) {
    const milestones = Math.floor(score / 10);
    this.enemySpeed = BASE_ENEMY_SPEED * Math.pow(SPEED_SCALE_FACTOR, milestones);
    this.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - milestones * SPAWN_REDUCE);
  }

  spawn() {
    const nearHorizonEnemies = this.enemies.filter(e => e.z < 0.15);
    const usedLanes = new Set(nearHorizonEnemies.map(e => e.lane));
    const availableLanes = [0, 1, 2].filter(l => !usedLanes.has(l));
    const pool = availableLanes.length > 0 ? availableLanes : [0, 1, 2];
    const lane = pool[Math.floor(Math.random() * pool.length)];

    const isTruck = Math.random() < TRUCK_CHANCE;
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.enemies.push({
      lane,
      z: 0,
      isTruck,
      color,
      width: isTruck ? ENEMY_TRUCK_W : ENEMY_SEDAN_W,
      height: isTruck ? ENEMY_TRUCK_H : ENEMY_SEDAN_H,
      scored: false,
    });
  }

  update(dt) {
    this.framesSinceSpawn += dt;
    if (this.framesSinceSpawn >= this.spawnInterval) {
      this.framesSinceSpawn = 0;
      this.spawn();
    }

    let scored = false;
    for (const e of this.enemies) {
      e.z += this.enemySpeed * dt;
      if (!e.scored && e.z > 1.1) {
        e.scored = true;
        this.score++;
        scored = true;
        if (this.score % 10 === 0) {
          this.scaleDifficulty(this.score);
        }
      }
    }

    this.enemies = this.enemies.filter(e => e.z <= 1.3);
    return scored;
  }
}

// ============================================================
// COLLISION
// ============================================================
export function checkCollision(playerX, enemies) {
  for (const e of enemies) {
    if (e.z < COLLISION_Z_MIN) continue;

    const s = scaleAtZ(e.z);
    const ew = e.width * s;
    const eh = e.height * s;
    const ex = getLaneX(e.lane, e.z) - ew / 2;
    const ey = getRoadXAtZ(e.z).y - eh;

    const px = playerX - PLAYER_CAR_W / 2 + COLLISION_INSET;
    const pw = PLAYER_CAR_W - COLLISION_INSET * 2;
    const py = PLAYER_Y - PLAYER_CAR_H + COLLISION_INSET;
    const ph = PLAYER_CAR_H - COLLISION_INSET * 2;

    const eix = ex + COLLISION_INSET;
    const eiw = ew - COLLISION_INSET * 2;
    const eiy = ey + COLLISION_INSET;
    const eih = eh - COLLISION_INSET * 2;

    if (px < eix + eiw && px + pw > eix && py < eiy + eih && py + ph > eiy) {
      return true;
    }
  }
  return false;
}
