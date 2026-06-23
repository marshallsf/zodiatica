/* ZODIATICA - synthesized audio (Web Audio API). No external files needed. */
const Audio = (() => {
  let ac = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicStarted = false;

  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
    master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.0;
    musicGain.connect(master);
  }

  function now() { return ac ? ac.currentTime : 0; }

  // one note
  function tone(freq, dur, type = "sine", vol = 0.2, t0 = 0, glideTo = null) {
    if (!ac || muted) return;
    const t = now() + t0;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function chord(freqs, dur, type, vol) {
    freqs.forEach((f, i) => tone(f, dur, type, vol, i * 0.0));
  }

  // ---- ambient pad: slow detuned drones with a gentle filter sweep ----
  function startMusic() {
    if (!ac || musicStarted) return;
    musicStarted = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.connect(musicGain);

    // slowly drifting filter
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const roots = [110, 110 * 1.5, 110 * 2, 110 * 1.25]; // A-based drone tones
    roots.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f * (1 + (i - 1.5) * 0.004); // slight detune
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(filter);
      o.start();
    });

    // fade music in
    musicGain.gain.cancelScheduledValues(now());
    musicGain.gain.setValueAtTime(0.0001, now());
    musicGain.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.5, now() + 4);
  }

  // ---- SFX ----
  const sfx = {
    play()   { tone(523, 0.12, "triangle", 0.25); tone(784, 0.18, "sine", 0.18, 0.06); },
    draw()   { tone(300, 0.12, "sine", 0.2, 0, 220); },
    wild()   { tone(660, 0.4, "sine", 0.18, 0, 1320); tone(990, 0.4, "triangle", 0.1, 0.05); },
    reverse(){ tone(700, 0.18, "sawtooth", 0.14, 0, 280); },
    illegal(){ tone(160, 0.18, "square", 0.12); },
    deal()   { tone(440, 0.06, "sine", 0.12, 0, 600); },
    win()    {
      const seq = [523, 659, 784, 1047];
      seq.forEach((f, i) => tone(f, 0.25, "triangle", 0.25, i * 0.13));
      chord([523, 659, 784, 1047], 0.9, "sine", 0.12);
    },
  };

  function toggleMute() {
    muted = !muted;
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(now());
      musicGain.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.5, now() + 0.4);
    }
    return muted;
  }

  return {
    init() { init(); startMusic(); },
    sfx,
    toggleMute,
    isMuted: () => muted,
    resume() { if (ac && ac.state === "suspended") ac.resume(); },
  };
})();
