// Collision detection — ball-paddle, ball-wall, ball-out-of-bounds

export function checkBallPaddle(ball, paddle) {
  const hb = paddle.getHitbox();
  const closestX = Math.max(hb.x, Math.min(ball.x, hb.x + hb.width));
  const closestY = Math.max(hb.y, Math.min(ball.y, hb.y + hb.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ball.radius) {
    return { hit: true, hitY: paddle.y };
  }
  return { hit: false, hitY: 0 };
}

export function checkBallWalls(ball, courtHeight) {
  return ball.y - ball.radius <= 0 || ball.y + ball.radius >= courtHeight;
}

export function checkBallOutOfBounds(ball, courtWidth) {
  if (ball.x + ball.radius < 0) {
    return { out: true, scorer: 'right' };
  }
  if (ball.x - ball.radius > courtWidth) {
    return { out: true, scorer: 'left' };
  }
  return { out: false, scorer: null };
}
