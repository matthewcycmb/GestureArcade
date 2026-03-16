// Bird class — physics, rendering, wing animation
// All values match FlappyFingers for identical game feel

const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const MAX_ROTATION = 90;
const MIN_ROTATION = -35;
const ROTATION_SPEED = 4;
const ROTATION_LERP = 0.15;

export class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;        // anchor for bob animation
    this.velocity = 0;
    this.rotation = 0;    // degrees
    this.targetRotation = 0;
    this.width = 34;
    this.height = 26;
    this.hitboxInset = 4;  // forgiving hitbox

    // Wing animation
    this.wingAngle = 0;
    this.wingSpeed = 0.15;
    this.flapAnimTimer = 0;
  }

  flap() {
    this.velocity = FLAP_STRENGTH;
    this.flapAnimTimer = 8; // frames of fast wing flap
  }

  update(dt) {
    this.velocity += GRAVITY * dt;
    this.y += this.velocity * dt;

    // Target rotation based on velocity
    this.targetRotation = Math.min(
      Math.max(this.velocity * ROTATION_SPEED, MIN_ROTATION),
      MAX_ROTATION
    );

    // Smooth rotation lerp
    this.rotation += (this.targetRotation - this.rotation) * ROTATION_LERP * dt;

    // Wing animation
    if (this.flapAnimTimer > 0) {
      this.wingAngle += 0.5 * dt;
      this.flapAnimTimer -= dt;
    } else {
      this.wingAngle += this.wingSpeed * dt;
    }
  }

  // Bob animation for menu/ready screens — absolute, never drifts
  bob(timestamp) {
    this.y = this.baseY + Math.sin(timestamp / 200) * 6;
    this.wingAngle += this.wingSpeed;
  }

  getHitbox() {
    return {
      x: this.x - this.width / 2 + this.hitboxInset,
      y: this.y - this.height / 2 + this.hitboxInset,
      width: this.width - this.hitboxInset * 2,
      height: this.height - this.hitboxInset * 2,
    };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    const w = this.width;
    const h = this.height;

    // Body — yellow
    ctx.fillStyle = '#F7DC6F';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = '#B7950B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Belly — cream
    ctx.fillStyle = '#FCF3CF';
    ctx.beginPath();
    ctx.ellipse(2, 3, w / 3, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing — gold, animated
    const wingFlap = Math.sin(this.wingAngle * 4) * 5;
    ctx.fillStyle = '#D4AC0D';
    ctx.beginPath();
    ctx.ellipse(-4, -2 + wingFlap, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B7950B';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Eye — white with black pupil
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(12, -5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak — red/orange
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(22, 2);
    ctx.lineTo(14, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
