import { THRESHOLDS } from './constants.js';

/**
 * One Euro Filter — adaptive low-pass filter that smooths heavily when
 * motion is slow (killing jitter) but stays responsive during fast movement.
 *
 * Based on: Casiez et al., "1€ Filter: A Simple Speed-based Low-pass Filter
 * for Noisy Input in Interactive Systems", CHI 2012.
 */
class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this._minCutoff = minCutoff;
    this._beta = beta;
    this._dCutoff = dCutoff;
    this._xPrev = null;
    this._dxPrev = 0.0;
    this._tPrev = null;
  }

  _smoothingFactor(rate, cutoff) {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  _exponentialSmoothing(alpha, x, xPrev) {
    return alpha * x + (1.0 - alpha) * xPrev;
  }

  filter(x, timestamp) {
    if (this._tPrev === null) {
      this._xPrev = x;
      this._tPrev = timestamp;
      this._dxPrev = 0.0;
      return x;
    }

    const dt = (timestamp - this._tPrev) / 1000; // seconds
    if (dt <= 0) return this._xPrev;

    const rate = 1.0 / dt;
    this._tPrev = timestamp;

    // Derivative of the signal
    const dx = (x - this._xPrev) / dt;
    const edAlpha = this._smoothingFactor(rate, this._dCutoff);
    const dxSmoothed = this._exponentialSmoothing(edAlpha, dx, this._dxPrev);
    this._dxPrev = dxSmoothed;

    // Adaptive cutoff based on speed
    const cutoff = this._minCutoff + this._beta * Math.abs(dxSmoothed);
    const alpha = this._smoothingFactor(rate, cutoff);
    const xSmoothed = this._exponentialSmoothing(alpha, x, this._xPrev);
    this._xPrev = xSmoothed;

    return xSmoothed;
  }

  reset() {
    this._xPrev = null;
    this._dxPrev = 0.0;
    this._tPrev = null;
  }
}

/**
 * Smooths all 21 hand landmarks using per-coordinate One Euro Filters.
 * Also applies a dead zone: if a landmark moves less than the threshold,
 * it snaps to the previous position (zero jitter when stationary).
 */
export class LandmarkSmoother {
  constructor(options = {}) {
    this._minCutoff = options.minCutoff ?? THRESHOLDS.SMOOTH_MIN_CUTOFF;
    this._beta = options.beta ?? THRESHOLDS.SMOOTH_BETA;
    this._dCutoff = options.dCutoff ?? THRESHOLDS.SMOOTH_D_CUTOFF;
    this._deadZone = options.deadZone ?? THRESHOLDS.SMOOTH_DEAD_ZONE;

    // Map<handIndex, { filters: OneEuroFilter[][], prevLandmarks: object[] }>
    this._hands = new Map();
  }

  _getHandState(handIdx) {
    if (!this._hands.has(handIdx)) {
      // 21 landmarks × 3 axes (x, y, z)
      const filters = [];
      for (let i = 0; i < 21; i++) {
        filters.push([
          new OneEuroFilter(this._minCutoff, this._beta, this._dCutoff),
          new OneEuroFilter(this._minCutoff, this._beta, this._dCutoff),
          new OneEuroFilter(this._minCutoff, this._beta, this._dCutoff),
        ]);
      }
      this._hands.set(handIdx, { filters, prevLandmarks: null });
    }
    return this._hands.get(handIdx);
  }

  /**
   * Smooth a set of 21 landmarks for a given hand.
   * @param {object[]} landmarks - Array of 21 {x, y, z} landmarks
   * @param {number} handIdx - Hand index (0 or 1)
   * @param {number} timestamp - Current timestamp in ms (performance.now())
   * @returns {object[]} Smoothed landmarks
   */
  smooth(landmarks, handIdx, timestamp) {
    const state = this._getHandState(handIdx);
    const smoothed = [];

    for (let i = 0; i < landmarks.length; i++) {
      const raw = landmarks[i];
      const [fx, fy, fz] = state.filters[i];

      let sx = fx.filter(raw.x, timestamp);
      let sy = fy.filter(raw.y, timestamp);
      let sz = fz.filter(raw.z ?? 0, timestamp);

      // Dead zone: if movement is tiny, snap to previous position
      if (state.prevLandmarks) {
        const prev = state.prevLandmarks[i];
        const dx = sx - prev.x;
        const dy = sy - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this._deadZone) {
          sx = prev.x;
          sy = prev.y;
          sz = prev.z ?? sz;
        }
      }

      smoothed.push({ x: sx, y: sy, z: sz });
    }

    state.prevLandmarks = smoothed;
    return smoothed;
  }

  /**
   * Remove tracking state for a hand (e.g., when hand is lost).
   */
  removeHand(handIdx) {
    this._hands.delete(handIdx);
  }

  /**
   * Clear all hand states.
   */
  reset() {
    this._hands.clear();
  }
}
