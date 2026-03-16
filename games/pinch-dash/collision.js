// Collision detection — AABB overlap, ceiling, spike/block, gap zones

export function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Returns true if the cube has collided with anything lethal.
 * @param {object} cube   - Cube instance (getHitbox(), onGround, x)
 * @param {object} obsMgr - ObstacleManager instance (getHitboxes(), getGapZones())
 */
export function checkCollision(cube, obsMgr) {
  const hitbox = cube.getHitbox();

  // Ceiling
  if (hitbox.y < 0) return true;

  // Obstacle hitboxes (spikes + blocks)
  for (const box of obsMgr.getHitboxes()) {
    if (aabbOverlap(hitbox, box)) return true;
  }

  // Floor gap — cube is on the ground level but over a gap section
  if (cube.onGround) {
    for (const gap of obsMgr.getGapZones()) {
      if (hitbox.x < gap.x + gap.width && hitbox.x + hitbox.width > gap.x) {
        return true;
      }
    }
  }

  return false;
}
