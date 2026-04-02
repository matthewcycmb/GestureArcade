// Renderer — background, ground, clouds, UI screens, HUD

const GROUND_HEIGHT = 80;
const GRASS_HEIGHT = 16;

// Animated sky background — 12 extracted PNG frames
const BG_FRAME_COUNT = 12;
const BG_FRAME_DURATION = 120; // ms per frame
const bgFrames = [];
for (let i = 0; i < BG_FRAME_COUNT; i++) {
  const img = document.createElement('img');
  img.src = `./assets/bg-frame-${i}.png`;
  bgFrames.push(img);
}
let bgFrameIndex = 0;
let bgFrameTimer = 0;
let bgLastTimestamp = 0;

/** Preload all background frames. Call from init(). */
export function preloadBgFrames() {
  return Promise.all(bgFrames.map(img => new Promise(resolve => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = resolve;
    img.onerror = () => { console.error('Failed to load:', img.src); resolve(); };
  })));
}

/** Advance background animation — call once per frame from game loop. */
export function updateBgAnimation(timestamp) {
  if (!bgLastTimestamp) { bgLastTimestamp = timestamp; return; }
  const dtMs = timestamp - bgLastTimestamp;
  bgLastTimestamp = timestamp;
  bgFrameTimer += dtMs;
  if (bgFrameTimer >= BG_FRAME_DURATION) {
    bgFrameTimer -= BG_FRAME_DURATION;
    bgFrameIndex = (bgFrameIndex + 1) % BG_FRAME_COUNT;
  }
}

export function getGroundY(gameHeight) {
  return gameHeight; // no ground — full sky
}

export function drawBackground(ctx, gameWidth, gameHeight) {
  const frame = bgFrames[bgFrameIndex];
  if (frame && frame.complete && frame.naturalWidth > 0) {
    ctx.drawImage(frame, 0, 0, gameWidth, gameHeight);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, gameHeight);
    grad.addColorStop(0, '#c5dde8');
    grad.addColorStop(1, '#e8eff4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameWidth, gameHeight);
  }
}

export function updateClouds(dt, gameWidth) {
  // No-op — clouds are now part of the animated background
}

// Ground scroll offset
let groundOffset = 0;

export function drawGround(ctx, gameWidth, gameHeight, scrollSpeed, dt) {
  const groundY = gameHeight - GROUND_HEIGHT;

  groundOffset = (groundOffset + scrollSpeed * dt) % 24;

  // Dirt
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(0, groundY, gameWidth, GROUND_HEIGHT);

  // Dirt texture lines
  ctx.strokeStyle = '#7A5B0F';
  ctx.lineWidth = 1;
  for (let x = -groundOffset; x < gameWidth; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + GRASS_HEIGHT + 10);
    ctx.lineTo(x + 12, groundY + GROUND_HEIGHT);
    ctx.stroke();
  }

  // Grass layer
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, groundY, gameWidth, GRASS_HEIGHT);

  // Grass highlight
  ctx.fillStyle = '#66BB6A';
  ctx.fillRect(0, groundY, gameWidth, 4);

  // Grass tufts
  ctx.fillStyle = '#388E3C';
  for (let x = -groundOffset; x < gameWidth + 12; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + 3, groundY - 4);
    ctx.lineTo(x + 6, groundY);
    ctx.fill();
  }

  // Ground top border
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(gameWidth, groundY);
  ctx.stroke();
}

export function drawScore(ctx, score, gameWidth) {
  ctx.save();
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const x = gameWidth / 2;
  const y = 40;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText(score, x + 2, y + 2);

  // Outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(score, x, y);

  // Fill
  ctx.fillStyle = '#fff';
  ctx.fillText(score, x, y);

  ctx.restore();
}

export function drawMenuScreen(ctx, gameWidth, gameHeight, timestamp) {
  // Title
  ctx.save();
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleY = gameHeight * 0.2;

  // Title shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText('Flappy Bird', gameWidth / 2 + 2, titleY + 2);

  // Title outline
  ctx.strokeStyle = '#1A5276';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText('Flappy Bird', gameWidth / 2, titleY);

  // Title fill
  ctx.fillStyle = '#F7DC6F';
  ctx.fillText('Flappy Bird', gameWidth / 2, titleY);

  // Subtitle
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('GESTURE ARCADE', gameWidth / 2, titleY + 32);

  // Instruction — pulsing
  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 500);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  const instrY = gameHeight * 0.65;
  ctx.strokeText('Pinch to flap!', gameWidth / 2, instrY);
  ctx.fillText('Pinch to flap!', gameWidth / 2, instrY);

  // Secondary instruction
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('or press Space / Click', gameWidth / 2, instrY + 28);

  ctx.restore();
}

export function drawReadyScreen(ctx, gameWidth, gameHeight, timestamp) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Get Ready!" text
  ctx.font = 'bold 36px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  const readyY = gameHeight * 0.22;
  ctx.strokeText('Get Ready!', gameWidth / 2, readyY);
  ctx.fillStyle = '#fff';
  ctx.fillText('Get Ready!', gameWidth / 2, readyY);

  // Pulsing instruction
  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 400);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  const instrY = gameHeight * 0.6;
  ctx.strokeText('Pinch to begin!', gameWidth / 2, instrY);
  ctx.fillText('Pinch to begin!', gameWidth / 2, instrY);

  ctx.restore();
}

export function drawGameOverScreen(ctx, score, gameWidth, gameHeight, timestamp, canRestart) {
  ctx.save();

  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Game Over" text
  const panelY = gameHeight * 0.3;
  ctx.font = 'bold 40px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText('Game Over', gameWidth / 2, panelY);
  ctx.fillStyle = '#E74C3C';
  ctx.fillText('Game Over', gameWidth / 2, panelY);

  // Score panel
  const panelW = 200;
  const panelH = 80;
  const panelX = (gameWidth - panelW) / 2;
  const panelCenterY = panelY + 70;

  // Panel background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelCenterY - panelH / 2, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Score label
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('SCORE', gameWidth / 2, panelCenterY - 15);

  // Score value
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#F7DC6F';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(score, gameWidth / 2, panelCenterY + 18);
  ctx.fillText(score, gameWidth / 2, panelCenterY + 18);

  // Restart instruction
  if (canRestart) {
    const alpha = 0.5 + 0.5 * Math.sin(timestamp / 500);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    const instrY = gameHeight * 0.65;
    ctx.strokeText('Pinch to retry', gameWidth / 2, instrY);
    ctx.fillText('Pinch to retry', gameWidth / 2, instrY);
  }

  ctx.restore();
}

// --- Multiplayer HUD ---

/**
 * Draw split score display for multiplayer: "P1: 7    P2: 4"
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} p1Score
 * @param {number} p2Score
 * @param {number} gameWidth
 */
export function drawMultiplayerHUD(ctx, p1Score, p2Score, gameWidth) {
  ctx.save();
  ctx.font = 'bold 32px sans-serif';
  ctx.textBaseline = 'top';

  const y = 12;
  const padding = 16;

  // P1 score (left)
  const p1Text = `P1: ${p1Score}`;
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(p1Text, padding + 2, y + 2);
  ctx.fillStyle = '#F7DC6F'; // yellow — local player
  ctx.fillText(p1Text, padding, y);

  // P2 score (right)
  const p2Text = `P2: ${p2Score}`;
  ctx.textAlign = 'right';
  ctx.strokeText(p2Text, gameWidth - padding + 2, y + 2);
  ctx.fillStyle = '#5DADE2'; // blue — opponent
  ctx.fillText(p2Text, gameWidth - padding, y);

  ctx.restore();
}

// --- Opponent bird (blue tint) ---

/**
 * Draw the opponent bird with a blue color scheme.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, velocity: number, rotation: number, wingAngle: number, width: number, height: number }} bird
 */
export function drawOpponentBird(ctx, bird) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate((bird.rotation * Math.PI) / 180);

  const w = bird.width;
  const h = bird.height;

  // Body — blue
  ctx.fillStyle = '#5DADE2';
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1A5276';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belly — light blue
  ctx.fillStyle = '#AED6F1';
  ctx.beginPath();
  ctx.ellipse(2, 3, w / 3, h / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing — dark blue, animated
  const wingFlap = Math.sin(bird.wingAngle * 4) * 5;
  ctx.fillStyle = '#2980B9';
  ctx.beginPath();
  ctx.ellipse(-4, -2 + wingFlap, 10, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1A5276';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(10, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(12, -5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak — orange
  ctx.fillStyle = '#F39C12';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(22, 2);
  ctx.lineTo(14, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
