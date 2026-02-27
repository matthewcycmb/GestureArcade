import { detectPinch } from './pinch.js';
import { detectPoint } from './point.js';
import { detectFingerGun } from './finger-gun.js';
import { detectPeaceSign } from './peace-sign.js';
import { detectThumbsUp } from './thumbs-up.js';
import { detectFist } from './fist.js';
import { detectOpenPalm } from './open-palm.js';
import { detectSwipe } from './swipe.js';

/**
 * Ordered list of gesture detectors.
 * Most specific gestures first for disambiguation.
 */
export const gestureDetectors = [
  { name: 'PINCH', detect: detectPinch, temporal: false },
  { name: 'POINT', detect: detectPoint, temporal: false },
  { name: 'FINGER_GUN', detect: detectFingerGun, temporal: false },
  { name: 'PEACE_SIGN', detect: detectPeaceSign, temporal: false },
  { name: 'THUMBS_UP', detect: detectThumbsUp, temporal: false },
  { name: 'FIST', detect: detectFist, temporal: false },
  { name: 'OPEN_PALM', detect: detectOpenPalm, temporal: false },
  { name: 'SWIPE', detect: detectSwipe, temporal: true },
];
