// Crucible trailer score - fully synthesised. 90 BPM, D minor, 32 s, 48 kHz stereo WAV.
// Timeline (bars of 2.667 s) is shared with the picture: see TIMELINE in trailer2.html.
import fs from 'fs';

const SR = 48000, DUR = 32, N = SR * DUR;
const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4;
const L = new Float32Array(N), R = new Float32Array(N);        // dry bus
const RL = new Float32Array(N), RR = new Float32Array(N);      // reverb send bus

let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function add(i, l, r, send = 0) { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; RL[i] += l * send; RR[i] += r * send; }

// band-limited saw by additive synthesis (low notes only, so harmonic count stays small)
function sawSample(ph, f) { let s = 0; const nh = Math.min(40, Math.floor(9000 / f)); for (let h = 1; h <= nh; h++) s += Math.sin(ph * h) / h; return s * 0.6; }

// state-variable lowpass per voice
function svf() { let lp = 0, bp = 0; return (x, fc, q = 0.7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); lp += f * bp; const hp = x - lp - q * bp; bp += f * hp; return lp; }; }

// ---------- instruments ----------
function pad(t0, dur, notes, { gain = .12, att = 1.5, rel = 2, cutoff = [400, 2400], detune = 0.12, send = .5, pan = 0 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor((dur + rel) * SR);
  notes.forEach((m, vi) => {
    for (const d of [-detune, 0, detune]) {
      const f = mtof(m + d), filt = svf(); let ph = Math.random() * 6.28;
      const p = clamp(pan + (d * 3) + (vi - notes.length / 2) * .12, -1, 1), gl = Math.cos((p + 1) * Math.PI / 4), gr = Math.sin((p + 1) * Math.PI / 4);
      for (let k = 0; k < n; k++) {
        const t = k / SR; ph += 2 * Math.PI * f / SR;
        const e = Math.min(1, t / att) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
        const fc = cutoff[0] + (cutoff[1] - cutoff[0]) * Math.min(1, t / (dur * .8));
        const s = filt(sawSample(ph, f), fc) * e * gain / 3;
        add(i0 + k, s * gl, s * gr, send);
      }
    }
  });
}
function drone(t0, dur, m, gain = .22) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR), f = mtof(m);
  for (let k = 0; k < n; k++) { const t = k / SR; const e = Math.min(1, t / 3) * Math.min(1, (dur - t) / 1.5);
    const s = (Math.sin(2 * Math.PI * f * t) + .5 * Math.sin(2 * Math.PI * f * 2 * t + Math.sin(t * .7)) + .15 * Math.sin(2 * Math.PI * f * 3.01 * t)) * e * gain * (0.85 + .15 * Math.sin(t * 1.3));
    add(i0 + k, s, s, .15); }
}
function impact(t0, size = 1) {           // cinematic hit: sub drop + noise crack + low tom body
  const i0 = Math.floor(t0 * SR), n = Math.floor(3.5 * SR); let ph = 0; const lpN = svf();
  for (let k = 0; k < n; k++) { const t = k / SR;
    const f = 38 + 110 * Math.exp(-t * 9); ph += 2 * Math.PI * f / SR;
    const sub = Math.sin(ph) * Math.exp(-t * 1.1) * .9;
    const crack = lpN(rnd(), 5000 * Math.exp(-t * 6) + 300) * Math.exp(-t * 7) * .9;
    const body = Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 4) * .5;
    const s = Math.tanh((sub + crack + body) * 1.6) * .55 * size;
    add(i0 + k, s, s * .97, .45);
  }
}
function braaam(t0, dur = 2.6) {          // brass-like horn blast, D2 + A2 + D3, distorted, filter swell
  const i0 = Math.floor(t0 * SR), n = Math.floor((dur + 1.5) * SR);
  const voices = [38, 45, 50, 38.07, 45.08, 26].map(m => ({ f: mtof(m), ph: Math.random() * 6, filt: svf() }));
  for (let k = 0; k < n; k++) { const t = k / SR;
    const e = Math.min(1, t / .06) * (t < dur ? 1 - .35 * (t / dur) : Math.max(0, .65 * (1 - (t - dur) / 1.5)));
    const fc = 180 + 1600 * Math.min(1, t / .35) * Math.exp(-t * .6);
    let s = 0; for (const v of voices) { v.ph += 2 * Math.PI * v.f * (1 + .003 * Math.sin(t * 5)) / SR; s += v.filt(sawSample(v.ph, v.f), fc); }
    s = Math.tanh(s * 1.8) * e * .28; add(i0 + k, s, s, .55);
  }
}
function taiko(t0, gain = 1, pitch = 1) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(1.2 * SR); let ph = 0; const lp = svf();
  for (let k = 0; k < n; k++) { const t = k / SR; const f = (95 + 60 * Math.exp(-t * 30)) * pitch; ph += 2 * Math.PI * f / SR;
    const s = (Math.sin(ph) * Math.exp(-t * 7) + lp(rnd(), 1800) * Math.exp(-t * 28) * .7) * .5 * gain;
    add(i0 + k, s, s, .3); }
}
function tick(t0, gain = .25) {           // clock tick
  const i0 = Math.floor(t0 * SR), n = Math.floor(.08 * SR);
  for (let k = 0; k < n; k++) { const t = k / SR; const s = (Math.sin(2 * Math.PI * 2400 * t) * .5 + rnd() * .5) * Math.exp(-t * 90) * gain; add(i0 + k, s * .9, s, .2); }
}
function ting(t0, gain = .18, base = 1320) { // metallic anvil ping for the forged letters
  const i0 = Math.floor(t0 * SR), n = Math.floor(2 * SR);
  const partials = [1, 2.76, 5.4, 8.93].map((r, j) => [base * r, 1 / (j + 1), 2.5 + j * 2]);
  for (let k = 0; k < n; k++) { const t = k / SR; let s = 0; for (const [f, a, d] of partials) s += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t * d);
    s *= gain; add(i0 + k, s * .8, s, .6); }
}
function ostinato(t0, bars, chords, gainRamp = [.05, .12]) { // 16th-note string ostinato
  const step = BEAT / 4; const total = bars * 16;
  for (let j = 0; j < total; j++) {
    const bar = Math.floor(j / 16), ch = chords[bar % chords.length], m = ch[[0, 1, 2, 1][j % 4]] + (j % 8 >= 4 ? 12 : 0);
    const t = t0 + j * step, f = mtof(m), i0 = Math.floor(t * SR), n = Math.floor(step * 1.6 * SR), filt = svf();
    const g = gainRamp[0] + (gainRamp[1] - gainRamp[0]) * (j / total), acc = j % 4 === 0 ? 1.3 : 1; let ph = 0;
    const fc = 700 + 3000 * (j / total);
    for (let k = 0; k < n; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR;
      const s = filt(sawSample(ph, f), fc) * Math.min(1, tt / .005) * Math.exp(-tt * 9) * g * acc;
      add(i0 + k, s * (j % 2 ? .7 : 1), s * (j % 2 ? 1 : .7), .35); }
  }
}
function riser(t0, dur) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR), bp = svf(); let ph = 0;
  for (let k = 0; k < n; k++) { const t = k / SR, x = t / dur;
    const fc = 300 + 7000 * x * x; ph += 2 * Math.PI * (110 + 900 * x * x * x) / SR;
    const s = (bp(rnd(), fc, .25) * .5 + Math.sin(ph) * .15) * x * x * .6; add(i0 + k, s, s, .4); }
}
function reverseSwell(tEnd, dur = 1.2) { // reversed cymbal into a hit
  const i0 = Math.floor((tEnd - dur) * SR), n = Math.floor(dur * SR), lo = svf(), hi = svf();
  for (let k = 0; k < n; k++) { const x = k / n; const w = rnd(); const band = lo(w, 1500 + 5500 * x) - hi(w, 400);
    const s = band * Math.pow(x, 3) * .5; add(i0 + k, s, s * .9, .5); }
}

// ---------- score ----------
const b = n => n * BAR;  // bar -> seconds
// Cold open: drone + clock
drone(0, b(2) + .3, 26, .2); drone(0, b(2), 38, .08);
for (let k = 0; k < 8; k++) tick(k * BEAT, k % 4 === 0 ? .3 : .18);
impact(b(1), .8);                                       // "it runs."
reverseSwell(b(2));
// Ignition
braaam(b(2), 2.4); impact(b(2), 1);
drone(b(2), b(10), 26, .22);
pad(b(2) + .4, b(2) - .4, [50, 53, 57], { gain: .08, att: 2, cutoff: [300, 1200] });
// Title forge: one ping per letter on 8th notes, rising
for (let k = 0; k < 8; k++) ting(b(3) + k * BEAT / 2, .12 + k * .01, 1175 * Math.pow(2, [0, 3, 5, 7, 10, 12, 15, 17][k] / 12) / 2);
reverseSwell(b(4), 1.3);
impact(b(4), 1.1);
// Montage: drums + ostinato over Dm | Bb | F | C
const prog = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];
ostinato(b(4), 4, prog, [.045, .11]);
prog.forEach((c, i) => { pad(b(4 + i), BAR, c.map(m => m - 12), { gain: .07, att: .3, rel: .6, cutoff: [500, 1500], send: .4 }); drone(b(4 + i), BAR, c[0] - 24, .12); });
for (let bar = 4; bar < 8; bar++) {
  const t = b(bar); const pat = bar < 7 ? [0, 1.5, 2, 3] : [0, 1, 1.5, 2, 2.5, 3, 3.25, 3.5, 3.75];
  pat.forEach(p => taiko(t + p * BEAT, p === 0 ? 1.1 : .75, p === 0 ? .9 : 1.1));
}
impact(b(6), .6);                                       // gauntlet BLOCK/PASS moment
riser(b(7) - BEAT * 2, BAR + BEAT * 2);
// Silence ... then the whisper and the hit
drone(b(8), BAR, 26, .06);
tick(b(8) + BEAT * 1.0, .12);
impact(b(8) + BAR / 2, .9);                             // "It improves."
reverseSwell(b(9), 1.4);
// Finale
impact(b(9), 1.25); braaam(b(9), 2.2);
pad(b(9), b(1), [38, 50, 53, 57, 62], { gain: .1, att: .4, cutoff: [600, 2600] });
pad(b(10), b(1), [34, 46, 50, 53, 58], { gain: .1, att: .8, cutoff: [800, 2600] });
pad(b(11), b(1) + .1, [38, 50, 54, 57, 62], { gain: .11, att: .8, rel: 3.5, cutoff: [900, 3000] }); // D major - the lift
taiko(b(9), 1.2, .85); taiko(b(10), .9, .85); taiko(b(11), 1, .8);

// ---------- reverb (Schroeder/Freeverb-lite) ----------
function reverb(inp, delaysComb, delaysAp, fb = .84, damp = .3) {
  const out = new Float32Array(N);
  const combs = delaysComb.map(d => ({ buf: new Float32Array(d), i: 0, store: 0 }));
  const aps = delaysAp.map(d => ({ buf: new Float32Array(d), i: 0 }));
  for (let k = 0; k < N; k++) {
    let s = 0; const x = inp[k] * .015;
    for (const c of combs) { const y = c.buf[c.i]; c.store = y * (1 - damp) + c.store * damp; c.buf[c.i] = x + c.store * fb; c.i = (c.i + 1) % c.buf.length; s += y; }
    for (const a of aps) { const y = a.buf[a.i]; const v = s + y * .5; a.buf[a.i] = v; a.i = (a.i + 1) % a.buf.length; s = y - v * .5; }
    out[k] = s;
  }
  return out;
}
const sc = SR / 44100;
const wl = reverb(RL, [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => Math.round(d * sc * 1.6)), [556, 441, 341, 225].map(d => Math.round(d * sc)));
const wr = reverb(RR, [1139, 1211, 1300, 1379, 1445, 1514, 1580, 1640].map(d => Math.round(d * sc * 1.6)), [579, 464, 364, 248].map(d => Math.round(d * sc)));

// ---------- master ----------
const mixL = new Float32Array(N), mixR = new Float32Array(N);
let peak = 0;
for (let k = 0; k < N; k++) { mixL[k] = L[k] + wl[k] * 1.2; mixR[k] = R[k] + wr[k] * 1.2; peak = Math.max(peak, Math.abs(mixL[k]), Math.abs(mixR[k])); }
const fadeOut = k => { const t = k / SR; return t > DUR - 2 ? Math.max(0, (DUR - t) / 2) : 1; };
const pre = 0.9 / peak * 1.8;                           // drive into soft clip
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) {
  const f = fadeOut(k);
  const l = Math.tanh(mixL[k] * pre) * .89 * f, r = Math.tanh(mixR[k] * pre) * .89 * f;
  buf.writeInt16LE(Math.round(l * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(r * 32767), 46 + k * 4);
}
fs.writeFileSync('music.wav', buf); console.log('music.wav written, raw peak', peak.toFixed(3));
