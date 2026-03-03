import { describe, it, expect } from 'vitest';
import { Paddle } from './paddle.js';
import { Ball, BASE_SPEED, MAX_SPEED_MULT, SPEED_INCREASE } from './ball.js';
import { AI, REACTION_INTERVAL } from './ai.js';
import { checkBallPaddle, checkBallWalls, checkBallOutOfBounds } from './collision.js';

// --- Paddle tests ---
describe('Paddle', () => {
  it('initializes at center of court', () => {
    const p = new Paddle(30, 540);
    expect(p.x).toBe(30);
    expect(p.y).toBe(270);
    expect(p.width).toBe(12);
    expect(p.height).toBe(80);
  });

  it('smoothly interpolates toward target', () => {
    const p = new Paddle(30, 540);
    p.setTarget(100);
    p.update(1);
    // Should move toward 100 (above center) but not reach it in one frame
    expect(p.y).toBeLessThan(270); // moved up from center
    expect(p.y).toBeGreaterThan(100); // but hasn't reached target yet
  });

  it('clamps to court bounds (top)', () => {
    const p = new Paddle(30, 540);
    p.setTarget(-100);
    for (let i = 0; i < 100; i++) p.update(1);
    expect(p.y).toBeGreaterThanOrEqual(p.height / 2);
  });

  it('clamps to court bounds (bottom)', () => {
    const p = new Paddle(30, 540);
    p.setTarget(1000);
    for (let i = 0; i < 100; i++) p.update(1);
    expect(p.y).toBeLessThanOrEqual(540 - p.height / 2);
  });

  it('returns correct hitbox', () => {
    const p = new Paddle(30, 540);
    const hb = p.getHitbox();
    expect(hb.x).toBe(30 - 6); // x - width/2
    expect(hb.y).toBe(270 - 40); // y - height/2
    expect(hb.width).toBe(12);
    expect(hb.height).toBe(80);
  });
});

// --- Ball tests ---
describe('Ball', () => {
  it('initializes at court center', () => {
    const b = new Ball(960, 540);
    expect(b.x).toBe(480);
    expect(b.y).toBe(270);
    expect(b.radius).toBe(10);
  });

  it('does not move until served', () => {
    const b = new Ball(960, 540);
    b.update(1);
    expect(b.x).toBe(480);
    expect(b.y).toBe(270);
  });

  it('moves after serve', () => {
    const b = new Ball(960, 540);
    b.serve();
    const startX = b.x;
    b.update(1);
    expect(b.x).not.toBe(startX);
  });

  it('bounces off wall (vy inverts)', () => {
    const b = new Ball(960, 540);
    b.vy = 5;
    b.bounceWall();
    expect(b.vy).toBe(-5);
  });

  it('calculates paddle bounce angle from offset', () => {
    const b = new Ball(960, 540);
    b.vx = -5;
    b.vy = 0;
    b.speedMult = 1;
    // Hit center of paddle → angle ~0
    b.bouncePaddle(b.y, 80);
    expect(b.vx).toBeGreaterThan(0); // direction reversed
    expect(Math.abs(b.vy)).toBeLessThan(1); // near-center hit → small vy
  });

  it('increases speed per paddle hit', () => {
    const b = new Ball(960, 540);
    b.vx = 5;
    b.vy = 0;
    expect(b.speedMult).toBe(1);
    b.bouncePaddle(b.y, 80);
    expect(b.speedMult).toBeGreaterThan(1);
    expect(b.hitCount).toBe(1);
  });

  it('caps speed at max multiplier', () => {
    const b = new Ball(960, 540);
    b.vx = 5;
    b.vy = 0;
    // Simulate many hits
    for (let i = 0; i < 200; i++) {
      b.bouncePaddle(b.y, 80);
    }
    expect(b.speedMult).toBeLessThanOrEqual(MAX_SPEED_MULT);
  });

  it('resets to center with fresh state', () => {
    const b = new Ball(960, 540);
    b.serve();
    b.update(1);
    b.hitCount = 10;
    b.speedMult = 2;
    b.reset();
    expect(b.x).toBe(480);
    expect(b.y).toBe(270);
    expect(b.hitCount).toBe(0);
    expect(b.speedMult).toBe(1);
    expect(b.active).toBe(false);
  });
});

// --- AI tests ---
describe('AI', () => {
  function makeBall(vx, x, y) {
    return { x, y, vx, vy: 0, speedMult: 1, radius: 10, active: true };
  }

  it('updates prediction toward ball when ball approaches', () => {
    const aiCtrl = new AI(930, 960, 540);
    const paddle = new Paddle(930, 540);
    const ball = makeBall(5, 400, 200); // moving toward AI

    aiCtrl.update(ball, REACTION_INTERVAL + 1, paddle, 1);
    // After update, paddle target should shift toward ball Y
    expect(paddle.targetY).not.toBe(270); // moved from center
  });

  it('drifts toward center when ball moves away', () => {
    const aiCtrl = new AI(930, 960, 540);
    const paddle = new Paddle(930, 540);
    paddle.y = 100; // off center
    const ball = makeBall(-5, 400, 200); // moving away from AI

    aiCtrl.update(ball, REACTION_INTERVAL + 1, paddle, 1);
    // Should drift toward center (270)
    expect(paddle.targetY).toBeGreaterThan(100);
  });

  it('respects reaction delay', () => {
    const aiCtrl = new AI(930, 960, 540);
    const paddle = new Paddle(930, 540);
    const ball = makeBall(5, 400, 200);

    // First call at t=0 — too soon
    aiCtrl.lastUpdateTime = 0;
    aiCtrl.update(ball, 50, paddle, 1); // only 50ms, less than 150ms interval
    // Target still near initial (AI may have slightly moved but prediction not updated)
    const firstTarget = aiCtrl.targetY;

    // Call at t=200 — past interval
    aiCtrl.update(ball, 200, paddle, 1);
    // Now prediction should have updated
    expect(aiCtrl.targetY).not.toBe(firstTarget);
  });
});

// --- Collision tests ---
describe('Collision', () => {
  it('detects ball-paddle overlap', () => {
    const ball = { x: 36, y: 270, radius: 10 };
    const paddle = new Paddle(30, 540);
    const result = checkBallPaddle(ball, paddle);
    expect(result.hit).toBe(true);
  });

  it('no false positive for distant ball-paddle', () => {
    const ball = { x: 480, y: 270, radius: 10 };
    const paddle = new Paddle(30, 540);
    const result = checkBallPaddle(ball, paddle);
    expect(result.hit).toBe(false);
  });

  it('detects ball hitting top wall', () => {
    const ball = { y: 5, radius: 10 };
    expect(checkBallWalls(ball, 540)).toBe(true);
  });

  it('detects ball hitting bottom wall', () => {
    const ball = { y: 535, radius: 10 };
    expect(checkBallWalls(ball, 540)).toBe(true);
  });

  it('no wall hit in middle of court', () => {
    const ball = { y: 270, radius: 10 };
    expect(checkBallWalls(ball, 540)).toBe(false);
  });

  it('detects ball out of bounds left', () => {
    const ball = { x: -15, radius: 10 };
    const result = checkBallOutOfBounds(ball, 960);
    expect(result.out).toBe(true);
    expect(result.scorer).toBe('right');
  });

  it('detects ball out of bounds right', () => {
    const ball = { x: 975, radius: 10 };
    const result = checkBallOutOfBounds(ball, 960);
    expect(result.out).toBe(true);
    expect(result.scorer).toBe('left');
  });

  it('ball in play is not out of bounds', () => {
    const ball = { x: 480, radius: 10 };
    const result = checkBallOutOfBounds(ball, 960);
    expect(result.out).toBe(false);
  });
});

// --- State Machine tests ---
describe('State Machine', () => {
  function createStateMachine() {
    let state = 'MENU';
    let mode = '1P';
    let leftScore = 0;
    let rightScore = 0;
    let gameOverCooldown = 0;
    const WIN_SCORE = 3;

    return {
      get state() { return state; },
      set state(s) { state = s; },
      get mode() { return mode; },
      get leftScore() { return leftScore; },
      get rightScore() { return rightScore; },
      get gameOverCooldown() { return gameOverCooldown; },

      selectMode(m) {
        if (state === 'MENU') {
          mode = m;
          state = 'READY';
        }
      },
      onOpenPalm() {
        if (state === 'READY') {
          state = 'PLAYING';
        } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
          leftScore = 0;
          rightScore = 0;
          state = 'PLAYING';
        }
      },
      scorePoint(scorer) {
        if (scorer === 'left') leftScore++;
        else rightScore++;

        if (leftScore >= WIN_SCORE || rightScore >= WIN_SCORE) {
          state = 'GAME_OVER';
          gameOverCooldown = 30;
        }
      },
      tickCooldown(dt) {
        if (gameOverCooldown > 0) gameOverCooldown -= dt;
      },
    };
  }

  it('MENU → READY on mode select', () => {
    const sm = createStateMachine();
    sm.selectMode('1P');
    expect(sm.state).toBe('READY');
  });

  it('READY → PLAYING on OPEN_PALM', () => {
    const sm = createStateMachine();
    sm.selectMode('1P');
    sm.onOpenPalm();
    expect(sm.state).toBe('PLAYING');
  });

  it('scoring increments score', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    sm.scorePoint('left');
    expect(sm.leftScore).toBe(1);
    sm.scorePoint('right');
    expect(sm.rightScore).toBe(1);
  });

  it('game over at 3 points', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    for (let i = 0; i < 3; i++) sm.scorePoint('left');
    expect(sm.state).toBe('GAME_OVER');
    expect(sm.leftScore).toBe(3);
  });

  it('cannot restart during cooldown', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    for (let i = 0; i < 3; i++) sm.scorePoint('left');
    sm.onOpenPalm();
    expect(sm.state).toBe('GAME_OVER'); // still locked
  });

  it('restart after cooldown resets scores and starts new game', () => {
    const sm = createStateMachine();
    sm.state = 'PLAYING';
    for (let i = 0; i < 3; i++) sm.scorePoint('left');
    sm.tickCooldown(31);
    sm.onOpenPalm();
    expect(sm.state).toBe('PLAYING');
    expect(sm.leftScore).toBe(0);
    expect(sm.rightScore).toBe(0);
  });
});
