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

export function playPaddleHit() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.2, ctx.currentTime);

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.1);

    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

export function playWallBounce() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.12, ctx.currentTime);

    osc.type = 'sine';
    osc.frequency.value = 200;

    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (_) {}
}

export function playScore() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    const osc1 = ctx.createOscillator();
    const gain1 = createGain(ctx, 0.12, ctx.currentTime);
    osc1.type = 'sine';
    osc1.frequency.value = 660;
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = createGain(ctx, 0.12, ctx.currentTime + 0.15);
    osc2.type = 'sine';
    osc2.frequency.value = 880;
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

export function playGameOver() {
  try {
    const { muted } = getAudioSettings();
    if (muted) return;
    const ctx = getCtx();

    const notes = [440, 330, 220];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = createGain(ctx, 0.15, ctx.currentTime + i * 0.2);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.25);
    });
  } catch (_) {}
}
