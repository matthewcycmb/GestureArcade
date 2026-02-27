#!/usr/bin/env node

/**
 * Smoke test: verifies GestureEngine API surface and gesture detection
 * without browser APIs (no start() call).
 */

import { GestureEngine, GESTURES, gestureDetectors } from '../packages/gesture-engine/index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

console.log('=== Smoke Test: GestureEngine API ===\n');

// --- Method existence ---
console.log('1. Method existence');

class MockTracker {
  async initialize() {}
  detect() { return { landmarks: [], handednesses: [] }; }
  destroy() {}
}

const engine = new GestureEngine({ handTracker: new MockTracker() });

assert(typeof engine.start === 'function', 'start() exists');
assert(typeof engine.stop === 'function', 'stop() exists');
assert(typeof engine.on === 'function', 'on() exists');
assert(typeof engine.off === 'function', 'off() exists');
assert(typeof engine.getVideoElement === 'function', 'getVideoElement() exists');

// --- Gesture constants ---
console.log('\n2. Gesture constants');

const expectedGestures = [
  'PINCH', 'OPEN_PALM', 'FIST', 'FINGER_GUN',
  'POINT', 'SWIPE', 'PEACE_SIGN', 'THUMBS_UP',
];

for (const g of expectedGestures) {
  assert(GESTURES[g] === g, `GESTURES.${g} defined`);
}

// --- on/off/emit round-trip ---
console.log('\n3. EventEmitter on/off/emit');

let received = null;
const cb = (data) => { received = data; };
engine.on('test-event', cb);
engine.emit('test-event', { hello: 'world' });
assert(received && received.hello === 'world', 'on/emit works');

received = null;
engine.off('test-event', cb);
engine.emit('test-event', { hello: 'again' });
assert(received === null, 'off removes listener');

// --- Gesture detection with fixtures ---
console.log('\n4. Gesture detection');

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
} from '../packages/gesture-engine/tests/fixtures/landmarks.js';

const fixtureTests = [
  ['PINCH', pinchLandmarks],
  ['POINT', pointLandmarks],
  ['FINGER_GUN', fingerGunLandmarks],
  ['PEACE_SIGN', peaceLandmarks],
  ['THUMBS_UP', thumbsUpLandmarks],
  ['FIST', fistLandmarks],
  ['OPEN_PALM', openPalmLandmarks],
];

for (const [expected, getFixture] of fixtureTests) {
  const landmarks = getFixture();
  let detected = null;

  for (const detector of gestureDetectors) {
    if (detector.temporal) continue;
    const result = detector.detect(landmarks, {});
    if (result) {
      detected = result.gesture;
      break;
    }
  }

  assert(detected === expected, `${expected} detected correctly`);
}

// Swipe test
const context = { history: [] };
const frames = swipeFrameHistory();
let swipeResult = null;
for (const frame of frames) {
  swipeResult = gestureDetectors.find(d => d.name === 'SWIPE').detect(
    landmarksAtWrist(frame.x, frame.y),
    context
  );
}
assert(swipeResult && swipeResult.gesture === 'SWIPE', 'SWIPE detected correctly');

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
