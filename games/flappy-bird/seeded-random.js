// Mulberry32 — fast, deterministic 32-bit PRNG
// Both clients use the same seed so pipe positions are identical without syncing pipe state.

/**
 * Returns a seeded random function that produces values in [0, 1).
 * @param {number} seed - 32-bit unsigned integer seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let s = seed >>> 0; // ensure unsigned 32-bit
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
