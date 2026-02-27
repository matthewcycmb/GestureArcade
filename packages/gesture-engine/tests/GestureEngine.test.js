import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GestureEngine } from '../src/GestureEngine.js';
import { GESTURES } from '../src/constants.js';
import {
  openPalmLandmarks,
  fistLandmarks,
  pinchLandmarks,
  pointLandmarks,
  fingerGunLandmarks,
  peaceLandmarks,
  thumbsUpLandmarks,
  landmarksAtWrist,
  swipeFrameHistory,
} from './fixtures/landmarks.js';

class MockHandTracker {
  constructor() {
    this._results = [];
    this._callIndex = 0;
  }

  setResults(results) {
    this._results = results;
    this._callIndex = 0;
  }

  async initialize() {}

  detect() {
    if (this._callIndex < this._results.length) {
      return this._results[this._callIndex++];
    }
    return { landmarks: [], handednesses: [] };
  }

  destroy() {}
}

function makeResult(landmarks) {
  return {
    landmarks: [landmarks],
    handednesses: [[{ categoryName: 'Right' }]],
  };
}

// Helper: prepare engine for testing (set running + mock browser globals)
function prepareEngine(engine) {
  engine._running = true;
  engine._video = {}; // mock video element
}

describe('GestureEngine', () => {
  let perfStub;
  let rafStub;

  beforeEach(() => {
    let now = 0;
    perfStub = vi.spyOn(performance, 'now').mockImplementation(() => now++);
    // Mock requestAnimationFrame to be a no-op (don't schedule next tick)
    globalThis.requestAnimationFrame = vi.fn();
    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    perfStub.mockRestore();
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });

  it('has required methods', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock });

    expect(typeof engine.start).toBe('function');
    expect(typeof engine.stop).toBe('function');
    expect(typeof engine.on).toBe('function');
    expect(typeof engine.off).toBe('function');
    expect(typeof engine.getVideoElement).toBe('function');
  });

  it('emits gesture events via on/off', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock, cooldownMs: 0 });
    prepareEngine(engine);
    const cb = vi.fn();

    engine.on(GESTURES.OPEN_PALM, cb);

    mock.setResults([makeResult(openPalmLandmarks())]);
    engine._tick();

    expect(cb).toHaveBeenCalled();
    const payload = cb.mock.calls[0][0];
    expect(payload.gesture).toBe(GESTURES.OPEN_PALM);
    expect(payload.hand).toBe('Right');
    expect(payload.position).toBeDefined();
    expect(payload.confidence).toBeDefined();
    expect(payload.timestamp).toBeDefined();
  });

  it('removes listener with off', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock, cooldownMs: 0 });
    prepareEngine(engine);
    const cb = vi.fn();

    engine.on(GESTURES.FIST, cb);
    engine.off(GESTURES.FIST, cb);

    mock.setResults([makeResult(fistLandmarks())]);
    engine._tick();

    expect(cb).not.toHaveBeenCalled();
  });

  it('emits frame event with raw data', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock, cooldownMs: 0 });
    prepareEngine(engine);
    const frameCb = vi.fn();

    engine.on('frame', frameCb);
    mock.setResults([makeResult(openPalmLandmarks())]);
    engine._tick();

    expect(frameCb).toHaveBeenCalled();
    expect(frameCb.mock.calls[0][0].landmarks).toBeDefined();
  });

  it('respects cooldown — does not fire same gesture rapidly', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock, cooldownMs: 300 });
    prepareEngine(engine);
    const cb = vi.fn();

    engine.on(GESTURES.FIST, cb);

    // Two rapid ticks with timestamps <300ms apart
    mock.setResults([makeResult(fistLandmarks()), makeResult(fistLandmarks())]);

    engine._tick();
    engine._tick();

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('detects SWIPE with direction and velocity', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock, cooldownMs: 0, smoothing: false });
    prepareEngine(engine);
    const cb = vi.fn();

    engine.on(GESTURES.SWIPE, cb);

    const frames = swipeFrameHistory();
    const results = frames.map(f => makeResult(landmarksAtWrist(f.x, f.y)));
    mock.setResults(results);

    for (let i = 0; i < results.length; i++) {
      engine._tick();
    }

    expect(cb).toHaveBeenCalled();
    const payload = cb.mock.calls[0][0];
    expect(payload.gesture).toBe(GESTURES.SWIPE);
    expect(payload.direction).toBeDefined();
    expect(payload.velocity).toBeGreaterThan(0);
  });

  it('detects each gesture type correctly', () => {
    const mock = new MockHandTracker();
    const engine = new GestureEngine({ handTracker: mock, cooldownMs: 0, smoothing: false });
    prepareEngine(engine);

    const fixtures = [
      { landmarks: pinchLandmarks(), expected: GESTURES.PINCH },
      { landmarks: pointLandmarks(), expected: GESTURES.POINT },
      { landmarks: fingerGunLandmarks(), expected: GESTURES.FINGER_GUN },
      { landmarks: peaceLandmarks(), expected: GESTURES.PEACE_SIGN },
      { landmarks: thumbsUpLandmarks(), expected: GESTURES.THUMBS_UP },
      { landmarks: fistLandmarks(), expected: GESTURES.FIST },
      { landmarks: openPalmLandmarks(), expected: GESTURES.OPEN_PALM },
    ];

    for (const { landmarks, expected } of fixtures) {
      const cb = vi.fn();
      engine.on(expected, cb);

      mock.setResults([makeResult(landmarks)]);
      engine._tick();

      expect(cb).toHaveBeenCalled();
      expect(cb.mock.calls[0][0].gesture).toBe(expected);

      engine.off(expected, cb);
      engine._cooldowns.clear();
      engine._handContexts.clear();
    }
  });
});
