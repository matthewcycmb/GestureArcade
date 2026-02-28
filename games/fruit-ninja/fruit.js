// Fruit class: types, arc physics, slice into halves, drawing

const FRUIT_TYPES = [
  { name: 'watermelon', radius: 36, points: 2, color: '#2E7D32', innerColor: '#E53935', rindColor: '#4CAF50' },
  { name: 'orange', radius: 28, points: 1, color: '#FF9800', innerColor: '#FFE0B2', rindColor: '#F57C00' },
  { name: 'apple', radius: 26, points: 1, color: '#D32F2F', innerColor: '#FFECB3', rindColor: '#B71C1C' },
  { name: 'strawberry', radius: 22, points: 1, color: '#C62828', innerColor: '#FF8A80', rindColor: '#B71C1C' },
  { name: 'banana', radius: 30, points: 1, color: '#FDD835', innerColor: '#FFFDE7', rindColor: '#F9A825' },
];

const GRAVITY = 0.4;

export class Fruit {
  constructor(x, y, vx, vy, typeIndex) {
    const type = FRUIT_TYPES[typeIndex ?? Math.floor(Math.random() * FRUIT_TYPES.length)];
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.radius = type.radius;
    this.points = type.points;
    this.color = type.color;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    this.sliced = false;
    this.halves = null;
    this.missed = false;
  }

  update(dt) {
    if (this.sliced && this.halves) {
      // Update halves
      for (const half of this.halves) {
        half.x += half.vx * dt;
        half.y += half.vy * dt;
        half.vy += GRAVITY * dt;
        half.rotation += half.rotationSpeed * dt;
        half.alpha -= 0.008 * dt;
      }
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += GRAVITY * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  slice() {
    if (this.sliced) return;
    this.sliced = true;

    // Create two halves that split apart
    this.halves = [
      {
        x: this.x, y: this.y,
        vx: this.vx - 2, vy: this.vy - 1,
        rotation: this.rotation, rotationSpeed: -0.08,
        alpha: 1.0, side: -1,
      },
      {
        x: this.x, y: this.y,
        vx: this.vx + 2, vy: this.vy - 1,
        rotation: this.rotation, rotationSpeed: 0.08,
        alpha: 1.0, side: 1,
      },
    ];
  }

  getCenter() {
    return { x: this.x, y: this.y };
  }

  isOffScreen(gameHeight) {
    if (this.sliced && this.halves) {
      return this.halves.every(h => h.alpha <= 0 || h.y > gameHeight + 100);
    }
    return this.y > gameHeight + this.radius;
  }

  draw(ctx) {
    if (this.sliced && this.halves) {
      this.drawHalves(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Outer rind
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.type.rindColor;
    ctx.fill();

    // Inner fruit
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(-this.radius * 0.2, -this.radius * 0.2, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    ctx.restore();
  }

  drawHalves(ctx) {
    for (const half of this.halves) {
      if (half.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, half.alpha);
      ctx.translate(half.x, half.y);
      ctx.rotate(half.rotation);

      // Draw half circle
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, Math.PI * 0.5 * half.side, Math.PI * 0.5 * half.side + Math.PI);
      ctx.closePath();
      ctx.fillStyle = this.type.rindColor;
      ctx.fill();

      // Inner exposed face
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, Math.PI * 0.5 * half.side, Math.PI * 0.5 * half.side + Math.PI);
      ctx.closePath();
      ctx.fillStyle = this.type.innerColor;
      ctx.fill();

      ctx.restore();
    }
  }
}

export { FRUIT_TYPES };
