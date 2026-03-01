import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import { Bird } from './bird.js';
import { PipeManager } from './pipes.js';
import { checkCollision } from './collision.js';
import { playFlap, playScore, playHit } from './audio.js';
import {
  getGroundY,
  drawBackground,
  updateClouds,
  drawGround,
  drawScore,
  drawMenuScreen,
  drawReadyScreen,
  drawGameOverScreen,
} from './renderer.js';

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game resolution — width fixed, height adapts to fill tall (portrait) screens
const GAME_WIDTH = 480;
const BASE_HEIGHT = 640;

// On tall screens (mobile portrait), extend game height to fill the viewport
// so there's no black bar. On landscape/desktop, use the base 640.
const viewportAspect = window.innerWidth / window.innerHeight;
const baseAspect = GAME_WIDTH / BASE_HEIGHT;
const GAME_HEIGHT = viewportAspect < baseAspect
  ? Math.round(GAME_WIDTH / viewportAspect)
  : BASE_HEIGHT;
const GROUND_Y = getGroundY(GAME_HEIGHT);

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Scale canvas to fit viewport while preserving aspect ratio
function resizeCanvas() {
  const aspect = GAME_WIDTH / GAME_HEIGHT;
  let w = window.innerWidth;
  let h = window.innerHeight;

  if (w / h > aspect) {
    w = h * aspect;
  } else {
    h = w / aspect;
  }

  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Game state ---
let state = 'MENU'; // MENU | READY | PLAYING | GAME_OVER
let bird = new Bird(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.4);
let pipeManager = new PipeManager(GAME_WIDTH, GAME_HEIGHT, GROUND_Y);
let lastTimestamp = 0;
let gameOverCooldown = 0; // frames before restart allowed

// --- Pinch detection via frame landmarks with hysteresis ---
const PINCH_THRESHOLD = 0.06;
const RELEASE_THRESHOLD = 0.10;
const MAX_PINCH_FRAMES = 30; // auto-release after ~500ms to prevent stuck state
let isPinched = false;
let pinchFrames = 0;
let landmarks = []; // current frame landmarks (array of arrays)

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function checkPinch(lms) {
  if (!lms || lms.length === 0) {
    // Hand lost — reset pinch state so next detection starts clean
    isPinched = false;
    pinchFrames = 0;
    return;
  }

  // Use first hand
  const hand = lms[0];
  if (!hand || hand.length < 21) return;

  const thumbTip = hand[4];
  const indexTip = hand[8];
  const dist = distance2D(thumbTip, indexTip);

  if (isPinched) {
    pinchFrames++;
    if (dist > RELEASE_THRESHOLD || pinchFrames >= MAX_PINCH_FRAMES) {
      isPinched = false;
      pinchFrames = 0;
    }
  } else if (dist < PINCH_THRESHOLD) {
    isPinched = true;
    pinchFrames = 0;
    onFlap();
  }
}

// --- Webcam PiP overlay ---
const PIP = { width: 160, height: 120, margin: 10 };
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function drawPiP(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return;

  const x = canvas.width - PIP.width - PIP.margin;
  const y = canvas.height - PIP.height - PIP.margin - 60; // above ground

  // Cover-crop: preserve video aspect ratio instead of stretching
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  const videoAR = vw / vh;
  const pipAR = PIP.width / PIP.height;
  let sx, sy, sw, sh;
  if (videoAR > pipAR) {
    // Video wider than PiP — crop sides
    sh = vh; sw = vh * pipAR;
    sx = (vw - sw) / 2; sy = 0;
  } else {
    // Video taller than PiP — crop top/bottom
    sw = vw; sh = vw / pipAR;
    sx = 0; sy = (vh - sh) / 2;
  }
  const cropX = sx / vw, cropY = sy / vh;
  const cropW = sw / vw, cropH = sh / vh;

  ctx.save();

  // Rounded clip
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.clip();

  // Mirror video
  ctx.translate(x + PIP.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, PIP.width, PIP.height);
  ctx.restore();

  // Draw landmarks remapped to cropped view
  ctx.save();
  ctx.translate(x, y);
  for (const lms of landmarks) {
    // Connections
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo((1 - (lms[a].x - cropX) / cropW) * PIP.width, ((lms[a].y - cropY) / cropH) * PIP.height);
      ctx.lineTo((1 - (lms[b].x - cropX) / cropW) * PIP.width, ((lms[b].y - cropY) / cropH) * PIP.height);
      ctx.stroke();
    }
    // Joints
    for (let i = 0; i < lms.length; i++) {
      ctx.beginPath();
      ctx.arc((1 - (lms[i].x - cropX) / cropW) * PIP.width, ((lms[i].y - cropY) / cropH) * PIP.height, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
    }
  }
  ctx.restore();

  // PiP border
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.stroke();

  // "LIVE" badge
  ctx.save();
  ctx.fillStyle = 'rgba(220, 50, 50, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, 36, 16, 4);
  ctx.fill();
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE', x + 24, y + 14);
  ctx.restore();
}

// --- Flap action ---
function onFlap() {
  if (state === 'MENU') {
    state = 'READY';
    resetGame();
  } else if (state === 'READY') {
    state = 'PLAYING';
    bird.flap();
    playFlap();
  } else if (state === 'PLAYING') {
    bird.flap();
    playFlap();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'READY';
    resetGame();
  }
}

function resetGame() {
  bird = new Bird(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.4);
  pipeManager = new PipeManager(GAME_WIDTH, GAME_HEIGHT, GROUND_Y);
  gameOverCooldown = 0;
}

// --- Fallback controls ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    onFlap();
  }
});
canvas.addEventListener('click', () => onFlap());

// --- GestureEngine setup ---
const engine = new GestureEngine();
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks; // [] when no hand — PiP shows video only
  checkPinch(data.landmarks);
});

// --- Game loop (60fps) ---
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    return;
  }

  const dt = Math.min((timestamp - lastTimestamp) / (1000 / 60), 1.5);
  lastTimestamp = timestamp;

  // --- Update ---
  updateClouds(dt, GAME_WIDTH);

  if (state === 'MENU') {
    bird.bob(timestamp);
  } else if (state === 'READY') {
    bird.bob(timestamp);
  } else if (state === 'PLAYING') {
    bird.update(dt);
    const scored = pipeManager.update(dt, bird.x);
    if (scored) playScore();

    if (checkCollision(bird, pipeManager, GROUND_Y)) {
      state = 'GAME_OVER';
      gameOverCooldown = 30; // ~0.5s at 60fps
      playHit();
    }
  } else if (state === 'GAME_OVER') {
    // Bird falls to ground
    if (bird.y + bird.height / 2 < GROUND_Y) {
      bird.velocity += 0.5 * dt;
      bird.y += bird.velocity * dt;
      bird.y = Math.min(bird.y, GROUND_Y - bird.height / 2);
      bird.rotation = Math.min(bird.rotation + 5 * dt, 90);
    }
    if (gameOverCooldown > 0) gameOverCooldown -= dt;
  }

  // --- Render ---
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground(ctx, GAME_WIDTH, GAME_HEIGHT);

  if (state === 'PLAYING' || state === 'GAME_OVER') {
    pipeManager.draw(ctx);
  }

  drawGround(ctx, GAME_WIDTH, GAME_HEIGHT,
    (state === 'MENU' || state === 'READY' || state === 'PLAYING') ? pipeManager.speed : 0,
    dt
  );

  bird.draw(ctx);

  // UI overlays
  if (state === 'MENU') {
    drawMenuScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'READY') {
    drawReadyScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'PLAYING') {
    drawScore(ctx, pipeManager.score, GAME_WIDTH);
  } else if (state === 'GAME_OVER') {
    drawScore(ctx, pipeManager.score, GAME_WIDTH);
    drawGameOverScreen(ctx, pipeManager.score, GAME_WIDTH, GAME_HEIGHT, timestamp, gameOverCooldown <= 0);
  }

  // PiP always on top
  drawPiP(videoEl);
}

// --- Init ---
async function init() {
  try {
    await engine.start();
    videoEl = engine.getVideoElement();
  } catch (err) {
    console.warn('GestureEngine failed to start (webcam unavailable?):', err.message);
    // Game still playable with keyboard/mouse
  }

  requestAnimationFrame(gameLoop);
}

init();

// Export for testing
export { state, bird, pipeManager, onFlap, resetGame, checkPinch, isPinched };
