import { EventEmitter } from './EventEmitter.js';
import { HandTracker } from './HandTracker.js';
import { LandmarkSmoother } from './LandmarkSmoother.js';
import { gestureDetectors } from './gestures/index.js';
import { THRESHOLDS } from './constants.js';

export class GestureEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this._handTracker = options.handTracker || new HandTracker(options);
    this._cooldownMs = options.cooldownMs ?? THRESHOLDS.COOLDOWN_MS;
    this._smoothingEnabled = options.smoothing !== false; // on by default
    this._smoother = new LandmarkSmoother({
      minCutoff: options.smoothMinCutoff,
      beta: options.smoothBeta,
      dCutoff: options.smoothDCutoff,
      deadZone: options.smoothDeadZone,
    });
    this._video = null;
    this._rafId = null;
    this._running = false;

    // Per-hand context for temporal gestures (swipe history)
    this._handContexts = new Map();
    // Cooldown tracking: key = `${gesture}-${handIndex}`, value = last fire timestamp
    this._cooldowns = new Map();
  }

  async start() {
    await this._handTracker.initialize();

    this._video = document.createElement('video');
    this._video.setAttribute('playsinline', '');
    this._video.setAttribute('autoplay', '');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
    });
    this._video.srcObject = stream;
    await this._video.play();

    this._running = true;
    this._tick();
  }

  stop() {
    this._running = false;

    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this._video && this._video.srcObject) {
      for (const track of this._video.srcObject.getTracks()) {
        track.stop();
      }
      this._video.srcObject = null;
    }

    this._handTracker.destroy();
    this._smoother.reset();
    this._handContexts.clear();
    this._cooldowns.clear();
  }

  getVideoElement() {
    return this._video;
  }

  _tick() {
    if (!this._running) return;

    const now = performance.now();
    const result = this._handTracker.detect(this._video, now);

    if (result && result.landmarks && result.landmarks.length > 0) {
      // Smooth landmarks to eliminate jitter when hands are stationary
      const smoothedAll = [];
      for (let handIdx = 0; handIdx < result.landmarks.length; handIdx++) {
        const raw = result.landmarks[handIdx];
        const smoothed = this._smoothingEnabled
          ? this._smoother.smooth(raw, handIdx, now)
          : raw;
        smoothedAll.push(smoothed);
      }

      this.emit('frame', {
        landmarks: smoothedAll,
        handednesses: result.handednesses,
      });

      for (let handIdx = 0; handIdx < smoothedAll.length; handIdx++) {
        const landmarks = smoothedAll[handIdx];
        const handedness = result.handednesses?.[handIdx]?.[0]?.categoryName || 'Unknown';
        this._detectGestures(landmarks, handIdx, handedness, now);
      }
    } else {
      // No hands detected — emit empty frame so renderers clear the overlay
      this._smoother.reset();
      this.emit('frame', { landmarks: [], handednesses: [] });
    }

    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _detectGestures(landmarks, handIdx, hand, timestamp) {
    // Get or create per-hand context
    if (!this._handContexts.has(handIdx)) {
      this._handContexts.set(handIdx, { history: [] });
    }
    const context = this._handContexts.get(handIdx);

    let staticDetected = false;

    for (const detector of gestureDetectors) {
      // Static detectors: only first match wins
      if (!detector.temporal) {
        if (staticDetected) continue;
        const result = detector.detect(landmarks, context);
        if (result) {
          staticDetected = true;
          this._emitIfCooldownClear(result, handIdx, hand, landmarks, timestamp);
        }
      } else {
        // Temporal detectors (swipe) run independently
        const result = detector.detect(landmarks, context);
        if (result) {
          this._emitIfCooldownClear(result, handIdx, hand, landmarks, timestamp);
        }
      }
    }
  }

  _emitIfCooldownClear(result, handIdx, hand, landmarks, timestamp) {
    const key = `${result.gesture}-${handIdx}`;
    const lastFired = this._cooldowns.has(key) ? this._cooldowns.get(key) : -Infinity;

    if (timestamp - lastFired < this._cooldownMs) return;

    this._cooldowns.set(key, timestamp);

    const wrist = landmarks[0];
    const payload = {
      gesture: result.gesture,
      hand,
      position: { x: wrist.x, y: wrist.y },
      confidence: result.confidence,
      timestamp,
      ...(result.extras || {}),
    };

    this.emit(result.gesture, payload);
  }
}
