import { LANDMARKS, GESTURES, THRESHOLDS } from '../constants.js';
import { isFingerExtended } from './base.js';

export function detectThumbsUp(landmarks) {
  const thumbExt = isFingerExtended(landmarks, 'THUMB');
  const indexCurled = !isFingerExtended(landmarks, 'INDEX');
  const middleCurled = !isFingerExtended(landmarks, 'MIDDLE');
  const ringCurled = !isFingerExtended(landmarks, 'RING');
  const pinkyCurled = !isFingerExtended(landmarks, 'PINKY');

  if (!thumbExt || !indexCurled || !middleCurled || !ringCurled || !pinkyCurled) {
    return null;
  }

  // Check thumb pointing upward (negative y in screen coords)
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const thumbMcp = landmarks[LANDMARKS.THUMB_MCP];
  const dx = thumbTip.x - thumbMcp.x;
  const dy = thumbTip.y - thumbMcp.y; // negative = upward

  // Angle from vertical: atan2(|dx|, -dy) in degrees
  const angleFromVertical = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));

  if (angleFromVertical <= THRESHOLDS.THUMBS_UP_ANGLE_TOLERANCE) {
    const confidence = 1 - angleFromVertical / 90;
    return {
      gesture: GESTURES.THUMBS_UP,
      confidence,
    };
  }
  return null;
}
