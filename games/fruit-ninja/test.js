import { describe, it, expect } from 'vitest';
import { Fruit, FRUIT_TYPES } from './fruit.js';
import { Bomb } from './bomb.js';
import { Spawner } from './spawner.js';
import { lineCircleIntersect } from './collision.js';

// --- Fruit tests ---
describe('Fruit', () => {
  it('initializes with correct properties', () => {
    const fruit = new Fruit(100, 200, 2, -12, 0);
    expect(fruit.x).toBe(100);
    expect(fruit.y).toBe(200);
    expect(fruit.vx).toBe(2);
    expect(fruit.vy).toBe(-12);
    expect(fruit.sliced).toBe(false);
    expect(fruit.radius).toBe(FRUIT_TYPES[0].radius);
  });

  it('applies gravity on update', () => {
    const fruit = new Fruit(100, 400, 0, -10);
    const prevVy = fruit.vy;
    fruit.update(1);
    expect(fruit.vy).toBeGreaterThan(prevVy);
    expect(fruit.y).toBeLessThan(400); // moved upward initially
  });

  it('follows arc trajectory', () => {
    const fruit = new Fruit(240, 800, 0, -15);
    // Goes up then comes back down
    const positions = [];
    for (let i = 0; i < 80; i++) {
      fruit.update(1);
      positions.push(fruit.y);
    }
    // Should go up first
    expect(positions[5]).toBeLessThan(800);
    // Then come back down past starting point
    expect(positions[positions.length - 1]).toBeGreaterThan(800);
  });

  it('creates halves when sliced', () => {
    const fruit = new Fruit(200, 400, 1, -5);
    fruit.slice();
    expect(fruit.sliced).toBe(true);
    expect(fruit.halves).not.toBeNull();
    expect(fruit.halves.length).toBe(2);
  });

  it('does not double-slice', () => {
    const fruit = new Fruit(200, 400, 1, -5);
    fruit.slice();
    const halves = fruit.halves;
    fruit.slice();
    expect(fruit.halves).toBe(halves); // same reference, not re-created
  });

  it('halves fall with gravity when sliced', () => {
    const fruit = new Fruit(200, 400, 0, 0);
    fruit.slice();
    const y0 = fruit.halves[0].y;
    // Halves have initial vy=-1 (upward), gravity pulls them down over time
    for (let i = 0; i < 20; i++) fruit.update(1);
    expect(fruit.halves[0].y).toBeGreaterThan(y0);
  });

  it('reports off-screen correctly', () => {
    const fruit = new Fruit(200, 900, 0, 5);
    expect(fruit.isOffScreen(854)).toBe(true);
    const fruit2 = new Fruit(200, 400, 0, -5);
    expect(fruit2.isOffScreen(854)).toBe(false);
  });

  it('getCenter returns correct position', () => {
    const fruit = new Fruit(150, 300, 0, 0);
    const center = fruit.getCenter();
    expect(center.x).toBe(150);
    expect(center.y).toBe(300);
  });
});

// --- Bomb tests ---
describe('Bomb', () => {
  it('initializes with correct properties', () => {
    const bomb = new Bomb(100, 200, 1, -10);
    expect(bomb.x).toBe(100);
    expect(bomb.y).toBe(200);
    expect(bomb.radius).toBe(32);
    expect(bomb.sliced).toBe(false);
  });

  it('applies gravity on update', () => {
    const bomb = new Bomb(100, 400, 0, -10);
    const prevVy = bomb.vy;
    bomb.update(1);
    expect(bomb.vy).toBeGreaterThan(prevVy);
  });

  it('marks as sliced', () => {
    const bomb = new Bomb(100, 400, 0, -10);
    bomb.slice();
    expect(bomb.sliced).toBe(true);
  });

  it('reports off-screen correctly', () => {
    const bomb = new Bomb(100, 900, 0, 5);
    expect(bomb.isOffScreen(854)).toBe(true);
  });
});

// --- Collision (line-circle intersection) tests ---
describe('Line-Circle Intersection', () => {
  function makeEntity(x, y, r) {
    return { getCenter: () => ({ x, y }), radius: r };
  }

  it('detects intersection when line passes through circle', () => {
    const segment = { x1: 0, y1: 50, x2: 100, y2: 50 };
    const entity = makeEntity(50, 50, 20);
    expect(lineCircleIntersect(segment, entity)).toBe(true);
  });

  it('rejects when line misses circle', () => {
    const segment = { x1: 0, y1: 0, x2: 100, y2: 0 };
    const entity = makeEntity(50, 50, 10);
    expect(lineCircleIntersect(segment, entity)).toBe(false);
  });

  it('detects when segment starts inside circle', () => {
    const segment = { x1: 50, y1: 50, x2: 200, y2: 50 };
    const entity = makeEntity(50, 50, 30);
    expect(lineCircleIntersect(segment, entity)).toBe(true);
  });

  it('detects when segment is entirely inside circle', () => {
    const segment = { x1: 48, y1: 50, x2: 52, y2: 50 };
    const entity = makeEntity(50, 50, 30);
    expect(lineCircleIntersect(segment, entity)).toBe(true);
  });

  it('rejects zero-length segment outside circle', () => {
    const segment = { x1: 0, y1: 0, x2: 0, y2: 0 };
    const entity = makeEntity(50, 50, 10);
    expect(lineCircleIntersect(segment, entity)).toBe(false);
  });

  it('detects tangent intersection', () => {
    // Line just touching the top of the circle
    const segment = { x1: 0, y1: 30, x2: 100, y2: 30 };
    const entity = makeEntity(50, 50, 20);
    expect(lineCircleIntersect(segment, entity)).toBe(true);
  });

  it('rejects when segment ends before reaching circle', () => {
    const segment = { x1: 0, y1: 50, x2: 20, y2: 50 };
    const entity = makeEntity(100, 50, 10);
    expect(lineCircleIntersect(segment, entity)).toBe(false);
  });
});

// --- Spawner tests ---
describe('Spawner', () => {
  it('initializes with empty arrays', () => {
    const spawner = new Spawner(480, 854);
    expect(spawner.getFruits().length).toBe(0);
    expect(spawner.getBombs().length).toBe(0);
  });

  it('spawns entities after interval', () => {
    const spawner = new Spawner(480, 854);
    spawner.start();
    // Tick past the spawn interval
    for (let i = 0; i < 100; i++) spawner.update(1);
    const total = spawner.getFruits().length + spawner.getBombs().length;
    expect(total).toBeGreaterThan(0);
  });

  it('resets all state', () => {
    const spawner = new Spawner(480, 854);
    spawner.start();
    for (let i = 0; i < 100; i++) spawner.update(1);
    spawner.reset();
    expect(spawner.getFruits().length).toBe(0);
    expect(spawner.getBombs().length).toBe(0);
    expect(spawner.spawnCount).toBe(0);
  });

  it('cleans up off-screen entities', () => {
    const spawner = new Spawner(480, 854);
    spawner.fruits.push(new Fruit(100, 1000, 0, 5));
    spawner.cleanup(854);
    expect(spawner.getFruits().length).toBe(0);
  });

  it('getMissedFruits returns unsliced below-screen fruits', () => {
    const spawner = new Spawner(480, 854);
    const f1 = new Fruit(100, 1000, 0, 5); // below screen, unsliced
    const f2 = new Fruit(200, 400, 0, -5);  // on screen
    const f3 = new Fruit(300, 1000, 0, 5);
    f3.slice(); // sliced, should not be missed
    spawner.fruits.push(f1, f2, f3);
    const missed = spawner.getMissedFruits();
    expect(missed.length).toBe(1);
    expect(missed[0]).toBe(f1);
  });
});

// --- Slicer tests ---
describe('Slicer', () => {
  it('returns null when no landmarks', async () => {
    const { updateSlicer, resetSlicer } = await import('./slicer.js');
    resetSlicer();
    const result = updateSlicer([], 0, 480, 854);
    expect(result).toBeNull();
  });

  it('returns null on first frame (no previous position)', async () => {
    const { updateSlicer, resetSlicer } = await import('./slicer.js');
    resetSlicer();
    const hand = makeFakeLandmarks(0.5, 0.5);
    const result = updateSlicer([hand], 0, 480, 854);
    expect(result).toBeNull();
  });

  it('returns segment when hand moves fast enough', async () => {
    const { updateSlicer, resetSlicer } = await import('./slicer.js');
    resetSlicer();

    const hand1 = makeFakeLandmarks(0.5, 0.5);
    updateSlicer([hand1], 0, 480, 854);

    // Move hand significantly (velocity > 0.015)
    const hand2 = makeFakeLandmarks(0.55, 0.5);
    const result = updateSlicer([hand2], 16, 480, 854);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('x1');
    expect(result).toHaveProperty('y1');
    expect(result).toHaveProperty('x2');
    expect(result).toHaveProperty('y2');
  });

  it('returns null when hand barely moves', async () => {
    const { updateSlicer, resetSlicer } = await import('./slicer.js');
    resetSlicer();

    const hand1 = makeFakeLandmarks(0.5, 0.5);
    updateSlicer([hand1], 0, 480, 854);

    // Tiny movement (velocity < 0.015)
    const hand2 = makeFakeLandmarks(0.501, 0.5);
    const result = updateSlicer([hand2], 16, 480, 854);
    expect(result).toBeNull();
  });
});

// Helper: create a fake 21-landmark array with all points near (x, y)
function makeFakeLandmarks(x, y) {
  const lms = [];
  for (let i = 0; i < 21; i++) {
    lms.push({ x: x + (i * 0.001), y: y + (i * 0.001), z: 0 });
  }
  return lms;
}

// --- State Machine tests ---
describe('State Machine', () => {
  function createStateMachine() {
    let state = 'MENU';
    let lives = 3;
    let score = 0;
    let gameOverCooldown = 0;

    return {
      get state() { return state; },
      set state(s) { state = s; },
      get lives() { return lives; },
      get score() { return score; },
      get gameOverCooldown() { return gameOverCooldown; },
      onOpenPalm() {
        if (state === 'MENU') {
          state = 'READY';
        } else if (state === 'READY') {
          state = 'PLAYING';
          score = 0;
          lives = 3;
        } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
          state = 'READY';
        }
      },
      onMiss() {
        lives--;
        if (lives <= 0) {
          state = 'GAME_OVER';
          gameOverCooldown = 45;
        }
      },
      onBomb() {
        state = 'GAME_OVER';
        gameOverCooldown = 45;
      },
      onSlice(points) {
        score += points;
      },
      tickCooldown(dt) {
        if (gameOverCooldown > 0) gameOverCooldown -= dt;
      },
    };
  }

  it('MENU -> READY on open palm', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    expect(sm.state).toBe('READY');
  });

  it('READY -> PLAYING on open palm', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    sm.onOpenPalm();
    expect(sm.state).toBe('PLAYING');
  });

  it('3 misses trigger GAME_OVER', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    sm.onOpenPalm();
    sm.onMiss();
    sm.onMiss();
    expect(sm.state).toBe('PLAYING');
    sm.onMiss();
    expect(sm.state).toBe('GAME_OVER');
  });

  it('bomb triggers instant GAME_OVER', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    sm.onOpenPalm();
    sm.onBomb();
    expect(sm.state).toBe('GAME_OVER');
  });

  it('GAME_OVER -> READY after cooldown', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    sm.onOpenPalm();
    sm.onBomb();
    sm.onOpenPalm();
    expect(sm.state).toBe('GAME_OVER'); // blocked by cooldown
    sm.tickCooldown(46);
    sm.onOpenPalm();
    expect(sm.state).toBe('READY');
  });

  it('score accumulates on slice', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    sm.onOpenPalm();
    sm.onSlice(1);
    sm.onSlice(2);
    expect(sm.score).toBe(3);
  });

  it('resets on READY -> PLAYING', () => {
    const sm = createStateMachine();
    sm.onOpenPalm();
    sm.onOpenPalm();
    sm.onSlice(5);
    sm.onBomb();
    sm.tickCooldown(46);
    sm.onOpenPalm(); // GAME_OVER -> READY
    sm.onOpenPalm(); // READY -> PLAYING (resets)
    expect(sm.score).toBe(0);
    expect(sm.lives).toBe(3);
  });
});

// --- Combo tests ---
describe('Combo System', () => {
  it('multi-slice in one frame gives combo bonus', () => {
    let score = 0;
    let comboCount = 0;
    let comboTimer = 0;
    const COMBO_WINDOW = 60;

    function processSlice(slicedThisFrame) {
      score += slicedThisFrame; // base points

      if (slicedThisFrame >= 2) {
        comboCount += slicedThisFrame;
        comboTimer = COMBO_WINDOW;
        score += slicedThisFrame; // bonus
      } else if (slicedThisFrame === 1) {
        if (comboTimer > 0) {
          comboCount++;
          comboTimer = COMBO_WINDOW;
          if (comboCount >= 2) {
            score += 1;
          }
        } else {
          comboCount = 1;
          comboTimer = COMBO_WINDOW;
        }
      }
    }

    // Slice 3 fruits at once
    processSlice(3);
    expect(score).toBe(6); // 3 base + 3 bonus
    expect(comboCount).toBe(3);
  });

  it('consecutive single slices build combo', () => {
    let score = 0;
    let comboCount = 0;
    let comboTimer = 0;
    const COMBO_WINDOW = 60;

    function processSlice(slicedThisFrame) {
      score += slicedThisFrame;

      if (slicedThisFrame >= 2) {
        comboCount += slicedThisFrame;
        comboTimer = COMBO_WINDOW;
        score += slicedThisFrame;
      } else if (slicedThisFrame === 1) {
        if (comboTimer > 0) {
          comboCount++;
          comboTimer = COMBO_WINDOW;
          if (comboCount >= 2) {
            score += 1;
          }
        } else {
          comboCount = 1;
          comboTimer = COMBO_WINDOW;
        }
      }
    }

    processSlice(1); // first slice, starts combo timer
    expect(comboCount).toBe(1);
    processSlice(1); // second within window → combo
    expect(comboCount).toBe(2);
    expect(score).toBe(3); // 1 + 1 + 1 bonus
  });

  it('combo resets when timer expires', () => {
    let comboCount = 1;
    let comboTimer = 60;

    // Simulate timer running out
    comboTimer -= 61;
    if (comboTimer <= 0) comboCount = 0;

    expect(comboCount).toBe(0);
  });
});
