// PipeManager — generation, scrolling, difficulty scaling, rendering

const PIPE_WIDTH = 56;
const CAP_HEIGHT = 28;
const CAP_OVERHANG = 4;
const PIPE_SPACING = 260;
const INITIAL_GAP = 150;
const MIN_GAP = 120;
const BASE_SPEED = 3;

export class PipeManager {
  constructor(gameWidth, gameHeight, groundY) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.groundY = groundY;
    this.pipes = [];
    this.speed = BASE_SPEED;
    this.gap = INITIAL_GAP;
    this.score = 0;
    this.lastPipeY = gameHeight / 2;
  }

  reset() {
    this.pipes = [];
    this.speed = BASE_SPEED;
    this.gap = INITIAL_GAP;
    this.score = 0;
    this.lastPipeY = this.gameHeight / 2;
  }

  scaleDifficulty(score) {
    const levels = Math.floor(score / 10);
    this.speed = BASE_SPEED * Math.pow(1.05, levels);
    this.gap = Math.max(MIN_GAP, INITIAL_GAP - levels * 2);
  }

  spawn() {
    const minY = 80 + this.gap / 2;
    const maxY = this.groundY - 80 - this.gap / 2;

    // Constrain Y within +-130px of previous pipe
    let gapCenter = minY + Math.random() * (maxY - minY);
    gapCenter = Math.max(
      Math.min(gapCenter, this.lastPipeY + 130),
      this.lastPipeY - 130
    );
    gapCenter = Math.max(minY, Math.min(maxY, gapCenter));
    this.lastPipeY = gapCenter;

    this.pipes.push({
      x: this.gameWidth + PIPE_WIDTH,
      gapCenter,
      scored: false,
    });
  }

  update(dt, birdX) {
    // Spawn new pipes
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (!lastPipe || lastPipe.x < this.gameWidth - PIPE_SPACING) {
      this.spawn();
    }

    let scored = false;

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.x -= this.speed * dt;

      // Score when bird passes pipe center
      if (!pipe.scored && pipe.x + PIPE_WIDTH / 2 < birdX) {
        pipe.scored = true;
        this.score++;
        scored = true;
        this.scaleDifficulty(this.score);
      }

      // Remove off-screen pipes
      if (pipe.x < -PIPE_WIDTH * 2) {
        this.pipes.splice(i, 1);
      }
    }

    return scored;
  }

  getHitboxes() {
    const boxes = [];
    for (const pipe of this.pipes) {
      const topBottom = pipe.gapCenter - this.gap / 2;
      const bottomTop = pipe.gapCenter + this.gap / 2;

      // Top pipe
      boxes.push({
        x: pipe.x,
        y: 0,
        width: PIPE_WIDTH,
        height: topBottom,
      });
      // Bottom pipe
      boxes.push({
        x: pipe.x,
        y: bottomTop,
        width: PIPE_WIDTH,
        height: this.groundY - bottomTop,
      });
    }
    return boxes;
  }

  draw(ctx) {
    for (const pipe of this.pipes) {
      const topBottom = pipe.gapCenter - this.gap / 2;
      const bottomTop = pipe.gapCenter + this.gap / 2;

      this._drawPipe(ctx, pipe.x, 0, topBottom, false);
      this._drawPipe(ctx, pipe.x, bottomTop, this.groundY - bottomTop, true);
    }
  }

  _drawPipe(ctx, x, y, height, isBottom) {
    if (height <= 0) return;

    // Pipe body — green gradient
    const grad = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
    grad.addColorStop(0, '#2ECC71');
    grad.addColorStop(0.3, '#58D68D');
    grad.addColorStop(0.7, '#2ECC71');
    grad.addColorStop(1, '#1E8449');

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, PIPE_WIDTH, height);

    // Highlight strip
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 8, y, 6, height);

    // Dark border
    ctx.strokeStyle = '#145A32';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PIPE_WIDTH, height);

    // Cap
    const capX = x - CAP_OVERHANG;
    const capW = PIPE_WIDTH + CAP_OVERHANG * 2;
    const capY = isBottom ? y : y + height - CAP_HEIGHT;

    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, '#27AE60');
    capGrad.addColorStop(0.3, '#6CDE96');
    capGrad.addColorStop(0.7, '#27AE60');
    capGrad.addColorStop(1, '#1A7A42');

    ctx.fillStyle = capGrad;
    ctx.fillRect(capX, capY, capW, CAP_HEIGHT);

    // Cap highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(capX + 6, capY + 3, 8, CAP_HEIGHT - 6);

    // Cap border
    ctx.strokeStyle = '#145A32';
    ctx.lineWidth = 2;
    ctx.strokeRect(capX, capY, capW, CAP_HEIGHT);
  }
}

export { PIPE_WIDTH };
