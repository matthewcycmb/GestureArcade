// ObstacleManager — spawn, scroll, hitboxes, difficulty

const BASE_SPEED = 4.5;
const GAME_WIDTH = 960;

export const OBSTACLE_TYPES = {
  SINGLE_SPIKE: 'SINGLE_SPIKE',
  DOUBLE_SPIKE: 'DOUBLE_SPIKE',
  TRIPLE_SPIKE: 'TRIPLE_SPIKE',
  CEILING_SPIKE: 'CEILING_SPIKE',
  FLOOR_GAP: 'FLOOR_GAP',
  BLOCK_1: 'BLOCK_1',
  BLOCK_2: 'BLOCK_2',
};

const SPIKE_W = 28;
const SPIKE_H = 36;
// Hitbox is narrower/shorter than the visual triangle so players
// don't die when passing near the thin tip — feels much fairer.
const SPIKE_HIT_W = 16;
const SPIKE_HIT_H = 24;
const SPIKE_HIT_X_OFFSET = (SPIKE_W - SPIKE_HIT_W) / 2; // center the narrow box
const CEIL_SPIKE_W = 24;
const CEIL_SPIKE_H = 48;
const BLOCK_W = 40;
const BLOCK_1_H = 40;
const BLOCK_2_H = 80;
const GAP_W = 80;

// Returns the obstacle types available at the given score
function getAvailableTypes(score) {
  // Only ground-level obstacles — no ceiling spikes or floor gaps
  const types = [OBSTACLE_TYPES.SINGLE_SPIKE, OBSTACLE_TYPES.BLOCK_1];
  if (score >= 5) {
    types.push(OBSTACLE_TYPES.DOUBLE_SPIKE, OBSTACLE_TYPES.TRIPLE_SPIKE);
  }
  if (score >= 15) {
    types.push(OBSTACLE_TYPES.BLOCK_2);
  }
  return types;
}

function minSpacing(score) {
  return Math.max(260, 380 - score * 4);
}

export class ObstacleManager {
  constructor(groundY, gameHeight) {
    this.groundY = groundY;
    this.gameHeight = gameHeight;
    this.obstacles = [];
    this.cameraX = 0;
    this.speed = BASE_SPEED;
    this.score = 0;
    this._nextSpawnX = GAME_WIDTH + 100;
  }

  reset() {
    this.obstacles = [];
    this.cameraX = 0;
    this.speed = BASE_SPEED;
    this.score = 0;
    this._nextSpawnX = GAME_WIDTH + 100;
  }

  update(dt) {
    this.cameraX += this.speed * dt;
    this.score = this.cameraX / 200;
    this.speed = Math.min(BASE_SPEED * (1 + this.score * 0.012), 12);

    while (this._nextSpawnX - this.cameraX < GAME_WIDTH + 200) {
      this._spawn(this._nextSpawnX);
      const gap = minSpacing(this.score) + Math.random() * (600 - minSpacing(this.score));
      this._nextSpawnX += gap;
    }

    this.obstacles = this.obstacles.filter(o => o.worldX + 80 > this.cameraX - 100);
  }

  _spawn(worldX) {
    const available = getAvailableTypes(this.score);
    const type = available[Math.floor(Math.random() * available.length)];
    // Pick a random visual variant for variety
    const variant = Math.floor(Math.random() * 4);
    this.obstacles.push({ type, worldX, variant });
  }

  getHitboxes() {
    const boxes = [];
    for (const o of this.obstacles) {
      const sx = o.worldX - this.cameraX;
      switch (o.type) {
        case OBSTACLE_TYPES.SINGLE_SPIKE:
          boxes.push({ x: sx + SPIKE_HIT_X_OFFSET, y: this.groundY - SPIKE_HIT_H, width: SPIKE_HIT_W, height: SPIKE_HIT_H });
          break;
        case OBSTACLE_TYPES.DOUBLE_SPIKE:
          boxes.push({ x: sx + SPIKE_HIT_X_OFFSET, y: this.groundY - SPIKE_HIT_H, width: SPIKE_HIT_W, height: SPIKE_HIT_H });
          boxes.push({ x: sx + SPIKE_W + SPIKE_HIT_X_OFFSET, y: this.groundY - SPIKE_HIT_H, width: SPIKE_HIT_W, height: SPIKE_HIT_H });
          break;
        case OBSTACLE_TYPES.TRIPLE_SPIKE:
          for (let i = 0; i < 3; i++) {
            boxes.push({ x: sx + i * SPIKE_W + SPIKE_HIT_X_OFFSET, y: this.groundY - SPIKE_HIT_H, width: SPIKE_HIT_W, height: SPIKE_HIT_H });
          }
          break;
        case OBSTACLE_TYPES.CEILING_SPIKE:
          boxes.push({ x: sx, y: 0, width: CEIL_SPIKE_W, height: CEIL_SPIKE_H });
          break;
        case OBSTACLE_TYPES.BLOCK_1:
          boxes.push({ x: sx, y: this.groundY - BLOCK_1_H, width: BLOCK_W, height: BLOCK_1_H });
          break;
        case OBSTACLE_TYPES.BLOCK_2:
          boxes.push({ x: sx, y: this.groundY - BLOCK_2_H, width: BLOCK_W, height: BLOCK_2_H });
          break;
        case OBSTACLE_TYPES.FLOOR_GAP:
          break;
      }
    }
    return boxes;
  }

  getGapZones() {
    const zones = [];
    for (const o of this.obstacles) {
      if (o.type === OBSTACLE_TYPES.FLOOR_GAP) {
        const sx = o.worldX - this.cameraX;
        zones.push({ x: sx, width: GAP_W });
      }
    }
    return zones;
  }

  draw(ctx) {
    for (const o of this.obstacles) {
      const sx = o.worldX - this.cameraX;
      this._drawObstacle(ctx, o.type, sx, o.variant || 0);
    }
  }

  _drawObstacle(ctx, type, sx, variant) {
    ctx.save();
    switch (type) {
      case OBSTACLE_TYPES.SINGLE_SPIKE:
        this._drawSpike(ctx, sx, this.groundY, SPIKE_W, SPIKE_H, false, variant);
        break;
      case OBSTACLE_TYPES.DOUBLE_SPIKE:
        this._drawSpike(ctx, sx, this.groundY, SPIKE_W, SPIKE_H, false, variant);
        this._drawSpike(ctx, sx + SPIKE_W, this.groundY, SPIKE_W, SPIKE_H, false, (variant + 1) % 4);
        break;
      case OBSTACLE_TYPES.TRIPLE_SPIKE:
        for (let i = 0; i < 3; i++) {
          this._drawSpike(ctx, sx + i * SPIKE_W, this.groundY, SPIKE_W, SPIKE_H, false, (variant + i) % 4);
        }
        break;
      case OBSTACLE_TYPES.CEILING_SPIKE:
        this._drawSpike(ctx, sx, 0, CEIL_SPIKE_W, CEIL_SPIKE_H, true, variant);
        break;
      case OBSTACLE_TYPES.FLOOR_GAP:
        this._drawGap(ctx, sx);
        break;
      case OBSTACLE_TYPES.BLOCK_1:
        this._drawBlock(ctx, sx, this.groundY - BLOCK_1_H, BLOCK_W, BLOCK_1_H, variant);
        break;
      case OBSTACLE_TYPES.BLOCK_2:
        this._drawBlock(ctx, sx, this.groundY - BLOCK_2_H, BLOCK_W, BLOCK_2_H, variant);
        break;
    }
    ctx.restore();
  }

  _drawSpike(ctx, x, baseY, w, h, fromCeiling, variant = 0) {
    if (fromCeiling) {
      this._drawRock(ctx, x, 0, w, h, true);
      return;
    }
    // Pick visual based on variant
    switch (variant % 4) {
      case 0: this._drawRock(ctx, x, baseY, w, h); break;
      case 1: this._drawMushroom(ctx, x, baseY, w, h); break;
      case 2: this._drawBush(ctx, x, baseY, w, h); break;
      case 3: this._drawCactus(ctx, x, baseY, w, h); break;
    }
  }

  _drawRock(ctx, x, baseY, w, h, ceiling = false) {
    if (ceiling) {
      ctx.fillStyle = '#7a6b5a';
      ctx.beginPath();
      ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, h - 8);
      ctx.lineTo(x + w / 2, h); ctx.lineTo(x + w - 2, h - 8);
      ctx.lineTo(x + w - 2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3d3229'; ctx.lineWidth = 2; ctx.stroke();
      return;
    }
    const ry = baseY;
    // Grey-brown boulder
    ctx.fillStyle = '#7a6b5a';
    ctx.beginPath();
    ctx.moveTo(x + 2, ry);
    ctx.lineTo(x, ry - h * 0.6);
    ctx.lineTo(x + 4, ry - h * 0.85);
    ctx.lineTo(x + w * 0.4, ry - h);
    ctx.lineTo(x + w * 0.65, ry - h * 0.9);
    ctx.lineTo(x + w, ry - h * 0.5);
    ctx.lineTo(x + w - 2, ry);
    ctx.closePath(); ctx.fill();
    // Right shadow
    ctx.fillStyle = '#5a4d3e';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, ry - h * 0.95);
    ctx.lineTo(x + w * 0.65, ry - h * 0.9);
    ctx.lineTo(x + w, ry - h * 0.5);
    ctx.lineTo(x + w - 2, ry);
    ctx.lineTo(x + w * 0.5, ry);
    ctx.closePath(); ctx.fill();
    // Outline
    ctx.strokeStyle = '#3d3229'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 2, ry); ctx.lineTo(x, ry - h * 0.6);
    ctx.lineTo(x + 4, ry - h * 0.85); ctx.lineTo(x + w * 0.4, ry - h);
    ctx.lineTo(x + w * 0.65, ry - h * 0.9); ctx.lineTo(x + w, ry - h * 0.5);
    ctx.lineTo(x + w - 2, ry); ctx.stroke();
  }

  _drawMushroom(ctx, x, baseY, w, h) {
    const cx = x + w / 2;
    // Stem
    const stemW = w * 0.35;
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(cx - stemW / 2, baseY - h * 0.5, stemW, h * 0.5);
    ctx.strokeStyle = '#a09080';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - stemW / 2, baseY - h * 0.5, stemW, h * 0.5);
    // Cap — red with white spots
    ctx.fillStyle = '#cc3333';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - h * 0.5, w * 0.55, h * 0.55, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#881818'; ctx.lineWidth = 2; ctx.stroke();
    // White spots
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - w * 0.15, baseY - h * 0.75, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + w * 0.2, baseY - h * 0.65, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  _drawBush(ctx, x, baseY, w, h) {
    const cx = x + w / 2;
    // Dark green base cluster
    ctx.fillStyle = '#2d6b30';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - h * 0.35, w * 0.55, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lighter top cluster
    ctx.fillStyle = '#3d8b40';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.15, baseY - h * 0.55, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.2, baseY - h * 0.5, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#5aad5e';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.1, baseY - h * 0.7, w * 0.15, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Outline
    ctx.strokeStyle = '#1a4a1c'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - h * 0.35, w * 0.55, h * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawCactus(ctx, x, baseY, w, h) {
    const cx = x + w / 2;
    const bodyW = w * 0.35;
    // Main body
    ctx.fillStyle = '#4a8c3f';
    ctx.fillRect(cx - bodyW / 2, baseY - h, bodyW, h);
    // Left arm
    ctx.fillRect(cx - bodyW / 2 - bodyW * 0.6, baseY - h * 0.7, bodyW * 0.6, bodyW * 0.3);
    ctx.fillRect(cx - bodyW / 2 - bodyW * 0.6, baseY - h * 0.7 - bodyW * 0.5, bodyW * 0.3, bodyW * 0.5);
    // Right arm
    ctx.fillRect(cx + bodyW / 2, baseY - h * 0.5, bodyW * 0.6, bodyW * 0.3);
    ctx.fillRect(cx + bodyW / 2 + bodyW * 0.3, baseY - h * 0.5 - bodyW * 0.4, bodyW * 0.3, bodyW * 0.4);
    // Highlight stripe
    ctx.fillStyle = '#5aad50';
    ctx.fillRect(cx - bodyW * 0.1, baseY - h + 2, bodyW * 0.15, h - 4);
    // Outline
    ctx.strokeStyle = '#2d5a25'; ctx.lineWidth = 2;
    ctx.strokeRect(cx - bodyW / 2, baseY - h, bodyW, h);
  }

  _drawBlock(ctx, x, y, w, h, variant = 0) {
    switch (variant % 3) {
      case 0: this._drawWoodCrate(ctx, x, y, w, h); break;
      case 1: this._drawBarrel(ctx, x, y, w, h); break;
      case 2: this._drawBrickBlock(ctx, x, y, w, h); break;
    }
  }

  _drawWoodCrate(ctx, x, y, w, h) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#7A5B0F';
    for (let ly = y + 6; ly < y + h; ly += 10) {
      ctx.fillRect(x + 2, ly, w - 4, 2);
    }
    ctx.fillStyle = '#6B4C0A';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#A07A20';
    ctx.fillRect(x + 2, y + 4, 3, h - 6);
    ctx.strokeStyle = '#3d3229'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    // Cross braces
    ctx.strokeStyle = '#6B4C0A'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + w - 2, y + h - 2);
    ctx.moveTo(x + w - 2, y + 2); ctx.lineTo(x + 2, y + h - 2);
    ctx.stroke();
  }

  _drawBarrel(ctx, x, y, w, h) {
    const cx = x + w / 2;
    // Body — brown with curved sides
    ctx.fillStyle = '#8B5E14';
    ctx.beginPath();
    ctx.ellipse(cx, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Darker center
    ctx.fillStyle = '#7A4E0F';
    ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
    // Metal bands
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h * 0.25);
    ctx.lineTo(x + w - 2, y + h * 0.25);
    ctx.moveTo(x + 2, y + h * 0.75);
    ctx.lineTo(x + w - 2, y + h * 0.75);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = '#A07828';
    ctx.fillRect(x + 4, y + h * 0.3, 3, h * 0.4);
    // Outline
    ctx.strokeStyle = '#3d2a10'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _drawBrickBlock(ctx, x, y, w, h) {
    // Brick-colored block
    ctx.fillStyle = '#b5651d';
    ctx.fillRect(x, y, w, h);
    // Brick lines
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1;
    const brickH = 10;
    for (let row = 0; row < Math.ceil(h / brickH); row++) {
      const by = y + row * brickH;
      ctx.beginPath();
      ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
      const offset = (row % 2 === 0) ? 0 : w / 2;
      ctx.beginPath();
      ctx.moveTo(x + offset, by); ctx.lineTo(x + offset, by + brickH); ctx.stroke();
      if (offset === 0) {
        ctx.beginPath();
        ctx.moveTo(x + w / 2, by); ctx.lineTo(x + w / 2, by + brickH); ctx.stroke();
      }
    }
    // Outline
    ctx.strokeStyle = '#5a2d0c'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _drawGap(ctx, sx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, this.groundY, GAP_W, this.gameHeight - this.groundY);
    ctx.strokeStyle = 'rgba(100,50,0,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, this.groundY); ctx.lineTo(sx, this.gameHeight);
    ctx.moveTo(sx + GAP_W, this.groundY); ctx.lineTo(sx + GAP_W, this.gameHeight);
    ctx.stroke();
  }
}
