// AI opponent — prediction, reaction delay, difficulty

const REACTION_INTERVAL = 150; // ms between target updates
const ERROR_MARGIN = 25; // px random offset
const MOVE_RATE = 0.12; // lerp rate per frame
const CENTER_DRIFT_RATE = 0.03; // drift toward center when idle

export class AI {
  constructor(paddleX, courtWidth, courtHeight) {
    this.paddleX = paddleX;
    this.courtWidth = courtWidth;
    this.courtHeight = courtHeight;
    this.targetY = courtHeight / 2;
    this.lastUpdateTime = 0;
    this.error = 0;
  }

  update(ball, timestamp, paddle, dt) {
    // Only update prediction periodically (simulates reaction delay)
    if (timestamp - this.lastUpdateTime > REACTION_INTERVAL) {
      this.lastUpdateTime = timestamp;

      if (ball.active && ball.vx > 0) {
        // Ball moving toward AI — predict where it will be
        this.targetY = this._predict(ball) + this.error;
        this.error = (Math.random() * 2 - 1) * ERROR_MARGIN;
      } else {
        // Ball moving away — drift toward center
        this.targetY = this.courtHeight / 2;
      }
    }

    // Move paddle toward target
    if (ball.active && ball.vx > 0) {
      paddle.setTarget(paddle.y + (this.targetY - paddle.y) * MOVE_RATE * dt);
    } else {
      // Drift toward center slowly
      paddle.setTarget(paddle.y + (this.courtHeight / 2 - paddle.y) * CENTER_DRIFT_RATE * dt);
    }
  }

  _predict(ball) {
    // Simple prediction: project ball to paddle's X, accounting for wall bounces
    if (ball.vx <= 0) return this.courtHeight / 2;

    const dx = this.paddleX - ball.x;
    const timeToReach = dx / (ball.vx * ball.speedMult);
    let predictedY = ball.y + ball.vy * ball.speedMult * timeToReach;

    // Simulate wall bounces
    const h = this.courtHeight - ball.radius * 2;
    predictedY -= ball.radius;
    if (h > 0) {
      predictedY = predictedY % (h * 2);
      if (predictedY < 0) predictedY += h * 2;
      if (predictedY > h) predictedY = h * 2 - predictedY;
      predictedY += ball.radius;
    }

    return predictedY;
  }
}

export { REACTION_INTERVAL, ERROR_MARGIN, MOVE_RATE };
