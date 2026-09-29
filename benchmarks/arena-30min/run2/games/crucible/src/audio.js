// Procedural WebAudio SFX. Interface per studio/ARCHITECTURE.md: createAudio() -> { unlock, setVolume, play }.
export function createAudio() {
  let ctx = null, master = null, comp = null, vol = 0.8;
  let whiteBuf = null, pinkBuf = null;
  let active = 0;
  const lastPlay = {};
  const MAXV = 24;
  // per-sound min interval (s) and priority (higher survives voice limit)
  const META = {
    rifle_fire: [0.03, 3], shotgun_fire: [0.05, 3], shotgun_pump: [0.1, 2], reload_start: [0.1, 2], reload_end: [0.1, 2],
    dry_fire: [0.08, 2], hit: [0.03, 3], kill: [0.05, 3], rusher_attack: [0.15, 2], rusher_alert: [0.3, 1], shooter_fire: [0.1, 2],
    projectile_impact: [0.05, 2], enemy_death: [0.06, 2], enemy_hurt: [0.05, 1], player_hurt: [0.1, 3], jump: [0.15, 1], land: [0.1, 1],
    footstep: [0.12, 0], wave_start: [0.5, 3], wave_clear: [0.5, 3], victory: [0.5, 3], gameover: [0.5, 3], ui_click: [0.03, 2], weapon_switch: [0.08, 2],
  };

  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = vol;
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
        master.connect(comp); comp.connect(ctx.destination);
        const n = ctx.sampleRate * 2;
        whiteBuf = ctx.createBuffer(1, n, ctx.sampleRate); pinkBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        const w = whiteBuf.getChannelData(0), p = pinkBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < n; i++) {
          const r = Math.random() * 2 - 1; w[i] = r;
          b0 = 0.99765 * b0 + r * 0.099; b1 = 0.963 * b1 + r * 0.2965; b2 = 0.57 * b2 + r * 1.0526;
          p[i] = (b0 + b1 + b2 + r * 0.1848) * 0.25;
        }
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* ignore */ }
  }
  function setVolume(v) {
    vol = Math.max(0, Math.min(1, +v || 0));
    if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.01);
  }

  // ---- building blocks; `t` absolute start time, `out` destination node ----
  const rr = (a, b) => a + Math.random() * (b - a);
  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function noise(out, t, o) { // o: dur, gain, type, f0, f1, q, attack, pink
    const s = ctx.createBufferSource(); s.buffer = o.pink ? pinkBuf : whiteBuf; s.loop = true;
    const off = Math.random() * 1.5; s.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.f0 || 4000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = ctx.createGain(); env(g, t, o.attack || 0.002, o.dur, o.gain || 0.5);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, off); s.stop(t + o.dur + (o.attack || 0.002) + 0.05);
  }
  function tone(out, t, o) { // o: type, f0, f1, dur, gain, attack
    const os = ctx.createOscillator(); os.type = o.type || 'sine';
    os.frequency.setValueAtTime(o.f0, t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(o.f1, 1), t + o.dur);
    const g = ctx.createGain(); env(g, t, o.attack || 0.003, o.dur, o.gain || 0.4);
    os.connect(g); g.connect(out);
    os.start(t); os.stop(t + o.dur + (o.attack || 0.003) + 0.05);
  }
  const click = (out, t, f = 2500, gain = 0.3, dur = 0.03) => noise(out, t, { dur, gain, type: 'bandpass', f0: f, q: 4 });

  const S = {
    rifle_fire(o, t, v) {
      noise(o, t, { dur: 0.09, gain: 0.7, type: 'highpass', f0: 1500 * v, attack: 0.001 });
      noise(o, t, { dur: 0.16, gain: 0.5, type: 'lowpass', f0: 5000, f1: 700, attack: 0.001 });
      tone(o, t, { type: 'sine', f0: 170 * v, f1: 45, dur: 0.14, gain: 0.9, attack: 0.001 });
      tone(o, t, { type: 'sawtooth', f0: 900 * v, f1: 200, dur: 0.04, gain: 0.15, attack: 0.001 });
      noise(o, t + 0.05, { dur: 0.3, gain: 0.08, pink: true, type: 'lowpass', f0: 1200, attack: 0.02 });
    },
    shotgun_fire(o, t, v) {
      noise(o, t, { dur: 0.35, gain: 0.9, type: 'lowpass', f0: 3500, f1: 250, attack: 0.001, pink: true });
      noise(o, t, { dur: 0.08, gain: 0.7, type: 'highpass', f0: 1200, attack: 0.001 });
      tone(o, t, { type: 'sine', f0: 110 * v, f1: 28, dur: 0.4, gain: 1.1, attack: 0.001 });
      tone(o, t, { type: 'triangle', f0: 260, f1: 60, dur: 0.15, gain: 0.35, attack: 0.001 });
      noise(o, t + 0.1, { dur: 0.7, gain: 0.12, pink: true, type: 'lowpass', f0: 700, attack: 0.05 });
    },
    shotgun_pump(o, t) {
      click(o, t, 1200, 0.5, 0.05); tone(o, t, { type: 'square', f0: 220, f1: 110, dur: 0.05, gain: 0.15 });
      click(o, t + 0.16, 1800, 0.55, 0.06); tone(o, t + 0.16, { type: 'square', f0: 300, f1: 140, dur: 0.06, gain: 0.15 });
    },
    reload_start(o, t) { click(o, t, 1600, 0.4, 0.04); tone(o, t, { type: 'square', f0: 400, f1: 200, dur: 0.05, gain: 0.08 }); click(o, t + 0.07, 900, 0.3, 0.05); },
    reload_end(o, t) { click(o, t, 2200, 0.5, 0.04); click(o, t + 0.09, 1400, 0.6, 0.06); tone(o, t + 0.09, { type: 'square', f0: 260, f1: 120, dur: 0.07, gain: 0.15 }); },
    dry_fire(o, t) { click(o, t, 3000, 0.4, 0.02); tone(o, t, { type: 'square', f0: 500, f1: 300, dur: 0.02, gain: 0.08 }); },
    hit(o, t) { tone(o, t, { type: 'square', f0: 1900, f1: 1500, dur: 0.05, gain: 0.22, attack: 0.001 }); click(o, t, 4000, 0.25, 0.02); },
    kill(o, t) {
      tone(o, t, { type: 'sine', f0: 1320, dur: 0.25, gain: 0.35 }); tone(o, t + 0.07, { type: 'sine', f0: 1980, dur: 0.4, gain: 0.3 });
      tone(o, t + 0.07, { type: 'triangle', f0: 3960, dur: 0.2, gain: 0.06 });
    },
    rusher_attack(o, t) {
      noise(o, t, { dur: 0.22, gain: 0.5, type: 'bandpass', f0: 500, f1: 2200, q: 1.2, attack: 0.08 });
      tone(o, t + 0.1, { type: 'sawtooth', f0: 140, f1: 70, dur: 0.16, gain: 0.3 });
      tone(o, t + 0.1, { type: 'sine', f0: 80, f1: 40, dur: 0.2, gain: 0.5 });
    },
    rusher_alert(o, t, v) {
      const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(90 * v, t); os.frequency.linearRampToValueAtTime(60 * v, t + 0.5);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 28; const lg = ctx.createGain(); lg.gain.value = 25; lfo.connect(lg); lg.connect(os.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 4;
      const g = ctx.createGain(); env(g, t, 0.08, 0.45, 0.35);
      os.connect(f); f.connect(g); g.connect(o); os.start(t); lfo.start(t); os.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    shooter_fire(o, t, v) {
      tone(o, t, { type: 'sawtooth', f0: 1400 * v, f1: 250, dur: 0.22, gain: 0.3, attack: 0.002 });
      tone(o, t, { type: 'square', f0: 300, f1: 900, dur: 0.12, gain: 0.12 });
      noise(o, t, { dur: 0.2, gain: 0.25, type: 'bandpass', f0: 3000, f1: 800, q: 2 });
    },
    projectile_impact(o, t) {
      noise(o, t, { dur: 0.25, gain: 0.5, type: 'lowpass', f0: 3000, f1: 300, attack: 0.001 });
      tone(o, t, { type: 'sine', f0: 200, f1: 50, dur: 0.2, gain: 0.5, attack: 0.001 }); tone(o, t, { type: 'sawtooth', f0: 800, f1: 200, dur: 0.1, gain: 0.12 });
    },
    enemy_death(o, t, v) {
      tone(o, t, { type: 'sawtooth', f0: 220 * v, f1: 40, dur: 0.55, gain: 0.3 });
      noise(o, t, { dur: 0.5, gain: 0.35, type: 'lowpass', f0: 2000, f1: 150, attack: 0.005, pink: true });
      tone(o, t + 0.25, { type: 'sine', f0: 70, f1: 35, dur: 0.3, gain: 0.5 });
    },
    enemy_hurt(o, t, v) { tone(o, t, { type: 'sawtooth', f0: 300 * v, f1: 150, dur: 0.12, gain: 0.22 }); noise(o, t, { dur: 0.08, gain: 0.25, type: 'bandpass', f0: 1200, q: 1 }); },
    player_hurt(o, t) {
      tone(o, t, { type: 'sine', f0: 90, f1: 40, dur: 0.3, gain: 0.9, attack: 0.001 });
      noise(o, t, { dur: 0.18, gain: 0.5, type: 'lowpass', f0: 900, f1: 200, attack: 0.001, pink: true });
      tone(o, t + 0.03, { type: 'sawtooth', f0: 200, f1: 110, dur: 0.22, gain: 0.2 });
    },
    jump(o, t) { noise(o, t, { dur: 0.14, gain: 0.18, type: 'bandpass', f0: 500, f1: 1400, q: 0.8, attack: 0.03 }); tone(o, t, { type: 'sine', f0: 140, f1: 220, dur: 0.1, gain: 0.15 }); },
    land(o, t) { tone(o, t, { type: 'sine', f0: 90, f1: 40, dur: 0.16, gain: 0.5, attack: 0.001 }); noise(o, t, { dur: 0.1, gain: 0.25, type: 'lowpass', f0: 800, f1: 200, attack: 0.001, pink: true }); },
    footstep(o, t, v) { noise(o, t, { dur: 0.07, gain: 0.2, type: 'lowpass', f0: 700 * v, f1: 200, attack: 0.002, pink: true }); tone(o, t, { type: 'sine', f0: 80 * v, f1: 50, dur: 0.06, gain: 0.15 }); },
    wave_start(o, t) { [196, 261.6, 392].forEach((f, i) => { tone(o, t + i * 0.11, { type: 'sawtooth', f0: f, dur: 0.35, gain: 0.14 }); tone(o, t + i * 0.11, { type: 'sine', f0: f / 2, dur: 0.4, gain: 0.25 }); }); },
    wave_clear(o, t) { [523.3, 659.3, 784, 1046.5].forEach((f, i) => { tone(o, t + i * 0.09, { type: 'triangle', f0: f, dur: 0.4, gain: 0.25 }); }); },
    victory(o, t) { [523.3, 659.3, 784, 1046.5, 784, 1046.5, 1318.5].forEach((f, i) => { tone(o, t + i * 0.15, { type: 'triangle', f0: f, dur: 0.55, gain: 0.25 }); tone(o, t + i * 0.15, { type: 'sawtooth', f0: f / 2, dur: 0.4, gain: 0.08 }); }); },
    gameover(o, t) { [392, 349.2, 311.1, 233.1].forEach((f, i) => { tone(o, t + i * 0.28, { type: 'sawtooth', f0: f, f1: f * 0.96, dur: 0.6, gain: 0.16 }); tone(o, t + i * 0.28, { type: 'sine', f0: f / 2, dur: 0.6, gain: 0.3 }); }); },
    ui_click(o, t) { tone(o, t, { type: 'sine', f0: 900, f1: 600, dur: 0.05, gain: 0.25, attack: 0.001 }); click(o, t, 3500, 0.15, 0.015); },
    weapon_switch(o, t) { click(o, t, 1000, 0.4, 0.05); tone(o, t, { type: 'square', f0: 180, f1: 110, dur: 0.06, gain: 0.12 }); click(o, t + 0.08, 2000, 0.4, 0.03); },
  };

  function play(name, opts = {}) {
    try {
      const fn = S[name];
      if (!fn || !ctx || ctx.state !== 'running') return;
      const [gap, prio] = META[name];
      const now = ctx.currentTime;
      if (now - (lastPlay[name] || -1) < gap) return;
      if (active >= MAXV && prio < 3) return;
      lastPlay[name] = now;
      let out = master, pan = null;
      const o = opts || {};
      let dist = 0;
      if (o.pos && o.listener && ctx.createStereoPanner) {
        const L = o.listener, e = L.matrixWorld.elements;
        const dx = o.pos.x - L.position.x, dy = o.pos.y - L.position.y, dz = o.pos.z - L.position.z;
        dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        // camera right vector = column 0 of matrixWorld
        const p = (dx * e[0] + dy * e[1] + dz * e[2]) / dist;
        pan = ctx.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, p * 0.9));
        const dg = ctx.createGain(); dg.gain.value = 1 / (1 + dist * 0.06);
        pan.connect(dg); dg.connect(master); out = pan;
      }
      const bus = ctx.createGain(); bus.gain.value = rr(0.9, 1.0); bus.connect(out);
      active++;
      setTimeout(() => { active = Math.max(0, active - 1); }, 700);
      fn(bus, now + 0.005, rr(0.94, 1.06));
    } catch (e) { /* never throw */ }
  }
  return { unlock, setVolume, play };
}
