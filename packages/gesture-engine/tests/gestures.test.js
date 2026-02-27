import { describe, it, expect } from 'vitest';
import { detectPinch } from '../src/gestures/pinch.js';
import { detectOpenPalm } from '../src/gestures/open-palm.js';
import { detectFist } from '../src/gestures/fist.js';
import { detectFingerGun } from '../src/gestures/finger-gun.js';
import { detectPoint } from '../src/gestures/point.js';
import { detectSwipe } from '../src/gestures/swipe.js';
import { detectPeaceSign } from '../src/gestures/peace-sign.js';
import { detectThumbsUp } from '../src/gestures/thumbs-up.js';
import {
  fistLandmarks,
  openPalmLandmarks,
  pinchLandmarks,
  pointLandmarks,
  fingerGunLandmarks,
  peaceLandmarks,
  thumbsUpLandmarks,
  swipeFrameHistory,
  landmarksAtWrist,
} from './fixtures/landmarks.js';
import { GESTURES } from '../src/constants.js';

describe('Gesture Detectors', () => {
  describe('PINCH', () => {
    it('detects pinch with close thumb and index', () => {
      const result = detectPinch(pinchLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.PINCH);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns null for open palm', () => {
      expect(detectPinch(openPalmLandmarks())).toBeNull();
    });

    it('returns null for fist', () => {
      expect(detectPinch(fistLandmarks())).toBeNull();
    });
  });

  describe('OPEN_PALM', () => {
    it('detects open palm with all fingers extended', () => {
      const result = detectOpenPalm(openPalmLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.OPEN_PALM);
      expect(result.confidence).toBe(1);
    });

    it('returns null for fist', () => {
      expect(detectOpenPalm(fistLandmarks())).toBeNull();
    });
  });

  describe('FIST', () => {
    it('detects fist with all fingers curled', () => {
      const result = detectFist(fistLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.FIST);
      expect(result.confidence).toBe(1);
    });

    it('returns null for open palm', () => {
      expect(detectFist(openPalmLandmarks())).toBeNull();
    });
  });

  describe('FINGER_GUN', () => {
    it('detects finger gun with index + thumb extended', () => {
      const result = detectFingerGun(fingerGunLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.FINGER_GUN);
    });

    it('returns null for fist', () => {
      expect(detectFingerGun(fistLandmarks())).toBeNull();
    });

    it('returns null for point (thumb curled)', () => {
      expect(detectFingerGun(pointLandmarks())).toBeNull();
    });
  });

  describe('POINT', () => {
    it('detects point with only index extended', () => {
      const result = detectPoint(pointLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.POINT);
    });

    it('returns null for finger gun (thumb also extended)', () => {
      expect(detectPoint(fingerGunLandmarks())).toBeNull();
    });

    it('returns null for open palm', () => {
      expect(detectPoint(openPalmLandmarks())).toBeNull();
    });
  });

  describe('PEACE_SIGN', () => {
    it('detects peace sign with index + middle extended', () => {
      const result = detectPeaceSign(peaceLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.PEACE_SIGN);
    });

    it('returns null for point (only index extended)', () => {
      expect(detectPeaceSign(pointLandmarks())).toBeNull();
    });

    it('returns null for open palm', () => {
      expect(detectPeaceSign(openPalmLandmarks())).toBeNull();
    });
  });

  describe('THUMBS_UP', () => {
    it('detects thumbs up with thumb pointing upward', () => {
      const result = detectThumbsUp(thumbsUpLandmarks());
      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.THUMBS_UP);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('returns null for fist (thumb not pointing up)', () => {
      expect(detectThumbsUp(fistLandmarks())).toBeNull();
    });

    it('returns null for open palm', () => {
      expect(detectThumbsUp(openPalmLandmarks())).toBeNull();
    });
  });

  describe('SWIPE', () => {
    it('detects swipe with sufficient displacement and velocity', () => {
      const context = { history: [] };
      const frames = swipeFrameHistory();
      let result = null;

      // Feed frames as landmark sets
      for (const frame of frames) {
        const lms = landmarksAtWrist(frame.x, frame.y);
        result = detectSwipe(lms, context);
      }

      expect(result).not.toBeNull();
      expect(result.gesture).toBe(GESTURES.SWIPE);
      expect(result.extras.direction).toBe('RIGHT');
      expect(result.extras.velocity).toBeGreaterThan(0);
    });

    it('returns null without enough frames', () => {
      const context = { history: [] };
      const lms = landmarksAtWrist(0.5, 0.7);
      expect(detectSwipe(lms, context)).toBeNull();
    });

    it('returns null without context', () => {
      const lms = landmarksAtWrist(0.5, 0.7);
      expect(detectSwipe(lms, null)).toBeNull();
    });

    it('clears history after detection', () => {
      const context = { history: [] };
      const frames = swipeFrameHistory();
      for (const frame of frames) {
        detectSwipe(landmarksAtWrist(frame.x, frame.y), context);
      }
      expect(context.history.length).toBe(0);
    });
  });

  describe('Cross-detection (disambiguation)', () => {
    it('fist landmarks do not trigger point', () => {
      expect(detectPoint(fistLandmarks())).toBeNull();
    });

    it('peace landmarks do not trigger point', () => {
      expect(detectPoint(peaceLandmarks())).toBeNull();
    });

    it('finger gun landmarks do not trigger point', () => {
      expect(detectPoint(fingerGunLandmarks())).toBeNull();
    });

    it('point landmarks do not trigger peace sign', () => {
      expect(detectPeaceSign(pointLandmarks())).toBeNull();
    });
  });
});
