/**
 * Synthetic 21-landmark arrays for testing gesture detectors.
 *
 * MediaPipe hand landmarks: 21 points, each {x, y, z}.
 * x/y are normalized [0,1], z is depth.
 *
 * Landmark layout:
 *   0: WRIST
 *   1-4: THUMB (CMC, MCP, IP, TIP)
 *   5-8: INDEX (MCP, PIP, DIP, TIP)
 *   9-12: MIDDLE (MCP, PIP, DIP, TIP)
 *   13-16: RING (MCP, PIP, DIP, TIP)
 *   17-20: PINKY (MCP, PIP, DIP, TIP)
 */

function lm(x, y, z = 0) {
  return { x, y, z };
}

// Base wrist position
const WRIST = { x: 0.5, y: 0.7 };

// Helper: generate a curled finger (tip near palm center ~0.5, 0.6)
function curledFinger(mcpX, mcpY) {
  return [
    lm(mcpX, mcpY),                    // MCP
    lm(mcpX, mcpY + 0.02),             // PIP (close to MCP)
    lm(mcpX * 0.9 + 0.05, mcpY + 0.01), // DIP
    lm(0.5, 0.62),                      // TIP near palm center
  ];
}

// Helper: generate an extended finger (tip far from wrist, pointing up)
function extendedFinger(mcpX, mcpY) {
  return [
    lm(mcpX, mcpY),                    // MCP
    lm(mcpX, mcpY - 0.08),             // PIP
    lm(mcpX, mcpY - 0.14),             // DIP
    lm(mcpX, mcpY - 0.20),             // TIP far from wrist
  ];
}

// Thumb curled: tip close to index MCP area
function curledThumb() {
  return [
    lm(0.38, 0.65),   // THUMB_CMC
    lm(0.36, 0.62),   // THUMB_MCP
    lm(0.38, 0.60),   // THUMB_IP
    lm(0.42, 0.61),   // THUMB_TIP (close to palm, near pinky_mcp distance is short)
  ];
}

// Thumb extended laterally (tip far from pinky MCP)
function extendedThumb() {
  return [
    lm(0.38, 0.65),   // THUMB_CMC
    lm(0.33, 0.60),   // THUMB_MCP
    lm(0.28, 0.55),   // THUMB_IP
    lm(0.22, 0.50),   // THUMB_TIP (far from pinky MCP at ~0.62, 0.60)
  ];
}

// Thumb pointing upward for thumbs-up
function thumbUp() {
  return [
    lm(0.38, 0.65),   // THUMB_CMC
    lm(0.38, 0.58),   // THUMB_MCP
    lm(0.38, 0.50),   // THUMB_IP
    lm(0.38, 0.42),   // THUMB_TIP (straight up, low y = up)
  ];
}

/**
 * FIST: all fingers curled, thumb curled
 */
export function fistLandmarks() {
  return [
    lm(WRIST.x, WRIST.y),     // 0: WRIST
    ...curledThumb(),           // 1-4: THUMB
    ...curledFinger(0.45, 0.58), // 5-8: INDEX
    ...curledFinger(0.50, 0.57), // 9-12: MIDDLE
    ...curledFinger(0.55, 0.58), // 13-16: RING
    ...curledFinger(0.60, 0.60), // 17-20: PINKY
  ];
}

/**
 * OPEN_PALM: all 5 fingers extended
 */
export function openPalmLandmarks() {
  return [
    lm(WRIST.x, WRIST.y),     // 0: WRIST
    ...extendedThumb(),         // 1-4: THUMB
    ...extendedFinger(0.45, 0.58), // 5-8: INDEX
    ...extendedFinger(0.50, 0.57), // 9-12: MIDDLE
    ...extendedFinger(0.55, 0.58), // 13-16: RING
    ...extendedFinger(0.60, 0.60), // 17-20: PINKY
  ];
}

/**
 * PINCH: thumb tip and index tip very close together
 */
export function pinchLandmarks() {
  const landmarks = openPalmLandmarks();
  // Move thumb tip and index tip close together
  landmarks[4] = lm(0.46, 0.45); // THUMB_TIP
  landmarks[8] = lm(0.47, 0.44); // INDEX_TIP - very close to thumb tip
  return landmarks;
}

/**
 * POINT: only index extended, all others curled (including thumb)
 */
export function pointLandmarks() {
  return [
    lm(WRIST.x, WRIST.y),     // 0: WRIST
    ...curledThumb(),           // 1-4: THUMB curled
    ...extendedFinger(0.45, 0.58), // 5-8: INDEX extended
    ...curledFinger(0.50, 0.57), // 9-12: MIDDLE curled
    ...curledFinger(0.55, 0.58), // 13-16: RING curled
    ...curledFinger(0.60, 0.60), // 17-20: PINKY curled
  ];
}

/**
 * FINGER_GUN: index + thumb extended, middle/ring/pinky curled
 */
export function fingerGunLandmarks() {
  return [
    lm(WRIST.x, WRIST.y),     // 0: WRIST
    ...extendedThumb(),         // 1-4: THUMB extended
    ...extendedFinger(0.45, 0.58), // 5-8: INDEX extended
    ...curledFinger(0.50, 0.57), // 9-12: MIDDLE curled
    ...curledFinger(0.55, 0.58), // 13-16: RING curled
    ...curledFinger(0.60, 0.60), // 17-20: PINKY curled
  ];
}

/**
 * PEACE_SIGN: index + middle extended, ring/pinky/thumb curled
 */
export function peaceLandmarks() {
  return [
    lm(WRIST.x, WRIST.y),     // 0: WRIST
    ...curledThumb(),           // 1-4: THUMB curled
    ...extendedFinger(0.45, 0.58), // 5-8: INDEX extended
    ...extendedFinger(0.50, 0.57), // 9-12: MIDDLE extended
    ...curledFinger(0.55, 0.58), // 13-16: RING curled
    ...curledFinger(0.60, 0.60), // 17-20: PINKY curled
  ];
}

/**
 * THUMBS_UP: thumb extended upward, all others curled
 */
export function thumbsUpLandmarks() {
  return [
    lm(WRIST.x, WRIST.y),     // 0: WRIST
    ...thumbUp(),               // 1-4: THUMB pointing up
    ...curledFinger(0.45, 0.58), // 5-8: INDEX curled
    ...curledFinger(0.50, 0.57), // 9-12: MIDDLE curled
    ...curledFinger(0.55, 0.58), // 13-16: RING curled
    ...curledFinger(0.60, 0.60), // 17-20: PINKY curled
  ];
}

/**
 * SWIPE: array of wrist positions showing lateral movement (left to right)
 */
export function swipeFrameHistory() {
  // 6 frames of wrist moving right quickly
  // displacement = 1.0 > 0.25, velocity = 1.0/6 ≈ 0.167 > 0.15
  const frames = [];
  for (let i = 0; i < 6; i++) {
    frames.push({ x: 0.2 + i * 0.2, y: 0.7 });
  }
  return frames;
}

/**
 * Generate full landmark set with wrist at a given position (for swipe testing).
 */
export function landmarksAtWrist(x, y) {
  const lms = fistLandmarks();
  lms[0] = lm(x, y);
  return lms;
}
