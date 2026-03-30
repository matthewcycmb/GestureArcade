import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import {
  GAME_WIDTH, GAME_HEIGHT, LANE_COUNT, OCEAN_Y,
  PLAYER_X, PLAYER_W, PLAYER_H, PLAYER_MAX_SPEED,
  MAX_HEALTH, INVINCIBILITY_FRAMES, COIN_SIZE, COIN_POINTS,
  BASE_ENEMY_SPEED,
  getLaneY, computePointY, pointYToGameY,
  EnemyManager, CoinManager, checkCollision, checkCoinCollision,
} from './logic.js';

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// ============================================================
// SPRITE LOADING
// ============================================================
const playerBirdImg = document.createElement('img');
playerBirdImg.src = './assets/bird.gif';
playerBirdImg.style.position = 'absolute';
playerBirdImg.style.left = '-9999px';
document.body.appendChild(playerBirdImg);

const skyBgImg = document.createElement('img');
skyBgImg.src = './assets/sky-bg.gif';
skyBgImg.style.position = 'absolute';
skyBgImg.style.left = '-9999px';
document.body.appendChild(skyBgImg);

const planeImg = new Image();
planeImg.src = './assets/plane.png';

// ============================================================
// AUDIO (procedural Web Audio)
// ============================================================
let audioCtx = null;
let windOsc = null;
let windGain = null;
const POINT_LERP = 0.15;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function getAudioSettings() {
  try {
    const raw = localStorage.getItem('gesture-arcade-settings');
    if (raw) {
      const s = JSON.parse(raw);
      return { volume: (s.sound?.volume ?? 80) / 100, muted: !!s.sound?.muted };
    }
  } catch (_) {}
  return { volume: 0.8, muted: false };
}

function startWindSound() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    windOsc = ctx.createBufferSource();
    windOsc.buffer = buf;
    windOsc.loop = true;
    windGain = ctx.createGain();
    const { volume } = getAudioSettings();
    windGain.gain.value = 0.02 * volume;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    windOsc.connect(filter);
    filter.connect(windGain);
    windGain.connect(ctx.destination);
    windOsc.start();
  } catch (_) {}
}

function stopWindSound() {
  try {
    if (windOsc) { windOsc.stop(); windOsc = null; }
    windGain = null;
  } catch (_) {}
}

function playScoreBlip() {
  try {
    const { muted, volume } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12 * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

function playCoinSound() {
  try {
    const { muted, volume } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (_) {}
}

function playHitSound() {
  try {
    const { muted, volume } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    const bufSize = ctx.sampleRate * 0.2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    noise.connect(ng);
    ng.connect(ctx.destination);
    noise.start(ctx.currentTime);
  } catch (_) {}
}

function playCrash() {
  try {
    const { muted, volume } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    const bufSize = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25 * volume, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    noise.connect(ng);
    ng.connect(ctx.destination);
    noise.start(ctx.currentTime);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.2 * volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

// ============================================================
// POINT TRACKING (smoothed)
// ============================================================
let targetY = null;

function updatePointTarget(lms) {
  if (!lms || lms.length === 0) {
    targetY = null;
    return;
  }
  const normY = computePointY(lms[0]);
  if (normY === null) { targetY = null; return; }
  targetY = pointYToGameY(normY);
}

// ============================================================
// SCREEN SHAKE
// ============================================================
let shakeFrames = 0;
let shakeIntensity = 0;

function triggerShake(frames, intensity) {
  shakeFrames = frames;
  shakeIntensity = intensity;
}

function applyShake() {
  if (shakeFrames > 0) {
    const ox = (Math.random() - 0.5) * shakeIntensity * 2;
    const oy = (Math.random() - 0.5) * shakeIntensity * 2;
    ctx.translate(ox, oy);
    shakeFrames--;
    shakeIntensity *= 0.92; // decay
    return true;
  }
  return false;
}

// ============================================================
// SPEED-UP FLASH
// ============================================================
let speedUpTimer = 0;

function triggerSpeedUp() {
  speedUpTimer = 90; // 1.5 seconds
}

function drawSpeedUpFlash(dt) {
  if (speedUpTimer <= 0) return;
  speedUpTimer -= dt;

  // Edge flash
  const alpha = Math.min(speedUpTimer / 30, 1) * 0.3;
  ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
  ctx.fillRect(0, 0, 8, GAME_HEIGHT);
  ctx.fillRect(GAME_WIDTH - 8, 0, 8, GAME_HEIGHT);
  ctx.fillRect(0, 0, GAME_WIDTH, 4);

  // "SPEED UP!" text
  if (speedUpTimer > 30) {
    const textAlpha = Math.min((speedUpTimer - 30) / 30, 1);
    ctx.save();
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = `rgba(255, 200, 50, ${textAlpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText('SPEED UP!', GAME_WIDTH / 2, GAME_HEIGHT * 0.2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// SKY BACKGROUND (gif)
// ============================================================
function drawSky() {
  if (skyBgImg.complete && skyBgImg.naturalWidth > 0) {
    ctx.drawImage(skyBgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    sky.addColorStop(0, '#87CEEB');
    sky.addColorStop(1, '#b8def5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

// ============================================================
// RENDERING
// ============================================================
function drawPlayerBird(x, y, w, h, invincible) {
  if (invincible) {
    // Blink effect during invincibility
    if (Math.floor(Date.now() / 80) % 2 === 0) return; // skip drawing every other 80ms
  }
  if (playerBirdImg.complete && playerBirdImg.naturalWidth > 0) {
    ctx.drawImage(playerBirdImg, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.fillStyle = '#2244cc';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemy(x, y, w, h) {
  if (planeImg.complete && planeImg.naturalWidth > 0) {
    ctx.drawImage(planeImg, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.fillStyle = '#4488cc';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
  }
}

function drawEnemies(enemies) {
  for (const e of enemies) {
    drawEnemy(e.x, e.y, e.width, e.height);
  }
}

function drawCoin(x, y, timestamp) {
  const size = COIN_SIZE;
  const pulse = 1 + Math.sin(timestamp / 200) * 0.1;
  const r = size / 2 * pulse;

  // Gold circle
  ctx.save();
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFA500';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner shine
  ctx.fillStyle = '#FFF8DC';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // "$" symbol
  ctx.fillStyle = '#B8860B';
  ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', x + 1, y + 1);
  ctx.restore();
}

function drawCoins(coins, timestamp) {
  for (const c of coins) {
    if (!c.collected) {
      drawCoin(c.x, c.y, timestamp);
    }
  }
}

// ============================================================
// HEARTS / HEALTH BAR
// ============================================================
function drawHearts(health) {
  const heartSize = 28;
  const spacing = 6;
  const startX = 16;
  const startY = 16;

  for (let i = 0; i < MAX_HEALTH; i++) {
    const x = startX + i * (heartSize + spacing);
    const isFilled = i < health;

    ctx.save();
    ctx.translate(x + heartSize / 2, startY + heartSize / 2);

    // Draw heart shape
    ctx.beginPath();
    const s = heartSize / 2;
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.3, -s, -s * 0.9, 0, -s * 0.5);
    ctx.bezierCurveTo(s, -s * 0.9, s, -s * 0.3, 0, s * 0.3);
    ctx.closePath();

    if (isFilled) {
      ctx.fillStyle = '#ff3355';
      ctx.shadowColor = '#ff3355';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ============================================================
// COIN PICKUP EFFECTS
// ============================================================
const coinPopups = [];

function addCoinPopup(x, y, points) {
  coinPopups.push({ x, y, points, timer: 40 });
}

function drawCoinPopups(dt) {
  for (let i = coinPopups.length - 1; i >= 0; i--) {
    const p = coinPopups[i];
    p.timer -= dt;
    p.y -= 1.5 * dt;
    if (p.timer <= 0) {
      coinPopups.splice(i, 1);
      continue;
    }
    const alpha = Math.min(p.timer / 20, 1);
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = `rgba(200, 150, 0, ${alpha})`;
    ctx.shadowBlur = 6;
    ctx.fillText(`+${p.points}`, p.x, p.y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// PiP OVERLAY
// ============================================================
const PIP = { width: 160, height: 120, margin: 10 };
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

let landmarks = [];

function drawPiP(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return;

  const x = canvas.width - PIP.width - PIP.margin;
  const y = canvas.height - PIP.height - PIP.margin;

  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  const videoAR = vw / vh;
  const pipAR = PIP.width / PIP.height;
  let sx, sy, sw, sh;
  if (videoAR > pipAR) {
    sh = vh; sw = vh * pipAR;
    sx = (vw - sw) / 2; sy = 0;
  } else {
    sw = vw; sh = vw / pipAR;
    sx = 0; sy = (vh - sh) / 2;
  }
  const cropX = sx / vw, cropY = sy / vh;
  const cropW = sw / vw, cropH = sh / vh;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.clip();
  ctx.translate(x + PIP.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, PIP.width, PIP.height);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  for (const lms of landmarks) {
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo((1 - (lms[a].x - cropX) / cropW) * PIP.width, ((lms[a].y - cropY) / cropH) * PIP.height);
      ctx.lineTo((1 - (lms[b].x - cropX) / cropW) * PIP.width, ((lms[b].y - cropY) / cropH) * PIP.height);
      ctx.stroke();
    }
    for (let i = 0; i < lms.length; i++) {
      ctx.beginPath();
      ctx.arc((1 - (lms[i].x - cropX) / cropW) * PIP.width, ((lms[i].y - cropY) / cropH) * PIP.height, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.stroke();

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

// ============================================================
// HUD
// ============================================================
function drawHUD(score) {
  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText(score, GAME_WIDTH / 2, 20);
  ctx.shadowBlur = 0;
}

// ============================================================
// SCREENS
// ============================================================
function drawMenuScreen(timestamp) {
  drawSky();

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('Sky Dodger', GAME_WIDTH / 2, GAME_HEIGHT * 0.30);
  ctx.shadowBlur = 0;

  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Point to steer \u2022 Dodge planes \u2022 Collect coins', GAME_WIDTH / 2, GAME_HEIGHT * 0.40);

  // Draw player bird in menu
  if (playerBirdImg.complete && playerBirdImg.naturalWidth > 0) {
    const bw = 120;
    const bh = bw * (playerBirdImg.naturalHeight / playerBirdImg.naturalWidth);
    ctx.drawImage(playerBirdImg, GAME_WIDTH / 2 - bw / 2, GAME_HEIGHT * 0.48, bw, bh);
  }

  const alpha = 0.5 + Math.sin(timestamp / 500) * 0.3;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillText('Show OPEN PALM to start', GAME_WIDTH / 2, GAME_HEIGHT * 0.72);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('or press Space', GAME_WIDTH / 2, GAME_HEIGHT * 0.78);
}

function drawGameOverScreen(score, timestamp, canRestart) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('Game Over', GAME_WIDTH / 2, GAME_HEIGHT * 0.32);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  const panelW = 200;
  const panelH = 100;
  ctx.beginPath();
  ctx.roundRect(GAME_WIDTH / 2 - panelW / 2, GAME_HEIGHT * 0.38, panelW, panelH, 12);
  ctx.fill();

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('SCORE', GAME_WIDTH / 2, GAME_HEIGHT * 0.42);

  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(score, GAME_WIDTH / 2, GAME_HEIGHT * 0.48);

  if (canRestart) {
    const alpha = 0.5 + Math.sin(timestamp / 500) * 0.3;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText('Show OPEN PALM to restart', GAME_WIDTH / 2, GAME_HEIGHT * 0.58);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('or press Space', GAME_WIDTH / 2, GAME_HEIGHT * 0.63);
  }
}

// ============================================================
// GAME STATE
// ============================================================
let state = 'MENU';
let playerY = GAME_HEIGHT / 2;
let health = MAX_HEALTH;
let invincibilityTimer = 0;
let enemyManager = new EnemyManager();
let coinManager = new CoinManager();
let lastTimestamp = 0;
let gameOverCooldown = 0;

function resetGame() {
  playerY = GAME_HEIGHT / 2;
  health = MAX_HEALTH;
  invincibilityTimer = 0;
  enemyManager.reset();
  coinManager.reset();
  targetY = null;
  gameOverCooldown = 0;
  shakeFrames = 0;
  speedUpTimer = 0;
  coinPopups.length = 0;
}

function saveHighScore(score) {
  try {
    const raw = localStorage.getItem('gesture-arcade-settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (!settings.highScores) settings.highScores = {};
      if (score > (settings.highScores['road-racer'] || 0)) {
        settings.highScores['road-racer'] = score;
        localStorage.setItem('gesture-arcade-settings', JSON.stringify(settings));
      }
    }
  } catch (_) {}
}

function onStart() {
  if (state === 'MENU') {
    state = 'PLAYING';
    resetGame();
    startWindSound();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'PLAYING';
    resetGame();
    startWindSound();
  }
}

// ============================================================
// INPUT
// ============================================================
const keysDown = new Set();

window.addEventListener('keydown', (e) => {
  keysDown.add(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    onStart();
  }
});

window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  onStart();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (state !== 'PLAYING') return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const normY = (touch.clientY - rect.top) / rect.height;
  targetY = pointYToGameY(normY);
}, { passive: false });

canvas.addEventListener('touchend', () => {
  targetY = null;
});

// ============================================================
// GESTURE ENGINE
// ============================================================
const engine = new GestureEngine();
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks;
  updatePointTarget(data.landmarks);
});

engine.on(GESTURES.OPEN_PALM, () => {
  onStart();
});

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    return;
  }

  const dt = Math.min((timestamp - lastTimestamp) / (1000 / 60), 1.5);
  lastTimestamp = timestamp;

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (state === 'MENU') {
    drawMenuScreen(timestamp);
    drawPiP(videoEl);
    return;
  }

  // Apply screen shake
  ctx.save();
  applyShake();

  if (state === 'PLAYING') {
    // Steering
    let keySteer = 0;
    if (keysDown.has('ArrowUp')) keySteer -= 1;
    if (keysDown.has('ArrowDown')) keySteer += 1;

    if (targetY !== null) {
      playerY += (targetY - playerY) * POINT_LERP * dt;
    } else if (keySteer !== 0) {
      playerY += keySteer * PLAYER_MAX_SPEED * dt;
    }

    // Clamp to sky area
    const halfBird = PLAYER_H / 2;
    playerY = Math.max(halfBird, Math.min(OCEAN_Y - halfBird, playerY));

    // Update enemies
    const result = enemyManager.update(dt);
    if (result.scored) playScoreBlip();
    if (result.speedUp) triggerSpeedUp();

    // Update coins
    coinManager.update(dt);

    // Coin collection
    const collected = checkCoinCollision(playerY, coinManager.coins);
    for (const c of collected) {
      enemyManager.score += COIN_POINTS;
      playCoinSound();
      addCoinPopup(c.x, c.y, COIN_POINTS);
    }

    // Invincibility countdown
    if (invincibilityTimer > 0) {
      invincibilityTimer -= dt;
    }

    // Collision with enemies
    if (invincibilityTimer <= 0 && checkCollision(playerY, enemyManager.enemies)) {
      health--;
      if (health <= 0) {
        state = 'GAME_OVER';
        gameOverCooldown = 30;
        stopWindSound();
        playCrash();
        triggerShake(20, 12);
        saveHighScore(enemyManager.score);
      } else {
        playHitSound();
        invincibilityTimer = INVINCIBILITY_FRAMES;
        triggerShake(10, 6);
      }
    }
  }

  if (state === 'GAME_OVER') {
    if (gameOverCooldown > 0) gameOverCooldown -= dt;
  }

  // Draw everything
  drawSky();
  drawCoins(coinManager.coins, timestamp);
  drawEnemies(enemyManager.enemies);
  drawPlayerBird(PLAYER_X, playerY, PLAYER_W, PLAYER_H, invincibilityTimer > 0);

  if (state === 'PLAYING') {
    drawHUD(enemyManager.score);
    drawHearts(health);
    drawSpeedUpFlash(dt);
    drawCoinPopups(dt);
  }

  if (state === 'GAME_OVER') {
    drawHUD(enemyManager.score);
    drawHearts(0);
    drawGameOverScreen(enemyManager.score, timestamp, gameOverCooldown <= 0);
  }

  ctx.restore(); // end shake transform

  drawPiP(videoEl);
}

// ============================================================
// INIT
// ============================================================
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
