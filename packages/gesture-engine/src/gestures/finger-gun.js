import { GESTURES } from '../constants.js';
import { isFingerExtended, isFingerCurled } from './base.js';

export function detectFingerGun(landmarks) {
  const indexExt = isFingerExtended(landmarks, 'INDEX');
  const thumbExt = isFingerExtended(landmarks, 'THUMB');
  const middleCurled = !isFingerExtended(landmarks, 'MIDDLE');
  const ringCurled = !isFingerExtended(landmarks, 'RING');
  const pinkyCurled = !isFingerExtended(landmarks, 'PINKY');

  if (indexExt && thumbExt && middleCurled && ringCurled && pinkyCurled) {
    return {
      gesture: GESTURES.FINGER_GUN,
      confidence: 0.9,
    };
  }
  return null;
}
