// Cube — physics, rotation, trail, death particles

export const GRAVITY = 0.55;
export const JUMP_VEL = -11;
const MAX_FALL = 14;
export const CUBE_SIZE = 40;
const HITBOX_INSET = 4;
export const COYOTE_MS = 80;

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
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.translate(t.x, t.y);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.fillStyle = '#4488ff';
      const hs = t.size / 2;
      ctx.fillRect(-hs, -hs, t.size, t.size);
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

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    // Outer glow
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 18;

    // Body — gradient fill
    const grad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    grad.addColorStop(0, '#3355ff');
    grad.addColorStop(1, '#1122aa');
    ctx.fillStyle = grad;
    ctx.fillRect(-s / 2, -s / 2, s, s);

    // Border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#6699ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s / 2, -s / 2, s, s);

    // Top-left shine
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-s / 2, -s / 2, s, s / 2);

    // Inner highlight square
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-s / 4, -s / 4, s / 2, s / 2);

    ctx.restore();
  }
}
