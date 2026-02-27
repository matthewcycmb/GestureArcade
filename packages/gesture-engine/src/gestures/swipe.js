import { LANDMARKS, GESTURES, THRESHOLDS } from '../constants.js';
import { angleDeg, angleToDirection } from './base.js';

export function detectSwipe(landmarks, context) {
  if (!context || !context.history) return null;

  const wrist = landmarks[LANDMARKS.WRIST];
  context.history.push({ x: wrist.x, y: wrist.y });

  if (context.history.length < THRESHOLDS.SWIPE_FRAME_HISTORY) return null;

  // Keep only the last N frames
  while (context.history.length > THRESHOLDS.SWIPE_FRAME_HISTORY) {
    context.history.shift();
  }

  const first = context.history[0];
  const last = context.history[context.history.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const displacement = Math.sqrt(dx * dx + dy * dy);
  const velocity = displacement / THRESHOLDS.SWIPE_FRAME_HISTORY;

  if (displacement > THRESHOLDS.SWIPE_MIN_DISPLACEMENT && velocity > THRESHOLDS.SWIPE_MIN_VELOCITY) {
    const angle = angleDeg(dx, dy);
    const direction = angleToDirection(angle);

    // Clear history after detection
    context.history.length = 0;

    return {
      gesture: GESTURES.SWIPE,
      confidence: Math.min(1, velocity / (THRESHOLDS.SWIPE_MIN_VELOCITY * 2)),
      extras: { direction, velocity },
    };
  }

  return null;
}
