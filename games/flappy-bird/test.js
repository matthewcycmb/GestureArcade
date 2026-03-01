import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bird } from './bird.js';
import { PipeManager } from './pipes.js';
import { checkCollision, aabbOverlap } from './collision.js';

// --- Bird tests ---
describe('Bird', () => {
  it('initializes at given position', () => {
    const bird = new Bird(100, 200);
    expect(bird.x).toBe(100);
    expect(bird.y).toBe(200);
    expect(bird.velocity).toBe(0);
  });

  it('applies gravity on update', () => {
    const bird = new Bird(100, 200);
    bird.update(1);
    expect(bird.velocity).toBeGreaterThan(0); // gravity pulls down
    expect(bird.y).toBeGreaterThan(200);
  });

  it('flap gives upward velocity', () => {
    const bird = new Bird(100, 300);
    bird.velocity = 5; // falling
    bird.flap();
    expect(bird.velocity).toBe(-8); // FLAP_STRENGTH
  });

  it('returns hitbox with inset', () => {
    const bird = new Bird(100, 200);
    const hb = bird.getHitbox();
    expect(hb.width).toBeLessThan(bird.width);
    expect(hb.height).toBeLessThan(bird.height);
    expect(hb.x).toBeGreaterThan(100 - bird.width / 2);
  });

  it('rotation follows velocity', () => {
    const bird = new Bird(100, 200);
    bird.velocity = 10; // falling fast
    bird.update(1);
    expect(bird.rotation).toBeGreaterThan(0); // tilts down
  });
});

// --- PipeManager tests ---
describe('PipeManager', () => {
  const W = 480;
  const H = 640;
  const groundY = 560;

  it('initializes with no pipes', () => {
    const pm = new PipeManager(W, H, groundY);
    expect(pm.pipes.length).toBe(0);
    expect(pm.score).toBe(0);
  });

  it('spawns pipes on first update', () => {
    const pm = new PipeManager(W, H, groundY);
    pm.update(1, 100);
    expect(pm.pipes.length).toBeGreaterThan(0);
  });

  it('scores when bird passes pipe', () => {
    const pm = new PipeManager(W, H, groundY);
    pm.pipes.push({ x: 90, gapCenter: 300, scored: false });
    const scored = pm.update(1, 200);
    expect(scored).toBe(true);
    expect(pm.score).toBe(1);
  });

  it('removes off-screen pipes', () => {
    const pm = new PipeManager(W, H, groundY);
    pm.pipes.push({ x: -200, gapCenter: 300, scored: true });
    pm.update(1, 100);
    // Off-screen pipe should be removed (x < -PIPE_WIDTH*2 = -112)
    expect(pm.pipes.filter(p => p.x < -200).length).toBe(0);
  });

  it('scales difficulty at score milestones', () => {
    const pm = new PipeManager(W, H, groundY);
    const initialSpeed = pm.speed;
    const initialGap = pm.gap;
    pm.scaleDifficulty(10);
    expect(pm.speed).toBeGreaterThan(initialSpeed);
    expect(pm.gap).toBeLessThan(initialGap);
  });

  it('resets state', () => {
    const pm = new PipeManager(W, H, groundY);
    pm.pipes.push({ x: 200, gapCenter: 300, scored: false });
    pm.score = 5;
    pm.speed = 10;
    pm.reset();
    expect(pm.pipes.length).toBe(0);
    expect(pm.score).toBe(0);
    expect(pm.speed).toBe(3);
  });

  it('returns hitboxes for top and bottom pipes', () => {
    const pm = new PipeManager(W, H, groundY);
    pm.pipes.push({ x: 200, gapCenter: 300, scored: false });
    const boxes = pm.getHitboxes();
    expect(boxes.length).toBe(2); // top + bottom per pipe
    // Top pipe: y=0, bottom: y > gapCenter
    expect(boxes[0].y).toBe(0);
    expect(boxes[1].y).toBeGreaterThan(300);
  });
});

// --- Collision tests ---
describe('Collision', () => {
  it('aabbOverlap detects overlapping rectangles', () => {
    expect(aabbOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 }
    )).toBe(true);
  });

  it('aabbOverlap rejects non-overlapping rectangles', () => {
    expect(aabbOverlap(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 }
    )).toBe(false);
  });

  it('detects ground collision', () => {
    const bird = new Bird(100, 555); // near ground at 560
    const pm = new PipeManager(480, 640, 560);
    expect(checkCollision(bird, pm, 560)).toBe(true);
  });

  it('detects ceiling collision', () => {
    const bird = new Bird(100, -5);
    const pm = new PipeManager(480, 640, 560);
    expect(checkCollision(bird, pm, 560)).toBe(true);
  });

  it('detects pipe collision', () => {
    const bird = new Bird(200, 100); // at top
    const pm = new PipeManager(480, 640, 560);
    // Place pipe gap centered at 400 (gap=150 → top pipe bottom at 325)
    // Bird at y=100 hits top pipe
    pm.pipes.push({ x: 183, gapCenter: 400, scored: false });
    expect(checkCollision(bird, pm, 560)).toBe(true);
  });

  it('no collision in clear space', () => {
    const bird = new Bird(100, 300);
    const pm = new PipeManager(480, 640, 560);
    // No pipes near bird
    pm.pipes.push({ x: 400, gapCenter: 300, scored: false });
    expect(checkCollision(bird, pm, 560)).toBe(false);
  });
});

// --- Pinch hysteresis logic test ---
describe('Pinch Hysteresis', () => {
  function lm(x, y) {
    return { x, y, z: 0 };
  }

  // Simulate the pinch detection logic from game.js
  function createPinchDetector() {
    let isPinched = false;
    let pinchFrames = 0;
    let flapCount = 0;
    const PINCH_THRESHOLD = 0.06;
    const RELEASE_THRESHOLD = 0.10;
    const MAX_PINCH_FRAMES = 30;

    return {
      check(thumbTip, indexTip) {
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (isPinched) {
          pinchFrames++;
          if (dist > RELEASE_THRESHOLD || pinchFrames >= MAX_PINCH_FRAMES) {
            isPinched = false;
            pinchFrames = 0;
          }
        } else if (dist < PINCH_THRESHOLD) {
          isPinched = true;
          pinchFrames = 0;
          flapCount++;
        }
      },
      checkEmpty() {
        // Simulate hand lost (no landmarks)
        isPinched = false;
        pinchFrames = 0;
      },
      get flapCount() { return flapCount; },
      get isPinched() { return isPinched; },
    };
  }

  it('triggers flap on pinch close', () => {
    const det = createPinchDetector();
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // dist ~0.02 < 0.06
    expect(det.flapCount).toBe(1);
    expect(det.isPinched).toBe(true);
  });

  it('does not re-trigger while still pinched', () => {
    const det = createPinchDetector();
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch
    det.check(lm(0.5, 0.5), lm(0.53, 0.5)); // still close
    expect(det.flapCount).toBe(1); // only one flap
  });

  it('triggers again after release cycle', () => {
    const det = createPinchDetector();
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch → flap 1
    det.check(lm(0.5, 0.5), lm(0.62, 0.5));  // release (dist 0.12 > 0.10)
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch again → flap 2
    expect(det.flapCount).toBe(2);
  });

  it('does not trigger if distance is between thresholds (hysteresis zone)', () => {
    const det = createPinchDetector();
    // dist ~0.08 is between 0.06 and 0.10, should NOT trigger
    det.check(lm(0.5, 0.5), lm(0.58, 0.5));
    expect(det.flapCount).toBe(0);
  });

  it('resets pinch state when hand is lost', () => {
    const det = createPinchDetector();
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch → flap 1
    expect(det.isPinched).toBe(true);
    det.checkEmpty(); // hand lost
    expect(det.isPinched).toBe(false);
    // Can pinch again immediately when hand returns
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch → flap 2
    expect(det.flapCount).toBe(2);
  });

  it('auto-releases after max pinch duration', () => {
    const det = createPinchDetector();
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch → flap 1
    expect(det.isPinched).toBe(true);
    // Simulate holding pinch for 30 frames
    for (let i = 0; i < 30; i++) {
      det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // still close
    }
    expect(det.isPinched).toBe(false); // auto-released
    // Can pinch again
    det.check(lm(0.5, 0.5), lm(0.52, 0.5)); // pinch → flap 2
    expect(det.flapCount).toBe(2);
  });
});

// --- State transitions ---
describe('State Machine', () => {
  // Simulate minimal state machine logic from game.js
  function createStateMachine() {
    let state = 'MENU';
    let gameOverCooldown = 0;

    return {
      get state() { return state; },
      set state(s) { state = s; },
      get gameOverCooldown() { return gameOverCooldown; },
      onFlap() {
        if (state === 'MENU') {
          state = 'READY';
        } else if (state === 'READY') {
          state = 'PLAYING';
        } else if (state === 'PLAYING') {
          // just flap, no state change
        } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
          state = 'READY';
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

  it('MENU → READY on flap', () => {
    const sm = createStateMachine();
    sm.onFlap();
    expect(sm.state).toBe('READY');
  });

  it('READY → PLAYING on flap', () => {
    const sm = createStateMachine();
    sm.onFlap(); // MENU → READY
    sm.onFlap(); // READY → PLAYING
    expect(sm.state).toBe('PLAYING');
  });

  it('PLAYING stays PLAYING on flap', () => {
    const sm = createStateMachine();
    sm.onFlap(); // MENU → READY
    sm.onFlap(); // READY → PLAYING
    sm.onFlap(); // PLAYING → still PLAYING
    expect(sm.state).toBe('PLAYING');
  });

  it('collision triggers GAME_OVER', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    sm.triggerGameOver();
    expect(sm.state).toBe('GAME_OVER');
  });

  it('GAME_OVER → READY after cooldown', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    sm.triggerGameOver();
    // Can't restart during cooldown
    sm.onFlap();
    expect(sm.state).toBe('GAME_OVER');
    // Tick past cooldown
    sm.tickCooldown(31);
    sm.onFlap();
    expect(sm.state).toBe('READY');
  });
});
