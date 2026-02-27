class p {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
  }
  on(t, e) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e), this;
  }
  off(t, e) {
    const s = this._listeners.get(t);
    return s && (s.delete(e), s.size === 0 && this._listeners.delete(t)), this;
  }
  emit(t, e) {
    const s = this._listeners.get(t);
    if (s)
      for (const i of s)
        try {
          i(e);
        } catch (o) {
          console.error(`EventEmitter: listener for "${t}" threw:`, o);
        }
    return this;
  }
}
const S = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm", H = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
class O {
  constructor(t = {}) {
    this.wasmPath = t.wasmPath || S, this.modelPath = t.modelPath || H, this.numHands = t.numHands ?? 1, this.delegate = t.delegate || "GPU", this.minDetectionConfidence = t.minDetectionConfidence ?? 0.7, this.minPresenceConfidence = t.minPresenceConfidence ?? 0.5, this.minTrackingConfidence = t.minTrackingConfidence ?? 0.5, this._handLandmarker = null;
  }
  async initialize() {
    const { FilesetResolver: t, HandLandmarker: e } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs"), s = await t.forVisionTasks(this.wasmPath);
    this._handLandmarker = await e.createFromOptions(s, {
      baseOptions: {
        modelAssetPath: this.modelPath,
        delegate: this.delegate
      },
      runningMode: "VIDEO",
      numHands: this.numHands,
      minHandDetectionConfidence: this.minDetectionConfidence,
      minHandPresenceConfidence: this.minPresenceConfidence,
      minTrackingConfidence: this.minTrackingConfidence
    });
  }
  detect(t, e) {
    if (!this._handLandmarker)
      throw new Error("HandTracker not initialized. Call initialize() first.");
    return this._handLandmarker.detectForVideo(t, e);
  }
  destroy() {
    this._handLandmarker && (this._handLandmarker.close(), this._handLandmarker = null);
  }
}
const _ = {
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
  PINKY_TIP: 20
}, D = {
  THUMB: { mcp: 2, pip: 3, dip: 3, tip: 4 },
  // thumb has no DIP; reuse IP
  INDEX: { mcp: 5, pip: 6, dip: 7, tip: 8 },
  MIDDLE: { mcp: 9, pip: 10, dip: 11, tip: 12 },
  RING: { mcp: 13, pip: 14, dip: 15, tip: 16 },
  PINKY: { mcp: 17, pip: 18, dip: 19, tip: 20 }
}, M = [
  _.WRIST,
  _.THUMB_MCP,
  _.INDEX_MCP,
  _.MIDDLE_MCP,
  _.RING_MCP,
  _.PINKY_MCP
], f = {
  PINCH: "PINCH",
  OPEN_PALM: "OPEN_PALM",
  FIST: "FIST",
  FINGER_GUN: "FINGER_GUN",
  POINT: "POINT",
  SWIPE: "SWIPE",
  PEACE_SIGN: "PEACE_SIGN",
  THUMBS_UP: "THUMBS_UP"
}, a = {
  PINCH_DISTANCE: 0.06,
  SWIPE_MIN_VELOCITY: 0.15,
  SWIPE_MIN_DISPLACEMENT: 0.25,
  SWIPE_FRAME_HISTORY: 6,
  CURL_DISTANCE: 0.1,
  COOLDOWN_MS: 300,
  THUMBS_UP_ANGLE_TOLERANCE: 30,
  // Landmark smoothing (One Euro Filter) — light touch; GPU + confidence do the heavy lifting
  SMOOTH_MIN_CUTOFF: 3,
  // Hz — higher = less smoothing when still (was 0.8, now very light)
  SMOOTH_BETA: 5,
  // Speed coefficient — high = almost no lag when moving
  SMOOTH_D_CUTOFF: 1,
  // Hz — cutoff for derivative filter
  SMOOTH_DEAD_ZONE: 2e-3
  // Normalized coord — only suppress sub-pixel jitter
};
class T {
  constructor(t = 1, e = 0, s = 1) {
    this._minCutoff = t, this._beta = e, this._dCutoff = s, this._xPrev = null, this._dxPrev = 0, this._tPrev = null;
  }
  _smoothingFactor(t, e) {
    const s = 1 / (2 * Math.PI * e), i = 1 / t;
    return 1 / (1 + s / i);
  }
  _exponentialSmoothing(t, e, s) {
    return t * e + (1 - t) * s;
  }
  filter(t, e) {
    if (this._tPrev === null)
      return this._xPrev = t, this._tPrev = e, this._dxPrev = 0, t;
    const s = (e - this._tPrev) / 1e3;
    if (s <= 0) return this._xPrev;
    const i = 1 / s;
    this._tPrev = e;
    const o = (t - this._xPrev) / s, c = this._smoothingFactor(i, this._dCutoff), r = this._exponentialSmoothing(c, o, this._dxPrev);
    this._dxPrev = r;
    const h = this._minCutoff + this._beta * Math.abs(r), l = this._smoothingFactor(i, h), u = this._exponentialSmoothing(l, t, this._xPrev);
    return this._xPrev = u, u;
  }
  reset() {
    this._xPrev = null, this._dxPrev = 0, this._tPrev = null;
  }
}
class x {
  constructor(t = {}) {
    this._minCutoff = t.minCutoff ?? a.SMOOTH_MIN_CUTOFF, this._beta = t.beta ?? a.SMOOTH_BETA, this._dCutoff = t.dCutoff ?? a.SMOOTH_D_CUTOFF, this._deadZone = t.deadZone ?? a.SMOOTH_DEAD_ZONE, this._hands = /* @__PURE__ */ new Map();
  }
  _getHandState(t) {
    if (!this._hands.has(t)) {
      const e = [];
      for (let s = 0; s < 21; s++)
        e.push([
          new T(this._minCutoff, this._beta, this._dCutoff),
          new T(this._minCutoff, this._beta, this._dCutoff),
          new T(this._minCutoff, this._beta, this._dCutoff)
        ]);
      this._hands.set(t, { filters: e, prevLandmarks: null });
    }
    return this._hands.get(t);
  }
  /**
   * Smooth a set of 21 landmarks for a given hand.
   * @param {object[]} landmarks - Array of 21 {x, y, z} landmarks
   * @param {number} handIdx - Hand index (0 or 1)
   * @param {number} timestamp - Current timestamp in ms (performance.now())
   * @returns {object[]} Smoothed landmarks
   */
  smooth(t, e, s) {
    const i = this._getHandState(e), o = [];
    for (let c = 0; c < t.length; c++) {
      const r = t[c], [h, l, u] = i.filters[c];
      let P = h.filter(r.x, s), m = l.filter(r.y, s), C = u.filter(r.z ?? 0, s);
      if (i.prevLandmarks) {
        const E = i.prevLandmarks[c], N = P - E.x, g = m - E.y;
        Math.sqrt(N * N + g * g) < this._deadZone && (P = E.x, m = E.y, C = E.z ?? C);
      }
      o.push({ x: P, y: m, z: C });
    }
    return i.prevLandmarks = o, o;
  }
  /**
   * Remove tracking state for a hand (e.g., when hand is lost).
   */
  removeHand(t) {
    this._hands.delete(t);
  }
  /**
   * Clear all hand states.
   */
  reset() {
    this._hands.clear();
  }
}
function I(n, t) {
  const e = n.x - t.x, s = n.y - t.y;
  return Math.sqrt(e * e + s * s);
}
function y(n) {
  let t = 0, e = 0;
  for (const s of M)
    t += n[s].x, e += n[s].y;
  return { x: t / M.length, y: e / M.length };
}
function d(n, t) {
  const e = D[t];
  if (!e) return !1;
  const s = n[e.tip];
  if (t === "THUMB") {
    const c = n[_.THUMB_IP], r = n[_.PINKY_MCP];
    return I(s, r) > I(c, r);
  }
  const i = n[e.pip], o = n[_.WRIST];
  return I(s, o) > I(i, o);
}
function X(n, t) {
  const e = D[t];
  if (!e) return !1;
  const s = n[e.tip], i = y(n);
  return I(s, i) < a.CURL_DISTANCE;
}
function L(n, t) {
  return Math.atan2(t, n) * (180 / Math.PI);
}
function U(n) {
  const t = (n % 360 + 360) % 360;
  return t >= 315 || t < 45 ? "RIGHT" : t >= 45 && t < 135 ? "DOWN" : t >= 135 && t < 225 ? "LEFT" : "UP";
}
function w(n) {
  const t = n[_.THUMB_TIP], e = n[_.INDEX_TIP], s = I(t, e);
  if (s < a.PINCH_DISTANCE) {
    const i = Math.max(0, 1 - s / a.PINCH_DISTANCE);
    return {
      gesture: f.PINCH,
      confidence: i,
      extras: {
        position: {
          x: (t.x + e.x) / 2,
          y: (t.y + e.y) / 2
        }
      }
    };
  }
  return null;
}
function v(n) {
  const t = d(n, "INDEX"), e = !d(n, "THUMB"), s = !d(n, "MIDDLE"), i = !d(n, "RING"), o = !d(n, "PINKY");
  return t && e && s && i && o ? {
    gesture: f.POINT,
    confidence: 1
  } : null;
}
function A(n) {
  const t = d(n, "INDEX"), e = d(n, "THUMB"), s = !d(n, "MIDDLE"), i = !d(n, "RING"), o = !d(n, "PINKY");
  return t && e && s && i && o ? {
    gesture: f.FINGER_GUN,
    confidence: 0.9
  } : null;
}
function F(n) {
  const t = d(n, "INDEX"), e = d(n, "MIDDLE"), s = !d(n, "RING"), i = !d(n, "PINKY"), o = !d(n, "THUMB");
  return t && e && s && i && o ? {
    gesture: f.PEACE_SIGN,
    confidence: 1
  } : null;
}
function R(n) {
  const t = d(n, "THUMB"), e = !d(n, "INDEX"), s = !d(n, "MIDDLE"), i = !d(n, "RING"), o = !d(n, "PINKY");
  if (!t || !e || !s || !i || !o)
    return null;
  const c = n[_.THUMB_TIP], r = n[_.THUMB_MCP], h = c.x - r.x, l = c.y - r.y, u = Math.abs(Math.atan2(h, -l) * (180 / Math.PI));
  if (u <= a.THUMBS_UP_ANGLE_TOLERANCE) {
    const P = 1 - u / 90;
    return {
      gesture: f.THUMBS_UP,
      confidence: P
    };
  }
  return null;
}
const G = ["THUMB", "INDEX", "MIDDLE", "RING", "PINKY"];
function b(n) {
  return G.every((e) => !d(n, e)) ? {
    gesture: f.FIST,
    confidence: 1
  } : null;
}
const B = ["THUMB", "INDEX", "MIDDLE", "RING", "PINKY"];
function W(n) {
  const t = B.filter((e) => d(n, e)).length;
  return t >= 4 ? {
    gesture: f.OPEN_PALM,
    confidence: t / 5
  } : null;
}
function Y(n, t) {
  if (!t || !t.history) return null;
  const e = n[_.WRIST];
  if (t.history.push({ x: e.x, y: e.y }), t.history.length < a.SWIPE_FRAME_HISTORY) return null;
  for (; t.history.length > a.SWIPE_FRAME_HISTORY; )
    t.history.shift();
  const s = t.history[0], i = t.history[t.history.length - 1], o = i.x - s.x, c = i.y - s.y, r = Math.sqrt(o * o + c * c), h = r / a.SWIPE_FRAME_HISTORY;
  if (r > a.SWIPE_MIN_DISPLACEMENT && h > a.SWIPE_MIN_VELOCITY) {
    const l = L(o, c), u = U(l);
    return t.history.length = 0, {
      gesture: f.SWIPE,
      confidence: Math.min(1, h / (a.SWIPE_MIN_VELOCITY * 2)),
      extras: { direction: u, velocity: h }
    };
  }
  return null;
}
const k = [
  { name: "PINCH", detect: w, temporal: !1 },
  { name: "POINT", detect: v, temporal: !1 },
  { name: "FINGER_GUN", detect: A, temporal: !1 },
  { name: "PEACE_SIGN", detect: F, temporal: !1 },
  { name: "THUMBS_UP", detect: R, temporal: !1 },
  { name: "FIST", detect: b, temporal: !1 },
  { name: "OPEN_PALM", detect: W, temporal: !1 },
  { name: "SWIPE", detect: Y, temporal: !0 }
];
class z extends p {
  constructor(t = {}) {
    super(), this._handTracker = t.handTracker || new O(t), this._cooldownMs = t.cooldownMs ?? a.COOLDOWN_MS, this._smoothingEnabled = t.smoothing !== !1, this._smoother = new x({
      minCutoff: t.smoothMinCutoff,
      beta: t.smoothBeta,
      dCutoff: t.smoothDCutoff,
      deadZone: t.smoothDeadZone
    }), this._video = null, this._rafId = null, this._running = !1, this._handContexts = /* @__PURE__ */ new Map(), this._cooldowns = /* @__PURE__ */ new Map();
  }
  async start() {
    await this._handTracker.initialize(), this._video = document.createElement("video"), this._video.setAttribute("playsinline", ""), this._video.setAttribute("autoplay", "");
    const t = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 }
    });
    this._video.srcObject = t, await this._video.play(), this._running = !0, this._tick();
  }
  stop() {
    if (this._running = !1, this._rafId != null && (cancelAnimationFrame(this._rafId), this._rafId = null), this._video && this._video.srcObject) {
      for (const t of this._video.srcObject.getTracks())
        t.stop();
      this._video.srcObject = null;
    }
    this._handTracker.destroy(), this._smoother.reset(), this._handContexts.clear(), this._cooldowns.clear();
  }
  getVideoElement() {
    return this._video;
  }
  _tick() {
    var s, i, o;
    if (!this._running) return;
    const t = performance.now(), e = this._handTracker.detect(this._video, t);
    if (e && e.landmarks && e.landmarks.length > 0) {
      const c = [];
      for (let r = 0; r < e.landmarks.length; r++) {
        const h = e.landmarks[r], l = this._smoothingEnabled ? this._smoother.smooth(h, r, t) : h;
        c.push(l);
      }
      this.emit("frame", {
        landmarks: c,
        handednesses: e.handednesses
      });
      for (let r = 0; r < c.length; r++) {
        const h = c[r], l = ((o = (i = (s = e.handednesses) == null ? void 0 : s[r]) == null ? void 0 : i[0]) == null ? void 0 : o.categoryName) || "Unknown";
        this._detectGestures(h, r, l, t);
      }
    } else
      this._smoother.reset(), this.emit("frame", { landmarks: [], handednesses: [] });
    this._rafId = requestAnimationFrame(() => this._tick());
  }
  _detectGestures(t, e, s, i) {
    this._handContexts.has(e) || this._handContexts.set(e, { history: [] });
    const o = this._handContexts.get(e);
    let c = !1;
    for (const r of k)
      if (r.temporal) {
        const h = r.detect(t, o);
        h && this._emitIfCooldownClear(h, e, s, t, i);
      } else {
        if (c) continue;
        const h = r.detect(t, o);
        h && (c = !0, this._emitIfCooldownClear(h, e, s, t, i));
      }
  }
  _emitIfCooldownClear(t, e, s, i, o) {
    const c = `${t.gesture}-${e}`, r = this._cooldowns.has(c) ? this._cooldowns.get(c) : -1 / 0;
    if (o - r < this._cooldownMs) return;
    this._cooldowns.set(c, o);
    const h = i[0], l = {
      gesture: t.gesture,
      hand: s,
      position: { x: h.x, y: h.y },
      confidence: t.confidence,
      timestamp: o,
      ...t.extras || {}
    };
    this.emit(t.gesture, l);
  }
}
export {
  p as EventEmitter,
  D as FINGERS,
  f as GESTURES,
  z as GestureEngine,
  O as HandTracker,
  _ as LANDMARKS,
  x as LandmarkSmoother,
  a as THRESHOLDS,
  L as angleDeg,
  U as angleToDirection,
  I as distance,
  k as gestureDetectors,
  X as isFingerCurled,
  d as isFingerExtended,
  y as palmCenter
};
