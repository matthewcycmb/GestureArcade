// Bird class — physics, rendering, wing animation
// All values match FlappyFingers for identical game feel

const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const MAX_ROTATION = 90;
const MIN_ROTATION = -35;
const ROTATION_SPEED = 4;
const ROTATION_LERP = 0.15;

// Fire cat sprite animation — 8 extracted PNG frames
const FIRECAT_COUNT = 8;
const FIRECAT_DURATION = 80;
const fireCatFrames = [];
for (let i = 0; i < FIRECAT_COUNT; i++) {
  const img = document.createElement('img');
  img.src = `./assets/firecat-frame-${i}.png`;
  fireCatFrames.push(img);
}
let fcIndex = 0, fcTimer = 0, fcLastTs = 0;

export function preloadCatFrames() {
  return Promise.all(fireCatFrames.map(img => new Promise(resolve => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = resolve;
    img.onerror = () => resolve();
  })));
}

export function updateCatAnimation(timestamp) {
  if (!fcLastTs) { fcLastTs = timestamp; return; }
  fcTimer += timestamp - fcLastTs;
  fcLastTs = timestamp;
  if (fcTimer >= FIRECAT_DURATION) {
    fcTimer -= FIRECAT_DURATION;
    fcIndex = (fcIndex + 1) % FIRECAT_COUNT;
  }
}

export class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;        // anchor for bob animation
    this.velocity = 0;
    this.rotation = 0;    // degrees
    this.targetRotation = 0;
    this.width = 56;
    this.height = 34;
    this.hitboxInset = 6;

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
    const frame = fireCatFrames[fcIndex];
    if (frame && frame.complete && frame.naturalWidth > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const tilt = Math.max(-20, Math.min(30, this.velocity * 2.5));
      ctx.rotate((tilt * Math.PI) / 180);
      ctx.drawImage(frame, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
