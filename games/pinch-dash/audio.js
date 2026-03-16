// Procedural Web Audio API sounds — no external files needed

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function getAudioSettings() {
  try {
    const raw = localStorage.getItem('gesture-arcade-settings');
    if (raw) {
      const s = JSON.parse(raw);
      return { volume: (s.sound?.volume ?? 80) / 100, muted: !!s.sound?.muted };
    }
  } catch (_) {}
  return { volume: 0.8, muted: false };
}

function createGain(ctx, baseVolume, time) {
  const gain = ctx.createGain();
  const { volume, muted } = getAudioSettings();
  gain.gain.setValueAtTime(muted ? 0 : baseVolume * volume, time);
  return gain;
}

export function playJump() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.13, ctx.currentTime);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.12);

    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  } catch (_) {}
}

export function playDoubleJump() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Two layered sines for a richer double-jump sound
    [[500, 1000], [750, 1200]].forEach(([f0, f1]) => {
      const osc = ctx.createOscillator();
      const gain = createGain(ctx, 0.08, t);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.linearRampToValueAtTime(f1, t + 0.13);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  } catch (_) {}
}

export function playDeath() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const t = ctx.currentTime;

    // White noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = createGain(ctx, 0.18, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.35);
    noise.onended = () => { noise.disconnect(); noiseGain.disconnect(); };

    // Descending sine
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.2, t);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(30, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  } catch (_) {}
}
