// MediaPipe Hand Landmark indices
export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// Finger groupings with joint indices
export const FINGERS = {
  THUMB: { mcp: 2, pip: 3, dip: 3, tip: 4 }, // thumb has no DIP; reuse IP
  INDEX: { mcp: 5, pip: 6, dip: 7, tip: 8 },
  MIDDLE: { mcp: 9, pip: 10, dip: 11, tip: 12 },
  RING: { mcp: 13, pip: 14, dip: 15, tip: 16 },
  PINKY: { mcp: 17, pip: 18, dip: 19, tip: 20 },
};

// MCP joint indices for palm center calculation
export const MCP_INDICES = [
  LANDMARKS.WRIST,
  LANDMARKS.THUMB_MCP,
  LANDMARKS.INDEX_MCP,
  LANDMARKS.MIDDLE_MCP,
  LANDMARKS.RING_MCP,
  LANDMARKS.PINKY_MCP,
];

// Gesture name constants
export const GESTURES = {
  PINCH: 'PINCH',
  OPEN_PALM: 'OPEN_PALM',
  FIST: 'FIST',
  FINGER_GUN: 'FINGER_GUN',
  POINT: 'POINT',
  SWIPE: 'SWIPE',
  PEACE_SIGN: 'PEACE_SIGN',
  THUMBS_UP: 'THUMBS_UP',
};

// Tunable thresholds
export const THRESHOLDS = {
  PINCH_DISTANCE: 0.06,
  SWIPE_MIN_VELOCITY: 0.15,
  SWIPE_MIN_DISPLACEMENT: 0.25,
  SWIPE_FRAME_HISTORY: 6,
  CURL_DISTANCE: 0.1,
  COOLDOWN_MS: 300,
  THUMBS_UP_ANGLE_TOLERANCE: 30,

  // Landmark smoothing (One Euro Filter) — light touch; GPU + confidence do the heavy lifting
  SMOOTH_MIN_CUTOFF: 3.0,    // Hz — higher = less smoothing when still (was 0.8, now very light)
  SMOOTH_BETA: 5.0,          // Speed coefficient — high = almost no lag when moving
  SMOOTH_D_CUTOFF: 1.0,      // Hz — cutoff for derivative filter
  SMOOTH_DEAD_ZONE: 0.002,   // Normalized coord — only suppress sub-pixel jitter
};
