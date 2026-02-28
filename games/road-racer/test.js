import { describe, it, expect, beforeEach } from 'vitest';
import { computePointX, pointXToRoadX, EnemyManager, checkCollision, getRoadXAtZ, PLAYER_CAR_W } from './logic.js';

// --- Helper: create a landmark point ---
function lm(x, y) {
  return { x, y, z: 0 };
}

// --- Helper: create a 21-landmark hand with index tip at given position ---
function makeHand(indexTipX, indexTipY) {
  const hand = [];
  for (let i = 0; i < 21; i++) {
    hand.push(lm(0.5, 0.5)); // filler
  }
  hand[8] = lm(indexTipX, indexTipY); // index finger tip
  return hand;
}

// ============================================================
// POINT TRACKING TESTS
// ============================================================
describe('Point Tracking', () => {
  it('returns null when no landmarks', () => {
    expect(computePointX(null)).toBe(null);
    expect(computePointX([])).toBe(null);
  });

  it('returns mirrored x position from index tip', () => {
    // Index tip at camera x=0.3 → mirrored = 0.7
    const hand = makeHand(0.3, 0.5);
    expect(computePointX(hand)).toBeCloseTo(0.7);
  });

  it('finger on left of camera maps to right side (mirror)', () => {
    const hand = makeHand(0.8, 0.5); // far right in camera = left screen
    expect(computePointX(hand)).toBeCloseTo(0.2);
  });

  it('finger at center maps to ~0.5', () => {
    const hand = makeHand(0.5, 0.5);
    expect(computePointX(hand)).toBeCloseTo(0.5);
  });

  it('pointXToRoadX maps 0 to left edge, 1 to right edge', () => {
    const road = getRoadXAtZ(1);
    const margin = PLAYER_CAR_W / 2;
    const left = pointXToRoadX(0);
    const right = pointXToRoadX(1);
    expect(left).toBeCloseTo(road.leftEdge + margin);
    expect(right).toBeCloseTo(road.rightEdge - margin);
  });

  it('pointXToRoadX maps 0.5 to road center', () => {
    const road = getRoadXAtZ(1);
    const center = pointXToRoadX(0.5);
    const roadCenter = (road.leftEdge + road.rightEdge) / 2;
    expect(center).toBeCloseTo(roadCenter);
  });
});

// ============================================================
// ENEMY MANAGER TESTS
// ============================================================
describe('EnemyManager', () => {
  let em;

  beforeEach(() => {
    em = new EnemyManager();
  });

  it('initializes with empty enemies and zero score', () => {
    expect(em.enemies.length).toBe(0);
    expect(em.score).toBe(0);
  });

  it('spawns enemies at z=0', () => {
    em.spawn();
    expect(em.enemies.length).toBe(1);
    expect(em.enemies[0].z).toBe(0);
    expect([0, 1, 2]).toContain(em.enemies[0].lane);
  });

  it('moves enemies toward player on update', () => {
    em.spawn();
    const initialZ = em.enemies[0].z;
    em.spawnInterval = 9999; // prevent auto-spawn
    em.update(1);
    expect(em.enemies[0].z).toBeGreaterThan(initialZ);
  });

  it('scores when enemy passes z > 1.1', () => {
    em.spawn();
    em.enemies[0].z = 1.09;
    em.spawnInterval = 9999;
    em.update(10); // push past 1.1
    expect(em.score).toBe(1);
  });

  it('removes enemies past z > 1.3', () => {
    em.spawn();
    em.enemies[0].z = 1.29;
    em.spawnInterval = 9999;
    em.update(10); // push past 1.3
    expect(em.enemies.length).toBe(0);
  });

  it('does not block all 3 lanes simultaneously', () => {
    // Fill lanes 0 and 1 near horizon
    em.enemies.push({ lane: 0, z: 0.05, isTruck: false, color: '#f00', width: 50, height: 80, scored: false });
    em.enemies.push({ lane: 1, z: 0.05, isTruck: false, color: '#0f0', width: 50, height: 80, scored: false });
    em.spawn();
    // The new spawn should prefer lane 2 (the only unblocked lane)
    const lastEnemy = em.enemies[em.enemies.length - 1];
    expect(lastEnemy.lane).toBe(2);
  });

  it('resets state correctly', () => {
    em.spawn();
    em.score = 15;
    em.enemySpeed = 0.05;
    em.reset();
    expect(em.enemies.length).toBe(0);
    expect(em.score).toBe(0);
    expect(em.enemySpeed).toBe(0.012);
  });
});

// ============================================================
// COLLISION TESTS
// ============================================================
describe('Collision', () => {
  it('detects collision when enemy overlaps player', () => {
    // Player at center (240), enemy in lane 1 (center) at z=0.85 (overlaps player Y)
    const enemies = [{
      lane: 1, z: 0.85, isTruck: false, color: '#f00',
      width: 50, height: 80, scored: false,
    }];
    const result = checkCollision(240, enemies);
    expect(result).toBe(true);
  });

  it('no collision when enemy is far away (z < 0.75)', () => {
    const enemies = [{
      lane: 1, z: 0.5, isTruck: false, color: '#f00',
      width: 50, height: 80, scored: false,
    }];
    expect(checkCollision(240, enemies)).toBe(false);
  });

  it('no collision when player is in different lane', () => {
    // Player far left, enemy in right lane at close z
    const enemies = [{
      lane: 2, z: 0.95, isTruck: false, color: '#f00',
      width: 50, height: 80, scored: false,
    }];
    // Player X at far left of road
    expect(checkCollision(100, enemies)).toBe(false);
  });
});

// ============================================================
// DIFFICULTY SCALING TESTS
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
    em.scaleDifficulty(200); // very high score
    expect(em.spawnInterval).toBeGreaterThanOrEqual(35);
  });

  it('speed scales exponentially', () => {
    const em = new EnemyManager();
    em.scaleDifficulty(10);
    const speed10 = em.enemySpeed;
    em.scaleDifficulty(20);
    const speed20 = em.enemySpeed;
    // Exponential: speed20/speed10 should equal speed10/baseSpeed
    const ratio1 = speed10 / 0.012;
    const ratio2 = speed20 / speed10;
    expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.001);
  });
});

// ============================================================
// STATE MACHINE TESTS
// ============================================================
describe('State Machine', () => {
  function createStateMachine() {
    let state = 'MENU';
    let gameOverCooldown = 0;

    return {
      get state() { return state; },
      set state(s) { state = s; },
      get gameOverCooldown() { return gameOverCooldown; },
      onStart() {
        if (state === 'MENU') {
          state = 'PLAYING';
        } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
          state = 'PLAYING';
        }
      },
      triggerGameOver() {
        state = 'GAME_OVER';
        gameOverCooldown = 30;
      },
      tickCooldown(dt) {
        if (gameOverCooldown > 0) gameOverCooldown -= dt;
      },
    };
  }

  it('MENU -> PLAYING on start', () => {
    const sm = createStateMachine();
    sm.onStart();
    expect(sm.state).toBe('PLAYING');
  });

  it('collision triggers GAME_OVER', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    sm.triggerGameOver();
    expect(sm.state).toBe('GAME_OVER');
  });

  it('GAME_OVER -> PLAYING after cooldown', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    sm.triggerGameOver();
    sm.onStart(); // blocked during cooldown
    expect(sm.state).toBe('GAME_OVER');
    sm.tickCooldown(31);
    sm.onStart();
    expect(sm.state).toBe('PLAYING');
  });

  it('restart blocked during cooldown', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    sm.triggerGameOver();
    sm.tickCooldown(15); // only halfway
    sm.onStart();
    expect(sm.state).toBe('GAME_OVER');
  });
});
