// SOLMAR HEAT — audio: all sound is synthesized with WebAudio, no audio files.
// Engine hum follows speed, a two-tone siren, noise gunshots, pickup blips,
// and a simple bass loop. Created lazily on first user gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: sawtooth through a lowpass, pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      // Siren: triangle, two tones alternated by a timer.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 660;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  // Simple bass loop: A-minor groove, one note per 0.22 s step.
  const BASS = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 58.3, 0, 73.4, 0];
  function startMusic() {
    if (musicTimer !== null || !ctx) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const f = BASS[musicStep % BASS.length];
      musicStep += 1;
      if (!f) return;
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + 0.22);
    }, 220);
  }

  function blip(freq, dur, type, vol) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = type || 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  return {
    ensure,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted: () => muted,
    setEngine(speed01, driving) {
      if (!ctx) return;
      engineGain.gain.value = driving ? 0.05 + speed01 * 0.06 : 0;
      engineOsc.frequency.value = 50 + speed01 * 130;
    },
    setSiren(on, dt) {
      if (!ctx) return;
      sirenGain.gain.value = on && !muted ? 0.045 : 0;
      if (on) {
        sirenTimer += dt;
        sirenOsc.frequency.value = Math.floor(sirenTimer * 2.4) % 2 === 0 ? 660 : 880;
      }
    },
    shoot() {
      if (!ctx || muted) return;
      const len = ctx.sampleRate * 0.09;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.3;
      src.connect(g); g.connect(master);
      src.start();
    },
    punch() { blip(140, 0.08, 'square', 0.15); },
    pickup() { blip(880, 0.12, 'sine', 0.2); setTimeout(() => blip(1320, 0.14, 'sine', 0.2), 90); },
    cash() { blip(1046, 0.1, 'triangle', 0.2); setTimeout(() => blip(1568, 0.16, 'triangle', 0.2), 100); },
    crash() { blip(70, 0.25, 'sawtooth', 0.25); },
    busted() { blip(220, 0.5, 'sawtooth', 0.2); setTimeout(() => blip(165, 0.6, 'sawtooth', 0.2), 220); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.2), i * 110)); },
  };
}
