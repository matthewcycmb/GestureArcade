import { GESTURES } from '../constants.js';
import { isFingerExtended } from './base.js';

const ALL_FINGERS = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];

export function detectFist(landmarks) {
  const noneExtended = ALL_FINGERS.every(f => !isFingerExtended(landmarks, f));

  if (noneExtended) {
    return {
      gesture: GESTURES.FIST,
      confidence: 1.0,
    };
  }
  return null;
}
