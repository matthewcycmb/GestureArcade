// Cube — physics, rotation, trail, death particles

export const GRAVITY = 0.55;
export const JUMP_VEL = -11;
const MAX_FALL = 14;
export const CUBE_SIZE = 64;
const HITBOX_INSET = 6;
export const COYOTE_MS = 80;

// Mario sprite animation — 8 extracted PNG frames
const MARIO_FRAME_COUNT = 8;
const MARIO_FRAME_DURATION = 80; // ms per frame
const marioFrames = [];
for (let i = 0; i < MARIO_FRAME_COUNT; i++) {
  const img = document.createElement('img');
  img.src = `./assets/mario-frame-${i}.png`;
  marioFrames.push(img);
}
let marioFrameIndex = 0;
let marioFrameTimer = 0;
let marioLastTimestamp = 0;

/** Preload all mario frames. Call from init(). */
export function preloadMarioFrames() {
  return Promise.all(marioFrames.map(img => new Promise(resolve => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = resolve;
    img.onerror = () => { console.error('Failed to load:', img.src); resolve(); };
  })));
}

/** Advance mario animation — call once per frame from game loop. */
export function updateMarioAnimation(timestamp) {
  if (!marioLastTimestamp) { marioLastTimestamp = timestamp; return; }
  const dtMs = timestamp - marioLastTimestamp;
  marioLastTimestamp = timestamp;
  marioFrameTimer += dtMs;
  if (marioFrameTimer >= MARIO_FRAME_DURATION) {
    marioFrameTimer -= MARIO_FRAME_DURATION;
    marioFrameIndex = (marioFrameIndex + 1) % MARIO_FRAME_COUNT;
  }
}

export class Cube {
  constructor(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.y = groundY - CUBE_SIZE / 2;
    this.vy = 0;
    this.onGround = true;

    // Visual rotation (degrees, purely cosmetic)
    this.rotation = 0;
    this.targetRotation = 0;

    // Coyote time
    this.coyoteTimer = 0; // ms remaining

    // Trail (small fading squares behind the cube while alive)
    this.trail = [];
    this._trailTimer = 0;

    this.particles = [];
    this.dead = false;
  }

  jump(vel) {
    this.vy = vel;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.targetRotation += 90;
  }

  update(dt) {
    if (this.dead) {
      this._updateParticles(dt);
      return;
    }

    // Gravity
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    this.y += this.vy * dt;

    // Ground landing
    const landY = this.groundY - CUBE_SIZE / 2;
    if (this.y >= landY) {
      this.y = landY;
      this.vy = 0;
      if (!this.onGround) {
        // Snap rotation to nearest 90 on landing
        this.rotation = Math.round(this.rotation / 90) * 90;
        this.targetRotation = this.rotation;
      }
      this.onGround = true;
      this.coyoteTimer = 0;
    } else {
      if (this.onGround) {
        // Just left the ground — start coyote window
        this.coyoteTimer = COYOTE_MS;
      }
      this.onGround = false;
      if (this.coyoteTimer > 0) {
        this.coyoteTimer -= dt * (1000 / 60); // dt is in frames
      }
    }

    // Lerp visual rotation
    const rotDiff = this.targetRotation - this.rotation;
    this.rotation += rotDiff * 0.18 * dt;

    // Spawn trail particles
    this._trailTimer += dt;
    if (this._trailTimer >= 2) {
      this._trailTimer = 0;
      this.trail.push({
        x: this.x,
        y: this.y,
        alpha: 0.5,
        size: CUBE_SIZE * 0.6,
        rotation: this.rotation,
      });
    }

    // Update trail
    for (const t of this.trail) {
      t.alpha -= dt / 12;
      t.size *= (1 - 0.03 * dt);
    }
    this.trail = this.trail.filter(t => t.alpha > 0);

    this._updateParticles(dt);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.trail = [];
    this._spawnParticles();
  }

  _spawnParticles() {
    const cx = this.x;
    const cy = this.y;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        alpha: 1,
        size: 3 + Math.random() * 5,
        color: ['#1a3aff', '#4488ff', '#00ffcc', '#ffffff'][i % 4],
      });
    }
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.vy += 0.3 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= (dt / 30);
    }
    this.particles = this.particles.filter(p => p.alpha > 0);
  }

  getHitbox() {
    return {
      x: this.x - CUBE_SIZE / 2 + HITBOX_INSET,
      y: this.y - CUBE_SIZE / 2 + HITBOX_INSET,
      width: CUBE_SIZE - HITBOX_INSET * 2,
      height: CUBE_SIZE - HITBOX_INSET * 2,
    };
  }

  draw(ctx) {
    const s = CUBE_SIZE;

    // Draw trail behind cube
    for (const t of this.trail) {
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.3;
      ctx.translate(t.x, t.y);
      const hs = t.size / 2;
      const frame = marioFrames[marioFrameIndex];
      if (frame && frame.complete && frame.naturalWidth > 0) {
        ctx.drawImage(frame, -hs, -hs, t.size, t.size);
      }
      ctx.restore();
    }

    // Draw death particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.dead) return;

    const frame = marioFrames[marioFrameIndex];
    if (frame && frame.complete && frame.naturalWidth > 0) {
      ctx.drawImage(frame, this.x - s / 2, this.y - s / 2, s, s);
    } else {
      // Fallback rectangle
      ctx.fillStyle = '#3355ff';
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    }
  }
}
