import { GESTURES } from '../constants.js';
import { isFingerExtended } from './base.js';

export function detectPoint(landmarks) {
  const indexExt = isFingerExtended(landmarks, 'INDEX');
  const thumbCurled = !isFingerExtended(landmarks, 'THUMB');
  const middleCurled = !isFingerExtended(landmarks, 'MIDDLE');
  const ringCurled = !isFingerExtended(landmarks, 'RING');
  const pinkyCurled = !isFingerExtended(landmarks, 'PINKY');

  if (indexExt && thumbCurled && middleCurled && ringCurled && pinkyCurled) {
    return {
      gesture: GESTURES.POINT,
      confidence: 1.0,
    };
  }
  return null;
}
