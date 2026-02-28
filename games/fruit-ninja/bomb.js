// Bomb class: similar arc physics, game-ending on slice

const GRAVITY = 0.4;

export class Bomb {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 32;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.06;
    this.sliced = false;
    this.fuseTime = 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += GRAVITY * dt;
    this.rotation += this.rotationSpeed * dt;
    this.fuseTime += dt;
  }

  slice() {
    this.sliced = true;
  }

  getCenter() {
    return { x: this.x, y: this.y };
  }

  isOffScreen(gameHeight) {
    return this.y > gameHeight + this.radius;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Bomb body — dark sphere with gradient
    const grad = ctx.createRadialGradient(-6, -6, 2, 0, 0, this.radius);
    grad.addColorStop(0, '#555');
    grad.addColorStop(0.5, '#222');
    grad.addColorStop(1, '#000');

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(-8, -10, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();

    // Fuse line
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius + 2);
    ctx.quadraticCurveTo(8, -this.radius - 10, 4, -this.radius - 16);
    ctx.stroke();

    // Fuse spark (animated)
    const sparkPhase = (this.fuseTime * 4) % 1;
    const sparkSize = 3 + sparkPhase * 3;
    ctx.beginPath();
    ctx.arc(4, -this.radius - 16, sparkSize, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, ${150 + sparkPhase * 100}, 0, ${0.8 - sparkPhase * 0.4})`;
    ctx.fill();

    // X mark
    ctx.strokeStyle = '#C62828';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(10, 10);
    ctx.moveTo(10, -10);
    ctx.lineTo(-10, 10);
    ctx.stroke();

    ctx.restore();
  }
}
