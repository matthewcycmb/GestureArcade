// AABB collision detection — ground, ceiling, pipes

export function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function checkCollision(bird, pipeManager, groundY) {
  const hitbox = bird.getHitbox();

  // Ceiling
  if (hitbox.y < 0) return true;

  // Ground
  if (hitbox.y + hitbox.height > groundY) return true;

  // Pipes
  const pipeBoxes = pipeManager.getHitboxes();
  for (const box of pipeBoxes) {
    if (aabbOverlap(hitbox, box)) return true;
  }

  return false;
}
