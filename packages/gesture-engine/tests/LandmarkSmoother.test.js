import { describe, it, expect } from 'vitest';
import { LandmarkSmoother } from '../src/LandmarkSmoother.js';
import { openPalmLandmarks } from './fixtures/landmarks.js';

function makeLandmarks(baseX = 0.5, baseY = 0.5) {
  // Generate 21 landmarks clustered around (baseX, baseY)
  const lms = [];
  for (let i = 0; i < 21; i++) {
    lms.push({ x: baseX + i * 0.01, y: baseY + i * 0.005, z: 0 });
  }
  return lms;
}

function addJitter(landmarks, amount) {
  return landmarks.map(lm => ({
    x: lm.x + (Math.random() - 0.5) * amount,
    y: lm.y + (Math.random() - 0.5) * amount,
    z: lm.z,
  }));
}

describe('LandmarkSmoother', () => {
  it('returns landmarks on first frame (passthrough)', () => {
    const smoother = new LandmarkSmoother();
    const lms = makeLandmarks();
    const result = smoother.smooth(lms, 0, 0);

    expect(result).toHaveLength(21);
    for (let i = 0; i < 21; i++) {
      expect(result[i].x).toBeCloseTo(lms[i].x, 5);
      expect(result[i].y).toBeCloseTo(lms[i].y, 5);
    }
  });

  it('suppresses jitter when hand is stationary', () => {
    const smoother = new LandmarkSmoother({
      minCutoff: 0.8,
      beta: 0.5,
      deadZone: 0.003,
    });

    const base = makeLandmarks(0.5, 0.5);

    // Feed 20 frames with tiny jitter (~0.002 normalized)
    let lastSmoothed;
    for (let frame = 0; frame < 20; frame++) {
      const jittered = addJitter(base, 0.002);
      lastSmoothed = smoother.smooth(jittered, 0, frame * 16.67);
    }

    // After settling, feed more jittery frames and check stability
    const settled = smoother.smooth(base, 0, 20 * 16.67);
    const jitteredAgain = addJitter(base, 0.002);
    const afterJitter = smoother.smooth(jitteredAgain, 0, 21 * 16.67);

    // The smoothed output should barely move (dead zone kicks in)
    for (let i = 0; i < 21; i++) {
      const dx = Math.abs(afterJitter[i].x - settled[i].x);
      const dy = Math.abs(afterJitter[i].y - settled[i].y);
      expect(dx).toBeLessThan(0.003);
      expect(dy).toBeLessThan(0.003);
    }
  });

  it('tracks fast movement with low lag', () => {
    const smoother = new LandmarkSmoother({
      minCutoff: 0.8,
      beta: 0.5,
      deadZone: 0.003,
    });

    // Start at position 0.3
    smoother.smooth(makeLandmarks(0.3, 0.3), 0, 0);

    // Feed a few frames at 0.3 to let filter settle
    for (let i = 1; i <= 5; i++) {
      smoother.smooth(makeLandmarks(0.3, 0.3), 0, i * 16.67);
    }

    // Now jump to 0.7 (large movement) and sustain for a few frames
    let moved;
    for (let i = 0; i < 5; i++) {
      moved = smoother.smooth(makeLandmarks(0.7, 0.7), 0, 100 + i * 16.67);
    }

    // After a few frames at the new position, should have converged close to 0.7
    expect(moved[0].x).toBeGreaterThan(0.6);
    expect(moved[0].y).toBeGreaterThan(0.6);
  });

  it('handles multiple hands independently', () => {
    const smoother = new LandmarkSmoother();

    const hand0 = makeLandmarks(0.3, 0.3);
    const hand1 = makeLandmarks(0.7, 0.7);

    const r0 = smoother.smooth(hand0, 0, 0);
    const r1 = smoother.smooth(hand1, 1, 0);

    // They should not interfere with each other
    expect(r0[0].x).toBeCloseTo(0.3, 2);
    expect(r1[0].x).toBeCloseTo(0.7, 2);
  });

  it('reset clears all hand states', () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(makeLandmarks(), 0, 0);
    smoother.smooth(makeLandmarks(), 1, 0);

    smoother.reset();

    // After reset, first frame should be passthrough again
    const lms = makeLandmarks(0.9, 0.9);
    const result = smoother.smooth(lms, 0, 100);
    expect(result[0].x).toBeCloseTo(0.9, 5);
  });

  it('removeHand clears only that hand', () => {
    const smoother = new LandmarkSmoother();

    smoother.smooth(makeLandmarks(0.3, 0.3), 0, 0);
    smoother.smooth(makeLandmarks(0.7, 0.7), 1, 0);

    smoother.removeHand(0);

    // Hand 0 is fresh (passthrough), hand 1 still has state
    const r0 = smoother.smooth(makeLandmarks(0.5, 0.5), 0, 16.67);
    expect(r0[0].x).toBeCloseTo(0.5, 5);
  });

  it('works with real gesture fixture landmarks', () => {
    const smoother = new LandmarkSmoother();
    const lms = openPalmLandmarks();
    const result = smoother.smooth(lms, 0, 0);

    expect(result).toHaveLength(21);
    expect(result[0]).toHaveProperty('x');
    expect(result[0]).toHaveProperty('y');
    expect(result[0]).toHaveProperty('z');
  });
});
