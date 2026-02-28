// Line-circle intersection for slice detection
// segment: { x1, y1, x2, y2 }
// entity: { getCenter(), radius }

export function lineCircleIntersect(segment, entity) {
  const center = entity.getCenter();
  const r = entity.radius;

  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;

  const fx = segment.x1 - center.x;
  const fy = segment.y1 - center.y;

  const a = dx * dx + dy * dy;
  if (a === 0) return false; // zero-length segment

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);

  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // Check if either intersection point is within the segment [0, 1]
  if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) return true;

  // Check if segment is entirely inside the circle
  if (t1 < 0 && t2 > 1) return true;

  return false;
}
