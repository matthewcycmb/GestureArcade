// Ball — physics, bouncing, speed scaling, rendering

const BASE_SPEED = 5;
const MAX_SPEED_MULT = 2.5;
const SPEED_INCREASE = 0.03; // 3% per paddle hit
const RADIUS = 10;
const TRAIL_LENGTH = 6;

export class Ball {
  constructor(courtWidth, courtHeight) {
    this.courtWidth = courtWidth;
    this.courtHeight = courtHeight;
    this.radius = RADIUS;
    this.reset();
  }

  reset(direction) {
    this.x = this.courtWidth / 2;
    this.y = this.courtHeight / 2;
    this.speedMult = 1;
    this.hitCount = 0;

    // Random serve angle ±45 degrees
    const angle = ((Math.random() * 90 - 45) * Math.PI) / 180;
    const dir = direction || (Math.random() < 0.5 ? 1 : -1);
    this.vx = Math.cos(angle) * BASE_SPEED * dir;
    this.vy = Math.sin(angle) * BASE_SPEED;

    this.trail = [];
    this.active = false; // waiting for countdown
  }

  serve() {
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;

    // Store trail position
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > TRAIL_LENGTH) this.trail.shift();

    this.x += this.vx * this.speedMult * dt;
    this.y += this.vy * this.speedMult * dt;
  }

  bounceWall() {
    this.vy = -this.vy;
    // Clamp inside court
    if (this.y < this.radius) this.y = this.radius;
    if (this.y > this.courtHeight - this.radius) this.y = this.courtHeight - this.radius;
  }

  bouncePaddle(paddleCenterY, paddleHeight) {
    // Angle based on where ball hit the paddle (-1 to 1 normalized offset)
    const offset = (this.y - paddleCenterY) / (paddleHeight / 2);
    const maxAngle = (60 * Math.PI) / 180;
    const angle = offset * maxAngle;

    const direction = this.vx > 0 ? -1 : 1;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx = Math.cos(angle) * currentSpeed * direction;
    this.vy = Math.sin(angle) * currentSpeed;

    // Increase speed per hit
    this.hitCount++;
    this.speedMult = Math.min(1 + this.hitCount * SPEED_INCREASE, MAX_SPEED_MULT);
  }

  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy) * this.speedMult;
  }

  draw(ctx) {
    // Motion trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = ((i + 1) / this.trail.length) * 0.3;
      const size = this.radius * ((i + 1) / this.trail.length) * 0.8;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    // Ball
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }
}

export { BASE_SPEED, MAX_SPEED_MULT, SPEED_INCREASE, RADIUS };
