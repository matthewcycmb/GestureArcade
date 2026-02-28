// Renderer — background, menu/ready/game-over screens, HUD, slice trail

// Dark wooden background with bamboo
export function drawBackground(ctx, gameWidth, gameHeight) {
  // Wood gradient
  const grad = ctx.createLinearGradient(0, 0, 0, gameHeight);
  grad.addColorStop(0, '#1a0e08');
  grad.addColorStop(0.3, '#2a1a10');
  grad.addColorStop(0.7, '#1e1008');
  grad.addColorStop(1, '#0f0804');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(255, 200, 150, 0.03)';
  ctx.lineWidth = 1;
  for (let y = 0; y < gameHeight; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.05) * 3);
    ctx.lineTo(gameWidth, y + Math.cos(y * 0.05) * 3);
    ctx.stroke();
  }

  // Bamboo decorative lines (sides)
  drawBamboo(ctx, 15, gameHeight);
  drawBamboo(ctx, gameWidth - 15, gameHeight);
}

function drawBamboo(ctx, x, height) {
  ctx.strokeStyle = 'rgba(100, 180, 80, 0.08)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();

  // Bamboo nodes
  ctx.strokeStyle = 'rgba(100, 180, 80, 0.12)';
  ctx.lineWidth = 8;
  for (let y = 50; y < height; y += 120) {
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.stroke();
  }
}

// Glowing slice trail
export function drawSliceTrail(ctx, trail, now) {
  if (trail.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < trail.length; i++) {
    const p0 = trail[i - 1];
    const p1 = trail[i];
    const age = now - p1.timestamp;
    const alpha = Math.max(0, 1 - age / 300);

    if (alpha <= 0) continue;

    // Outer glow
    ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.3})`;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Inner bright line
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  ctx.restore();
}

// Score display (top center, gold)
export function drawScore(ctx, score, gameWidth) {
  ctx.save();
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const x = gameWidth / 2;
  const y = 40;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(score, x + 2, y + 2);

  // Outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(score, x, y);

  // Fill — gold
  ctx.fillStyle = '#FFD700';
  ctx.fillText(score, x, y);

  ctx.restore();
}

// Lives display (hearts, top right)
export function drawLives(ctx, lives, gameWidth) {
  ctx.save();
  const heartSize = 20;
  const spacing = 28;
  const startX = gameWidth - 20;
  const y = 50;

  for (let i = 0; i < 3; i++) {
    const x = startX - i * spacing;
    const filled = i < lives;
    drawHeart(ctx, x, y, heartSize, filled);
  }

  ctx.restore();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);

  const s = size / 20;
  ctx.beginPath();
  ctx.moveTo(0, 3 * s);
  ctx.bezierCurveTo(0, -2 * s, -10 * s, -5 * s, -10 * s, 0);
  ctx.bezierCurveTo(-10 * s, 5 * s, 0, 10 * s, 0, 14 * s);
  ctx.bezierCurveTo(0, 10 * s, 10 * s, 5 * s, 10 * s, 0);
  ctx.bezierCurveTo(10 * s, -5 * s, 0, -2 * s, 0, 3 * s);
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = '#E53935';
    ctx.fill();
    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawMenuScreen(ctx, gameWidth, gameHeight, timestamp) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  const titleY = gameHeight * 0.22;
  ctx.font = 'bold 46px sans-serif';

  // Title shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText('Fruit Ninja', gameWidth / 2 + 2, titleY + 2);

  // Title outline
  ctx.strokeStyle = '#5D1E0F';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText('Fruit Ninja', gameWidth / 2, titleY);

  // Title fill — gradient red/orange
  ctx.fillStyle = '#FF6F00';
  ctx.fillText('Fruit Ninja', gameWidth / 2, titleY);

  // Subtitle
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('GESTURE ARCADE', gameWidth / 2, titleY + 34);

  // Decorative blade swoosh
  const swooshAlpha = 0.3 + 0.15 * Math.sin(timestamp / 800);
  ctx.strokeStyle = `rgba(255, 255, 255, ${swooshAlpha})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gameWidth * 0.25, gameHeight * 0.38);
  ctx.quadraticCurveTo(gameWidth * 0.5, gameHeight * 0.32, gameWidth * 0.75, gameHeight * 0.38);
  ctx.stroke();

  // Instruction — pulsing
  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 500);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  const instrY = gameHeight * 0.6;
  ctx.strokeText('Show open palm to start', gameWidth / 2, instrY);
  ctx.fillText('Show open palm to start', gameWidth / 2, instrY);

  // Secondary instruction
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or Click to start', gameWidth / 2, instrY + 28);

  ctx.restore();
}

export function drawReadyScreen(ctx, gameWidth, gameHeight, timestamp) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Get Ready!" text
  ctx.font = 'bold 38px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  const readyY = gameHeight * 0.25;
  ctx.strokeText('Get Ready!', gameWidth / 2, readyY);
  ctx.fillStyle = '#fff';
  ctx.fillText('Get Ready!', gameWidth / 2, readyY);

  // Pulsing instruction
  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 400);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  const instrY = gameHeight * 0.55;
  ctx.strokeText('Swipe your hand to slice!', gameWidth / 2, instrY);
  ctx.fillText('Swipe your hand to slice!', gameWidth / 2, instrY);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Show open palm to begin', gameWidth / 2, instrY + 28);

  ctx.restore();
}

export function drawGameOverScreen(ctx, score, gameWidth, gameHeight, timestamp, canRestart, reason) {
  ctx.save();

  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Game Over" text
  const panelY = gameHeight * 0.25;
  ctx.font = 'bold 42px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText('Game Over', gameWidth / 2, panelY);
  ctx.fillStyle = '#E53935';
  ctx.fillText('Game Over', gameWidth / 2, panelY);

  // Reason
  if (reason) {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(reason, gameWidth / 2, panelY + 32);
  }

  // Score panel
  const panelW = 200;
  const panelH = 80;
  const panelX = (gameWidth - panelW) / 2;
  const panelCenterY = panelY + 80;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelCenterY - panelH / 2, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('SCORE', gameWidth / 2, panelCenterY - 15);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#FFD700';
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
    const instrY = gameHeight * 0.6;
    ctx.strokeText('Show open palm to retry', gameWidth / 2, instrY);
    ctx.fillText('Show open palm to retry', gameWidth / 2, instrY);
  }

  ctx.restore();
}
