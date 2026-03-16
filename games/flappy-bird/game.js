import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import { Bird } from './bird.js';
import { PipeManager } from './pipes.js';
import { checkCollision } from './collision.js';
import { playFlap, playScore, playHit } from './audio.js';
import { mulberry32 } from './seeded-random.js';
import { multiplayer } from './multiplayer.js';
import {
  getGroundY,
  drawBackground,
  updateClouds,
  drawGround,
  drawScore,
  drawMenuScreen,
  drawReadyScreen,
  drawGameOverScreen,
  drawMultiplayerHUD,
  drawOpponentBird,
} from './renderer.js';

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 480;
const BASE_HEIGHT = 640;

const viewportAspect = window.innerWidth / window.innerHeight;
const baseAspect = GAME_WIDTH / BASE_HEIGHT;
const GAME_HEIGHT = viewportAspect < baseAspect
  ? Math.round(GAME_WIDTH / viewportAspect)
  : BASE_HEIGHT;
const GROUND_Y = getGroundY(GAME_HEIGHT);

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

function resizeCanvas() {
  const aspect = GAME_WIDTH / GAME_HEIGHT;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (w / h > aspect) { w = h * aspect; } else { h = w / aspect; }
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Game state ---
// Solo:  MENU | READY | PLAYING | GAME_OVER
// Multi: MP_LOBBY | MP_COUNTDOWN | PLAYING | MP_GAME_OVER
let state = 'MP_LOBBY'; // start at lobby so user picks solo vs multi
let mode = 'solo';      // 'solo' | 'multi'

let bird = new Bird(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.4);
let pipeManager = new PipeManager(GAME_WIDTH, GAME_HEIGHT, GROUND_Y);
let lastTimestamp = 0;
let gameOverCooldown = 0;

// Multiplayer state
let opponentBird = null;
let opponentScore = 0;
let opponentDead = false;
let mpCountdown = 3;
let mpCountdownTimer = 0;
let mpResultMsg = '';
let syncTimer = 0;
const SYNC_INTERVAL = 6; // send position sync every ~6 frames (~100ms at 60fps)

// --- Pinch detection ---
const BASE_PINCH_THRESHOLD = 0.06;
const BASE_RELEASE_THRESHOLD = 0.10;
const BASE_PALM_WIDTH = 0.18;
const MAX_PINCH_MS = 500;
let isPinched = false;
let pinchStartTime = 0;
let landmarks = [];

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function palmWidth(hand) {
  return distance2D(hand[5], hand[17]);
}

function checkPinch(lms) {
  if (!lms || lms.length === 0) {
    isPinched = false;
    pinchStartTime = 0;
    return;
  }
  const hand = lms[0];
  if (!hand || hand.length < 21) return;

  const thumbTip = hand[4];
  const indexTip = hand[8];
  const dist = distance2D(thumbTip, indexTip);

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
  const y = canvas.height - PIP.height - PIP.margin - 60;

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

// --- Game reset ---
function resetGame(seed) {
  bird = new Bird(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.4);
  const rng = seed != null ? mulberry32(seed) : Math.random;
  pipeManager = new PipeManager(GAME_WIDTH, GAME_HEIGHT, GROUND_Y, rng);
  gameOverCooldown = 0;
  syncTimer = 0;

  if (mode === 'multi') {
    opponentBird = new Bird(GAME_WIDTH * 0.3 + 8, GAME_HEIGHT * 0.4);
    opponentScore = 0;
    opponentDead = false;
  } else {
    opponentBird = null;
  }
}

// --- Flap action ---
function onFlap() {
  if (state === 'READY') {
    state = 'PLAYING';
    bird.flap();
    playFlap();
  } else if (state === 'PLAYING') {
    bird.flap();
    playFlap();
    if (mode === 'multi') {
      multiplayer.sendFlap();
    }
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0 && mode === 'solo') {
    // Go straight to PLAYING with a flap — avoids the pinch immediately
    // re-triggering from READY and the player missing the transition
    resetGame();
    state = 'PLAYING';
    bird.flap();
    playFlap();
  } else if (state === 'MENU') {
    state = 'READY';
    resetGame();
  }
}

// --- Lobby UI helpers ---
function showSection(id) {
  for (const el of document.querySelectorAll('.mp-section')) {
    el.style.display = 'none';
  }
  if (id) document.getElementById(id).style.display = 'flex';
}

function showLobby(section) {
  document.getElementById('lobby-ui').style.display = 'flex';
  showSection(section);
}

function hideLobby() {
  document.getElementById('lobby-ui').style.display = 'none';
}

// --- Button wiring ---
document.getElementById('btn-solo').addEventListener('click', () => {
  hideLobby();
  mode = 'solo';
  state = 'MENU';
});

document.getElementById('btn-create').addEventListener('click', () => {
  document.getElementById('mp-connect-error').textContent = '';
  showLobby('mp-create-section');
  document.getElementById('mp-code-display').textContent = '...';
  document.getElementById('mp-status').textContent = 'Connecting...';
  mode = 'multi';
  state = 'MP_LOBBY';
  multiplayer.connect();
  multiplayer.createRoom();
});

document.getElementById('btn-join-section').addEventListener('click', () => {
  document.getElementById('mp-connect-error').textContent = '';
  showLobby('mp-join-section');
  document.getElementById('mp-join-error').textContent = '';
  mode = 'multi';
  state = 'MP_LOBBY';
  multiplayer.connect();
});

document.getElementById('btn-join').addEventListener('click', () => {
  const code = document.getElementById('mp-code-input').value.trim().toUpperCase();
  if (code.length !== 4) {
    document.getElementById('mp-join-error').textContent = 'Enter a 4-letter code';
    return;
  }
  document.getElementById('mp-join-error').textContent = '';
  document.getElementById('mp-status').textContent = 'Joining...';
  multiplayer.joinRoom(code);
});

document.getElementById('btn-back-create').addEventListener('click', () => {
  multiplayer.disconnect();
  mode = 'solo';
  showLobby('mp-main');
});

document.getElementById('btn-back-join').addEventListener('click', () => {
  multiplayer.disconnect();
  mode = 'solo';
  showLobby('mp-main');
});

document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('mp-game-over').style.display = 'none';
  multiplayer.sendPlayAgain();
  resetGame(); // Reset bird so it's not stuck on the ground
  showLobby('mp-create-section');
  document.getElementById('mp-code-display').textContent = '';
  document.getElementById('mp-status').textContent = 'Waiting for opponent to accept rematch...';
  state = 'MP_LOBBY';
});

document.getElementById('btn-mp-quit').addEventListener('click', () => {
  document.getElementById('mp-game-over').style.display = 'none';
  multiplayer.disconnect();
  mode = 'solo';
  resetGame(); // Reset bird so it's not stuck on the ground
  state = 'MP_LOBBY';
  showLobby('mp-main');
});

// --- Multiplayer event handlers ---
multiplayer.on('ROOM_CREATED', ({ code }) => {
  showLobby('mp-create-section');
  document.getElementById('mp-code-display').textContent = code;
  document.getElementById('mp-status').textContent = 'Waiting for opponent to join with code:';
});

multiplayer.on('OPPONENT_JOINED', () => {
  document.getElementById('mp-status').textContent = 'Opponent joined! Get ready...';
  startMpCountdown();
});

multiplayer.on('JOIN_OK', ({ playerId }) => {
  // P2: hide join form, show waiting message
  showLobby('mp-create-section');
  document.getElementById('mp-code-display').textContent = '✓';
  document.getElementById('mp-status').textContent = `Joined as P${playerId}. Waiting to start...`;
  startMpCountdown();
});

multiplayer.on('JOIN_ERROR', ({ reason }) => {
  document.getElementById('mp-join-error').textContent = reason;
});

multiplayer.on('START', ({ seed }) => {
  hideLobby();
  resetGame(seed);
  state = 'PLAYING';
});

multiplayer.on('FLAP', () => {
  if (!opponentBird || state !== 'PLAYING') return;
  opponentBird.flap();
});

multiplayer.on('SYNC', ({ y, vy, score }) => {
  if (!opponentBird || state !== 'PLAYING') return;
  // Snap opponent bird to authoritative position
  opponentBird.y = y;
  opponentBird.velocity = vy;
  opponentScore = score;
});

multiplayer.on('OPPONENT_DEAD', ({ score }) => {
  opponentScore = score;
  opponentDead = true;
  // If local bird already died, we can now show full result
  if (state === 'MP_GAME_OVER') {
    const localScore = pipeManager.score;
    const p1Score = multiplayer.playerId === 1 ? localScore : opponentScore;
    const p2Score = multiplayer.playerId === 1 ? opponentScore : localScore;
    mpResultMsg = localScore > opponentScore
      ? `You win! P1: ${p1Score} — P2: ${p2Score}`
      : localScore === opponentScore
        ? `Draw! Both scored ${localScore}`
        : `You lose. P1: ${p1Score} — P2: ${p2Score}`;
    showMpGameOver();
  }
});

// Rematch flow: opponent requested a rematch while we're on game over screen
multiplayer.on('REMATCH_REQUESTED', () => {
  // Auto-accept: send play again back and wait for REMATCH_START
  document.getElementById('mp-game-over').style.display = 'none';
  resetGame(); // Reset bird so it's not stuck on the ground
  multiplayer.sendPlayAgain();
  showLobby('mp-create-section');
  document.getElementById('mp-code-display').textContent = '';
  document.getElementById('mp-status').textContent = 'Rematch starting...';
  state = 'MP_LOBBY';
});

multiplayer.on('REMATCH_WAITING', () => {
  // We requested first — just update status text
  document.getElementById('mp-status').textContent = 'Waiting for opponent to accept rematch...';
});

multiplayer.on('REMATCH_START', () => {
  // Both players accepted — start countdown
  startMpCountdown();
});

multiplayer.on('OPPONENT_DISCONNECTED', () => {
  if (state === 'PLAYING' || state === 'MP_GAME_OVER') {
    mpResultMsg = `Opponent disconnected. Your score: ${pipeManager.score}`;
    state = 'MP_GAME_OVER';
    showMpGameOver();
  } else {
    // During lobby or countdown — go back to main menu
    hideLobby();
    document.getElementById('mp-game-over').style.display = 'none';
    showLobby('mp-main');
    document.getElementById('mp-connect-error').textContent = 'Opponent disconnected.';
    multiplayer.disconnect();
    mode = 'solo';
    state = 'MP_LOBBY';
  }
});

multiplayer.on('disconnected', () => {
  if (state === 'PLAYING' && mode === 'multi') {
    mpResultMsg = `Disconnected. Your score: ${pipeManager.score}`;
    state = 'MP_GAME_OVER';
    showMpGameOver();
  } else if (state === 'MP_LOBBY' && mode === 'multi') {
    // Connection failed before a room was created — show error and go back to main
    showLobby('mp-main');
    const errEl = document.getElementById('mp-connect-error');
    if (errEl) errEl.textContent = 'Could not connect to server. Is the relay running?';
    state = 'MP_LOBBY';
    mode = 'solo';
  }
});

multiplayer.on('error', () => {
  if (state === 'MP_LOBBY') {
    showLobby('mp-main');
    const errEl = document.getElementById('mp-connect-error');
    if (errEl) errEl.textContent = 'Could not connect to relay server.';
    state = 'MP_LOBBY';
    mode = 'solo';
  }
});

function startMpCountdown() {
  mpCountdown = 3;
  mpCountdownTimer = 0;
  resetGame(); // Ensure bird is in starting position for countdown
  state = 'MP_COUNTDOWN';
  hideLobby();
}

function showMpGameOver() {
  document.getElementById('mp-result-msg').textContent = mpResultMsg;
  document.getElementById('mp-game-over').style.display = 'flex';
}

// --- Fallback controls ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); onFlap(); }
});
canvas.addEventListener('click', () => onFlap());
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onFlap(); }, { passive: false });

// --- GestureEngine ---
const engine = new GestureEngine();
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks;
  checkPinch(data.landmarks);
});

// --- Game loop ---
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!lastTimestamp) { lastTimestamp = timestamp; return; }
  const dt = Math.min((timestamp - lastTimestamp) / (1000 / 60), 1.5);
  lastTimestamp = timestamp;

  updateClouds(dt, GAME_WIDTH);

  if (state === 'MENU') {
    bird.bob(timestamp);
  } else if (state === 'READY') {
    bird.bob(timestamp);
  } else if (state === 'MP_LOBBY') {
    bird.bob(timestamp);
  } else if (state === 'MP_COUNTDOWN') {
    bird.bob(timestamp);
    if (opponentBird) opponentBird.bob(timestamp);
    mpCountdownTimer += dt;
    if (mpCountdownTimer >= 60) {
      mpCountdownTimer = 0;
      mpCountdown--;
      if (mpCountdown <= 0) {
        multiplayer.sendReady();
        mpCountdown = 0; // stay at 0 until START arrives
      }
    }
  } else if (state === 'PLAYING') {
    bird.update(dt);
    if (mode === 'multi' && opponentBird && !opponentDead) {
      opponentBird.update(dt);
    }

    const scored = pipeManager.update(dt, bird.x);
    if (scored) playScore();

    // Send periodic position sync to opponent
    if (mode === 'multi') {
      syncTimer += dt;
      if (syncTimer >= SYNC_INTERVAL) {
        syncTimer = 0;
        multiplayer.sendSync(bird.y, bird.velocity, pipeManager.score);
      }
    }

    if (checkCollision(bird, pipeManager, GROUND_Y)) {
      playHit();
      if (mode === 'multi') {
        multiplayer.sendDead(pipeManager.score);
        state = 'MP_GAME_OVER';
        gameOverCooldown = 30;
        if (opponentDead) {
          // Both dead — show result now
          const localScore = pipeManager.score;
          const p1 = multiplayer.playerId === 1 ? localScore : opponentScore;
          const p2 = multiplayer.playerId === 1 ? opponentScore : localScore;
          mpResultMsg = localScore > opponentScore
            ? `You win! P1: ${p1} — P2: ${p2}`
            : localScore === opponentScore
              ? `Draw! Both scored ${localScore}`
              : `You lose. P1: ${p1} — P2: ${p2}`;
          setTimeout(showMpGameOver, 1200);
        } else {
          mpResultMsg = `You crashed! Waiting for opponent...`;
          setTimeout(showMpGameOver, 1200);
        }
      } else {
        state = 'GAME_OVER';
        gameOverCooldown = 30;
      }
    }
  } else if (state === 'GAME_OVER' || state === 'MP_GAME_OVER') {
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

  if (state === 'PLAYING' || state === 'GAME_OVER' || state === 'MP_GAME_OVER') {
    pipeManager.draw(ctx);
  }

  drawGround(ctx, GAME_WIDTH, GAME_HEIGHT,
    (['MENU','READY','PLAYING','MP_COUNTDOWN'].includes(state)) ? pipeManager.speed : 0,
    dt
  );

  if (mode === 'multi' && opponentBird && (state === 'PLAYING' || state === 'MP_GAME_OVER')) {
    drawOpponentBird(ctx, opponentBird);
  }

  bird.draw(ctx);

  // Overlays
  if (state === 'MENU') {
    drawMenuScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'READY') {
    drawReadyScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp);
  } else if (state === 'MP_COUNTDOWN') {
    drawMpCountdown(ctx, GAME_WIDTH, GAME_HEIGHT);
  } else if (state === 'PLAYING') {
    if (mode === 'solo') {
      drawScore(ctx, pipeManager.score, GAME_WIDTH);
    } else {
      const local = pipeManager.score;
      const p1 = multiplayer.playerId === 1 ? local : opponentScore;
      const p2 = multiplayer.playerId === 1 ? opponentScore : local;
      drawMultiplayerHUD(ctx, p1, p2, GAME_WIDTH);
    }
  } else if (state === 'GAME_OVER') {
    drawScore(ctx, pipeManager.score, GAME_WIDTH);
    drawGameOverScreen(ctx, pipeManager.score, GAME_WIDTH, GAME_HEIGHT, timestamp, gameOverCooldown <= 0);
  } else if (state === 'MP_GAME_OVER') {
    const local = pipeManager.score;
    const p1 = multiplayer.playerId === 1 ? local : opponentScore;
    const p2 = multiplayer.playerId === 1 ? opponentScore : local;
    drawMultiplayerHUD(ctx, p1, p2, GAME_WIDTH);
  }

  drawPiP(videoEl);
}

function drawMpCountdown(ctx, gameWidth, gameHeight) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const label = mpCountdown > 0 ? String(mpCountdown) : 'GO!';
  ctx.font = 'bold 72px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeText(label, gameWidth / 2, gameHeight * 0.35);
  ctx.fillStyle = mpCountdown > 0 ? '#F7DC6F' : '#2ECC71';
  ctx.fillText(label, gameWidth / 2, gameHeight * 0.35);

  ctx.font = 'bold 20px sans-serif';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeText('Get ready!', gameWidth / 2, gameHeight * 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Get ready!', gameWidth / 2, gameHeight * 0.5);

  ctx.restore();
}

// --- Init ---
async function init() {
  // Show lobby overlay on load
  showLobby('mp-main');

  try {
    await engine.start();
    videoEl = engine.getVideoElement();
  } catch (err) {
    console.warn('GestureEngine failed to start:', err.message);
  }

  requestAnimationFrame(gameLoop);
}

init();

export { state, bird, pipeManager, onFlap, resetGame, checkPinch, isPinched, mode };
