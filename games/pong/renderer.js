// Renderer — court, net, score, UI screens

const PADDLE_INSET = 30;

export function drawCourt(ctx, w, h) {
  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0a0a');
  grad.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle wall lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.stroke();

  // Center dashed net
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawScores(ctx, leftScore, rightScore, w) {
  ctx.save();
  ctx.font = '72px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillText(leftScore, w * 0.25, 30);
  ctx.fillText(rightScore, w * 0.75, 30);
  ctx.restore();
}

export function drawMenuScreen(ctx, w, h, timestamp, hoverZone) {
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 72px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('PONG', w / 2, h * 0.22);

  // Subtitle
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('GESTURE ARCADE', w / 2, h * 0.22 + 48);

  // Mode selection zones
  const zoneW = 180;
  const zoneH = 100;
  const zoneY = h * 0.48;

  // 1P zone (left half)
  const z1x = w / 2 - zoneW - 20;
  const z1hover = hoverZone === '1P';
  ctx.fillStyle = z1hover ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = z1hover ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(z1x, zoneY, zoneW, zoneH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = z1hover ? '#fff' : 'rgba(255,255,255,0.7)';
  ctx.fillText('1 PLAYER', z1x + zoneW / 2, zoneY + 38);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('vs AI', z1x + zoneW / 2, zoneY + 68);

  // 2P zone (right half)
  const z2x = w / 2 + 20;
  const z2hover = hoverZone === '2P';
  ctx.fillStyle = z2hover ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = z2hover ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(z2x, zoneY, zoneW, zoneH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = z2hover ? '#fff' : 'rgba(255,255,255,0.7)';
  ctx.fillText('2 PLAYERS', z2x + zoneW / 2, zoneY + 38);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('local', z2x + zoneW / 2, zoneY + 68);

  // Instructions
  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 500);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillText('Click to select mode', w / 2, h * 0.75);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or press 1 / 2', w / 2, h * 0.75 + 28);

  ctx.restore();
}

export function drawReadyScreen(ctx, w, h, timestamp, mode) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('GET READY', w / 2, h * 0.25);

  // Control instructions
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  if (mode === '1P') {
    ctx.fillText('Move your hand up/down to control the paddle', w / 2, h * 0.42);
    ctx.fillText('AI controls the other paddle', w / 2, h * 0.42 + 28);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Keyboard: W/S or Arrow Up/Down', w / 2, h * 0.42 + 60);
  } else {
    ctx.fillText('Left hand controls left paddle', w / 2, h * 0.42);
    ctx.fillText('Right hand controls right paddle', w / 2, h * 0.42 + 28);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Keyboard: W/S (left) — Up/Down (right)', w / 2, h * 0.42 + 60);
  }

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('First to 7 wins!', w / 2, h * 0.6);

  const alpha = 0.5 + 0.5 * Math.sin(timestamp / 400);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillText('Show OPEN PALM to start', w / 2, h * 0.74);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or press Space', w / 2, h * 0.74 + 28);

  ctx.restore();
}

export function drawCountdown(ctx, w, h, count) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(count, w / 2, h / 2);
  ctx.restore();
}

export function drawGameOverScreen(ctx, w, h, timestamp, leftScore, rightScore, mode, canRestart) {
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Game Over"
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#E74C3C';
  ctx.fillText('GAME OVER', w / 2, h * 0.25);

  // Winner
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#fff';
  let winnerText;
  if (mode === '1P') {
    winnerText = leftScore >= 7 ? 'You Win!' : 'AI Wins!';
  } else {
    winnerText = leftScore >= 7 ? 'Left Player Wins!' : 'Right Player Wins!';
  }
  ctx.fillText(winnerText, w / 2, h * 0.38);

  // Score panel
  const panelW = 220;
  const panelH = 80;
  const panelX = (w - panelW) / 2;
  const panelY = h * 0.48;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 42px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${leftScore}  -  ${rightScore}`, w / 2, panelY + panelH / 2);

  // Restart instruction
  if (canRestart) {
    const alpha = 0.5 + 0.5 * Math.sin(timestamp / 500);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillText('Show OPEN PALM to play again', w / 2, h * 0.74);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('or press Space', w / 2, h * 0.74 + 28);
  }

  ctx.restore();
}

// Menu zone geometry (for click/hover hit-testing in game.js)
export function getMenuZones(w, h) {
  const zoneW = 180;
  const zoneH = 100;
  const zoneY = h * 0.48;
  return {
    '1P': { x: w / 2 - zoneW - 20, y: zoneY, w: zoneW, h: zoneH },
    '2P': { x: w / 2 + 20, y: zoneY, w: zoneW, h: zoneH },
  };
}

export { PADDLE_INSET };
