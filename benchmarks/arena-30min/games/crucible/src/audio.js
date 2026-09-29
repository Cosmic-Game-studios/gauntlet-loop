// Arena audio: pure WebAudio synthesis, no assets.
export function createAudio() {
  let ctx = null, master = null, noiseW = null, noiseB = null, failed = false;
  let vol = 0.8, voices = 0;
  const MAX_VOICES = 12;
  const PRIORITY = { playerHurt: 1, enemyMelee: 1, waveStart: 1, waveClear: 1, gameover: 1, victory: 1 };
  const active = [];
  const lastPlay = {};

  function init() {
    if (ctx || failed) return ctx;
    try {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) { failed = true; return null; }
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = vol;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      master.connect(comp); comp.connect(ctx.destination);
      const sr = ctx.sampleRate;
      noiseW = ctx.createBuffer(1, sr * 1, sr);
      const d = noiseW.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseB = ctx.createBuffer(1, Math.floor(sr * 0.25), sr);
      const b = noiseB.getChannelData(0); let lp = 0;
      for (let i = 0; i < b.length; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.35;
        b[i] = lp * Math.pow(1 - i / b.length, 2) * 2.2;
      }
    } catch (e) { failed = true; ctx = null; }
    return ctx;
  }

  // helpers; t = absolute start time, all return end time
  function env(g, t, a, dur, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(o) { // {t,type,f0,f1,dur,peak,a,pitch,dist}
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    const p = o.pitch || 1;
    osc.frequency.setValueAtTime(o.f0 * p, o.t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(o.f1 * p, 1), o.t + o.dur);
    env(g, o.t, o.a || 0.004, o.dur, o.peak);
    let out = g;
    osc.connect(g);
    if (o.dist) {
      const ws = ctx.createWaveShaper(), c = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * o.dist); }
      ws.curve = c; g.connect(ws); out = ws;
    }
    out.connect(master);
    osc.start(o.t); osc.stop(o.t + o.dur + 0.02);
    return o.t + o.dur;
  }
  function noise(o) { // {t,buf,ftype,f0,f1,q,dur,peak,a,pitch}
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = o.buf === 'b' ? noiseB : noiseW;
    s.playbackRate.value = o.rate || 1;
    f.type = o.ftype || 'lowpass';
    const p = o.pitch || 1;
    f.frequency.setValueAtTime(o.f0 * p, o.t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(o.f1 * p, 20), o.t + o.dur);
    f.Q.value = o.q || 0.7;
    env(g, o.t, o.a || 0.003, o.dur, o.peak);
    s.connect(f); f.connect(g); g.connect(master);
    const off = Math.random() * 0.5;
    s.start(o.t, off); s.stop(o.t + Math.min(o.dur + 0.02, 0.48));
  }

  const R = (a, b) => a + Math.random() * (b - a);
  const S = {
    rifle(t, p) {
      const k = p * R(0.94, 1.06);
      noise({ t, ftype: 'highpass', f0: 1800, q: 0.5, dur: 0.09, peak: 0.9, pitch: k });
      noise({ t, buf: 'b', ftype: 'bandpass', f0: 3000, q: 0.8, dur: 0.05, peak: 0.6, pitch: k });
      tone({ t, type: 'sine', f0: 170, f1: 50, dur: 0.13, peak: 0.9, pitch: k });
    },
    shotgun(t, p) {
      const k = p * R(0.95, 1.05);
      noise({ t, ftype: 'lowpass', f0: 3500, f1: 300, dur: 0.3, peak: 1.0, pitch: k, a: 0.002 });
      noise({ t, ftype: 'highpass', f0: 2000, dur: 0.06, peak: 0.6, pitch: k });
      tone({ t, type: 'sine', f0: 90, f1: 32, dur: 0.3, peak: 1.0, pitch: k });
    },
    pump(t, p) {
      for (const [dt, f] of [[0, 900], [0.16, 600]]) {
        noise({ t: t + dt, ftype: 'bandpass', f0: f * 2, q: 3, dur: 0.05, peak: 0.6, pitch: p });
        tone({ t: t + dt, type: 'square', f0: f, f1: f * 0.5, dur: 0.04, peak: 0.25, pitch: p });
      }
    },
    reload(t, p) {
      noise({ t, ftype: 'bandpass', f0: 2200, q: 4, dur: 0.06, peak: 0.6, pitch: p });
      tone({ t, type: 'square', f0: 700, f1: 300, dur: 0.05, peak: 0.25, pitch: p });
      noise({ t: t + 0.35, ftype: 'bandpass', f0: 500, q: 1, dur: 0.15, peak: 0.25, pitch: p });
      noise({ t: t + 0.75, ftype: 'lowpass', f0: 1800, q: 1, dur: 0.08, peak: 0.9, pitch: p });
      tone({ t: t + 0.75, type: 'triangle', f0: 260, f1: 90, dur: 0.1, peak: 0.7, pitch: p });
      noise({ t: t + 0.9, ftype: 'bandpass', f0: 3000, q: 5, dur: 0.05, peak: 0.5, pitch: p });
    },
    dryfire(t, p) {
      noise({ t, ftype: 'bandpass', f0: 3500, q: 5, dur: 0.03, peak: 0.5, pitch: p });
      tone({ t, type: 'square', f0: 1200, f1: 800, dur: 0.02, peak: 0.15, pitch: p });
    },
    hit(t, p) {
      tone({ t, type: 'sine', f0: 140, f1: 55, dur: 0.12, peak: 0.9, pitch: p });
      noise({ t, buf: 'b', ftype: 'lowpass', f0: 900, dur: 0.1, peak: 0.6, pitch: p });
    },
    hitmarker(t, p) {
      tone({ t, type: 'square', f0: 2600, f1: 2000, dur: 0.035, peak: 0.25, a: 0.001, pitch: p });
    },
    headshot(t, p) {
      tone({ t, type: 'square', f0: 3000, f1: 2400, dur: 0.05, peak: 0.3, a: 0.001, pitch: p });
      tone({ t: t + 0.05, type: 'square', f0: 4000, dur: 0.12, peak: 0.25, a: 0.001, pitch: p });
      tone({ t, type: 'sine', f0: 200, f1: 60, dur: 0.15, peak: 0.8, pitch: p });
      noise({ t, buf: 'b', ftype: 'highpass', f0: 2500, dur: 0.06, peak: 0.5, pitch: p });
    },
    enemyMelee(t, p) {
      noise({ t, ftype: 'bandpass', f0: 500, f1: 3000, q: 2, dur: 0.28, peak: 0.6, a: 0.12, pitch: p });
    },
    enemyShoot(t, p) {
      tone({ t, type: 'sawtooth', f0: 1600, f1: 200, dur: 0.22, peak: 0.35, pitch: p });
      tone({ t, type: 'sine', f0: 800, f1: 100, dur: 0.2, peak: 0.4, pitch: p });
      noise({ t, ftype: 'highpass', f0: 4000, dur: 0.05, peak: 0.3, pitch: p });
    },
    enemyDeath(t, p) {
      tone({ t, type: 'sawtooth', f0: 220, f1: 40, dur: 0.6, peak: 0.6, dist: 6, a: 0.01, pitch: p });
      tone({ t, type: 'square', f0: 110, f1: 30, dur: 0.6, peak: 0.4, dist: 4, pitch: p });
      noise({ t: t + 0.05, buf: 'b', ftype: 'lowpass', f0: 1200, f1: 200, dur: 0.4, peak: 0.6, pitch: p });
    },
    playerHurt(t, p) {
      tone({ t, type: 'sine', f0: 110, f1: 45, dur: 0.25, peak: 1.0, pitch: p });
      noise({ t, ftype: 'lowpass', f0: 500, f1: 150, dur: 0.35, peak: 0.6, pitch: p });
    },
    footstep(t, p) {
      const k = p * R(0.85, 1.15);
      noise({ t, buf: 'b', ftype: 'lowpass', f0: 500, dur: 0.07, peak: 0.25, pitch: k });
      tone({ t, type: 'sine', f0: 90, f1: 55, dur: 0.06, peak: 0.25, pitch: k });
    },
    jump(t, p) {
      noise({ t, ftype: 'bandpass', f0: 400, f1: 1200, q: 1, dur: 0.15, peak: 0.25, a: 0.05, pitch: p });
      tone({ t, type: 'sine', f0: 200, f1: 380, dur: 0.12, peak: 0.2, pitch: p });
    },
    land(t, p) {
      tone({ t, type: 'sine', f0: 100, f1: 40, dur: 0.15, peak: 0.7, pitch: p });
      noise({ t, buf: 'b', ftype: 'lowpass', f0: 700, dur: 0.12, peak: 0.4, pitch: p });
    },
    waveStart(t, p) {
      tone({ t, type: 'sawtooth', f0: 220, f1: 880, dur: 0.7, peak: 0.25, a: 0.3, pitch: p });
      tone({ t, type: 'square', f0: 110, f1: 440, dur: 0.7, peak: 0.15, a: 0.3, pitch: p });
      noise({ t, ftype: 'bandpass', f0: 300, f1: 3000, q: 1, dur: 0.7, peak: 0.15, a: 0.4, pitch: p });
    },
    waveClear(t, p) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ t: t + i * 0.02, type: 'triangle', f0: f, dur: 0.9, peak: 0.22, a: 0.02, pitch: p }));
    },
    uiClick(t, p) {
      tone({ t, type: 'sine', f0: 1200, f1: 800, dur: 0.05, peak: 0.3, a: 0.001, pitch: p });
    },
    victory(t, p) {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) =>
        tone({ t: t + i * 0.13, type: 'triangle', f0: f, dur: i === 5 ? 1.0 : 0.35, peak: 0.28, a: 0.01, pitch: p }));
    },
    gameover(t, p) {
      [392, 349.23, 311.13, 261.63].forEach((f, i) =>
        tone({ t: t + i * 0.28, type: 'sawtooth', f0: f, f1: f * 0.97, dur: i === 3 ? 1.1 : 0.4, peak: 0.22, a: 0.02, pitch: p }));
    },
  };
  const DUR = { rifle: 0.15, shotgun: 0.32, pump: 0.25, reload: 1.05, dryfire: 0.05, hit: 0.13, hitmarker: 0.05,
    headshot: 0.2, enemyMelee: 0.3, enemyShoot: 0.25, enemyDeath: 0.65, playerHurt: 0.37, footstep: 0.08,
    jump: 0.17, land: 0.16, waveStart: 0.75, waveClear: 0.95, uiClick: 0.06, victory: 1.6, gameover: 1.6 };
  const MIN_GAP = { footstep: 0.08, hitmarker: 0.03, rifle: 0.03, uiClick: 0.03, hit: 0.03 };

  return {
    resume() {
      try { const c = init(); if (c && c.state === 'suspended') c.resume(); } catch (e) {}
    },
    setMasterVolume(v) {
      vol = Math.min(1, Math.max(0, +v || 0));
      try { if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.02); } catch (e) {}
    },
    play(name, opts) {
      try {
        const fn = S[name];
        if (!fn) return;
        if (!init()) return;
        if (voices >= MAX_VOICES) {
          if (!PRIORITY[name]) return;
          const k = active.findIndex(a => !PRIORITY[a.name]);
          if (k < 0) return;
          const o = active.splice(k, 1)[0]; clearTimeout(o.timer); voices--; try { o.sub.disconnect(); } catch (e) {}
        }
        const now = ctx.currentTime;
        if (lastPlay[name] !== undefined && now - lastPlay[name] < (MIN_GAP[name] || 0.02)) return;
        lastPlay[name] = now;
        const v = opts && opts.volume !== undefined ? Math.min(1, Math.max(0, opts.volume)) : 1;
        const pitch = opts && opts.pitch > 0 ? opts.pitch : 1;
        // per-sound volume: route via temporary gain inserted by swapping master target
        const sub = ctx.createGain(); sub.gain.value = v;
        sub.connect(master.__in || master);
        const saved = master;
        master = sub;
        try { fn(now + 0.005, pitch); } finally { master = saved; }
        voices++;
        const rec = { name, sub, timer: 0 };
        rec.timer = setTimeout(() => { const i = active.indexOf(rec); if (i >= 0) active.splice(i, 1); voices--; try { sub.disconnect(); } catch (e) {} }, (DUR[name] || 0.5) * 1000 + 100);
        active.push(rec);
      } catch (e) {}
    },
  };
}
