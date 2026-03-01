# Gesture Arcade

Browser-based arcade platform where players use hand gestures via webcam.

## Architecture

```
packages/gesture-engine/    Core gesture detection library
  src/GestureEngine.js      Main class (extends EventEmitter) — start/stop/on/off
  src/HandTracker.js        MediaPipe Hand Landmarker wrapper (injectable for testing)
  src/LandmarkSmoother.js   One Euro Filter for sub-pixel jitter suppression
  src/EventEmitter.js       Vanilla JS pub/sub (Map<string, Set<Function>>)
  src/constants.js          Landmark indices, finger groups, gesture names, thresholds
  src/gestures/             Pure function detectors — (landmarks, context) => result | null
    base.js                 Shared helpers: distance, palmCenter, isFingerExtended, etc.
    index.js                Registry with detection priority order
    pinch.js, fist.js, ...  Individual gesture detectors
  tests/                    Vitest test suites
    fixtures/landmarks.js   Synthetic 21-landmark arrays for all 8 gestures
  demo.html                 Webcam demo with gesture checklist and overlay
games/                      Game implementations (future)
hub/                        Hub/launcher UI (future)
scripts/
  verify.sh                 Full verification pipeline
  smoke-test.js             Node.js API surface test
```

## GestureEngine API

```js
import { GestureEngine, GESTURES } from '@gesture-arcade/engine';

const engine = new GestureEngine(options?);
// options.handTracker — inject mock for testing (default: real HandTracker)
// options.cooldownMs  — min ms between same gesture events (default: 300)

await engine.start();           // Init MediaPipe, start webcam + detection loop
engine.stop();                  // Stop everything, release camera
engine.getVideoElement();       // Returns the <video> element

engine.on('PINCH', (payload) => { ... });
engine.off('PINCH', callback);

// payload shape:
// { gesture, hand, position: {x, y}, confidence, timestamp }
// SWIPE adds: { direction: 'UP'|'DOWN'|'LEFT'|'RIGHT', velocity }
```

## Supported Gestures

| Gesture | Detection |
|---------|-----------|
| PINCH | Thumb tip + index tip distance < 0.06 |
| POINT | Only index extended, all others curled |
| FINGER_GUN | Index + thumb extended, others curled |
| PEACE_SIGN | Index + middle extended, others curled |
| THUMBS_UP | Thumb extended upward (within 30deg), others curled |
| FIST | All fingers curled |
| OPEN_PALM | At least 4 of 5 fingers extended |
| SWIPE | Wrist displacement > 0.25 over 6 frames with velocity > 0.15/frame |

Detection priority: PINCH > POINT > FINGER_GUN > PEACE_SIGN > THUMBS_UP > FIST > OPEN_PALM > SWIPE

## Commands

```bash
npm install              # Install all dependencies
npm test                 # Run Vitest unit tests
npm run build            # Build gesture-engine library to dist/
npm run dev              # Start Vite dev server (opens demo.html)
node scripts/smoke-test.js   # API surface verification
bash scripts/verify.sh       # Full verification pipeline
```

## Testing

- **Unit tests**: `npm test` — runs Vitest on all `tests/*.test.js`
- **Smoke test**: `node scripts/smoke-test.js` — verifies API surface and gesture classification in Node.js
- **Demo page**: `npm run dev` → perform all 8 gestures → checklist auto-completes
- **Full pipeline**: `bash scripts/verify.sh` — install, test, build, smoke, dev server health check

Gesture detectors are pure functions tested with synthetic landmark fixtures. GestureEngine integration tests use MockHandTracker (dependency injection).

## Adding a New Gesture

1. Create `packages/gesture-engine/src/gestures/my-gesture.js` — export a detector function `(landmarks, context) => result | null`
2. Add gesture name to `GESTURES` in `constants.js`
3. Add detector to `gestureDetectors` array in `gestures/index.js` (position by specificity)
4. Add synthetic fixture to `tests/fixtures/landmarks.js`
5. Add test cases to `tests/gestures.test.js`

## Hand Tracking Quality

Tracking stability comes primarily from **MediaPipe configuration, NOT external smoothing filters**.
The HandTracker is configured to match the proven FlappyFingers project:

- **GPU delegate** (`delegate: 'GPU'`) with **automatic CPU fallback** — GPU is preferred for speed, but silently falls back to CPU on mobile devices where GPU delegate fails
- **Pinned MediaPipe v0.10.18** — avoid regressions from `@latest`
- **Confidence thresholds** — `detection: 0.7`, `tracking: 0.5`, `presence: 0.5`
- **Single hand default** (`numHands: 1`) — halves detector workload
- **Flexible camera constraints** — uses `{ ideal: 640 }` / `{ ideal: 480 }` instead of exact values, so mobile cameras use their native resolution without scaling artifacts

The LandmarkSmoother (One Euro Filter) is a **light** final pass for sub-pixel jitter only.
DO NOT set aggressive smoothing values (low minCutoff, low beta) — this adds visible
lag/delay. Current values (`minCutoff: 3.0`, `beta: 5.0`) are intentionally light.
If tracking feels laggy, the fix is NEVER more smoothing — check MediaPipe config first.

## Mobile Compatibility

Mobile devices have different tracking characteristics than desktop. Key lessons learned:

### Distance-based thresholds must scale by hand size
On mobile, users hold the phone closer, so their hand fills more of the camera frame.
Fixed normalized-distance thresholds (e.g. pinch at `< 0.06`) become unreliable because
the same physical gesture produces larger normalized distances when the hand is closer.
**Fix**: Scale thresholds by palm width (distance from index MCP to pinky MCP, landmarks 5→17)
relative to a reference palm width (`0.18` at arm's length). See Flappy Bird `checkPinch()`.

### Use elapsed time, not frame counts, for timeouts
Mobile devices often run at 30fps instead of 60fps. Frame-counting timers (e.g.
`MAX_PINCH_FRAMES = 30` intended for ~500ms) take twice as long on mobile.
**Fix**: Use `performance.now()` for all duration-based logic. See Flappy Bird `MAX_PINCH_MS`.

### Coordinate-based tracking works fine across devices
Gestures that track position (wrist Y for Pong paddles, index tip X for Road Racer steering,
palm velocity for Fruit Ninja slicing) use normalized `[0,1]` coordinates which naturally
adapt to any camera resolution and hand distance. These do NOT need scaling fixes.

### Every game MUST have touch fallbacks
Webcam gesture tracking may fail on mobile (permission denied, thermal throttling, poor
lighting). Every game must include `touchstart`/`touchmove`/`touchend` event listeners
on the canvas as a fallback input method. Use `{ passive: false }` and `e.preventDefault()`
to prevent scroll/zoom interference.

## Threshold Tuning

All thresholds are in `packages/gesture-engine/src/constants.js` under `THRESHOLDS`:
- `PINCH_DISTANCE` (0.06) — max distance between thumb+index tips for pinch
- `SWIPE_MIN_VELOCITY` (0.15) — min wrist velocity per frame for swipe
- `SWIPE_MIN_DISPLACEMENT` (0.25) — min total displacement for swipe
- `CURL_DISTANCE` (0.1) — max distance from tip to palm center for "curled"
- `COOLDOWN_MS` (300) — default cooldown between repeated gesture events
- `THUMBS_UP_ANGLE_TOLERANCE` (30) — degrees from vertical for thumbs-up
- `SMOOTH_MIN_CUTOFF` (3.0) — One Euro Filter cutoff Hz (higher = less smoothing)
- `SMOOTH_BETA` (5.0) — speed coefficient (higher = less lag when moving)
- `SMOOTH_D_CUTOFF` (1.0) — derivative filter cutoff
- `SMOOTH_DEAD_ZONE` (0.002) — movements below this are suppressed

## Game Template

Every game must follow this file structure:
```
games/[game-name]/
  index.html          — Entry point, loads game.js as ES module
  game.js             — All game logic
  assets/             — Sprites, sounds, etc.
  test.js             — Vitest test verifying init + gesture response
```

### index.html skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Game Name] — Gesture Arcade</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script type="module" src="./game.js"></script>
</body>
</html>
```

### game.js required structure

```js
import { GestureEngine, GESTURES } from '../../packages/gesture-engine/index.js';

// --- Constants ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game state ---
let state = 'START'; // START | PLAYING | GAME_OVER
let score = 0;
let landmarks = []; // current frame landmarks (array of arrays)

// --- Webcam PiP overlay ---
// Must show webcam + hand skeleton so the player can see themselves.
// Draw as picture-in-picture in a corner of the game canvas.
// Reference: packages/gesture-engine/demo.html drawLandmarks()
const PIP = { width: 160, height: 120, margin: 12 };
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function drawPiP(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return;
  const x = canvas.width - PIP.width - PIP.margin;
  const y = canvas.height - PIP.height - PIP.margin;

  ctx.save();
  // Rounded clip
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.clip();
  // Mirror video
  ctx.translate(x + PIP.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, PIP.width, PIP.height);
  ctx.restore();

  // Draw landmarks on top
  ctx.save();
  ctx.translate(x, y);
  for (const lms of landmarks) {
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
    ctx.lineWidth = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo((1 - lms[a].x) * PIP.width, lms[a].y * PIP.height);
      ctx.lineTo((1 - lms[b].x) * PIP.width, lms[b].y * PIP.height);
      ctx.stroke();
    }
    for (let i = 0; i < lms.length; i++) {
      ctx.beginPath();
      ctx.arc((1 - lms[i].x) * PIP.width, lms[i].y * PIP.height, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
    }
  }
  ctx.restore();

  // PiP border
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, PIP.width, PIP.height, 8);
  ctx.stroke();
}

// --- Engine setup ---
const engine = new GestureEngine();
let videoEl = null;

engine.on('frame', (data) => {
  landmarks = data.landmarks; // [] when no hand detected — PiP just shows video
});

// --- Game screens ---
// START screen:  Show game title + "Show OPEN_PALM to start"
// PLAYING:       Game loop + score display + PiP
// GAME_OVER:     Final score + "Show OPEN_PALM to restart"

// --- Game loop (60fps) ---
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  // ... update + render based on state ...
  drawPiP(videoEl);
}

// --- Init ---
async function init() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  await engine.start();
  videoEl = engine.getVideoElement();

  // Wire up gesture → state transitions
  engine.on(GESTURES.OPEN_PALM, () => {
    if (state === 'START' || state === 'GAME_OVER') {
      state = 'PLAYING';
      score = 0;
    }
  });

  requestAnimationFrame(gameLoop);
}

init();
```

### Every game MUST:
- Import GestureEngine from `../../packages/gesture-engine/index.js`
- Show a webcam PiP overlay with hand skeleton (use the `drawPiP` pattern above with mirrored video + `(1 - lm.x)` for landmarks)
- Listen to `engine.on('frame', ...)` and store `data.landmarks` — this is `[]` when no hand is detected, so the PiP just shows the video feed with no skeleton (no frozen/stale landmarks)
- Include a **start screen** with game title and "Show [gesture] to start"
- Include a **score display** during gameplay
- Include a **game over screen** with final score and "Show [gesture] to restart"
- Run at 60fps using `requestAnimationFrame`
- Handle no hand detected gracefully (pause or ignore, never crash)
- Use delta-time for physics: `const dt = Math.min((timestamp - lastTimestamp) / (1000/60), 1.5)`
- Include **touch event fallbacks** (`touchstart`/`touchmove`/`touchend` with `{ passive: false }`) for all state transitions and gameplay controls — mobile users may not have reliable webcam tracking
- If using distance-based gesture thresholds, **scale by hand size** (palm width) for mobile compatibility
- Use **elapsed time** (`performance.now()`) not frame counts for any duration-based logic

### Every game MUST include a test file: `games/[game-name]/test.js`

```js
// Verifies: game initializes without errors, responds to mock gesture events
// Use MockHandTracker pattern from packages/gesture-engine/tests/GestureEngine.test.js
// Test: START → gesture → PLAYING transition
// Test: PLAYING → game over condition → GAME_OVER state
// Test: GAME_OVER → gesture → restarts
```

## Adding a New Game

1. Create `games/[game-name]/` with the file structure above
2. Copy the game.js skeleton and fill in game-specific logic
3. Map gestures to game actions (document in the section below)
4. Run `npm test` and `bash scripts/verify.sh` after building
5. Add a `## [Game Name]` section below with the gesture mapping

## Games

### Flappy Bird
- **Files**: `games/flappy-bird/` — `index.html`, `game.js`, `bird.js`, `pipes.js`, `collision.js`, `audio.js`, `renderer.js`, `test.js`
- **Resolution**: 480x640 (3:4 portrait), scales to fit viewport
- **Control**: Pinch (thumb+index) to flap — uses frame landmarks with hysteresis, NOT PINCH events
  - Base thresholds: trigger at `< 0.06`, release at `> 0.10` — scaled dynamically by palm width
  - Palm width scaling: `palmWidth(hand) / 0.18` — adapts to hand distance from camera (critical for mobile)
  - Auto-release after 500ms (`performance.now()` based, not frame-counting) to prevent stuck state
  - Resets on hand loss so next detection starts clean
  - One flap per pinch-release cycle (same feel as FlappyFingers)
- **Fallback**: Space bar, mouse click, or touch tap
- **States**: `MENU → READY → PLAYING → GAME_OVER → READY`
- **Physics**: gravity 0.5/frame², flap -8, pipe speed 3px/frame, gap 150px (initial)
- **Difficulty**: Every 10 points: speed *1.05, gap -2px (min 120px)
- **Audio**: Procedural Web Audio API (flap, score, hit — no external files)
- **PiP**: 160x120 bottom-right, mirrored webcam + hand skeleton, "LIVE" badge
- **Test**: `games/flappy-bird/test.js` — bird physics, pipes, collision, pinch hysteresis, state machine

### Pong
- **Files**: `games/pong/` — `index.html`, `game.js`, `paddle.js`, `ball.js`, `ai.js`, `collision.js`, `audio.js`, `renderer.js`, `test.js`
- **Resolution**: 960x540 (16:9 landscape), scales to fit viewport
- **Modes**: 1P vs AI, 2P local (two hands on same webcam)
- **Control**: Hand Y position (wrist landmark) maps to paddle position via frame landmarks
  - 1P: any detected hand controls left paddle, AI controls right
  - 2P: MediaPipe handedness — `'Left'` hand = left paddle, `'Right'` hand = right paddle
  - Lerp smoothing (`0.2 * dt`) for jitter-free movement
- **Fallback**: W/S or Up/Down (1P), W/S + Up/Down (2P), 1/2/Enter for menu, Space for start/restart, touch for mobile menu/state transitions
- **States**: `MENU → READY → PLAYING → GAME_OVER → MENU`
- **Physics**: Ball base speed 5px/frame, random ±45° serve, bounce angle from paddle hit offset (±60°), speed +3% per hit (max 2.5x), delta-time
- **Scoring**: First to 7 wins, 1.5s serve countdown between points
- **AI**: Predicts ball Y at paddle X with wall bounces, 150ms reaction delay, ±25px error margin, lerp 0.12/frame, drifts to center when idle
- **Audio**: Procedural Web Audio API (paddle hit, wall bounce, score, game over — no external files)
- **PiP**: 160x120 bottom-right, mirrored webcam + hand skeleton, "LIVE" badge, color-coded hands in 2P mode (green=left, blue=right)
- **Test**: `games/pong/test.js` — paddle physics, ball physics, AI behavior, collision detection, state machine