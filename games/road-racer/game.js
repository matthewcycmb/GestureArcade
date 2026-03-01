import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import {
  GAME_WIDTH, GAME_HEIGHT, ROAD_TOP, ROAD_BOTTOM, VANISH_X,
  ROAD_WIDTH_BOTTOM, ROAD_WIDTH_TOP, LANE_COUNT,
  PLAYER_Y, PLAYER_CAR_W, PLAYER_CAR_H, PLAYER_MAX_SPEED,
  BASE_ENEMY_SPEED,
  getRoadXAtZ, getLaneX, scaleAtZ,
  computePointX, pointXToRoadX, EnemyManager, checkCollision,
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
// AUDIO (procedural Web Audio)
// ============================================================
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
const POINT_LERP = 0.15; // how quickly car follows finger (0..1, higher = snappier)

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

function startEngineHum() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 80;
    const { volume } = getAudioSettings();
    engineGain.gain.value = 0.04 * volume;
    engineOsc.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
  } catch (_) {}
}

function updateEngineHum(speedKmh) {
  if (!engineOsc || !engineGain) return;
  try {
    const { volume, muted } = getAudioSettings();
    engineGain.gain.value = muted ? 0 : 0.04 * volume;
    const t = Math.min((speedKmh - 60) / 140, 1);
    engineOsc.frequency.value = 80 + t * 80;
  } catch (_) {}
}

function stopEngineHum() {
  try {
    if (engineOsc) { engineOsc.stop(); engineOsc = null; }
    engineGain = null;
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
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12 * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

function playCrash() {
  try {
    const { muted, volume } = getAudioSettings();
    if (muted) return;
    const ctx = getAudioCtx();
    const bufSize = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.18 * volume, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    noise.connect(ng);
    ng.connect(ctx.destination);
    noise.start(ctx.currentTime);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.22 * volume, ctx.currentTime);
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
let targetX = null; // target road X from finger, or null if no hand

function updatePointTarget(lms) {
  if (!lms || lms.length === 0) {
    targetX = null;
    return;
  }
  const normX = computePointX(lms[0]);
  if (normX === null) { targetX = null; return; }
  targetX = pointXToRoadX(normX);
}

// ============================================================
// RENDERING
// ============================================================
let stripeOffset = 0;

function drawRoad(dt, speedKmh) {
  // Sky gradient (night theme)
  const sky = ctx.createLinearGradient(0, 0, 0, ROAD_TOP + 50);
  sky.addColorStop(0, '#0a0a2e');
  sky.addColorStop(0.5, '#1a1a4e');
  sky.addColorStop(1, '#2a2a3e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, ROAD_TOP + 50);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const starSeed = [37, 89, 142, 203, 267, 321, 388, 411, 455, 12, 55, 170, 240, 310, 380, 430];
  for (let i = 0; i < starSeed.length; i++) {
    const sx = (starSeed[i] * 7 + i * 43) % GAME_WIDTH;
    const sy = (starSeed[i] * 3 + i * 17) % (ROAD_TOP - 10);
    const sr = ((i % 3) + 1) * 0.6;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Road strips from bottom to top
  const strips = 80;
  for (let i = 0; i < strips; i++) {
    const z1 = i / strips;
    const z2 = (i + 1) / strips;
    const r1 = getRoadXAtZ(z1);
    const r2 = getRoadXAtZ(z2);

    // Grass
    const grassShade = i % 4 < 2 ? '#1a3a1a' : '#163016';
    ctx.fillStyle = grassShade;
    ctx.fillRect(0, r2.y, GAME_WIDTH, r1.y - r2.y + 1);

    // Road surface
    const roadShade = i % 4 < 2 ? '#333' : '#383838';
    ctx.fillStyle = roadShade;
    ctx.beginPath();
    ctx.moveTo(r2.leftEdge, r2.y);
    ctx.lineTo(r2.rightEdge, r2.y);
    ctx.lineTo(r1.rightEdge, r1.y);
    ctx.lineTo(r1.leftEdge, r1.y);
    ctx.closePath();
    ctx.fill();

    // Road edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = Math.max(1, z1 * 3);
    ctx.beginPath();
    ctx.moveTo(r1.leftEdge, r1.y);
    ctx.lineTo(r2.leftEdge, r2.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r1.rightEdge, r1.y);
    ctx.lineTo(r2.rightEdge, r2.y);
    ctx.stroke();
  }

  // Dashed lane markings
  stripeOffset += (speedKmh / 60) * 0.3 * dt;
  if (stripeOffset > 1) stripeOffset -= 1;

  for (let lane = 1; lane < LANE_COUNT; lane++) {
    for (let i = 0; i < 20; i++) {
      const baseZ = (i + stripeOffset) / 20;
      if (baseZ < 0 || baseZ > 1) continue;
      const z1 = baseZ;
      const z2 = Math.min(baseZ + 0.025, 1);
      const r1 = getRoadXAtZ(z1);
      const r2 = getRoadXAtZ(z2);
      const laneW1 = r1.width / LANE_COUNT;
      const laneW2 = r2.width / LANE_COUNT;
      const bx1 = r1.leftEdge + laneW1 * lane;
      const bx2 = r2.leftEdge + laneW2 * lane;

      if (i % 2 === 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.2 + z1 * 0.4})`;
        ctx.lineWidth = Math.max(1, z1 * 3);
        ctx.beginPath();
        ctx.moveTo(bx1, r1.y);
        ctx.lineTo(bx2, r2.y);
        ctx.stroke();
      }
    }
  }
}

function drawCar(x, y, w, h, color, isPlayer) {
  ctx.save();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, [6, 6, 4, 4]);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - w / 2 + 4, y - h * 0.65, w - 8, h * 0.25);

  ctx.fillStyle = isPlayer ? 'rgba(100,180,255,0.5)' : 'rgba(150,200,255,0.4)';
  const wsW = w * 0.7;
  const wsH = h * 0.2;
  ctx.beginPath();
  ctx.roundRect(x - wsW / 2, y - h * 0.85, wsW, wsH, 3);
  ctx.fill();

  if (isPlayer) {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x - w / 2 + 8, y - h + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2 - 8, y - h + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#ff3333';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(x - w / 2 + 6, y - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w / 2 - 6, y - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawEnemies(enemies) {
  const sorted = [...enemies].sort((a, b) => a.z - b.z);
  for (const e of sorted) {
    const s = scaleAtZ(e.z);
    const ex = getLaneX(e.lane, e.z);
    const ey = getRoadXAtZ(e.z).y;
    drawCar(ex, ey, e.width * s, e.height * s, e.color, false);
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

  // Cover-crop: preserve video aspect ratio instead of stretching
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
function drawHUD(score, speedKmh) {
  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText(score, GAME_WIDTH / 2, 20);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`${Math.round(speedKmh)} km/h`, 16, 24);
}

// ============================================================
// SCREENS
// ============================================================
function drawMenuScreen(timestamp) {
  drawRoad(0, 0);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('Road Racer', GAME_WIDTH / 2, GAME_HEIGHT * 0.35);
  ctx.shadowBlur = 0;

  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Point to steer', GAME_WIDTH / 2, GAME_HEIGHT * 0.42);

  const alpha = 0.5 + Math.sin(timestamp / 500) * 0.3;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillText('Show OPEN PALM to start', GAME_WIDTH / 2, GAME_HEIGHT * 0.55);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('or press Space', GAME_WIDTH / 2, GAME_HEIGHT * 0.60);
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
let playerX = GAME_WIDTH / 2;
let enemyManager = new EnemyManager();
let lastTimestamp = 0;
let gameOverCooldown = 0;

function getSpeedKmh() {
  const ratio = enemyManager.enemySpeed / BASE_ENEMY_SPEED;
  return 60 + (ratio - 1) * 140;
}

function resetGame() {
  playerX = GAME_WIDTH / 2;
  enemyManager.reset();
  targetX = null;
  gameOverCooldown = 0;
  stripeOffset = 0;
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
    startEngineHum();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'PLAYING';
    resetGame();
    startEngineHum();
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

  if (state === 'PLAYING') {
    // Keyboard fallback steering
    let keySteer = 0;
    if (keysDown.has('ArrowLeft')) keySteer -= 1;
    if (keysDown.has('ArrowRight')) keySteer += 1;

    if (targetX !== null) {
      // Point tracking: lerp toward finger target
      playerX += (targetX - playerX) * POINT_LERP * dt;
    } else if (keySteer !== 0) {
      playerX += keySteer * PLAYER_MAX_SPEED * dt;
    }

    // Clamp to road boundaries
    const roadAtPlayer = getRoadXAtZ(1);
    const halfCar = PLAYER_CAR_W / 2;
    playerX = Math.max(roadAtPlayer.leftEdge + halfCar, Math.min(roadAtPlayer.rightEdge - halfCar, playerX));

    const scored = enemyManager.update(dt);
    if (scored) playScoreBlip();

    updateEngineHum(getSpeedKmh());

    if (checkCollision(playerX, enemyManager.enemies)) {
      state = 'GAME_OVER';
      gameOverCooldown = 30;
      stopEngineHum();
      playCrash();
      saveHighScore(enemyManager.score);
    }
  }

  if (state === 'GAME_OVER') {
    if (gameOverCooldown > 0) gameOverCooldown -= dt;
  }

  const speedKmh = getSpeedKmh();
  drawRoad(dt, state === 'PLAYING' ? speedKmh : 0);
  drawEnemies(enemyManager.enemies);
  drawCar(playerX, PLAYER_Y, PLAYER_CAR_W, PLAYER_CAR_H, '#e74c3c', true);

  if (state === 'PLAYING') {
    drawHUD(enemyManager.score, speedKmh);
  }

  if (state === 'GAME_OVER') {
    drawHUD(enemyManager.score, 0);
    drawGameOverScreen(enemyManager.score, timestamp, gameOverCooldown <= 0);
  }

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
