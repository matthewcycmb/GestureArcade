// Renderer — background, ground, clouds, UI screens, HUD

const GROUND_HEIGHT = 80;
const GRASS_HEIGHT = 16;

// Cloud state
const clouds = [];
let cloudsInitialized = false;

function initClouds(gameWidth, gameHeight) {
  if (cloudsInitialized) return;
  cloudsInitialized = true;
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * gameWidth,
      y: 30 + Math.random() * (gameHeight * 0.35),
      size: 20 + Math.random() * 30,
      speed: 0.2 + Math.random() * 0.3,
    });
  }
}

export function getGroundY(gameHeight) {
  return gameHeight - GROUND_HEIGHT;
}

export function drawBackground(ctx, gameWidth, gameHeight) {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, gameHeight - GROUND_HEIGHT);
  grad.addColorStop(0, '#4FC3F7');
  grad.addColorStop(0.5, '#81D4FA');
  grad.addColorStop(1, '#B3E5FC');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, gameWidth, gameHeight - GROUND_HEIGHT);

  // Clouds
  initClouds(gameWidth, gameHeight);
  for (const cloud of clouds) {
    drawCloud(ctx, cloud.x, cloud.y, cloud.size);
  }
}

export function updateClouds(dt, gameWidth) {
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * dt;
    if (cloud.x < -cloud.size * 3) {
      cloud.x = gameWidth + cloud.size * 2;
      cloud.y = 30 + Math.random() * 200;
    }
  }
}

function drawCloud(ctx, x, y, size) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x + size * 1.4, y, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x - size * 0.5, y + size * 0.1, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
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
