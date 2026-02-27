import { LANDMARKS, GESTURES, THRESHOLDS } from '../constants.js';
import { distance } from './base.js';

export function detectPinch(landmarks) {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const dist = distance(thumbTip, indexTip);

  if (dist < THRESHOLDS.PINCH_DISTANCE) {
    const confidence = Math.max(0, 1 - dist / THRESHOLDS.PINCH_DISTANCE);
    return {
      gesture: GESTURES.PINCH,
      confidence,
      extras: {
        position: {
          x: (thumbTip.x + indexTip.x) / 2,
          y: (thumbTip.y + indexTip.y) / 2,
        },
      },
    };
  }
  return null;
}
