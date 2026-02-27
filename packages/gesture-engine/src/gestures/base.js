import { FINGERS, LANDMARKS, MCP_INDICES, THRESHOLDS } from '../constants.js';

/**
 * 2D Euclidean distance between two landmarks.
 */
export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Average position of wrist + all MCP joints.
 */
export function palmCenter(landmarks) {
  let sx = 0, sy = 0;
  for (const idx of MCP_INDICES) {
    sx += landmarks[idx].x;
    sy += landmarks[idx].y;
  }
  return { x: sx / MCP_INDICES.length, y: sy / MCP_INDICES.length };
}

/**
 * Rotation-invariant finger extension check.
 * For non-thumb: tip farther from wrist than PIP means extended.
 * For thumb: tip farther from pinky MCP than IP (lateral extension).
 */
export function isFingerExtended(landmarks, fingerName) {
  const finger = FINGERS[fingerName];
  if (!finger) return false;

  const tip = landmarks[finger.tip];

  if (fingerName === 'THUMB') {
    const ip = landmarks[LANDMARKS.THUMB_IP];
    const ref = landmarks[LANDMARKS.PINKY_MCP];
    return distance(tip, ref) > distance(ip, ref);
  }

  const pip = landmarks[finger.pip];
  const wrist = landmarks[LANDMARKS.WRIST];
  return distance(tip, wrist) > distance(pip, wrist);
}

/**
 * Check if finger tip is curled close to palm center.
 */
export function isFingerCurled(landmarks, fingerName) {
  const finger = FINGERS[fingerName];
  if (!finger) return false;

  const tip = landmarks[finger.tip];
  const palm = palmCenter(landmarks);
  return distance(tip, palm) < THRESHOLDS.CURL_DISTANCE;
}

/**
 * Angle in degrees from dx, dy. 0° = right, 90° = down (screen coords).
 */
export function angleDeg(dx, dy) {
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Classify angle into cardinal direction.
 */
export function angleToDirection(angle) {
  // Normalize to 0..360
  const a = ((angle % 360) + 360) % 360;
  if (a >= 315 || a < 45) return 'RIGHT';
  if (a >= 45 && a < 135) return 'DOWN';
  if (a >= 135 && a < 225) return 'LEFT';
  return 'UP';
}
