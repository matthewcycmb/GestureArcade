import { GESTURES } from '../constants.js';
import { isFingerExtended } from './base.js';

export function detectPeaceSign(landmarks) {
  const indexExt = isFingerExtended(landmarks, 'INDEX');
  const middleExt = isFingerExtended(landmarks, 'MIDDLE');
  const ringCurled = !isFingerExtended(landmarks, 'RING');
  const pinkyCurled = !isFingerExtended(landmarks, 'PINKY');
  const thumbCurled = !isFingerExtended(landmarks, 'THUMB');

  if (indexExt && middleExt && ringCurled && pinkyCurled && thumbCurled) {
    return {
      gesture: GESTURES.PEACE_SIGN,
      confidence: 1.0,
    };
  }
  return null;
}
