// WebAudio synthesised sound effects. No external assets.
export function createAudio() {
  let ac = null, master = null, noiseBuf = null;
  let volume = 0.7;

  function ensure() {
    if (ac) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = volume;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      const len = ac.sampleRate * 1.5;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { ac = null; return false; }
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(t, dur, peak, type, freq, q, out, freqEnd) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q || 0.7;
    const g = ac.createGain(); env(g, t, 0.002, peak, dur);
    s.connect(f); f.connect(g); g.connect(out || master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function tone(t, type, f0, f1, dur, peak, attack, out) {
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ac.createGain(); env(g, t, attack || 0.003, peak, dur);
    o.connect(g); g.connect(out || master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const sounds = {
    rifle(t) {
      noise(t, 0.09, 0.9, 'highpass', 1800, 0.5);
      noise(t, 0.16, 0.6, 'lowpass', 3000, 0.8, null, 400);
      tone(t, 'sine', 160, 45, 0.12, 0.9);
      tone(t, 'square', 900, 200, 0.03, 0.15);
    },
    shotgun(t) {
      noise(t, 0.35, 1.0, 'lowpass', 4000, 0.6, null, 250);
      noise(t, 0.06, 0.7, 'highpass', 2500, 0.5);
      tone(t, 'sine', 110, 30, 0.35, 1.0);
      tone(t, 'triangle', 70, 35, 0.25, 0.6);
    },
    reload(t) {
      tone(t, 'square', 1800, 1200, 0.03, 0.2); noise(t, 0.04, 0.3, 'bandpass', 3000, 3);
      tone(t + 0.12, 'square', 1400, 900, 0.03, 0.18); noise(t + 0.12, 0.05, 0.3, 'bandpass', 2200, 3);
    },
    pump(t) {
      noise(t, 0.06, 0.5, 'bandpass', 1500, 2); tone(t, 'square', 400, 200, 0.05, 0.2);
      noise(t + 0.14, 0.07, 0.6, 'bandpass', 1100, 2); tone(t + 0.14, 'square', 300, 150, 0.05, 0.25);
    },
    empty(t) { tone(t, 'square', 2200, 1800, 0.02, 0.15); noise(t, 0.02, 0.2, 'highpass', 4000, 1); },
    hit(t) { tone(t, 'square', 1900, 1900, 0.04, 0.12); },
    kill(t) { tone(t, 'sine', 1320, 1320, 0.25, 0.35); tone(t + 0.07, 'sine', 1760, 1760, 0.3, 0.3); },
    enemyShoot(t) { tone(t, 'sawtooth', 1400, 180, 0.22, 0.25); tone(t, 'sine', 700, 90, 0.2, 0.3); },
    enemyMelee(t) { noise(t, 0.18, 0.6, 'bandpass', 600, 1.5, null, 2500); tone(t, 'sawtooth', 120, 60, 0.12, 0.25); },
    enemyDeath(t) {
      tone(t, 'sawtooth', 600, 50, 0.7, 0.35); tone(t, 'square', 300, 40, 0.6, 0.15);
      noise(t, 0.5, 0.5, 'lowpass', 3000, 0.7, null, 200);
    },
    playerHurt(t) { tone(t, 'sine', 140, 60, 0.2, 0.9); noise(t, 0.12, 0.4, 'lowpass', 800, 1); },
    waveStart(t) {
      tone(t, 'triangle', 660, 660, 0.25, 0.3); tone(t + 0.15, 'triangle', 880, 880, 0.25, 0.3);
      tone(t + 0.3, 'triangle', 1320, 1320, 0.5, 0.3);
    },
    switch(t) { noise(t, 0.05, 0.3, 'bandpass', 2000, 2); tone(t + 0.06, 'square', 900, 700, 0.03, 0.12); },
    jump(t) { noise(t, 0.1, 0.15, 'lowpass', 700, 1); },
    land(t) { tone(t, 'sine', 90, 40, 0.12, 0.5); noise(t, 0.08, 0.25, 'lowpass', 500, 1); },
  };

  return {
    resume() { if (ensure() && ac.state === 'suspended') ac.resume(); },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.setTargetAtTime(volume, ac.currentTime, 0.02);
    },
    play(name, opts) {
      if (!ac || !master || ac.state !== 'running') return;
      const fn = sounds[name]; if (!fn) return;
      try { fn(ac.currentTime + ((opts && opts.delay) || 0)); } catch (e) { /* ignore */ }
    },
  };
}
