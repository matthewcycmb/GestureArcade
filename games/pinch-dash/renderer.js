// Renderer — parallax background, ground, HUD, start/dead screens

const GROUND_HEIGHT = 80;

// --- Parallax layers ---
// Layer 1: stars
const stars = [];
let starsInit = false;

// Layer 2: grid lines
let gridOffset = 0;

// Ground scroll
let groundOffset = 0;

function initStars(gameWidth, gameHeight) {
  if (starsInit) return;
  starsInit = true;
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: Math.random() * gameWidth,
      y: Math.random() * (gameHeight - GROUND_HEIGHT),
      r: 0.4 + Math.random() * 1.2,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
}

export function updateBackground(dt, scrollSpeed, gameWidth) {
  gridOffset = (gridOffset + scrollSpeed * 0.3 * dt) % 80;
  groundOffset = (groundOffset + scrollSpeed * dt) % 40;

  for (const s of stars) {
    s.x -= scrollSpeed * 0.05 * dt;
    if (s.x < -2) s.x += gameWidth + 4;
  }
}

export function drawBackground(ctx, gameWidth, gameHeight) {
  initStars(gameWidth, gameHeight);

  // Gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, gameHeight - GROUND_HEIGHT);
  bgGrad.addColorStop(0, '#06061a');
  bgGrad.addColorStop(0.5, '#0a0a2e');
  bgGrad.addColorStop(1, '#0d1030');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Stars with twinkling
  for (const s of stars) {
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 1000 * s.twinkleSpeed + s.twinkleOffset));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.7})`;
    ctx.fill();
  }

  // Perspective grid — horizontal lines converge toward horizon
  const horizonY = gameHeight - GROUND_HEIGHT;
  ctx.strokeStyle = 'rgba(30,80,255,0.04)';
  ctx.lineWidth = 1;
  // Vertical grid lines
  for (let x = -gridOffset; x < gameWidth; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, horizonY);
    ctx.stroke();
  }
  // Horizontal grid lines (spaced further apart near top for depth)
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const y = horizonY * (0.3 + t * 0.7);
    const alpha = 0.02 + t * 0.04;
    ctx.strokeStyle = `rgba(30,80,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
}

export function drawGround(ctx, gameWidth, gameHeight, groundY) {
  // Ground fill — subtle gradient
  const gndGrad = ctx.createLinearGradient(0, groundY, 0, gameHeight);
  gndGrad.addColorStop(0, '#0c1025');
  gndGrad.addColorStop(1, '#060810');
  ctx.fillStyle = gndGrad;
  ctx.fillRect(0, groundY, gameWidth, GROUND_HEIGHT);

  // Primary edge line — bright glow
  ctx.save();
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(gameWidth, groundY);
  ctx.stroke();
  ctx.restore();

  // Secondary line underneath
  ctx.strokeStyle = 'rgba(0,255,204,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 4);
  ctx.lineTo(gameWidth, groundY + 4);
  ctx.stroke();

  // Scrolling tick marks
  ctx.strokeStyle = 'rgba(0,255,204,0.12)';
  ctx.lineWidth = 1;
  for (let x = -groundOffset; x < gameWidth; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + 10);
    ctx.lineTo(x, groundY + 22);
    ctx.stroke();
  }

  // Dashed mid-line
  ctx.strokeStyle = 'rgba(0,255,204,0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([12, 28]);
  ctx.lineDashOffset = -groundOffset;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 40);
  ctx.lineTo(gameWidth, groundY + 40);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawHUD(ctx, score, speed, gameWidth) {
  ctx.save();

  // Score — top-right with pill background
  const scoreText = `${Math.floor(score)} m`;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  const scoreW = ctx.measureText(scoreText).width;

  ctx.fillStyle = 'rgba(0,20,30,0.5)';
  ctx.beginPath();
  ctx.roundRect(gameWidth - scoreW - 28, 10, scoreW + 20, 28, 6);
  ctx.fill();

  ctx.fillStyle = '#00ffcc';
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 4;
  ctx.fillText(scoreText, gameWidth - 18, 14);
  ctx.shadowBlur = 0;

  // Speed — top-left, offset past back button
  const mult = (speed / 4.5).toFixed(1);
  const speedText = `${mult}x`;
  ctx.textAlign = 'left';
  ctx.font = 'bold 16px monospace';
  const speedW = ctx.measureText(speedText).width;

  ctx.fillStyle = 'rgba(0,20,30,0.5)';
  ctx.beginPath();
  ctx.roundRect(58, 12, speedW + 16, 24, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(180,190,255,0.8)';
  ctx.fillText(speedText, 66, 15);

  ctx.restore();
}

export function drawStartScreen(ctx, gameWidth, gameHeight, timestamp) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dim overlay for readability
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Title with strong glow
  const titleY = gameHeight * 0.3;
  ctx.font = 'bold 56px monospace';
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('PINCH DASH', gameWidth / 2, titleY);
  // Double render for stronger glow
  ctx.fillText('PINCH DASH', gameWidth / 2, titleY);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = 'rgba(150,160,255,0.6)';
  ctx.letterSpacing = '4px';
  ctx.fillText('GESTURE  ARCADE', gameWidth / 2, titleY + 38);

  // Divider line
  ctx.strokeStyle = 'rgba(0,255,204,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gameWidth / 2 - 80, titleY + 60);
  ctx.lineTo(gameWidth / 2 + 80, titleY + 60);
  ctx.stroke();

  // Main instruction — pulsing
  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 600);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.fillText('Pinch to jump!', gameWidth / 2, gameHeight * 0.58);
  ctx.shadowBlur = 0;

  // Alt controls
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('Space / Click / Touch', gameWidth / 2, gameHeight * 0.58 + 32);

  ctx.restore();
}

export function drawDeadScreen(ctx, score, gameWidth, gameHeight, timestamp, canRestart, highScore = 0) {
  ctx.save();

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "GAME OVER" with red glow
  ctx.font = 'bold 52px monospace';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff4444';
  ctx.fillText('GAME OVER', gameWidth / 2, gameHeight * 0.28);
  ctx.fillText('GAME OVER', gameWidth / 2, gameHeight * 0.28);
  ctx.shadowBlur = 0;

  // Score panel
  const panelW = 260;
  const panelH = 100;
  const panelX = (gameWidth - panelW) / 2;
  const panelY = gameHeight * 0.42 - panelH / 2;

  // Panel background
  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(0,30,40,0.85)');
  panelGrad.addColorStop(1, 'rgba(0,15,25,0.85)');
  ctx.fillStyle = panelGrad;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  // Panel border
  ctx.strokeStyle = 'rgba(0,255,204,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "DISTANCE" label
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = 'rgba(0,255,204,0.5)';
  ctx.fillText('DISTANCE', gameWidth / 2, panelY + 28);

  // Score value
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 10;
  ctx.fillText(`${Math.floor(score)} m`, gameWidth / 2, panelY + 65);
  ctx.shadowBlur = 0;

  // High score
  if (highScore > 0) {
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = 'rgba(180,190,255,0.6)';
    ctx.fillText(`BEST: ${highScore} m`, gameWidth / 2, panelY + panelH + 18);
  }

  // Restart instruction
  if (canRestart) {
    const alpha = 0.4 + 0.6 * Math.sin(timestamp / 500);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText('Pinch to retry', gameWidth / 2, gameHeight * 0.65);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('Space / Click / Touch', gameWidth / 2, gameHeight * 0.65 + 28);
  }

  ctx.restore();
}

// --- PiP overlay (mirrored webcam + hand skeleton + LIVE badge) ---
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

export function drawPiP(ctx, videoEl, landmarks, canvasWidth, canvasHeight) {
  const PIP = { width: 160, height: 120, margin: 10 };
  if (!videoEl || videoEl.readyState < 2) return;

  const x = canvasWidth - PIP.width - PIP.margin;
  const y = canvasHeight - PIP.height - PIP.margin - 60;

  // Cover-crop
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

  // Landmarks
  ctx.save();
  ctx.translate(x, y);
  for (const lms of landmarks) {
    ctx.strokeStyle = 'rgba(0,255,100,0.6)';
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
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.stroke();

  // LIVE badge
  ctx.save();
  ctx.fillStyle = 'rgba(220,50,50,0.85)';
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, 38, 16, 4);
  ctx.fill();
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE', x + 25, y + 14);
  ctx.restore();
}
