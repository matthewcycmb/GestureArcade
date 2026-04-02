// Renderer — parallax background, ground, HUD, start/dead screens

const GROUND_HEIGHT = 80;

// Background image
const bgImg = document.createElement('img');
bgImg.src = './assets/bg.jpg';
let bgScrollX = 0;

/** Preload background image. Call from init(). */
export function preloadBgImage() {
  return new Promise(resolve => {
    if (bgImg.complete && bgImg.naturalWidth > 0) return resolve();
    bgImg.onload = resolve;
    bgImg.onerror = () => { console.error('Failed to load bg.jpg'); resolve(); };
  });
}

export function updateBackground(dt, scrollSpeed, gameWidth) {
  bgScrollX = (bgScrollX + scrollSpeed * 0.5 * dt) % gameWidth;
}

export function drawBackground(ctx, gameWidth, gameHeight) {
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    // Seamless scrolling background
    const x = Math.floor(-bgScrollX);
    ctx.drawImage(bgImg, x, 0, gameWidth + 1, gameHeight);
    ctx.drawImage(bgImg, x + gameWidth, 0, gameWidth + 1, gameHeight);
  } else {
    // Fallback sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, gameHeight);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#b8def5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameWidth, gameHeight);
  }
}

export function drawGround(ctx, gameWidth, gameHeight, groundY) {
  // Ground is now part of the background image — no separate drawing needed
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
