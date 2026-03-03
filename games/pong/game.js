import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';
import { Paddle } from './paddle.js';
import { Ball } from './ball.js';
import { AI } from './ai.js';
import { checkBallPaddle, checkBallWalls, checkBallOutOfBounds } from './collision.js';
import { playPaddleHit, playWallBounce, playScore, playGameOver } from './audio.js';
import {
  drawCourt,
  drawScores,
  drawMenuScreen,
  drawReadyScreen,
  drawCountdown,
  drawGameOverScreen,
  getMenuZones,
  PADDLE_INSET,
} from './renderer.js';

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const WIN_SCORE = 7;
const SERVE_DELAY = 90; // frames (~1.5s at 60fps)

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
let mode = '1P';    // 1P | 2P
let hoverZone = null; // '1P' | '2P' | null — for menu hover

// Convert screen (mouse) coordinates to game coordinates
function screenToGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * GAME_WIDTH,
    y: (clientY - rect.top) / rect.height * GAME_HEIGHT,
  };
}

function hitTestMenuZone(gx, gy) {
  const zones = getMenuZones(GAME_WIDTH, GAME_HEIGHT);
  for (const [key, z] of Object.entries(zones)) {
    if (gx >= z.x && gx <= z.x + z.w && gy >= z.y && gy <= z.y + z.h) {
      return key;
    }
  }
  return null;
}

let leftScore = 0;
let rightScore = 0;

let leftPaddle = new Paddle(PADDLE_INSET, GAME_HEIGHT);
let rightPaddle = new Paddle(GAME_WIDTH - PADDLE_INSET, GAME_HEIGHT);
let ball = new Ball(GAME_WIDTH, GAME_HEIGHT);
let ai = new AI(GAME_WIDTH - PADDLE_INSET, GAME_WIDTH, GAME_HEIGHT);

let serveTimer = 0;
let lastTimestamp = 0;
let gameOverCooldown = 0;

// Keyboard paddle control state
const keys = {};

// --- Landmarks ---
let landmarks = [];
let handednesses = [];

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

function getHandColor(index) {
  if (mode !== '2P' || handednesses.length < 2) return 'rgba(0, 255, 100, 0.6)';
  const name = handednesses[index]?.[0]?.categoryName;
  return name === 'Left' ? 'rgba(0, 255, 100, 0.6)' : 'rgba(80, 160, 255, 0.6)';
}

function drawPiP(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return;

  const x = mode === '2P'
    ? (canvas.width - PIP.width) / 2
    : canvas.width - PIP.width - PIP.margin;
  const y = mode === '2P'
    ? PIP.margin
    : canvas.height - PIP.height - PIP.margin;

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

  // Draw landmarks remapped to cropped view
  ctx.save();
  ctx.translate(x, y);
  for (let h = 0; h < landmarks.length; h++) {
    const lms = landmarks[h];
    const color = getHandColor(h);
    ctx.strokeStyle = color;
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

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.stroke();

  // LIVE badge
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

// --- Hand tracking → paddle mapping ---
// Map a comfortable camera sub-range to the full court height so the player
// doesn't need to reach the very edge of the camera frame.
const CAM_Y_MIN = 0.15; // wrist.y at "top" of comfortable range
const CAM_Y_MAX = 0.85; // wrist.y at "bottom" of comfortable range

function mapWristToCourtY(wristY) {
  const t = (wristY - CAM_Y_MIN) / (CAM_Y_MAX - CAM_Y_MIN); // 0–1 within comfort zone
  return Math.max(0, Math.min(1, t)) * GAME_HEIGHT;
}

function updatePaddlesFromHands() {
  if (landmarks.length === 0) return;

  if (mode === '1P') {
    // Any hand controls left paddle
    const wrist = landmarks[0][0];
    leftPaddle.setTarget(mapWristToCourtY(wrist.y));
  } else {
    // 2P: map by handedness
    for (let i = 0; i < landmarks.length; i++) {
      const name = handednesses[i]?.[0]?.categoryName;
      const wrist = landmarks[i][0];
      const targetY = mapWristToCourtY(wrist.y);

      if (name === 'Left') {
        leftPaddle.setTarget(targetY);
      } else if (name === 'Right') {
        rightPaddle.setTarget(targetY);
      }
    }
  }

}

// --- Keyboard paddle control ---
function updatePaddlesFromKeyboard(dt) {
  const speed = 8 * dt;

  if (mode === '1P') {
    if (keys['KeyW'] || keys['ArrowUp']) leftPaddle.setTarget(leftPaddle.y - speed);
    if (keys['KeyS'] || keys['ArrowDown']) leftPaddle.setTarget(leftPaddle.y + speed);
  } else {
    if (keys['KeyW']) leftPaddle.setTarget(leftPaddle.y - speed);
    if (keys['KeyS']) leftPaddle.setTarget(leftPaddle.y + speed);
    if (keys['ArrowUp']) rightPaddle.setTarget(rightPaddle.y - speed);
    if (keys['ArrowDown']) rightPaddle.setTarget(rightPaddle.y + speed);
  }
}

// --- Reset game ---
function resetGame() {
  leftScore = 0;
  rightScore = 0;
  leftPaddle = new Paddle(PADDLE_INSET, GAME_HEIGHT);
  rightPaddle = new Paddle(GAME_WIDTH - PADDLE_INSET, GAME_HEIGHT);
  ball = new Ball(GAME_WIDTH, GAME_HEIGHT);
  ai = new AI(GAME_WIDTH - PADDLE_INSET, GAME_WIDTH, GAME_HEIGHT);
  serveTimer = SERVE_DELAY;
  gameOverCooldown = 0;
}

function startServe(direction) {
  ball.reset(direction);
  serveTimer = SERVE_DELAY;
}

// --- Mouse input ---
canvas.addEventListener('mousemove', (e) => {
  if (state === 'MENU') {
    const { x, y } = screenToGame(e.clientX, e.clientY);
    hoverZone = hitTestMenuZone(x, y);
  }
});

canvas.addEventListener('click', (e) => {
  if (state === 'MENU') {
    const { x, y } = screenToGame(e.clientX, e.clientY);
    const zone = hitTestMenuZone(x, y);
    if (zone) {
      mode = zone;
      state = 'READY';
      resetGame();
    }
  } else if (state === 'READY') {
    state = 'PLAYING';
    startServe();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'MENU';
  }
});

// --- Touch input (mobile) ---
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const { x, y } = screenToGame(touch.clientX, touch.clientY);

  if (state === 'MENU') {
    const zone = hitTestMenuZone(x, y);
    if (zone) {
      mode = zone;
      state = 'READY';
      resetGame();
    }
  } else if (state === 'READY') {
    state = 'PLAYING';
    startServe();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'MENU';
  }
}, { passive: false });

canvas.style.cursor = 'pointer';

// --- Keyboard input ---
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (state === 'MENU') {
    if (e.code === 'Digit1') {
      mode = '1P';
      state = 'READY';
      resetGame();
    }
    if (e.code === 'Digit2') {
      mode = '2P';
      state = 'READY';
      resetGame();
    }
  } else if (state === 'READY') {
    if (e.code === 'Space') {
      e.preventDefault();
      state = 'PLAYING';
      startServe();
    }
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    if (e.code === 'Space') {
      e.preventDefault();
      state = 'MENU';
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// --- GestureEngine setup ---
const engine = new GestureEngine({ numHands: 2 });
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks;
  handednesses = data.handednesses || [];
});

engine.on(GESTURES.OPEN_PALM, () => {
  if (state === 'READY') {
    state = 'PLAYING';
    startServe();
  } else if (state === 'GAME_OVER' && gameOverCooldown <= 0) {
    state = 'MENU';
  }
});

// --- Game loop ---
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    return;
  }

  const dt = Math.min((timestamp - lastTimestamp) / (1000 / 60), 1.5);
  lastTimestamp = timestamp;

  // --- Update ---
  updatePaddlesFromHands();
  updatePaddlesFromKeyboard(dt);

  if (state === 'PLAYING') {
    // Serve countdown
    if (serveTimer > 0) {
      serveTimer -= dt;
      if (serveTimer <= 0) {
        ball.serve();
      }
    }

    // Ball update
    ball.update(dt);

    if (ball.active) {
      // Wall bounce
      if (checkBallWalls(ball, GAME_HEIGHT)) {
        ball.bounceWall();
        playWallBounce();
      }

      // Paddle collisions
      const leftHit = checkBallPaddle(ball, leftPaddle);
      if (leftHit.hit && ball.vx < 0) {
        ball.x = leftPaddle.x + leftPaddle.width / 2 + ball.radius;
        ball.bouncePaddle(leftHit.hitY, leftPaddle.height);
        playPaddleHit();
      }

      const rightHit = checkBallPaddle(ball, rightPaddle);
      if (rightHit.hit && ball.vx > 0) {
        ball.x = rightPaddle.x - rightPaddle.width / 2 - ball.radius;
        ball.bouncePaddle(rightHit.hitY, rightPaddle.height);
        playPaddleHit();
      }

      // Out of bounds (scoring)
      const oob = checkBallOutOfBounds(ball, GAME_WIDTH);
      if (oob.out) {
        if (oob.scorer === 'left') {
          leftScore++;
        } else {
          rightScore++;
        }
        playScore();

        // Check for game over
        if (leftScore >= WIN_SCORE || rightScore >= WIN_SCORE) {
          state = 'GAME_OVER';
          gameOverCooldown = 30;
          playGameOver();
        } else {
          // Serve toward the scorer's opponent
          startServe(oob.scorer === 'left' ? 1 : -1);
        }
      }
    }

    // AI update (1P mode, right paddle)
    if (mode === '1P') {
      ai.update(ball, timestamp, rightPaddle, dt);
    }
  }

  // Paddle physics (always — so keyboard works in all states)
  leftPaddle.update(dt);
  rightPaddle.update(dt);

  if (state === 'GAME_OVER' && gameOverCooldown > 0) {
    gameOverCooldown -= dt;
  }

  // --- Render ---
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawCourt(ctx, GAME_WIDTH, GAME_HEIGHT);

  if (state === 'PLAYING' || state === 'GAME_OVER') {
    drawScores(ctx, leftScore, rightScore, GAME_WIDTH);
    leftPaddle.draw(ctx);
    rightPaddle.draw(ctx);
    ball.draw(ctx);

    // Serve countdown overlay
    if (state === 'PLAYING' && serveTimer > 0) {
      const count = Math.ceil(serveTimer / (SERVE_DELAY / 3));
      drawCountdown(ctx, GAME_WIDTH, GAME_HEIGHT, count);
    }
  }

  if (state === 'MENU') {
    drawMenuScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp, hoverZone);
  } else if (state === 'READY') {
    // Show paddles in ready state too
    leftPaddle.draw(ctx);
    rightPaddle.draw(ctx);
    drawReadyScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp, mode);
  } else if (state === 'GAME_OVER') {
    drawGameOverScreen(ctx, GAME_WIDTH, GAME_HEIGHT, timestamp, leftScore, rightScore, mode, gameOverCooldown <= 0);
  }

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

export { state, mode, leftScore, rightScore, leftPaddle, rightPaddle, ball, ai, resetGame, startServe };
