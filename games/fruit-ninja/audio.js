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

// Slice whoosh sound
export function playSlice() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    // White noise burst (short whoosh)
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for swoosh character
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;

    const gain = createGain(ctx, 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(ctx.currentTime);
  } catch (_) {}
}

// Combo ascending arpeggio
export function playCombo(count) {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    const numNotes = Math.min(count, notes.length);
    for (let i = 0; i < numNotes; i++) {
      const osc = ctx.createOscillator();
      const gain = createGain(ctx, 0.1, ctx.currentTime + i * 0.06);
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.15);
    }
  } catch (_) {}
}

// Bomb explosion
export function playBomb() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    // White noise burst
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = createGain(ctx, 0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);

    // Bass thud
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.25, ctx.currentTime);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

// Missed fruit sad tone
export function playMiss() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.08, ctx.currentTime);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}
