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

const SPIKE_W = 24;
const SPIKE_H = 32;
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
    this.obstacles.push({ type, worldX });
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
      this._drawObstacle(ctx, o.type, sx);
    }
  }

  _drawObstacle(ctx, type, sx) {
    ctx.save();
    switch (type) {
      case OBSTACLE_TYPES.SINGLE_SPIKE:
        this._drawSpike(ctx, sx, this.groundY, SPIKE_W, SPIKE_H, false);
        break;
      case OBSTACLE_TYPES.DOUBLE_SPIKE:
        this._drawSpike(ctx, sx, this.groundY, SPIKE_W, SPIKE_H, false);
        this._drawSpike(ctx, sx + SPIKE_W, this.groundY, SPIKE_W, SPIKE_H, false);
        break;
      case OBSTACLE_TYPES.TRIPLE_SPIKE:
        for (let i = 0; i < 3; i++) {
          this._drawSpike(ctx, sx + i * SPIKE_W, this.groundY, SPIKE_W, SPIKE_H, false);
        }
        break;
      case OBSTACLE_TYPES.CEILING_SPIKE:
        this._drawSpike(ctx, sx, 0, CEIL_SPIKE_W, CEIL_SPIKE_H, true);
        break;
      case OBSTACLE_TYPES.FLOOR_GAP:
        this._drawGap(ctx, sx);
        break;
      case OBSTACLE_TYPES.BLOCK_1:
        this._drawBlock(ctx, sx, this.groundY - BLOCK_1_H, BLOCK_W, BLOCK_1_H);
        break;
      case OBSTACLE_TYPES.BLOCK_2:
        this._drawBlock(ctx, sx, this.groundY - BLOCK_2_H, BLOCK_W, BLOCK_2_H);
        break;
    }
    ctx.restore();
  }

  _drawSpike(ctx, x, baseY, w, h, fromCeiling) {
    // Spike gradient
    const tipX = x + w / 2;
    let tipY, baseLineY;
    if (fromCeiling) {
      tipY = h;
      baseLineY = 0;
    } else {
      tipY = baseY - h;
      baseLineY = baseY;
    }

    const grad = ctx.createLinearGradient(tipX, tipY, tipX, baseLineY);
    grad.addColorStop(0, '#ffaa00');
    grad.addColorStop(1, '#cc4400');

    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (fromCeiling) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(tipX, h);
    } else {
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w, baseY);
      ctx.lineTo(tipX, baseY - h);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    // Edge highlight
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawBlock(ctx, x, y, w, h) {
    // Block gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#008855');
    grad.addColorStop(1, '#004433');

    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Top edge shine
    ctx.fillStyle = 'rgba(0,255,170,0.25)';
    ctx.fillRect(x + 1, y + 1, w - 2, 4);

    // Inner cross pattern
    ctx.strokeStyle = 'rgba(0,255,170,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  }

  _drawGap(ctx, sx) {
    // Dark pit
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, this.groundY, GAP_W, this.gameHeight - this.groundY);

    // Danger glow on edges
    const edgeGrad = ctx.createLinearGradient(sx, this.groundY, sx + 8, this.groundY);
    edgeGrad.addColorStop(0, 'rgba(255,60,0,0.4)');
    edgeGrad.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(sx, this.groundY, 8, this.gameHeight - this.groundY);

    const edgeGrad2 = ctx.createLinearGradient(sx + GAP_W, this.groundY, sx + GAP_W - 8, this.groundY);
    edgeGrad2.addColorStop(0, 'rgba(255,60,0,0.4)');
    edgeGrad2.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = edgeGrad2;
    ctx.fillRect(sx + GAP_W - 8, this.groundY, 8, this.gameHeight - this.groundY);

    // Edge lines
    ctx.strokeStyle = 'rgba(255,80,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, this.groundY);
    ctx.lineTo(sx, this.gameHeight);
    ctx.moveTo(sx + GAP_W, this.groundY);
    ctx.lineTo(sx + GAP_W, this.gameHeight);
    ctx.stroke();
  }
}
