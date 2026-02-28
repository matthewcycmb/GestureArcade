// Palm tracking, velocity detection, slice trail management
import { MCP_INDICES } from '../../packages/gesture-engine/src/constants.js';

const VELOCITY_THRESHOLD = 0.015; // normalized coords/frame
const TRAIL_MAX_POINTS = 20;
const TRAIL_FADE_MS = 300;

let prevPalm = null;
let trail = [];

function palmCenter(landmarks) {
  let sumX = 0, sumY = 0;
  for (const idx of MCP_INDICES) {
    sumX += landmarks[idx].x;
    sumY += landmarks[idx].y;
  }
  return {
    x: sumX / MCP_INDICES.length,
    y: sumY / MCP_INDICES.length,
  };
}

// Returns a slice segment { x1, y1, x2, y2 } in game coords, or null
export function updateSlicer(landmarks, timestamp, gameWidth, gameHeight) {
  if (!landmarks || landmarks.length === 0) {
    prevPalm = null;
    return null;
  }

  const hand = landmarks[0];
  if (!hand || hand.length < 21) {
    prevPalm = null;
    return null;
  }

  const palm = palmCenter(hand);
  // Mirror X to match mirrored PiP video
  const gameX = (1 - palm.x) * gameWidth;
  const gameY = palm.y * gameHeight;

  let segment = null;

  if (prevPalm) {
    // Velocity in normalized coords
    const dx = palm.x - prevPalm.normX;
    const dy = palm.y - prevPalm.normY;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    if (velocity > VELOCITY_THRESHOLD) {
      segment = {
        x1: prevPalm.x,
        y1: prevPalm.y,
        x2: gameX,
        y2: gameY,
      };

      // Add to trail
      trail.push({ x: gameX, y: gameY, timestamp });
      if (trail.length > TRAIL_MAX_POINTS) {
        trail.shift();
      }
    }
  }

  prevPalm = { x: gameX, y: gameY, normX: palm.x, normY: palm.y };
  return segment;
}

export function getSliceTrail(now) {
  // Filter out old points
  trail = trail.filter(p => now - p.timestamp < TRAIL_FADE_MS);
  return trail;
}

export function getCursorPosition() {
  return prevPalm ? { x: prevPalm.x, y: prevPalm.y } : null;
}

export function resetSlicer() {
  prevPalm = null;
  trail = [];
}
