// Procedural Web Audio API sounds — no external files needed

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Read volume/mute from hub settings (localStorage)
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

export function playFlap() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.15, ctx.currentTime);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.07);
    osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.15);

    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) { /* audio not available */ }
}

export function playScore() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = createGain(ctx, 0.12, ctx.currentTime);
    osc1.type = 'sine';
    osc1.frequency.value = 660;
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second note (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = createGain(ctx, 0.12, ctx.currentTime + 0.15);
    osc2.type = 'sine';
    osc2.frequency.value = 880;
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.3);
  } catch (_) { /* audio not available */ }
}

export function playHit() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    // White noise burst
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = createGain(ctx, 0.15, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);

    // Bass thud
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.2, ctx.currentTime);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (_) { /* audio not available */ }
}
