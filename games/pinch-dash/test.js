import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cube, GRAVITY, JUMP_VEL, CUBE_SIZE, COYOTE_MS } from './player.js';
import { ObstacleManager, OBSTACLE_TYPES } from './obstacles.js';
import { aabbOverlap, checkCollision } from './collision.js';

const GROUND_Y = 460;
const GAME_HEIGHT = 540;
const CUBE_X = 173;

// ─── 1. Cube physics ──────────────────────────────────────────────────────────
describe('Cube physics', () => {
  let cube;
  beforeEach(() => { cube = new Cube(CUBE_X, GROUND_Y); });

  it('starts on the ground', () => {
    expect(cube.onGround).toBe(true);
    expect(cube.y).toBe(GROUND_Y - CUBE_SIZE / 2);
  });

  it('applies gravity when airborne', () => {
    cube.jump(JUMP_VEL);
    const vy0 = cube.vy;
    cube.update(1);
    expect(cube.vy).toBeGreaterThan(vy0); // gravity adds positive vy each frame
  });

  it('first jump sets vy to JUMP_VEL', () => {
    cube.jump(JUMP_VEL);
    expect(cube.vy).toBe(JUMP_VEL);
    expect(cube.onGround).toBe(false);
  });

  it('lands on ground and resets state', () => {
    cube.jump(JUMP_VEL);
    // Simulate many frames until cube lands
    for (let i = 0; i < 200; i++) cube.update(1);
    expect(cube.onGround).toBe(true);
    expect(cube.vy).toBe(0);
  });

  it('coyoteTimer is set when leaving the ground', () => {
    // Cube starts on ground (onGround = true)
    expect(cube.onGround).toBe(true);
    // Lift cube above ground threshold (simulating walking off an edge, not jumping)
    cube.y -= 5;
    // update() detects: onGround was true but cube is now airborne → sets coyoteTimer
    cube.update(1);
    expect(cube.coyoteTimer).toBeGreaterThan(0);
  });

  it('die() spawns 20 particles', () => {
    cube.die();
    expect(cube.particles.length).toBe(20);
    expect(cube.dead).toBe(true);
  });

  it('particles fade over time and eventually disappear', () => {
    cube.die();
    expect(cube.particles.length).toBe(20);
    // After 20 frames (dt=1), alpha = 1 - 20/30 ≈ 0.33 (still alive)
    for (let i = 0; i < 20; i++) cube.update(1);
    const mid = cube.particles.length;
    // After another 20 frames (40 total > 30), alpha <= 0, all filtered
    for (let i = 0; i < 20; i++) cube.update(1);
    expect(cube.particles.length).toBeLessThan(mid);
  });
});

// ─── 2. ObstacleManager ───────────────────────────────────────────────────────
describe('ObstacleManager', () => {
  let mgr;
  beforeEach(() => { mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT); });

  it('starts with no obstacles', () => {
    expect(mgr.obstacles.length).toBe(0);
  });

  it('spawns obstacles after update', () => {
    mgr.update(1);
    expect(mgr.obstacles.length).toBeGreaterThan(0);
  });

  it('getHitboxes returns boxes for spike types', () => {
    mgr.obstacles = [{ type: OBSTACLE_TYPES.SINGLE_SPIKE, worldX: mgr.cameraX + 100 }];
    const boxes = mgr.getHitboxes();
    expect(boxes.length).toBe(1);
    expect(boxes[0].y).toBe(GROUND_Y - 24);
  });

  it('getHitboxes returns 2 boxes for double spike', () => {
    mgr.obstacles = [{ type: OBSTACLE_TYPES.DOUBLE_SPIKE, worldX: mgr.cameraX + 100 }];
    expect(mgr.getHitboxes().length).toBe(2);
  });

  it('getHitboxes returns 3 boxes for triple spike', () => {
    mgr.obstacles = [{ type: OBSTACLE_TYPES.TRIPLE_SPIKE, worldX: mgr.cameraX + 100 }];
    expect(mgr.getHitboxes().length).toBe(3);
  });

  it('getGapZones returns gap for FLOOR_GAP type', () => {
    mgr.obstacles = [{ type: OBSTACLE_TYPES.FLOOR_GAP, worldX: mgr.cameraX + 200 }];
    const zones = mgr.getGapZones();
    expect(zones.length).toBe(1);
    expect(zones[0].width).toBe(80);
  });

  it('culls far-behind obstacles', () => {
    mgr.obstacles = [{ type: OBSTACLE_TYPES.SINGLE_SPIKE, worldX: 0 }];
    mgr.cameraX = 2000;
    mgr.update(1);
    // The old obstacle should be culled (worldX + 80 < cameraX - 100 → 80 < 1900)
    const old = mgr.obstacles.find(o => o.worldX === 0);
    expect(old).toBeUndefined();
  });

  it('speed increases with score', () => {
    const speed0 = mgr.speed;
    mgr.cameraX = 200 * 30; // score = 30
    mgr.update(1);
    expect(mgr.speed).toBeGreaterThan(speed0);
  });

  it('speed is capped at 12', () => {
    mgr.cameraX = 200 * 10000;
    mgr.update(1);
    expect(mgr.speed).toBeLessThanOrEqual(12);
  });
});

// ─── 3. Collision detection ───────────────────────────────────────────────────
describe('Collision detection', () => {
  it('aabbOverlap returns true for overlapping rects', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('aabbOverlap returns false for non-overlapping rects', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 20, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('aabbOverlap returns false for edge-touching rects', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('detects ceiling collision', () => {
    const cube = new Cube(CUBE_X, GROUND_Y);
    cube.y = -30; // above screen
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.obstacles = [];
    expect(checkCollision(cube, mgr)).toBe(true);
  });

  it('detects spike hitbox collision', () => {
    const cube = new Cube(CUBE_X, GROUND_Y);
    // Place spike exactly at cube X in screen space
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    // spike worldX = cameraX + CUBE_X so screenX = CUBE_X
    mgr.obstacles = [{ type: OBSTACLE_TYPES.SINGLE_SPIKE, worldX: mgr.cameraX + CUBE_X }];
    cube.y = GROUND_Y - CUBE_SIZE / 2; // on ground, within spike height
    expect(checkCollision(cube, mgr)).toBe(true);
  });

  it('detects gap collision when cube is on ground', () => {
    const cube = new Cube(CUBE_X, GROUND_Y);
    cube.onGround = true;
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    // gap at CUBE_X screen position
    mgr.obstacles = [{ type: OBSTACLE_TYPES.FLOOR_GAP, worldX: mgr.cameraX + CUBE_X - 10 }];
    expect(checkCollision(cube, mgr)).toBe(true);
  });

  it('no collision when cube is airborne over gap', () => {
    const cube = new Cube(CUBE_X, GROUND_Y);
    cube.onGround = false;
    cube.y = GROUND_Y - 100; // airborne
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.obstacles = [{ type: OBSTACLE_TYPES.FLOOR_GAP, worldX: mgr.cameraX + CUBE_X - 10 }];
    expect(checkCollision(cube, mgr)).toBe(false);
  });

  it('no collision when cube is clear of all obstacles', () => {
    const cube = new Cube(CUBE_X, GROUND_Y);
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.obstacles = [{ type: OBSTACLE_TYPES.SINGLE_SPIKE, worldX: mgr.cameraX + 600 }]; // far ahead
    expect(checkCollision(cube, mgr)).toBe(false);
  });
});

// ─── 4. Pinch hysteresis ─────────────────────────────────────────────────────
describe('Pinch hysteresis', () => {
  // Minimal checkPinch re-implementation for unit testing (mirrors game.js logic)
  const BASE_PINCH_THRESHOLD = 0.06;
  const BASE_RELEASE_THRESHOLD = 0.10;
  const BASE_PALM_WIDTH = 0.18;
  const MAX_PINCH_MS = 500;

  function makeLandmarks(thumbIndexDist, palmW = BASE_PALM_WIDTH) {
    // Minimal 21-landmark array with meaningful positions
    const lms = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    // Thumb tip = 4, index tip = 8, palm width = dist(5, 17)
    lms[4] = { x: 0.5, y: 0.5 };
    lms[8] = { x: 0.5 + thumbIndexDist, y: 0.5 };
    lms[5] = { x: 0.5, y: 0.5 };
    lms[17] = { x: 0.5 + palmW, y: 0.5 };
    return [lms];
  }

  function makeChecker() {
    let isPinched = false;
    let pinchStartTime = 0;
    const events = [];

    function dist2D(a, b) {
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function check(lms, nowMs = performance.now()) {
      if (!lms || lms.length === 0) { isPinched = false; pinchStartTime = 0; return; }
      const hand = lms[0];
      const d = dist2D(hand[4], hand[8]);
      const scale = dist2D(hand[5], hand[17]) / BASE_PALM_WIDTH;
      const pt = BASE_PINCH_THRESHOLD * scale;
      const rt = BASE_RELEASE_THRESHOLD * scale;

      if (isPinched) {
        if (d > rt || nowMs - pinchStartTime >= MAX_PINCH_MS) {
          isPinched = false; pinchStartTime = 0;
        }
      } else if (d < pt) {
        isPinched = true;
        pinchStartTime = nowMs;
        events.push('pinch');
      }
    }

    return { check, events, get isPinched() { return isPinched; } };
  }

  it('triggers on close pinch', () => {
    const { check, events } = makeChecker();
    check(makeLandmarks(0.03)); // well within threshold
    expect(events).toContain('pinch');
  });

  it('does NOT re-trigger while still pinched', () => {
    const { check, events } = makeChecker();
    check(makeLandmarks(0.03));
    check(makeLandmarks(0.03));
    check(makeLandmarks(0.03));
    expect(events.length).toBe(1);
  });

  it('re-triggers after release', () => {
    const { check, events } = makeChecker();
    check(makeLandmarks(0.03)); // pinch
    check(makeLandmarks(0.15)); // release (beyond release threshold)
    check(makeLandmarks(0.03)); // pinch again
    expect(events.length).toBe(2);
  });

  it('auto-releases after MAX_PINCH_MS', () => {
    const { check, events } = makeChecker();
    check(makeLandmarks(0.03), 0);
    check(makeLandmarks(0.03), MAX_PINCH_MS + 1); // time expired
    check(makeLandmarks(0.03), MAX_PINCH_MS + 2); // should re-trigger
    expect(events.length).toBe(2);
  });

  it('no trigger when distance is above threshold', () => {
    const { check, events } = makeChecker();
    check(makeLandmarks(0.15)); // open hand
    expect(events.length).toBe(0);
  });
});

// ─── 5. State machine ─────────────────────────────────────────────────────────
describe('State machine logic', () => {
  // Simulate state transitions without DOM/GestureEngine
  function makeStateMachine() {
    let state = 'START';
    let deadCooldown = 0;
    let jumpCount = 0;

    function onJump() {
      if (state === 'START') { state = 'PLAYING'; return; }
      if (state === 'DEAD') { if (deadCooldown <= 0) { state = 'PLAYING'; jumpCount = 0; } return; }
    }

    function onCollision() {
      state = 'DEAD';
      deadCooldown = 1000;
    }

    function tick(ms) { deadCooldown = Math.max(0, deadCooldown - ms); }

    return { onJump, onCollision, tick, get state() { return state; }, get deadCooldown() { return deadCooldown; } };
  }

  it('START → PLAYING on jump', () => {
    const sm = makeStateMachine();
    sm.onJump();
    expect(sm.state).toBe('PLAYING');
  });

  it('PLAYING → DEAD on collision', () => {
    const sm = makeStateMachine();
    sm.onJump(); // START → PLAYING
    sm.onCollision();
    expect(sm.state).toBe('DEAD');
  });

  it('DEAD → ignores jump during cooldown', () => {
    const sm = makeStateMachine();
    sm.onJump();
    sm.onCollision();
    sm.onJump(); // cooldown still active
    expect(sm.state).toBe('DEAD');
  });

  it('DEAD → PLAYING after cooldown expires', () => {
    const sm = makeStateMachine();
    sm.onJump();
    sm.onCollision();
    sm.tick(1001); // expire cooldown
    sm.onJump();
    expect(sm.state).toBe('PLAYING');
  });

  it('deadCooldown decrements over time', () => {
    const sm = makeStateMachine();
    sm.onJump();
    sm.onCollision();
    sm.tick(500);
    expect(sm.deadCooldown).toBe(500);
    sm.tick(600);
    expect(sm.deadCooldown).toBe(0);
  });
});

// ─── 6. Difficulty ────────────────────────────────────────────────────────────
describe('Difficulty scaling', () => {
  it('speed increases with cameraX', () => {
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.cameraX = 0; mgr.update(0);
    const s0 = mgr.speed;
    mgr.cameraX = 200 * 50; // score = 50
    mgr.update(0);
    expect(mgr.speed).toBeGreaterThan(s0);
  });

  it('speed is capped at 12', () => {
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.cameraX = 200 * 100000;
    mgr.update(0);
    expect(mgr.speed).toBeLessThanOrEqual(12);
  });

  it('minSpacing tightens with score', () => {
    function ms(score) { return Math.max(260, 380 - score * 4); }
    expect(ms(0)).toBe(380);
    expect(ms(20)).toBe(300);
    expect(ms(100)).toBe(260); // clamped
  });

  it('only basic types appear at score 0', () => {
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.score = 0;
    const seen = new Set();
    for (let i = 0; i < 100; i++) mgr._spawn(i * 400);
    for (const o of mgr.obstacles) seen.add(o.type);
    expect(seen.has(OBSTACLE_TYPES.DOUBLE_SPIKE)).toBe(false);
    expect(seen.has(OBSTACLE_TYPES.BLOCK_2)).toBe(false);
  });

  it('BLOCK_2 appears at score >= 15', () => {
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.score = 20;
    const seen = new Set();
    for (let i = 0; i < 200; i++) mgr._spawn(i * 400);
    for (const o of mgr.obstacles) seen.add(o.type);
    expect(seen.has(OBSTACLE_TYPES.BLOCK_2)).toBe(true);
  });

  it('multi-spike types appear at score >= 5', () => {
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.score = 5;
    const seen = new Set();
    for (let i = 0; i < 200; i++) mgr._spawn(i * 300);
    for (const o of mgr.obstacles) seen.add(o.type);
    expect(
      seen.has(OBSTACLE_TYPES.DOUBLE_SPIKE) ||
      seen.has(OBSTACLE_TYPES.TRIPLE_SPIKE)
    ).toBe(true);
  });

  it('no ceiling spikes or floor gaps ever spawn', () => {
    const mgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
    mgr.score = 100;
    const seen = new Set();
    for (let i = 0; i < 500; i++) mgr._spawn(i * 300);
    for (const o of mgr.obstacles) seen.add(o.type);
    expect(seen.has(OBSTACLE_TYPES.CEILING_SPIKE)).toBe(false);
    expect(seen.has(OBSTACLE_TYPES.FLOOR_GAP)).toBe(false);
  });
});
