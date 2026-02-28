// Paddle — position, smoothing, rendering, hitbox

export class Paddle {
  constructor(x, courtHeight) {
    this.x = x;
    this.y = courtHeight / 2;
    this.width = 12;
    this.height = 80;
    this.courtHeight = courtHeight;
    this.targetY = this.y;
  }

  setTarget(y) {
    this.targetY = y;
  }

  update(dt, lerpRate = 0.2) {
    this.y += (this.targetY - this.y) * lerpRate * dt;
    // Clamp to court bounds
    this.y = Math.max(this.height / 2, Math.min(this.courtHeight - this.height / 2, this.y));
  }

  getHitbox() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  draw(ctx) {
    const hb = this.getHitbox();

    // Glow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 10;

    // Rounded white rectangle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(hb.x, hb.y, hb.width, hb.height, 4);
    ctx.fill();

    ctx.restore();
  }
}
