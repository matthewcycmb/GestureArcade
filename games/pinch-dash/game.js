import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import { Cube, JUMP_VEL, COYOTE_MS, preloadMarioFrames, updateMarioAnimation } from './player.js';
import { ObstacleManager } from './obstacles.js';
import { checkCollision } from './collision.js';
import { playJump, playDeath } from './audio.js';
import {
  updateBackground,
  drawBackground,
  drawGround,
  preloadBgImage,
  drawHUD,
  drawStartScreen,
  drawDeadScreen,
  drawPiP,
} from './renderer.js';

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const GROUND_Y = Math.floor(GAME_HEIGHT * 0.725); // align with grass line in bg.jpg
export const CUBE_X = 173;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

function resizeCanvas() {
  const aspect = GAME_WIDTH / GAME_HEIGHT;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (w / h > aspect) w = h * aspect;
  else h = w / aspect;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Game state ---
export let state = 'START'; // START | PLAYING | DEAD
let cube = new Cube(CUBE_X, GROUND_Y);
let obsMgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
let lastTimestamp = 0;
let deadCooldown = 0; // ms before restart allowed
let highScore = parseInt(localStorage.getItem('pinch-dash-high') || '0', 10);

// --- Pinch detection (hysteresis, same pattern as Flappy Bird) ---
const BASE_PINCH_THRESHOLD = 0.06;
const BASE_RELEASE_THRESHOLD = 0.10;
const BASE_PALM_WIDTH = 0.18;
const MAX_PINCH_MS = 500;
let isPinched = false;
let pinchStartTime = 0;
export let landmarks = [];

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function palmWidth(hand) {
  return distance2D(hand[5], hand[17]);
}

export function checkPinch(lms) {
  if (!lms || lms.length === 0) {
    isPinched = false;
    pinchStartTime = 0;
    return;
  }
  const hand = lms[0];
  if (!hand || hand.length < 21) return;

  const dist = distance2D(hand[4], hand[8]);
  const scale = palmWidth(hand) / BASE_PALM_WIDTH;
  const pinchThreshold = BASE_PINCH_THRESHOLD * scale;
  const releaseThreshold = BASE_RELEASE_THRESHOLD * scale;

  if (isPinched) {
    const elapsed = performance.now() - pinchStartTime;
    if (dist > releaseThreshold || elapsed >= MAX_PINCH_MS) {
      isPinched = false;
      pinchStartTime = 0;
    }
  } else if (dist < pinchThreshold) {
    isPinched = true;
    pinchStartTime = performance.now();
    onJump();
  }
}

// --- Jump action ---
export function onJump() {
  if (state === 'START') {
    startGame();
    return;
  }
  if (state === 'DEAD') {
    if (deadCooldown <= 0) restartGame();
    return;
  }
  // PLAYING — single jump only (ground or coyote)
  const coyoteActive = !cube.onGround && cube.coyoteTimer > 0;
  if (cube.onGround || coyoteActive) {
    cube.jump(JUMP_VEL);
    playJump();
  }
}

function startGame() {
  state = 'PLAYING';
  cube = new Cube(CUBE_X, GROUND_Y);
  obsMgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
  deadCooldown = 0;
}

export function restartGame() {
  state = 'PLAYING';
  cube = new Cube(CUBE_X, GROUND_Y);
  obsMgr = new ObstacleManager(GROUND_Y, GAME_HEIGHT);
  deadCooldown = 0;
}

// --- Fallback controls ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); onJump(); }
});
canvas.addEventListener('click', () => onJump());
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  onJump();
}, { passive: false });

// --- GestureEngine ---
const engine = new GestureEngine();
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks;
  checkPinch(data.landmarks);
});

engine.on(GESTURES.OPEN_PALM, () => {
  if (state === 'START' || (state === 'DEAD' && deadCooldown <= 0)) {
    if (state === 'START') startGame();
    else restartGame();
  }
});

// --- Game loop ---
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!lastTimestamp) { lastTimestamp = timestamp; return; }
  const dt = Math.min((timestamp - lastTimestamp) / (1000 / 60), 1.5);
  lastTimestamp = timestamp;

  // Advance sprite animations
  updateMarioAnimation(timestamp);

  // Update
  const scrollSpeed = state === 'PLAYING' ? obsMgr.speed : 0;
  updateBackground(dt, scrollSpeed, GAME_WIDTH);

  if (state === 'PLAYING') {
    obsMgr.update(dt);
    cube.update(dt);

    if (checkCollision(cube, obsMgr)) {
      cube.die();
      state = 'DEAD';
      deadCooldown = 1000; // ms
      const finalScore = Math.floor(obsMgr.cameraX);
      if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('pinch-dash-high', String(highScore));
      }
      playDeath();
    }
  } else if (state === 'DEAD') {
    cube.update(dt); // particles still animate
    deadCooldown -= dt * (1000 / 60);
    if (deadCooldown < 0) deadCooldown = 0;
  }

  // Render
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground(ctx, GAME_WIDTH, GAME_HEIGHT);

  if (state === 'PLAYING' || state === 'DEAD') {
    obsMgr.draw(ctx);
  }

  drawGround(ctx, GAME_WIDTH, GAME_HEIGHT, GROUND_Y);

  cube.draw(ctx);

  // Overlays
  if (state === 'START') {
    drawStartScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'PLAYING') {
    drawHUD(ctx, obsMgr.cameraX, obsMgr.speed, GAME_WIDTH);
  } else if (state === 'DEAD') {
    drawHUD(ctx, obsMgr.cameraX, obsMgr.speed, GAME_WIDTH);
    drawDeadScreen(ctx, obsMgr.cameraX, GAME_WIDTH, GAME_HEIGHT, timestamp, deadCooldown <= 0, highScore);
  }

  drawPiP(ctx, videoEl, landmarks, GAME_WIDTH, GAME_HEIGHT);
}

// --- Init ---
(async function init() {
  // Preload sprites
  await Promise.all([preloadMarioFrames(), preloadBgImage()]);

  // Start game loop
  requestAnimationFrame(gameLoop);

  // Gesture engine in background
  try {
    await engine.start();
    videoEl = engine.getVideoElement();
  } catch (err) {
    console.warn('GestureEngine failed to start:', err.message);
  }
})();

// Exports for testing
export { state as gameState, cube, obsMgr, isPinched };
