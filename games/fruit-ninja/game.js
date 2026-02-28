import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import { Spawner } from './spawner.js';
import { updateSlicer, getSliceTrail, getCursorPosition, resetSlicer } from './slicer.js';
import { lineCircleIntersect } from './collision.js';
import { createJuiceParticles, createComboText, updateParticles, drawParticles } from './particles.js';
import { playSlice, playCombo, playBomb, playMiss } from './audio.js';
import {
  drawBackground,
  drawSliceTrail,
  drawScore,
  drawLives,
  drawMenuScreen,
  drawReadyScreen,
  drawGameOverScreen,
} from './renderer.js';

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 480;
const GAME_HEIGHT = 854;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

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
let score = 0;
let lives = 3;
let gameOverReason = '';
let gameOverCooldown = 0;
let lastTimestamp = 0;
let landmarks = [];
let particles = [];

// Combo tracking
let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 60; // frames (~1s at 60fps)

const spawner = new Spawner(GAME_WIDTH, GAME_HEIGHT);

// --- OPEN_PALM detection via frame landmarks ---
const OPEN_PALM_COOLDOWN = 30; // frames
let openPalmCooldown = 0;
let palmWasOpen = false;

function checkOpenPalm(lms) {
  if (!lms || lms.length === 0) return false;
  // Use GestureEngine's OPEN_PALM event instead of manual detection
  return false;
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
  const y = canvas.height - PIP.height - PIP.margin;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.clip();
  ctx.translate(x + PIP.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, PIP.width, PIP.height);
  ctx.restore();

  // Draw landmarks on top
  ctx.save();
  ctx.translate(x, y);
  for (const lms of landmarks) {
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo((1 - lms[a].x) * PIP.width, lms[a].y * PIP.height);
      ctx.lineTo((1 - lms[b].x) * PIP.width, lms[b].y * PIP.height);
      ctx.stroke();
    }
    for (let i = 0; i < lms.length; i++) {
      ctx.beginPath();
      ctx.arc((1 - lms[i].x) * PIP.width, lms[i].y * PIP.height, 3, 0, Math.PI * 2);
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

// --- State transitions ---
function onOpenPalm() {
  if (state === 'MENU') {
    state = 'READY';
  } else if (state === 'READY') {
    state = 'PLAYING';
    resetGame();
    spawner.start();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'READY';
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  gameOverReason = '';
  gameOverCooldown = 0;
  comboCount = 0;
  comboTimer = 0;
  particles = [];
  spawner.reset();
  resetSlicer();
}

function triggerGameOver(reason) {
  state = 'GAME_OVER';
  gameOverReason = reason;
  gameOverCooldown = 45; // ~0.75s cooldown
}

// --- Mouse fallback ---
let mouseDown = false;
let mousePrev = null;

canvas.addEventListener('mousedown', (e) => {
  if (state === 'MENU' || state === 'READY' || (state === 'GAME_OVER' && gameOverCooldown <= 0)) {
    onOpenPalm();
    return;
  }
  mouseDown = true;
  const rect = canvas.getBoundingClientRect();
  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = GAME_HEIGHT / rect.height;
  mousePrev = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!mouseDown || state !== 'PLAYING') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = GAME_HEIGHT / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  if (mousePrev) {
    const segment = { x1: mousePrev.x, y1: mousePrev.y, x2: mx, y2: my };
    processSlice(segment, performance.now());
  }
  mousePrev = { x: mx, y: my };
});

canvas.addEventListener('mouseup', () => {
  mouseDown = false;
  mousePrev = null;
});

// --- Slice processing ---
function processSlice(segment, now) {
  let slicedThisFrame = 0;

  // Check fruits
  for (const fruit of spawner.getFruits()) {
    if (fruit.sliced) continue;
    if (lineCircleIntersect(segment, fruit)) {
      fruit.slice();
      score += fruit.points;
      slicedThisFrame++;
      createJuiceParticles(fruit, particles);
      playSlice();
    }
  }

  // Check bombs
  for (const bomb of spawner.getBombs()) {
    if (bomb.sliced) continue;
    if (lineCircleIntersect(segment, bomb)) {
      bomb.slice();
      playBomb();
      triggerGameOver('You sliced a bomb!');
      return;
    }
  }

  // Combo logic
  if (slicedThisFrame >= 2) {
    comboCount += slicedThisFrame;
    comboTimer = COMBO_WINDOW;
    score += slicedThisFrame; // bonus for multi-slice
    createComboText(segment.x2, segment.y2 - 40, slicedThisFrame, particles);
    playCombo(slicedThisFrame);
  } else if (slicedThisFrame === 1) {
    if (comboTimer > 0) {
      comboCount++;
      comboTimer = COMBO_WINDOW;
      if (comboCount >= 2) {
        score += 1; // combo bonus
        createComboText(segment.x2, segment.y2 - 40, comboCount, particles);
        playCombo(comboCount);
      }
    } else {
      comboCount = 1;
      comboTimer = COMBO_WINDOW;
    }
  }
}

// --- GestureEngine setup ---
const engine = new GestureEngine();
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks;

  // Always update slicer so cursor position is tracked on all screens
  const segment = updateSlicer(data.landmarks, performance.now(), GAME_WIDTH, GAME_HEIGHT);

  if (state === 'PLAYING' && segment) {
    processSlice(segment, performance.now());
  }
});

engine.on(GESTURES.OPEN_PALM, () => {
  if (openPalmCooldown <= 0) {
    onOpenPalm();
    openPalmCooldown = OPEN_PALM_COOLDOWN;
  }
});

// --- Hand cursor ---
function drawCursor(ctx, x, y, timestamp) {
  ctx.save();

  const pulse = 0.8 + 0.2 * Math.sin(timestamp / 150);
  const size = 18 * pulse;

  // Outer glow
  ctx.beginPath();
  ctx.arc(x, y, size + 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200, 230, 255, 0.1)';
  ctx.fill();

  // Crosshair ring
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();

  // Crosshair lines
  const lineLen = 8;
  const gap = size + 4;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * pulse})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - gap, y); ctx.lineTo(x - gap - lineLen, y);
  ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + lineLen, y);
  ctx.moveTo(x, y - gap); ctx.lineTo(x, y - gap - lineLen);
  ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + lineLen);
  ctx.stroke();

  ctx.restore();
}

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
  if (openPalmCooldown > 0) openPalmCooldown -= dt;

  if (state === 'PLAYING') {
    spawner.update(dt);

    // Check missed fruits
    const missed = spawner.getMissedFruits();
    for (const fruit of missed) {
      fruit.missed = true;
      lives--;
      playMiss();
      if (lives <= 0) {
        triggerGameOver('Too many missed fruits!');
        break;
      }
    }

    spawner.cleanup(GAME_HEIGHT);

    // Combo timer
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        comboCount = 0;
      }
    }

    updateParticles(particles, dt);
  } else if (state === 'GAME_OVER') {
    // Keep updating entities so they fall off screen
    spawner.update(dt);
    spawner.cleanup(GAME_HEIGHT);
    updateParticles(particles, dt);
    if (gameOverCooldown > 0) gameOverCooldown -= dt;
  }

  // --- Render ---
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground(ctx, GAME_WIDTH, GAME_HEIGHT);

  if (state === 'PLAYING' || state === 'GAME_OVER') {
    // Draw entities
    for (const bomb of spawner.getBombs()) bomb.draw(ctx);
    for (const fruit of spawner.getFruits()) fruit.draw(ctx);

    // Slice trail
    const trail = getSliceTrail(performance.now());
    drawSliceTrail(ctx, trail, performance.now());

    // Particles
    drawParticles(ctx, particles);
  }

  // UI overlays
  if (state === 'MENU') {
    drawMenuScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'READY') {
    drawReadyScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'PLAYING') {
    drawScore(ctx, score, GAME_WIDTH);
    drawLives(ctx, lives, GAME_WIDTH);
  } else if (state === 'GAME_OVER') {
    drawScore(ctx, score, GAME_WIDTH);
    drawLives(ctx, lives, GAME_WIDTH);
    drawGameOverScreen(ctx, score, GAME_WIDTH, GAME_HEIGHT, timestamp, gameOverCooldown <= 0, gameOverReason);
  }

  // Hand cursor — always visible when hand is detected
  const cursor = getCursorPosition();
  if (cursor) {
    drawCursor(ctx, cursor.x, cursor.y, timestamp);
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
  }

  requestAnimationFrame(gameLoop);
}

init();

// Export for testing
export { state, score, lives, onOpenPalm, resetGame, triggerGameOver, processSlice, spawner, comboCount };
