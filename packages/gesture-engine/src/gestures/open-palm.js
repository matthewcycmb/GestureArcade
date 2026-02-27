import { GESTURES } from '../constants.js';
import { isFingerExtended } from './base.js';

const FINGER_NAMES = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];

export function detectOpenPalm(landmarks) {
  const extendedCount = FINGER_NAMES.filter(f => isFingerExtended(landmarks, f)).length;

  if (extendedCount >= 4) {
    return {
      gesture: GESTURES.OPEN_PALM,
      confidence: extendedCount / 5,
    };
  }
  return null;
}
