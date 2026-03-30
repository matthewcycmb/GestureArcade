import { describe, it, expect, beforeEach } from 'vitest';
import {
  computePointY, pointYToGameY, EnemyManager, CoinManager,
  checkCollision, checkCoinCollision,
  getLaneY, PLAYER_X, PLAYER_W, PLAYER_H, GAME_WIDTH, GAME_HEIGHT,
  ENEMY_BIRD_W, ENEMY_BIRD_H, OCEAN_Y, MAX_HEALTH, COIN_SIZE, COIN_POINTS,
} from './logic.js';

// --- Helper ---
function lm(x, y) { return { x, y, z: 0 }; }

function makeHand(indexTipX, indexTipY) {
  const hand = [];
  for (let i = 0; i < 21; i++) hand.push(lm(0.5, 0.5));
  hand[8] = lm(indexTipX, indexTipY);
  return hand;
}

// ============================================================
// POINT TRACKING
// ============================================================
describe('Point Tracking', () => {
  it('returns null when no landmarks', () => {
    expect(computePointY(null)).toBe(null);
    expect(computePointY([])).toBe(null);
  });

  it('returns y position from index tip', () => {
    const hand = makeHand(0.5, 0.3);
    expect(computePointY(hand)).toBeCloseTo(0.3);
  });

  it('pointYToGameY maps 0 to top, 1 to ocean line', () => {
    const top = pointYToGameY(0);
    const bottom = pointYToGameY(1);
    expect(top).toBeLessThan(bottom);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(OCEAN_Y);
  });

  it('pointYToGameY maps 0.5 to roughly center of sky area', () => {
    const center = pointYToGameY(0.5);
    expect(center).toBeCloseTo(OCEAN_Y / 2, -1);
  });
});

// ============================================================
// ENEMY MANAGER
// ============================================================
describe('EnemyManager', () => {
  let em;
  beforeEach(() => { em = new EnemyManager(); });

  it('initializes with empty enemies and zero score', () => {
    expect(em.enemies.length).toBe(0);
    expect(em.score).toBe(0);
  });

  it('spawns enemies off-screen right', () => {
    em.spawnSingle();
    expect(em.enemies.length).toBe(1);
    expect(em.enemies[0].x).toBeGreaterThan(GAME_WIDTH);
  });

  it('moves enemies toward player on update', () => {
    em.spawnSingle();
    const initialX = em.enemies[0].x;
    em.spawnInterval = 9999;
    em.update(1);
    expect(em.enemies[0].x).toBeLessThan(initialX);
  });

  it('scores when enemy passes player', () => {
    em.spawnSingle();
    em.enemies[0].x = PLAYER_X - 49;
    em.spawnInterval = 9999;
    em.update(1);
    expect(em.score).toBe(1);
  });

  it('removes enemies past left edge', () => {
    em.spawnSingle();
    em.enemies[0].x = -99;
    em.spawnInterval = 9999;
    em.update(1);
    expect(em.enemies.length).toBe(0);
  });

  it('does not block all 3 lanes simultaneously', () => {
    em.enemies.push({ lane: 0, x: GAME_WIDTH + 10, y: getLaneY(0), isBig: false, width: ENEMY_BIRD_W, height: ENEMY_BIRD_H, scored: false });
    em.enemies.push({ lane: 1, x: GAME_WIDTH + 10, y: getLaneY(1), isBig: false, width: ENEMY_BIRD_W, height: ENEMY_BIRD_H, scored: false });
    em.spawnSingle();
    const lastEnemy = em.enemies[em.enemies.length - 1];
    expect(lastEnemy.lane).toBe(2);
  });

  it('resets state correctly', () => {
    em.spawnSingle();
    em.score = 15;
    em.enemySpeed = 10;
    em.reset();
    expect(em.enemies.length).toBe(0);
    expect(em.score).toBe(0);
    expect(em.enemySpeed).toBe(4);
  });

  it('update returns scored and speedUp flags', () => {
    em.spawnSingle();
    em.spawnInterval = 9999;
    const result = em.update(1);
    expect(result).toHaveProperty('scored');
    expect(result).toHaveProperty('speedUp');
  });

  it('signals speedUp at score milestones', () => {
    em.score = 9;
    em.spawnSingle();
    em.enemies[0].x = PLAYER_X - 49;
    em.spawnInterval = 9999;
    const result = em.update(1);
    expect(result.scored).toBe(true);
    expect(result.speedUp).toBe(true);
  });

  it('spawns wave patterns after score 10', () => {
    em.score = 10;
    em.waveCounter = 4; // next spawn will be 5th (wave)
    em.spawn();
    // Wave patterns spawn 2+ enemies
    expect(em.enemies.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// COIN MANAGER
// ============================================================
describe('CoinManager', () => {
  let cm;
  beforeEach(() => { cm = new CoinManager(); });

  it('initializes empty', () => {
    expect(cm.coins.length).toBe(0);
  });

  it('spawns coins off-screen right', () => {
    cm.spawn();
    expect(cm.coins.length).toBe(1);
    expect(cm.coins[0].x).toBeGreaterThan(GAME_WIDTH);
  });

  it('moves coins left on update', () => {
    cm.spawn();
    const initialX = cm.coins[0].x;
    cm.framesSinceSpawn = 0; // prevent extra spawns
    cm.update(1);
    expect(cm.coins[0].x).toBeLessThan(initialX);
  });

  it('removes coins past left edge', () => {
    cm.spawn();
    cm.coins[0].x = -49;
    cm.update(1);
    expect(cm.coins.length).toBe(0);
  });

  it('removes collected coins', () => {
    cm.spawn();
    cm.coins[0].collected = true;
    cm.update(1);
    expect(cm.coins.length).toBe(0);
  });

  it('resets correctly', () => {
    cm.spawn();
    cm.reset();
    expect(cm.coins.length).toBe(0);
    expect(cm.framesSinceSpawn).toBe(0);
  });
});

// ============================================================
// COLLISION
// ============================================================
describe('Collision', () => {
  it('detects collision when enemy overlaps player', () => {
    const enemies = [{
      lane: 1, x: PLAYER_X, y: GAME_HEIGHT / 3,
      isBig: false, width: ENEMY_BIRD_W, height: ENEMY_BIRD_H, scored: false,
    }];
    expect(checkCollision(GAME_HEIGHT / 3, enemies)).toBe(true);
  });

  it('no collision when enemy is far away horizontally', () => {
    const enemies = [{
      lane: 1, x: GAME_WIDTH - 100, y: GAME_HEIGHT / 3,
      isBig: false, width: ENEMY_BIRD_W, height: ENEMY_BIRD_H, scored: false,
    }];
    expect(checkCollision(GAME_HEIGHT / 3, enemies)).toBe(false);
  });

  it('no collision when player is in different lane vertically', () => {
    const enemies = [{
      lane: 2, x: PLAYER_X, y: OCEAN_Y - 50,
      isBig: false, width: ENEMY_BIRD_W, height: ENEMY_BIRD_H, scored: false,
    }];
    expect(checkCollision(50, enemies)).toBe(false);
  });
});

// ============================================================
// COIN COLLISION
// ============================================================
describe('Coin Collision', () => {
  it('detects coin pickup when overlapping', () => {
    const coins = [{ x: PLAYER_X, y: 200, collected: false }];
    const collected = checkCoinCollision(200, coins);
    expect(collected.length).toBe(1);
    expect(coins[0].collected).toBe(true);
  });

  it('does not collect distant coins', () => {
    const coins = [{ x: GAME_WIDTH - 100, y: 200, collected: false }];
    const collected = checkCoinCollision(200, coins);
    expect(collected.length).toBe(0);
  });

  it('does not re-collect already collected coins', () => {
    const coins = [{ x: PLAYER_X, y: 200, collected: true }];
    const collected = checkCoinCollision(200, coins);
    expect(collected.length).toBe(0);
  });
});

// ============================================================
// DIFFICULTY SCALING
// ============================================================
describe('Difficulty', () => {
  it('increases speed at milestones', () => {
    const em = new EnemyManager();
    const initialSpeed = em.enemySpeed;
    em.scaleDifficulty(10);
    expect(em.enemySpeed).toBeGreaterThan(initialSpeed);
  });

  it('decreases spawn interval at milestones', () => {
    const em = new EnemyManager();
    const initialInterval = em.spawnInterval;
    em.scaleDifficulty(10);
    expect(em.spawnInterval).toBeLessThan(initialInterval);
  });

  it('respects minimum spawn interval', () => {
    const em = new EnemyManager();
    em.scaleDifficulty(200);
    expect(em.spawnInterval).toBeGreaterThanOrEqual(25);
  });

  it('speed scales exponentially', () => {
    const em = new EnemyManager();
    em.scaleDifficulty(10);
    const speed10 = em.enemySpeed;
    em.scaleDifficulty(20);
    const speed20 = em.enemySpeed;
    const ratio1 = speed10 / 4;
    const ratio2 = speed20 / speed10;
    expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.01);
  });
});

// ============================================================
// STATE MACHINE
// ============================================================
describe('State Machine', () => {
  function createStateMachine() {
    let state = 'MENU';
    let gameOverCooldown = 0;
    let health = MAX_HEALTH;
    let invincibilityTimer = 0;

    return {
      get state() { return state; },
      set state(s) { state = s; },
      get health() { return health; },
      get invincibilityTimer() { return invincibilityTimer; },
      onStart() {
        if (state === 'MENU') { state = 'PLAYING'; }
        else if (state === 'GAME_OVER' && gameOverCooldown <= 0) { state = 'PLAYING'; health = MAX_HEALTH; }
      },
      onHit() {
        if (invincibilityTimer > 0) return;
        health--;
        if (health <= 0) { state = 'GAME_OVER'; gameOverCooldown = 30; }
        else { invincibilityTimer = 90; }
      },
      tickCooldown(dt) {
        if (gameOverCooldown > 0) gameOverCooldown -= dt;
        if (invincibilityTimer > 0) invincibilityTimer -= dt;
      },
    };
  }

  it('MENU -> PLAYING on start', () => {
    const sm = createStateMachine();
    sm.onStart();
    expect(sm.state).toBe('PLAYING');
  });

  it('first hit reduces health but stays PLAYING', () => {
    const sm = createStateMachine();
    sm.onStart();
    sm.onHit();
    expect(sm.state).toBe('PLAYING');
    expect(sm.health).toBe(MAX_HEALTH - 1);
  });

  it('grants invincibility after hit', () => {
    const sm = createStateMachine();
    sm.onStart();
    sm.onHit();
    expect(sm.invincibilityTimer).toBe(90);
  });

  it('ignores hits during invincibility', () => {
    const sm = createStateMachine();
    sm.onStart();
    sm.onHit();
    sm.onHit(); // should be ignored
    expect(sm.health).toBe(MAX_HEALTH - 1);
  });

  it('third hit triggers GAME_OVER', () => {
    const sm = createStateMachine();
    sm.onStart();
    sm.onHit();
    sm.tickCooldown(100); // clear invincibility
    sm.onHit();
    sm.tickCooldown(100);
    sm.onHit();
    expect(sm.state).toBe('GAME_OVER');
    expect(sm.health).toBe(0);
  });

  it('GAME_OVER -> PLAYING after cooldown restores health', () => {
    const sm = createStateMachine();
    sm.onStart();
    sm.onHit(); sm.tickCooldown(100);
    sm.onHit(); sm.tickCooldown(100);
    sm.onHit();
    expect(sm.state).toBe('GAME_OVER');
    sm.tickCooldown(31);
    sm.onStart();
    expect(sm.state).toBe('PLAYING');
    expect(sm.health).toBe(MAX_HEALTH);
  });

  it('restart blocked during cooldown', () => {
    const sm = createStateMachine();
    sm.onStart();
    sm.onHit(); sm.tickCooldown(100);
    sm.onHit(); sm.tickCooldown(100);
    sm.onHit();
    sm.tickCooldown(15);
    sm.onStart();
    expect(sm.state).toBe('GAME_OVER');
  });
});
