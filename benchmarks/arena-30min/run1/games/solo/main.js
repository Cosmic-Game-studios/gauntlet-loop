import * as THREE from './vendor/three.module.js';

// ============================================================ settings
const settings = { sens: 1.0, volume: 0.7 };
try { const s = JSON.parse(localStorage.getItem('arena-settings')); if (s) Object.assign(settings, s); } catch (e) { /* ignore */ }
function saveSettings() { try { localStorage.setItem('arena-settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } }

// ============================================================ renderer / scenes
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.autoClear = false;
document.body.insertBefore(renderer.domElement, document.body.firstChild);

const scene = new THREE.Scene();
const SKY = 0x28344f;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 35, 95);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10);
vmScene.add(new THREE.HemisphereLight(0xbcd4ff, 0x302820, 1.4));
const vmSun = new THREE.DirectionalLight(0xffe6c8, 2.0); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = vmCamera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); vmCamera.updateProjectionMatrix();
});

// ============================================================ lighting
scene.add(new THREE.HemisphereLight(0xa8c0ff, 0x4a3a30, 1.35));
const sun = new THREE.DirectionalLight(0xffdcb0, 2.4);
sun.position.set(22, 40, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 5, far: 90 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const muzzleLight = new THREE.PointLight(0xffc070, 0, 9, 2);
scene.add(muzzleLight);

// ============================================================ procedural textures
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; if (repeat) t.repeat.set(repeat, repeat);
  return t;
}
function speckle(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
const floorTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#3a4150'; g.fillRect(0, 0, s, s); speckle(g, s, 3000, 0.12);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  g.strokeStyle = 'rgba(120,200,255,.18)'; g.lineWidth = 1; g.strokeRect(4, 4, s - 8, s - 8);
}, 30);
const wallTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#56607a'; g.fillRect(0, 0, s, s); speckle(g, s, 2500, 0.1);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, s / 2 - 2, s, 4); g.fillRect(s / 2 - 2, 0, 4, s / 2);
  g.fillRect(0, s / 2, 4, s / 2);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, s, 6);
});
const crateTex = canvasTex(128, (g, s) => {
  g.fillStyle = '#c0762e'; g.fillRect(0, 0, s, s); speckle(g, s, 800, 0.15);
  g.strokeStyle = '#6b3b12'; g.lineWidth = 8; g.strokeRect(4, 4, s - 8, s - 8);
  g.beginPath(); g.moveTo(8, 8); g.lineTo(s - 8, s - 8); g.moveTo(s - 8, 8); g.lineTo(8, s - 8); g.lineWidth = 6; g.stroke();
});
const platTex = canvasTex(128, (g, s) => {
  g.fillStyle = '#2f5a66'; g.fillRect(0, 0, s, s); speckle(g, s, 1200, 0.12);
  g.fillStyle = 'rgba(0,0,0,.3)';
  for (let i = 0; i < s; i += 16) g.fillRect(0, i, s, 2);
  g.fillStyle = '#e8c33a'; for (let i = -s; i < s; i += 24) { g.save(); g.translate(i, 0); g.rotate(0.6); g.fillRect(0, -4, 10, 10); g.restore(); }
});

const mats = {
  floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05 }),
  wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.1 }),
  crate: new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.75 }),
  plat: new THREE.MeshStandardMaterial({ map: platTex, roughness: 0.7, metalness: 0.1 }),
  pillar: new THREE.MeshStandardMaterial({ color: 0x8792a8, roughness: 0.6, metalness: 0.1 }),
  trimCyan: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x3fe6ff, emissiveIntensity: 2.2 }),
  trimOrange: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xff8a2a, emissiveIntensity: 2.2 }),
};

// ============================================================ arena
const solids = []; // { min, max }
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function addBox(cx, cz, w, d, h, mat, y0 = 0, solid = true, shadows = true) {
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(w, h, d); m.position.set(cx, y0 + h / 2, cz);
  m.castShadow = shadows; m.receiveShadow = true;
  m.matrixAutoUpdate = false; m.updateMatrix();
  scene.add(m);
  if (solid) solids.push({ min: new THREE.Vector3(cx - w / 2, y0, cz - d / 2), max: new THREE.Vector3(cx + w / 2, y0 + h, cz + d / 2) });
  return m;
}
const S = 30;
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 2 * S), mats.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // perimeter walls + glowing trim
  const WH = 5;
  addBox(0, -S - 0.5, 2 * S + 2, 1, WH, mats.wall); addBox(0, S + 0.5, 2 * S + 2, 1, WH, mats.wall);
  addBox(-S - 0.5, 0, 1, 2 * S, WH, mats.wall); addBox(S + 0.5, 0, 1, 2 * S, WH, mats.wall);
  addBox(0, -S + 0.02, 2 * S, 0.06, 0.12, mats.trimCyan, 3.2, false, false); addBox(0, S - 0.02, 2 * S, 0.06, 0.12, mats.trimCyan, 3.2, false, false);
  addBox(-S + 0.02, 0, 0.06, 2 * S, 0.12, mats.trimOrange, 3.2, false, false); addBox(S - 0.02, 0, 0.06, 2 * S, 0.12, mats.trimOrange, 3.2, false, false);
  // central raised platform with stairs north + south
  addBox(0, 0, 8, 8, 1.6, mats.plat);
  addBox(0, 0, 8.1, 8.1, 0.08, mats.trimCyan, 1.56, false, false);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 3; i++) addBox(0, sgn * (4.4 + i * 0.8), 3, 0.8, 1.2 - i * 0.4, mats.plat);
  }
  // side ledges (east/west) reachable by stairs
  for (const sx of [-1, 1]) {
    addBox(sx * 24, 0, 6, 10, 1.2, mats.plat);
    for (let i = 0; i < 2; i++) addBox(sx * (20.6 - i * 0.8), 0, 0.8, 3, 0.8 - i * 0.4, mats.plat);
  }
  // pillars
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addBox(sx * 12, sz * 12, 2, 2, 4.5, mats.pillar);
    addBox(sx * 12, sz * 12, 2.1, 2.1, 0.1, sx * sz > 0 ? mats.trimCyan : mats.trimOrange, 3.6, false, false);
    addBox(sx * 7, sz * 16, 2, 2, 1.2, mats.crate);
    addBox(sx * 7.6, sz * 17.4, 1.1, 1.1, 1.1, mats.crate, 0);
    addBox(sx * 16, sz * 7, 2, 2, 1.2, mats.crate);
    addBox(sx * 22, sz * 22, 3, 3, 2.4, mats.wall);
    addBox(sx * 4.5, sz * 10.5, 1.4, 1.4, 1.4, mats.crate);
    addBox(sx * 17, sz * 19, 5, 1, 1.6, mats.wall);
  }
  addBox(0, -20, 6, 1.2, 1.6, mats.wall); addBox(0, 20, 6, 1.2, 1.6, mats.wall);
}

// ============================================================ collision helpers
function overlapBox(x, y, z, r, h) {
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z && y + h > b.min.y && y < b.max.y) return b;
  }
  return null;
}
// ray vs AABB, returns t or Infinity; writes normal axis into _hitN
const _hitN = new THREE.Vector3();
function rayBox(o, d, b, maxT) {
  let tmin = 0, tmax = maxT, axis = -1, sign = 0;
  for (let a = 0; a < 3; a++) {
    const oa = a === 0 ? o.x : a === 1 ? o.y : o.z, da = a === 0 ? d.x : a === 1 ? d.y : d.z;
    const mn = a === 0 ? b.min.x : a === 1 ? b.min.y : b.min.z, mx = a === 0 ? b.max.x : a === 1 ? b.max.y : b.max.z;
    if (Math.abs(da) < 1e-9) { if (oa < mn || oa > mx) return Infinity; continue; }
    let t1 = (mn - oa) / da, t2 = (mx - oa) / da, s = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = a; sign = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  if (axis < 0) return Infinity; // origin inside
  _hitN.set(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0);
  return tmin;
}
const worldNormal = new THREE.Vector3();
function raycastWorld(o, d, maxT) {
  let best = maxT;
  if (d.y < -1e-6) { const t = -o.y / d.y; if (t > 0 && t < best) { best = t; worldNormal.set(0, 1, 0); } }
  for (let i = 0; i < solids.length; i++) {
    const t = rayBox(o, d, solids[i], best);
    if (t < best) { best = t; worldNormal.copy(_hitN); }
  }
  return best;
}
const _los = new THREE.Vector3(), _losD = new THREE.Vector3();
function lineOfSight(ax, ay, az, bx, by, bz) {
  _los.set(ax, ay, az); _losD.set(bx - ax, by - ay, bz - az);
  const len = _losD.length(); _losD.divideScalar(len);
  for (let i = 0; i < solids.length; i++) if (rayBox(_los, _losD, solids[i], len) < len) return false;
  return true;
}

// ============================================================ navigation grid (flow field)
const CELL = 1, GN = 2 * S / CELL;
const blocked = new Uint8Array(GN * GN);
const flow = new Int32Array(GN * GN);
const bfsQueue = new Int32Array(GN * GN);
for (let gz = 0; gz < GN; gz++) for (let gx = 0; gx < GN; gx++) {
  const cx = -S + (gx + 0.5) * CELL, cz = -S + (gz + 0.5) * CELL;
  const r = 0.5 + 0.45;
  let bl = 0;
  for (const b of solids) if (b.max.y > 0.35 && cx + r > b.min.x && cx - r < b.max.x && cz + r > b.min.z && cz - r < b.max.z) { bl = 1; break; }
  blocked[gz * GN + gx] = bl;
}
const cellOf = (x, z) => {
  const gx = Math.max(0, Math.min(GN - 1, Math.floor((x + S) / CELL)));
  const gz = Math.max(0, Math.min(GN - 1, Math.floor((z + S) / CELL)));
  return gz * GN + gx;
};
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function computeFlow(tx, tz) {
  flow.fill(1e9);
  let start = cellOf(tx, tz);
  if (blocked[start]) { // nearest walkable cell
    const sx = start % GN, sz = (start / GN) | 0; let best = -1, bd = 1e9;
    for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) {
      const x = sx + dx, z = sz + dz; if (x < 0 || z < 0 || x >= GN || z >= GN) continue;
      const i = z * GN + x; const dd = dx * dx + dz * dz;
      if (!blocked[i] && dd < bd) { bd = dd; best = i; }
    }
    if (best < 0) return; start = best;
  }
  let head = 0, tail = 0; bfsQueue[tail++] = start; flow[start] = 0;
  while (head < tail) {
    const c = bfsQueue[head++], cx = c % GN, cz = (c / GN) | 0, cd = flow[c];
    for (let k = 0; k < 4; k++) {
      const x = cx + NB[k][0], z = cz + NB[k][1];
      if (x < 0 || z < 0 || x >= GN || z >= GN) continue;
      const i = z * GN + x;
      if (blocked[i] || flow[i] <= cd + 1) continue;
      flow[i] = cd + 1; bfsQueue[tail++] = i;
    }
  }
}
// returns direction into out (x,z) following the flow field
function flowDir(x, z, out) {
  const c = cellOf(x, z), cx = c % GN, cz = (c / GN) | 0;
  let best = flow[c], bi = -1;
  for (let k = 0; k < 8; k++) {
    const nx = cx + NB[k][0], nz = cz + NB[k][1];
    if (nx < 0 || nz < 0 || nx >= GN || nz >= GN) continue;
    const i = nz * GN + nx;
    if (blocked[i]) continue;
    if (k >= 4 && (blocked[cz * GN + nx] || blocked[nz * GN + cx])) continue; // no corner cutting
    const v = flow[i] + (k >= 4 ? 0.414 : 0);
    if (v < best) { best = v; bi = i; }
  }
  if (bi < 0) { out.x = 0; out.y = 0; return false; }
  const tx = -S + ((bi % GN) + 0.5) * CELL, tz = -S + (((bi / GN) | 0) + 0.5) * CELL;
  out.x = tx - x; out.y = tz - z; const l = Math.hypot(out.x, out.y) || 1; out.x /= l; out.y /= l;
  return true;
}

// ============================================================ audio
let actx = null, master = null, noiseBuf = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = settings.volume; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { actx = null; }
}
function sNoise(t0, dur, freq, vol, type = 'lowpass', q = 1) {
  const src = actx.createBufferSource(); src.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
}
function sTone(t0, f0, f1, dur, vol, type = 'sine') {
  const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function distVol(x, z) { const d = Math.hypot(x - player.pos.x, z - player.pos.z); return Math.max(0.12, 1 - d / 40); }
const sfx = {
  rifle() { const t = actx.currentTime; sNoise(t, 0.11, 2400, 0.55, 'bandpass', 0.8); sTone(t, 170, 55, 0.09, 0.35, 'square'); sNoise(t, 0.2, 500, 0.25); },
  shotgun() { const t = actx.currentTime; sNoise(t, 0.35, 1300, 0.9); sTone(t, 95, 35, 0.25, 0.6, 'sine'); sNoise(t, 0.07, 4000, 0.4, 'highpass');
    sNoise(t + 0.35, 0.05, 2500, 0.3, 'bandpass', 3); sNoise(t + 0.5, 0.06, 1800, 0.35, 'bandpass', 3); },
  empty() { const t = actx.currentTime; sNoise(t, 0.03, 3000, 0.3, 'bandpass', 4); },
  reload(dur) { const t = actx.currentTime; sNoise(t + 0.1, 0.05, 1500, 0.35, 'bandpass', 3); sTone(t + 0.12, 300, 200, 0.05, 0.1, 'square');
    sNoise(t + dur * 0.55, 0.05, 2200, 0.35, 'bandpass', 3); sNoise(t + dur * 0.85, 0.06, 1200, 0.45, 'bandpass', 3); sTone(t + dur * 0.85, 500, 350, 0.04, 0.1, 'square'); },
  switchW() { const t = actx.currentTime; sNoise(t, 0.05, 2000, 0.25, 'bandpass', 2); sNoise(t + 0.12, 0.04, 2800, 0.25, 'bandpass', 2); },
  hit(head) { const t = actx.currentTime; sTone(t, head ? 1800 : 1200, head ? 1500 : 900, 0.06, 0.22, 'triangle'); },
  enemyShot(x, z) { const t = actx.currentTime, v = distVol(x, z); sTone(t, 700, 180, 0.22, 0.25 * v, 'sawtooth'); sNoise(t, 0.1, 1500, 0.15 * v, 'bandpass', 2); },
  melee(x, z) { const t = actx.currentTime, v = distVol(x, z); sNoise(t, 0.18, 700, 0.5 * v); sTone(t, 160, 60, 0.15, 0.3 * v, 'sawtooth'); },
  rusherGrowl(x, z) { const t = actx.currentTime, v = distVol(x, z); sTone(t, 110, 70, 0.4, 0.12 * v, 'sawtooth'); },
  death(x, z) { const t = actx.currentTime, v = distVol(x, z); sTone(t, 320, 40, 0.55, 0.3 * v, 'sawtooth'); sNoise(t, 0.4, 900, 0.35 * v); sNoise(t + 0.05, 0.3, 3000, 0.1 * v, 'highpass'); },
  hurt() { const t = actx.currentTime; sTone(t, 220, 90, 0.18, 0.35, 'square'); sNoise(t, 0.12, 600, 0.35); },
  wave() { const t = actx.currentTime; sTone(t, 440, 440, 0.15, 0.15, 'triangle'); sTone(t + 0.18, 660, 660, 0.25, 0.15, 'triangle'); },
  impact() { const t = actx.currentTime; sNoise(t, 0.04, 3500, 0.08, 'bandpass', 2); },
};
function play(name, ...args) { if (!actx || !master) return; try { sfx[name](...args); } catch (e) { /* ignore */ } }

// ============================================================ effects: particles, decals, tracers, projectiles
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _obj = new THREE.Object3D();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);

const PMAX = 300;
const particles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ toneMapped: false }), PMAX);
particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage); particles.frustumCulled = false;
const pData = [];
for (let i = 0; i < PMAX; i++) { pData.push({ life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 1, grav: 1 }); particles.setMatrixAt(i, ZERO_M); particles.setColorAt(i, new THREE.Color(1, 1, 1)); }
scene.add(particles);
let pNext = 0;
const _col = new THREE.Color();
function spawnParticles(pos, n, color, speed, size, life, grav = 1, dir = null) {
  _col.set(color);
  for (let k = 0; k < n; k++) {
    const i = pNext; pNext = (pNext + 1) % PMAX; const p = pData[i];
    p.pos.copy(pos); p.vel.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
    if (dir) p.vel.addScaledVector(dir, speed * 0.7);
    p.life = p.max = life * (0.6 + Math.random() * 0.6); p.size = size * (0.6 + Math.random() * 0.8); p.grav = grav;
    particles.setColorAt(i, _col);
  }
  particles.instanceColor.needsUpdate = true;
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    const p = pData[i]; if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { particles.setMatrixAt(i, ZERO_M); continue; }
    p.vel.y -= 14 * p.grav * dt; p.pos.addScaledVector(p.vel, dt);
    if (p.pos.y < 0.03) { p.pos.y = 0.03; p.vel.y *= -0.3; p.vel.x *= 0.6; p.vel.z *= 0.6; }
    const sc = p.size * (p.life / p.max);
    _s.set(sc, sc, sc); _m4.compose(p.pos, _q.identity(), _s); particles.setMatrixAt(i, _m4);
  }
  particles.instanceMatrix.needsUpdate = true;
}

const DMAX = 80;
const decalTex = canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(20,20,20,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const decals = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), DMAX);
decals.frustumCulled = false;
for (let i = 0; i < DMAX; i++) decals.setMatrixAt(i, ZERO_M);
scene.add(decals);
let dNext = 0;
function spawnDecal(pos, normal) {
  _obj.position.copy(pos).addScaledVector(normal, 0.01);
  _p.copy(_obj.position).add(normal); _obj.lookAt(_p); _obj.rotateZ(Math.random() * 6.28);
  const sc = 0.7 + Math.random() * 0.6; _obj.scale.set(sc, sc, sc); _obj.updateMatrix();
  decals.setMatrixAt(dNext, _obj.matrix); dNext = (dNext + 1) % DMAX; decals.instanceMatrix.needsUpdate = true;
}

const TMAX = 40;
const tracerPos = new Float32Array(TMAX * 6), tracerCol = new Float32Array(TMAX * 6), tracerLife = new Float32Array(TMAX);
const tracerGeo = new THREE.BufferGeometry();
tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3).setUsage(THREE.DynamicDrawUsage));
tracerGeo.setAttribute('color', new THREE.BufferAttribute(tracerCol, 3).setUsage(THREE.DynamicDrawUsage));
const tracers = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
tracers.frustumCulled = false; scene.add(tracers);
let tNext = 0;
function spawnTracer(a, b) {
  const i = tNext; tNext = (tNext + 1) % TMAX;
  // start part-way along to look like a streak
  tracerPos[i * 6] = a.x + (b.x - a.x) * 0.05; tracerPos[i * 6 + 1] = a.y + (b.y - a.y) * 0.05; tracerPos[i * 6 + 2] = a.z + (b.z - a.z) * 0.05;
  tracerPos[i * 6 + 3] = b.x; tracerPos[i * 6 + 4] = b.y; tracerPos[i * 6 + 5] = b.z;
  tracerLife[i] = 0.07;
  tracerGeo.attributes.position.needsUpdate = true;
}
function updateTracers(dt) {
  for (let i = 0; i < TMAX; i++) {
    if (tracerLife[i] > 0) tracerLife[i] = Math.max(0, tracerLife[i] - dt);
    const k = tracerLife[i] / 0.07;
    tracerCol[i * 6] = 0.5 * k; tracerCol[i * 6 + 1] = 0.45 * k; tracerCol[i * 6 + 2] = 0.3 * k;
    tracerCol[i * 6 + 3] = 1.0 * k; tracerCol[i * 6 + 4] = 0.85 * k; tracerCol[i * 6 + 5] = 0.5 * k;
  }
  tracerGeo.attributes.color.needsUpdate = true;
}

// enemy projectiles
const PRMAX = 40;
const projGeo = new THREE.SphereGeometry(0.16, 10, 8);
const projMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f, toneMapped: false });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const projs = [];
for (let i = 0; i < PRMAX; i++) {
  const m = new THREE.Mesh(projGeo, projMat); const g = new THREE.Mesh(projGeo, glowMat); g.scale.setScalar(2.2); m.add(g);
  m.visible = false; scene.add(m);
  projs.push({ mesh: m, vel: new THREE.Vector3(), life: 0, dmg: 10, from: new THREE.Vector3() });
}
function fireProjectile(from, target, speed, dmg) {
  const p = projs.find(q => q.life <= 0); if (!p) return;
  p.mesh.position.copy(from); p.vel.subVectors(target, from).normalize().multiplyScalar(speed);
  p.life = 4; p.dmg = dmg; p.from.copy(from); p.mesh.visible = true;
}
function updateProjectiles(dt) {
  for (const p of projs) {
    if (p.life <= 0) continue;
    p.life -= dt;
    const pos = p.mesh.position; pos.addScaledVector(p.vel, dt);
    // hit player (capsule approx: vertical segment)
    const py = Math.min(Math.max(pos.y, player.pos.y + 0.3), player.pos.y + 1.5);
    const dx = pos.x - player.pos.x, dy = pos.y - py, dz = pos.z - player.pos.z;
    let dead = p.life <= 0;
    if (!dead && dx * dx + dy * dy + dz * dz < 0.55 * 0.55) { damagePlayer(p.dmg, p.from); dead = true; }
    if (!dead && (pos.y < 0 || overlapBox(pos.x, pos.y, pos.z, 0.05, 0.05))) { dead = true; }
    if (dead) { p.life = 0; p.mesh.visible = false; spawnParticles(pos, 8, 0xff7a2a, 4, 1.2, 0.35); }
  }
}

// ============================================================ player
const player = { pos: new THREE.Vector3(0, 0, 18), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, health: 100, r: 0.4, h: 1.75, eye: 1.62 };
const input = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
let godMode = false;

function movePlayer(dt) {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  let wx = 0, wz = 0;
  if (input.forward) { wx += fx; wz += fz; } if (input.back) { wx -= fx; wz -= fz; }
  if (input.right) { wx += rx; wz += rz; } if (input.left) { wx -= rx; wz -= rz; }
  const wl = Math.hypot(wx, wz);
  const sprinting = input.sprint && input.forward && !reloading();
  const speed = sprinting ? 9.2 : 6.0;
  if (wl > 0) { wx = wx / wl * speed; wz = wz / wl * speed; }
  const accel = player.onGround ? 14 : 3;
  const k = 1 - Math.exp(-accel * dt);
  player.vel.x += (wx - player.vel.x) * k; player.vel.z += (wz - player.vel.z) * k;
  if (input.jump && player.onGround) { player.vel.y = 7.2; player.onGround = false; }
  const p = player.pos, r = player.r, h = player.h;
  // X axis
  const dxm = player.vel.x * dt; p.x += dxm;
  let b = overlapBox(p.x, p.y, p.z, r, h);
  if (b) {
    const step = b.max.y - p.y;
    if (player.onGround && step > 0 && step <= 0.45 && !overlapBox(p.x, b.max.y + 0.001, p.z, r, h)) p.y = b.max.y + 0.001;
    else { p.x -= dxm; player.vel.x = 0; }
  }
  const dzm = player.vel.z * dt; p.z += dzm;
  b = overlapBox(p.x, p.y, p.z, r, h);
  if (b) {
    const step = b.max.y - p.y;
    if (player.onGround && step > 0 && step <= 0.45 && !overlapBox(p.x, b.max.y + 0.001, p.z, r, h)) p.y = b.max.y + 0.001;
    else { p.z -= dzm; player.vel.z = 0; }
  }
  // Y axis
  player.vel.y -= 22 * dt; if (player.vel.y < -40) player.vel.y = -40;
  p.y += player.vel.y * dt;
  player.onGround = false;
  if (p.y <= 0) { p.y = 0; player.vel.y = 0; player.onGround = true; }
  b = overlapBox(p.x, p.y, p.z, r, h);
  if (b) {
    if (player.vel.y <= 0) { p.y = b.max.y; player.onGround = true; } else { p.y = b.min.y - h - 0.001; }
    player.vel.y = 0;
  }
  // arena bounds safety
  p.x = Math.max(-S + r, Math.min(S - r, p.x)); p.z = Math.max(-S + r, Math.min(S - r, p.z));
}

// ============================================================ weapons + viewmodel
const WEAPONS = {
  rifle: { name: 'Rifle', magSize: 30, reserveMax: 90, interval: 0.095, reloadTime: 1.7, damage: 24, pellets: 1, spread: 0.006, bloom: 0.006, maxBloom: 0.05, kick: 0.012, range: 120 },
  shotgun: { name: 'Shotgun', magSize: 6, reserveMax: 24, interval: 0.85, reloadTime: 2.1, damage: 13, pellets: 8, spread: 0.075, bloom: 0, maxBloom: 0, kick: 0.05, range: 45 },
};
const wstate = { rifle: { ammo: 30, reserve: 90 }, shotgun: { ammo: 6, reserve: 24 } };
let current = 'rifle', cooldown = 0, reloadT = 0, switchT = 0, bloom = 0, kick = 0, pumpT = 0, flashT = 0, lastFire = 0;
const reloading = () => reloadT > 0;

const gunMats = {
  dark: new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.45, metalness: 0.1 }),
  body: new THREE.MeshStandardMaterial({ color: 0x7c8698, roughness: 0.5, metalness: 0.1 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x3fe6ff, emissiveIntensity: 1.6 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 }),
  accent2: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xff8a2a, emissiveIntensity: 1.6 }),
};
function vbox(parent, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function vcyl(parent, r, len, x, y, z, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); parent.add(m); return m; }

const flashTex = canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = gr; g.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = (i % 2 ? 0.22 : 0.5) * s; g.lineTo(s / 2 + Math.cos(a) * rr, s / 2 + Math.sin(a) * rr); }
  g.fill();
});
const flashMat = new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
function makeFlash(parent, z, size) {
  const f = new THREE.Group();
  const a = new THREE.Mesh(new THREE.PlaneGeometry(size, size), flashMat); f.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.6, size * 1.6), flashMat); b.rotation.y = Math.PI / 2; b.position.z = -size * 0.4; f.add(b);
  const c = b.clone(); c.rotation.set(0, Math.PI / 2, Math.PI / 2); f.add(c);
  f.position.set(0, 0, z); f.visible = false; parent.add(f); return f;
}

const viewmodel = new THREE.Group(); vmScene.add(viewmodel);
const guns = {};
{ // rifle
  const g = new THREE.Group();
  vbox(g, 0.07, 0.09, 0.42, 0, 0, -0.05, gunMats.body);
  vbox(g, 0.075, 0.02, 0.3, 0, 0.055, -0.08, gunMats.dark);
  vbox(g, 0.03, 0.05, 0.1, 0, 0.09, -0.02, gunMats.dark);
  vbox(g, 0.012, 0.012, 0.08, 0.02, 0.09, -0.02, gunMats.accent);
  vcyl(g, 0.016, 0.3, 0, 0.01, -0.4, gunMats.dark);
  vcyl(g, 0.026, 0.07, 0, 0.01, -0.54, gunMats.dark);
  vbox(g, 0.06, 0.07, 0.22, 0, -0.005, -0.33, gunMats.body);
  vbox(g, 0.062, 0.01, 0.16, 0, 0.035, -0.33, gunMats.accent);
  vbox(g, 0.05, 0.08, 0.2, 0, -0.01, 0.24, gunMats.dark);
  vbox(g, 0.045, 0.12, 0.05, 0, -0.07, 0.07, gunMats.dark);
  const mag = vbox(g, 0.045, 0.16, 0.07, 0, -0.12, -0.1, gunMats.dark); mag.rotation.x = 0.2;
  const magAccent = vbox(mag, 1.02, 0.1, 1.02, 0, -0.35, 0, gunMats.accent);
  g.userData = { mag, magY: mag.position.y, flash: makeFlash(g, -0.6, 0.22), muzzleZ: -0.6 };
  guns.rifle = g; viewmodel.add(g);
}
{ // shotgun
  const g = new THREE.Group();
  vbox(g, 0.08, 0.1, 0.34, 0, 0, 0, gunMats.body);
  vcyl(g, 0.022, 0.55, 0, 0.025, -0.42, gunMats.dark);
  vcyl(g, 0.018, 0.45, 0, -0.025, -0.38, gunMats.dark);
  const pump = vbox(g, 0.07, 0.06, 0.18, 0, -0.03, -0.36, gunMats.wood);
  vbox(g, 0.06, 0.1, 0.28, 0, -0.03, 0.28, gunMats.wood);
  vbox(g, 0.05, 0.12, 0.05, 0, -0.08, 0.1, gunMats.dark);
  vbox(g, 0.004, 0.012, 0.22, 0.041, 0.02, 0, gunMats.accent2); vbox(g, 0.004, 0.012, 0.22, -0.041, 0.02, 0, gunMats.accent2);
  const shell = vbox(g, 0.03, 0.03, 0.07, 0.02, 0.0, 0.02, new THREE.MeshStandardMaterial({ color: 0xc02020, roughness: 0.5 }));
  shell.visible = false;
  g.userData = { pump, pumpZ: pump.position.z, shell, flash: makeFlash(g, -0.72, 0.36), muzzleZ: -0.72 };
  guns.shotgun = g; viewmodel.add(g);
}
guns.shotgun.visible = false;
for (const k in guns) guns[k].traverse(o => { if (o.isMesh) o.frustumCulled = false; });

// ============================================================ enemies
const enemyGeo = {
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cone: new THREE.ConeGeometry(1, 1, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  box: boxGeo,
};
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffee55, emissiveIntensity: 3 });
const eyeMatS = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x55ffee, emissiveIntensity: 3 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.6, metalness: 0.1 });
const hpBarGeo = new THREE.PlaneGeometry(1, 0.08);
const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });
const hpFgMat = new THREE.MeshBasicMaterial({ color: 0xff4a3d, depthWrite: false });

function part(parent, geo, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
function buildRusher() {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x9c2a22, roughness: 0.55, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0 });
  const body = new THREE.Group(); body.position.y = 0.85; root.add(body);
  part(body, enemyGeo.sphere, skin, 0.42, 0.38, 0.5, 0, 0.05, 0);
  const head = new THREE.Group(); head.position.set(0, 0.42, -0.3); body.add(head);
  part(head, enemyGeo.sphere, skin, 0.26, 0.22, 0.28, 0, 0, 0);
  part(head, enemyGeo.sphere, eyeMat, 0.05, 0.04, 0.03, -0.1, 0.04, -0.24);
  part(head, enemyGeo.sphere, eyeMat, 0.05, 0.04, 0.03, 0.1, 0.04, -0.24);
  part(head, enemyGeo.box, darkMat, 0.3, 0.06, 0.1, 0, -0.12, -0.2);
  for (let i = 0; i < 4; i++) { const sp = part(body, enemyGeo.cone, darkMat, 0.07, 0.3, 0.07, 0, 0.38 - i * 0.03, 0.25 - i * 0.18); sp.rotation.x = -0.5; }
  const limbs = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.42, 0.15, -0.1); body.add(arm);
    part(arm, enemyGeo.cyl, skin, 0.08, 0.55, 0.08, 0, -0.25, 0);
    const claw = part(arm, enemyGeo.cone, darkMat, 0.08, 0.2, 0.08, 0, -0.6, 0); claw.rotation.x = Math.PI;
    const leg = new THREE.Group(); leg.position.set(sx * 0.22, 0.85 - 0.15, 0.1); root.add(leg);
    part(leg, enemyGeo.cyl, skin, 0.1, 0.72, 0.1, 0, -0.36, 0);
    part(leg, enemyGeo.box, darkMat, 0.16, 0.08, 0.26, 0, -0.68, -0.05);
    limbs.push(arm, leg);
  }
  const bar = new THREE.Group(); bar.position.y = 2.0; root.add(bar);
  bar.add(new THREE.Mesh(hpBarGeo, hpBgMat)); const fg = new THREE.Mesh(hpBarGeo, hpFgMat); fg.position.z = 0.001; bar.add(fg);
  return { root, body, head, limbs, skin, bar, fg };
}
function buildShooter() {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x4a6fd0, roughness: 0.45, metalness: 0.15, emissive: 0xffffff, emissiveIntensity: 0 });
  const body = new THREE.Group(); body.position.y = 1.25; root.add(body);
  part(body, enemyGeo.box, skin, 0.62, 0.6, 0.42, 0, 0.1, 0);
  part(body, enemyGeo.box, darkMat, 0.4, 0.3, 0.3, 0, -0.3, 0);
  part(body, enemyGeo.box, eyeMatS, 0.5, 0.05, 0.02, 0, 0.25, -0.22);
  const head = new THREE.Group(); head.position.set(0, 0.62, 0); body.add(head);
  part(head, enemyGeo.sphere, skin, 0.22, 0.2, 0.22, 0, 0, 0);
  part(head, enemyGeo.box, eyeMatS, 0.3, 0.07, 0.06, 0, 0.02, -0.19);
  part(head, enemyGeo.cyl, darkMat, 0.015, 0.3, 0.015, 0.12, 0.25, 0.05);
  const limbs = [];
  // cannon arm (right) and shield arm (left)
  const gunArm = new THREE.Group(); gunArm.position.set(0.42, 0.15, 0); body.add(gunArm);
  part(gunArm, enemyGeo.box, darkMat, 0.16, 0.16, 0.5, 0, 0, -0.2);
  const barrel = part(gunArm, enemyGeo.cyl, skin, 0.07, 0.35, 0.07, 0, 0, -0.55); barrel.rotation.x = Math.PI / 2;
  part(gunArm, enemyGeo.sphere, eyeMatS, 0.06, 0.06, 0.06, 0, 0, -0.73);
  const off = new THREE.Group(); off.position.set(-0.42, 0.15, 0); body.add(off);
  part(off, enemyGeo.cyl, skin, 0.07, 0.6, 0.07, 0, -0.28, 0);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.2, 0.9, 0); root.add(leg);
    part(leg, enemyGeo.box, skin, 0.14, 0.5, 0.16, 0, -0.25, 0);
    part(leg, enemyGeo.box, darkMat, 0.12, 0.45, 0.12, 0, -0.65, 0.04);
    part(leg, enemyGeo.box, darkMat, 0.18, 0.06, 0.3, 0, -0.87, -0.05);
    limbs.push(leg);
  }
  const bar = new THREE.Group(); bar.position.y = 2.35; root.add(bar);
  bar.add(new THREE.Mesh(hpBarGeo, hpBgMat)); const fg = new THREE.Mesh(hpBarGeo, hpFgMat); fg.position.z = 0.001; bar.add(fg);
  return { root, body, head, limbs, skin, bar, fg, gunArm, off };
}

const enemies = [];
let nextEnemyId = 1;
const ETYPES = {
  rusher: { hp: 70, speed: 5.2, radius: 0.5, bodyY: 0.9, bodyR: 0.55, headY: 1.3, headR: 0.3, score: 100 },
  shooter: { hp: 90, speed: 3.4, radius: 0.5, bodyY: 1.3, bodyR: 0.5, headY: 1.87, headR: 0.26, score: 150 },
};
let diff = { hp: 1, speed: 1, dmg: 1, fireRate: 1, projSpeed: 1 };
function spawnEnemy(type, x, y, z) {
  const T = ETYPES[type]; if (!T) return -1;
  const m = type === 'rusher' ? buildRusher() : buildShooter();
  m.root.position.set(x, 0, z); scene.add(m.root);
  const e = {
    id: nextEnemyId++, type, T, m, pos: m.root.position, hp: T.hp * diff.hp, maxHp: T.hp * diff.hp, alive: true, deathT: 0,
    vel: new THREE.Vector3(), knock: new THREE.Vector3(), flash: 0, stagger: 0, attackCd: 1 + Math.random(), animT: Math.random() * 10,
    strafe: Math.random() < 0.5 ? -1 : 1, strafeT: 0, swing: 0, facing: 0, growlT: 2 + Math.random() * 4, spawnT: 0.5,
  };
  m.root.scale.setScalar(0.01);
  enemies.push(e);
  spawnParticles(_p.set(x, 1, z), 20, type === 'rusher' ? 0xff5040 : 0x5aa0ff, 5, 1.5, 0.6, 0.3);
  return e.id;
}
function removeEnemy(i) {
  const e = enemies[i]; scene.remove(e.m.root); e.m.skin.dispose(); enemies.splice(i, 1);
}
function aliveCount() { let n = 0; for (const e of enemies) if (e.alive) n++; return n; }

function damageEnemy(e, dmg, head, dir) {
  if (!e.alive) return false;
  e.hp -= dmg * (head ? 2 : 1);
  e.flash = 0.1; e.stagger = 0.18;
  e.knock.x += dir.x * (current === 'shotgun' ? 1.2 : 0.6); e.knock.z += dir.z * (current === 'shotgun' ? 1.2 : 0.6);
  _p.set(e.pos.x, head ? e.T.headY : e.T.bodyY, e.pos.z);
  spawnParticles(_p, head ? 10 : 5, e.type === 'rusher' ? 0x8a0f0a : 0x3a6fff, 3, 1.2, 0.5, 1, dir);
  if (e.hp <= 0) {
    e.alive = false; e.deathT = 0; e.m.bar.visible = false;
    score += e.T.score + (head ? 50 : 0);
    play('death', e.pos.x, e.pos.z);
    _p.set(e.pos.x, e.T.bodyY, e.pos.z);
    spawnParticles(_p, 36, e.type === 'rusher' ? 0xff3a20 : 0x5ad0ff, 7, 2.2, 0.9);
    spawnParticles(_p, 14, 0x222222, 4, 2.5, 1.2);
    return true;
  }
  return false;
}

const _dir2 = { x: 0, y: 0 }, _tgt = new THREE.Vector3(), _from = new THREE.Vector3();
let flowTimer = 0;
function updateEnemies(dt) {
  flowTimer -= dt;
  if (flowTimer <= 0) { flowTimer = 0.25; computeFlow(player.pos.x, player.pos.z); }
  const px = player.pos.x, pz = player.pos.z;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], m = e.m;
    e.animT += dt;
    if (e.spawnT > 0) { e.spawnT -= dt; m.root.scale.setScalar(Math.max(0.01, 1 - e.spawnT / 0.5)); }
    if (e.flash > 0) { e.flash -= dt; m.skin.emissiveIntensity = e.flash > 0 ? 0.8 : 0; }
    if (!e.alive) {
      e.deathT += dt;
      const t = Math.min(1, e.deathT / 0.6);
      m.root.rotation.x = -t * Math.PI / 2 * 0.95; m.root.position.y = -t * 0.3;
      m.body.rotation.z = t * 0.5;
      if (e.deathT > 1.0) m.root.scale.setScalar(Math.max(0.01, 1 - (e.deathT - 1.0) / 0.5));
      if (e.deathT > 1.5) removeEnemy(i);
      continue;
    }
    const dx = px - e.pos.x, dz = pz - e.pos.z, dist = Math.hypot(dx, dz);
    const eyeY = e.type === 'shooter' ? 1.4 : 1.2;
    let mx = 0, mz = 0, speed = e.T.speed * diff.speed;
    if (e.stagger > 0) { e.stagger -= dt; speed *= 0.25; }
    if (e.type === 'rusher') {
      if (dist < 2.2) { mx = dx / (dist || 1); mz = dz / (dist || 1); if (dist < 1.1) speed = 0; }
      else if (flowDir(e.pos.x, e.pos.z, _dir2)) { mx = _dir2.x; mz = _dir2.y; }
      else { mx = dx / dist; mz = dz / dist; }
      e.attackCd -= dt;
      const dy = player.pos.y - e.pos.y;
      if (dist < 1.6 && dy < 2.2 && e.attackCd <= 0) {
        e.attackCd = 1.0; e.swing = 0.35;
        play('melee', e.pos.x, e.pos.z);
        damagePlayer(9 * diff.dmg, e.pos);
      }
      e.growlT -= dt; if (e.growlT <= 0) { e.growlT = 3 + Math.random() * 4; if (dist < 25) play('rusherGrowl', e.pos.x, e.pos.z); }
    } else {
      const los = dist < 40 && lineOfSight(e.pos.x, eyeY, e.pos.z, px, player.pos.y + 1.3, pz);
      e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = 1.2 + Math.random() * 1.8; e.strafe *= -1; }
      if (!los || dist > 17) {
        if (flowDir(e.pos.x, e.pos.z, _dir2)) { mx = _dir2.x; mz = _dir2.y; } else { mx = dx / dist; mz = dz / dist; }
      } else if (dist < 8) { mx = -dx / dist; mz = -dz / dist; mx += -dz / dist * e.strafe * 0.6; mz += dx / dist * e.strafe * 0.6; }
      else { mx = -dz / dist * e.strafe; mz = dx / dist * e.strafe; speed *= 0.6; }
      e.attackCd -= dt;
      if (los && dist < 30 && e.attackCd <= 0 && e.spawnT <= 0) {
        e.attackCd = (1.7 + Math.random() * 1.2) / diff.fireRate; e.swing = 0.25;
        // muzzle position (right arm tip)
        const c = Math.cos(e.facing), s = Math.sin(e.facing);
        _from.set(e.pos.x + c * 0.42 - s * 0.75, 1.4, e.pos.z - s * 0.42 - c * 0.75);
        _tgt.set(px, player.pos.y + 1.1, pz);
        fireProjectile(_from, _tgt, 15 * diff.projSpeed, 10 * diff.dmg);
        play('enemyShot', e.pos.x, e.pos.z);
      }
    }
    // separation
    for (const o of enemies) {
      if (o === e || !o.alive) continue;
      const sx = e.pos.x - o.pos.x, sz = e.pos.z - o.pos.z, d2 = sx * sx + sz * sz;
      if (d2 < 1.2 && d2 > 1e-4) { const d = Math.sqrt(d2); mx += sx / d * 0.8; mz += sz / d * 0.8; }
    }
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const kk = 1 - Math.exp(-8 * dt);
    e.vel.x += (mx * speed - e.vel.x) * kk; e.vel.z += (mz * speed - e.vel.z) * kk;
    e.pos.x += (e.vel.x + e.knock.x) * dt; e.pos.z += (e.vel.z + e.knock.z) * dt;
    e.knock.multiplyScalar(Math.exp(-6 * dt));
    // push out of solids (circle vs AABB)
    const r = e.T.radius;
    for (let k = 0; k < solids.length; k++) {
      const b = solids[k];
      if (b.max.y < 0.3) continue;
      const cx = Math.max(b.min.x, Math.min(e.pos.x, b.max.x)), cz = Math.max(b.min.z, Math.min(e.pos.z, b.max.z));
      const ox = e.pos.x - cx, oz = e.pos.z - cz, d2 = ox * ox + oz * oz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); e.pos.x += ox / d * (r - d); e.pos.z += oz / d * (r - d); }
        else { e.pos.x += (e.pos.x < (b.min.x + b.max.x) / 2 ? -1 : 1) * 0.05; }
      }
    }
    // push away from player (no overlap)
    { const ox = e.pos.x - px, oz = e.pos.z - pz, d = Math.hypot(ox, oz), mind = r + player.r;
      if (d < mind && d > 1e-4 && player.pos.y < 1.5) { e.pos.x += ox / d * (mind - d); e.pos.z += oz / d * (mind - d); } }
    // facing & animation
    const wantFace = Math.atan2(-dx, -dz);
    let df = wantFace - e.facing; df = Math.atan2(Math.sin(df), Math.cos(df));
    e.facing += df * Math.min(1, dt * 8);
    m.root.rotation.y = e.facing;
    const spd = Math.hypot(e.vel.x, e.vel.z);
    const cyc = e.animT * (e.type === 'rusher' ? 13 : 8), amp = Math.min(1, spd / 3);
    if (e.swing > 0) e.swing -= dt;
    if (e.type === 'rusher') {
      m.limbs[0].rotation.x = Math.sin(cyc) * 0.9 * amp - (e.swing > 0 ? 1.8 * Math.sin(e.swing / 0.35 * Math.PI) : 0);
      m.limbs[2].rotation.x = -Math.sin(cyc) * 0.9 * amp - (e.swing > 0 ? 1.8 * Math.sin(e.swing / 0.35 * Math.PI) : 0);
      m.limbs[1].rotation.x = -Math.sin(cyc) * 0.8 * amp; m.limbs[3].rotation.x = Math.sin(cyc) * 0.8 * amp;
      m.body.rotation.x = 0.35 * amp + 0.05 * Math.sin(cyc * 2); m.body.position.y = 0.85 + Math.abs(Math.sin(cyc)) * 0.08 * amp;
      m.head.rotation.x = -0.3 * amp;
    } else {
      m.limbs[0].rotation.x = Math.sin(cyc) * 0.6 * amp; m.limbs[1].rotation.x = -Math.sin(cyc) * 0.6 * amp;
      m.body.position.y = 1.25 + Math.abs(Math.sin(cyc)) * 0.05 * amp;
      m.body.rotation.z = Math.sin(cyc) * 0.04 * amp;
      const aim = Math.atan2(player.pos.y + 1.1 - 1.4, dist);
      m.gunArm.rotation.x = aim + (e.swing > 0 ? 0.4 * (e.swing / 0.25) : 0);
      m.head.rotation.y = Math.sin(e.animT * 1.3) * 0.2;
    }
    if (e.stagger > 0) m.body.rotation.x -= e.stagger * 2;
    // hp bar faces camera
    m.bar.visible = e.hp < e.maxHp;
    if (m.bar.visible) { m.bar.rotation.y = player.yaw - e.facing; m.fg.scale.x = Math.max(0.001, e.hp / e.maxHp); m.fg.position.x = -(1 - m.fg.scale.x) / 2; }
  }
}

// ============================================================ game state
let mode = 'menu', frozen = false, waveSpawning = true;
let wave = 0, score = 0, waveState = 'break', waveTimer = 0, spawnQueue = [], spawnTimer = 0, bannerT = 0;
const WAVES = [
  { rusher: 4, shooter: 1 }, { rusher: 6, shooter: 2 }, { rusher: 7, shooter: 4 }, { rusher: 9, shooter: 5 }, { rusher: 12, shooter: 7 },
];
const SPAWNS = [[-26, -26], [26, -26], [-26, 26], [26, 26], [0, -27], [0, 27], [-27, -12], [27, 12], [-27, 12], [27, -12]];

function resetRun() {
  for (let i = enemies.length - 1; i >= 0; i--) removeEnemy(i);
  for (const p of projs) { p.life = 0; p.mesh.visible = false; }
  player.pos.set(0, 0, 18); player.vel.set(0, 0, 0); player.yaw = 0; player.pitch = 0; player.health = 100; player.onGround = true;
  wstate.rifle.ammo = 30; wstate.rifle.reserve = 90; wstate.shotgun.ammo = 6; wstate.shotgun.reserve = 24;
  current = 'rifle'; guns.rifle.visible = true; guns.shotgun.visible = false; cooldown = 0; reloadT = 0; switchT = 0; bloom = 0; kick = 0;
  wave = 0; score = 0; waveState = 'break'; waveTimer = 2.0; spawnQueue = []; spawnTimer = 0;
  for (const k in input) input[k] = false;
  dmgInd.forEach(d => { d.t = 0; });
  diff = { hp: 1, speed: 1, dmg: 1, fireRate: 1, projSpeed: 1 };
}
function startWave(n) {
  wave = n; waveState = 'fighting';
  const w = WAVES[n - 1]; const f = n - 1;
  diff = { hp: 1 + 0.12 * f, speed: 1 + 0.07 * f, dmg: 1 + 0.12 * f, fireRate: 1 + 0.12 * f, projSpeed: 1 + 0.06 * f };
  spawnQueue = [];
  for (let i = 0; i < w.rusher; i++) spawnQueue.push('rusher');
  for (let i = 0; i < w.shooter; i++) spawnQueue.push('shooter');
  for (let i = spawnQueue.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = spawnQueue[i]; spawnQueue[i] = spawnQueue[j]; spawnQueue[j] = t; }
  spawnTimer = 0.3;
  showBanner(`WAVE ${n}`, `${w.rusher + w.shooter} hostiles`);
  play('wave');
}
function updateWaves(dt) {
  if (!waveSpawning) return;
  if (waveState === 'break') {
    waveTimer -= dt;
    if (waveTimer <= 0) startWave(wave + 1);
  } else if (waveState === 'fighting') {
    if (spawnQueue.length) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(0.35, 1.0 - wave * 0.12);
        // farthest-ish spawn from player, randomised
        let best = null, bd = -1;
        for (let k = 0; k < 4; k++) { const s = SPAWNS[(Math.random() * SPAWNS.length) | 0]; const d = Math.hypot(s[0] - player.pos.x, s[1] - player.pos.z); if (d > bd) { bd = d; best = s; } }
        spawnEnemy(spawnQueue.pop(), best[0] + (Math.random() - 0.5) * 2, 0, best[1] + (Math.random() - 0.5) * 2);
      }
    } else if (aliveCount() === 0) {
      score += 250 * wave;
      if (wave >= WAVES.length) { endRun('victory'); return; }
      waveState = 'break'; waveTimer = 5;
      showBanner(`WAVE ${wave} CLEARED`, `+${250 * wave} · next wave in 5s`);
      // top up some ammo between waves
      wstate.rifle.reserve = Math.min(WEAPONS.rifle.reserveMax, wstate.rifle.reserve + 30);
      wstate.shotgun.reserve = Math.min(WEAPONS.shotgun.reserveMax, wstate.shotgun.reserve + 8);
      player.health = Math.min(100, player.health + 25);
    }
  }
}

// ============================================================ shooting
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(), _hit = new THREE.Vector3(), _muz = new THREE.Vector3(), _tmp = new THREE.Vector3();
function raySphere(o, d, cx, cy, cz, r, maxT) {
  const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz;
  const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - c; if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h); return t > 0 && t < maxT ? t : Infinity;
}
function tryFire() {
  const W = WEAPONS[current], st = wstate[current];
  if (cooldown > 0 || reloadT > 0 || switchT > 0) return;
  if (st.ammo <= 0) { cooldown = 0.25; play('empty'); if (st.reserve > 0) startReload(); return; }
  st.ammo--; cooldown += W.interval; lastFire = 0;
  const cp = Math.cos(player.pitch);
  _fwd.set(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
  _right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  _up.crossVectors(_right, _fwd).normalize();
  _o.set(player.pos.x, player.pos.y + player.eye, player.pos.z);
  _muz.copy(_o).addScaledVector(_fwd, 0.7).addScaledVector(_right, 0.22).addScaledVector(_up, -0.16);
  const moving = Math.hypot(player.vel.x, player.vel.z) > 1 || !player.onGround;
  const spread = W.spread + bloom + (current === 'rifle' && moving ? 0.012 : 0);
  let anyHit = false, killed = false, head = false;
  for (let p = 0; p < W.pellets; p++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * spread;
    _d.copy(_fwd).addScaledVector(_right, Math.cos(a) * rr).addScaledVector(_up, Math.sin(a) * rr).normalize();
    let tWorld = raycastWorld(_o, _d, W.range);
    _tmp.copy(worldNormal);
    let bestE = null, bestT = tWorld, bestHead = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      const th = raySphere(_o, _d, e.pos.x, e.T.headY + e.pos.y, e.pos.z, e.T.headR, bestT);
      if (th < bestT) { bestT = th; bestE = e; bestHead = true; }
      const tb = raySphere(_o, _d, e.pos.x, e.T.bodyY + e.pos.y, e.pos.z, e.T.bodyR, bestT);
      if (tb < bestT) { bestT = tb; bestE = e; bestHead = false; }
      // legs
      const tl = raySphere(_o, _d, e.pos.x, 0.4, e.pos.z, 0.35, bestT);
      if (tl < bestT) { bestT = tl; bestE = e; bestHead = false; }
    }
    _hit.copy(_o).addScaledVector(_d, bestT);
    if (p < 3 || current === 'rifle') spawnTracer(_muz, _hit);
    if (bestE) {
      const falloff = current === 'shotgun' ? Math.max(0.35, 1 - bestT / 30) : 1;
      if (damageEnemy(bestE, W.damage * falloff, bestHead, _d)) killed = true;
      anyHit = true; head = head || bestHead;
    } else if (tWorld < W.range) {
      spawnDecal(_hit, _tmp);
      spawnParticles(_hit, current === 'rifle' ? 5 : 2, 0xffd28a, 4, 0.8, 0.3, 1, _tmp);
    }
  }
  if (anyHit) { showHitmarker(killed); play('hit', head); }
  // recoil
  kick = Math.min(1.5, kick + (current === 'rifle' ? 0.35 : 1));
  player.pitch = Math.min(1.5, player.pitch + W.kick * (0.7 + Math.random() * 0.6));
  player.yaw += (Math.random() - 0.5) * W.kick * 0.5;
  bloom = Math.min(W.maxBloom, bloom + W.bloom);
  flashT = 0.05; const fl = guns[current].userData.flash; fl.visible = true; fl.rotation.z = Math.random() * 6.28;
  muzzleLight.position.copy(_muz); muzzleLight.intensity = current === 'rifle' ? 6 : 12;
  if (current === 'shotgun') pumpT = 0.6;
  play(current);
}
function startReload() {
  const W = WEAPONS[current], st = wstate[current];
  if (reloadT > 0 || switchT > 0 || st.ammo >= W.magSize || st.reserve <= 0) return;
  reloadT = W.reloadTime; play('reload', W.reloadTime);
}
function finishReload() {
  const W = WEAPONS[current], st = wstate[current];
  const n = Math.min(W.magSize - st.ammo, st.reserve); st.ammo += n; st.reserve -= n;
}
function switchWeapon(w) {
  if (w === current || mode !== 'playing') return;
  current = w; reloadT = 0; switchT = 0.35; cooldown = Math.max(cooldown, 0.1); bloom = 0; pumpT = 0;
  guns.rifle.visible = w === 'rifle'; guns.shotgun.visible = w === 'shotgun';
  play('switchW');
}

// ============================================================ damage / HUD
const $ = id => document.getElementById(id);
const hud = $('hud');
const dmgEls = [...document.querySelectorAll('.dmg')];
const dmgInd = dmgEls.map(el => ({ el, t: 0, x: 0, z: 0 }));
let vignetteT = 0, hitmarkT = 0;
function damagePlayer(amount, from) {
  if (mode !== 'playing') return;
  const slot = dmgInd.reduce((a, b) => (a.t < b.t ? a : b));
  slot.t = 1.2; slot.x = from.x; slot.z = from.z;
  if (godMode) return;
  player.health -= amount; vignetteT = 0.5;
  play('hurt');
  if (player.health <= 0) { player.health = 0; endRun('gameover'); }
}
function showHitmarker(kill) { hitmarkT = kill ? 0.35 : 0.18; $('hitmarker').classList.toggle('kill', kill); }
let bannerTimer = 0;
function showBanner(t, s) { $('banner').innerHTML = `${t}<small>${s || ''}</small>`; $('banner').style.opacity = 1; bannerTimer = 2.2; }

const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } }
function updateHUD(dt) {
  const st = wstate[current], W = WEAPONS[current];
  setText('hpN', String(Math.ceil(player.health)));
  setStyle('hpfill', 'width', player.health + '%');
  setStyle('hpfill', 'background', player.health > 35 ? '' : 'linear-gradient(90deg,#ff3a2a,#ff8a4a)');
  setText('wName', W.name);
  setText('ammoN', `${st.ammo} <small>/ ${st.reserve}</small>`);
  setText('reloadMsg', reloadT > 0 ? 'RELOADING…' : (st.ammo === 0 ? (st.reserve ? 'PRESS R TO RELOAD' : 'NO AMMO') : ''));
  setText('slots', current === 'rifle' ? '<b>1 RIFLE</b> · 2 SHOTGUN' : '1 RIFLE · <b>2 SHOTGUN</b>');
  setText('waveT', wave ? `WAVE ${wave} / 5` : 'GET READY');
  const alive = aliveCount() + spawnQueue.length;
  setText('waveS', waveState === 'break' ? `next wave in ${Math.max(0, Math.ceil(waveTimer))}s` : `${alive} hostiles remaining`);
  setText('scoreN', String(score));
  // crosshair spread
  const moving = Math.hypot(player.vel.x, player.vel.z) > 1 || !player.onGround;
  const sp = Math.round(6 + (W.spread + bloom + (current === 'rifle' && moving ? 0.012 : 0)) * 400 + kick * 6);
  if (hudCache.sp !== sp) {
    hudCache.sp = sp;
    $('chL').style.left = (-sp - 8) + 'px'; $('chR').style.left = sp + 'px'; $('chU').style.top = (-sp - 8) + 'px'; $('chD').style.top = sp + 'px';
  }
  if (hitmarkT > 0) hitmarkT -= dt;
  setStyle('hitmarker', 'opacity', hitmarkT > 0 ? '1' : '0');
  if (vignetteT > 0) vignetteT -= dt;
  setStyle('vignette', 'opacity', String(Math.max(0, vignetteT * 1.6 + (player.health < 30 ? 0.35 : 0)).toFixed(2)));
  for (const d of dmgInd) {
    if (d.t > 0) {
      d.t -= dt;
      const ang = Math.atan2(d.x - player.pos.x, d.z - player.pos.z); // world angle of source
      const rel = -(ang - Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw)));
      d.el.style.transform = `rotate(${rel}rad)`; d.el.style.opacity = Math.min(1, d.t * 1.5).toFixed(2);
    } else if (d.el.style.opacity !== '0') d.el.style.opacity = '0';
  }
  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) $('banner').style.opacity = 0; }
}

// ============================================================ viewmodel animation
let bobT = 0;
function updateViewmodel(dt) {
  const g = guns[current], ud = g.userData, W = WEAPONS[current];
  const spd = Math.hypot(player.vel.x, player.vel.z);
  if (player.onGround) bobT += dt * spd * 1.25;
  const bobAmp = Math.min(1, spd / 6) * (player.onGround ? 1 : 0.2);
  kick *= Math.exp(-dt * 12);
  let x = 0.23 + Math.cos(bobT) * 0.012 * bobAmp, y = -0.23 + Math.abs(Math.sin(bobT)) * 0.014 * bobAmp - player.vel.y * 0.002, z = -0.42 + kick * 0.07;
  let rx = kick * 0.12, rz = 0;
  // sprint pose
  if (input.sprint && input.forward && spd > 7) { rx -= 0.25; rz += 0.3; x -= 0.03; y -= 0.03; }
  if (reloadT > 0) {
    const p = 1 - reloadT / W.reloadTime, s = Math.sin(Math.min(1, p) * Math.PI);
    rx -= 0.5 * s; rz += 0.45 * s; y -= 0.06 * s;
    if (current === 'rifle') { ud.mag.position.y = ud.magY - (p > 0.2 && p < 0.7 ? 0.25 * Math.sin((p - 0.2) / 0.5 * Math.PI) : 0); }
    else { ud.shell.visible = (p * 8 % 1) < 0.6 && p < 0.9; ud.shell.position.y = -0.06 + (p * 8 % 1) * 0.05; }
  } else if (ud.mag) ud.mag.position.y = ud.magY; else ud.shell.visible = false;
  if (switchT > 0) { const s = switchT / 0.35; y -= 0.25 * s; rx -= 0.6 * s; }
  if (ud.pump) {
    const pt = pumpT > 0 ? 1 - pumpT / 0.6 : 1;
    ud.pump.position.z = ud.pumpZ + (pt > 0.35 && pt < 0.95 ? 0.1 * Math.sin((pt - 0.35) / 0.6 * Math.PI) : 0);
  }
  // sway from mouse look
  sway.x *= Math.exp(-dt * 10); sway.y *= Math.exp(-dt * 10);
  viewmodel.position.set(x - sway.x * 0.02, y + sway.y * 0.02, z);
  viewmodel.rotation.set(rx + sway.y * 0.03, sway.x * 0.04, rz);
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) { ud.flash.visible = false; muzzleLight.intensity = 0; } }
}
const sway = { x: 0, y: 0 };

// ============================================================ input
function lookDelta(dx, dy) {
  const k = 0.0022 * settings.sens;
  player.yaw -= dx * k; player.pitch -= dy * k;
  player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
  sway.x += Math.max(-3, Math.min(3, dx * 0.05)); sway.y += Math.max(-3, Math.min(3, dy * 0.05));
}
const canvas = renderer.domElement;
function lockPointer() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } }
let hadLock = false;
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) hadLock = true;
  else if (hadLock && mode === 'playing') pauseGame(true);
});
document.addEventListener('mousemove', e => { if (document.pointerLockElement === canvas && mode === 'playing' && !frozen) lookDelta(e.movementX, e.movementY); });
canvas.addEventListener('mousedown', e => {
  if (mode !== 'playing') return;
  if (document.pointerLockElement !== canvas) { lockPointer(); return; }
  if (e.button === 0) input.fire = true;
});
document.addEventListener('mouseup', e => { if (e.button === 0) input.fire = false; });
document.addEventListener('wheel', e => { if (mode === 'playing') switchWeapon(current === 'rifle' ? 'shotgun' : 'rifle'); }, { passive: true });
const KEYMAP = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right' };
function oneShot(key) {
  if (key === 'Escape') { if (mode === 'playing') pauseGame(true); else if (mode === 'paused') resumeGame(); return; }
  if (mode !== 'playing') return;
  if (key === 'r' || key === 'R') startReload();
  else if (key === '1') switchWeapon('rifle');
  else if (key === '2') switchWeapon('shotgun');
}
document.addEventListener('keydown', e => {
  if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; if (e.code === 'Space') e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'Escape') oneShot('Escape');
  else if (e.code === 'KeyR') oneShot('r');
  else if (e.code === 'Digit1') oneShot('1');
  else if (e.code === 'Digit2') oneShot('2');
});
document.addEventListener('keyup', e => { if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { for (const k in input) input[k] = false; });

// ============================================================ menus
const screens = ['menu', 'settings', 'pause', 'gameover', 'victory'];
let settingsReturn = 'menu';
function showScreen(name) { for (const s of screens) $(s).classList.toggle('hidden', s !== name); }
function startGame() {
  initAudio(); resetRun(); mode = 'playing'; frozen = false; showScreen(null); hud.classList.remove('hidden');
  showBanner('GET READY', 'wave 1 incoming');
}
function pauseGame() { if (mode !== 'playing') return; mode = 'paused'; for (const k in input) input[k] = false; showScreen('pause'); if (document.pointerLockElement) document.exitPointerLock(); }
function resumeGame() { if (mode !== 'paused') return; mode = 'playing'; showScreen(null); hadLock = false; lockPointer(); }
function endRun(kind) {
  mode = kind; for (const k in input) input[k] = false;
  $(kind === 'victory' ? 'vicText' : 'goText').textContent = kind === 'victory' ? `All 5 waves cleared. Final score: ${score}` : `Reached wave ${wave}. Score: ${score}`;
  updateHUD(0); showScreen(kind); hadLock = false; if (document.pointerLockElement) document.exitPointerLock();
}
document.body.addEventListener('click', e => {
  const act = e.target.dataset && e.target.dataset.act; if (!act) return;
  initAudio();
  if (act === 'play' || act === 'restart') { startGame(); hadLock = false; lockPointer(); }
  else if (act === 'settings') { settingsReturn = mode === 'paused' ? 'pause' : 'menu'; showScreen('settings'); }
  else if (act === 'back') showScreen(settingsReturn);
  else if (act === 'resume') resumeGame();
  else if (act === 'quit') { mode = 'menu'; resetRun(); hud.classList.add('hidden'); showScreen('menu'); }
});
const sensEl = $('sens'), volEl = $('vol');
sensEl.value = settings.sens; volEl.value = settings.volume;
function refreshSettingsLabels() { $('sensV').textContent = (+settings.sens).toFixed(2); $('volV').textContent = Math.round(settings.volume * 100) + '%'; }
refreshSettingsLabels();
sensEl.addEventListener('input', () => { settings.sens = +sensEl.value; refreshSettingsLabels(); saveSettings(); });
volEl.addEventListener('input', () => { settings.volume = +volEl.value; if (master) master.gain.value = settings.volume; refreshSettingsLabels(); saveSettings(); });

// ============================================================ main loop
const clock = new THREE.Clock();
let menuT = 0;
let steps = 1;
function tick() {
  const frameDt = Math.min(0.25, clock.getDelta());
  steps = Math.max(1, Math.ceil(frameDt / 0.034));
  for (let i = 0; i < steps; i++) step(frameDt / steps, i === steps - 1);
  render();
  requestAnimationFrame(tick);
}
function step(dt, last) {
  if (mode === 'playing' && !frozen) {
    movePlayer(dt);
    if (cooldown > 0) cooldown -= dt; else if (!input.fire) cooldown = 0;
    if (pumpT > 0) pumpT -= dt;
    if (switchT > 0) switchT -= dt;
    if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) { reloadT = 0; finishReload(); } }
    lastFire += dt;
    if (lastFire > 0.15) bloom = Math.max(0, bloom - dt * 0.15);
    for (let n = 0; n < 3 && input.fire && cooldown <= 0 && mode === 'playing'; n++) tryFire();
    updateWaves(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateTracers(dt);
    updateViewmodel(dt);
    if (last) updateHUD(dt * steps);
  } else if (mode === 'playing' && frozen) {
    updateHUD(0);
  } else if (mode === 'paused' || mode === 'gameover' || mode === 'victory') {
    updateParticles(dt * 0.3); updateTracers(dt);
  }
}
function render() {
  const dt = 0.016;
  if (mode === 'menu') { // slow orbit behind menu
    menuT += dt * 0.08;
    camera.position.set(Math.sin(menuT) * 24, 9, Math.cos(menuT) * 24); camera.lookAt(0, 1, 0);
  } else {
    camera.position.set(player.pos.x, player.pos.y + player.eye, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }
  renderer.clear();
  renderer.render(scene, camera);
  if (mode !== 'menu') { renderer.clearDepth(); renderer.render(vmScene, vmCamera); }
}
requestAnimationFrame(tick);

// ============================================================ test hook
window.__game = {
  start() { startGame(); },
  getState() {
    return {
      mode, wave, health: player.health, weapon: current, ammo: wstate[current].ammo, reserve: wstate[current].reserve, score,
      enemiesAlive: aliveCount(), playerPos: [player.pos.x, player.pos.y, player.pos.z], yaw: player.yaw, pitch: player.pitch,
    };
  },
  setInput(o) { for (const k in o) if (k in input) input[k] = !!o[k]; },
  look(dx, dy) { lookDelta(dx, dy); },
  pressKey(key) { oneShot(key); },
  setPlayerPose(x, y, z, yaw, pitch) { player.pos.set(x, y, z); player.vel.set(0, 0, 0); if (yaw !== undefined) player.yaw = yaw; if (pitch !== undefined) player.pitch = pitch; },
  spawnEnemy(type, x, y, z) { return spawnEnemy(type, x, y || 0, z); },
  getEnemies() { return enemies.map(e => ({ id: e.id, type: e.type, health: Math.max(0, e.hp), pos: [e.pos.x, e.pos.y, e.pos.z], alive: e.alive })); },
  setPaused(b) { frozen = !!b; },
  setGodMode(b) { godMode = !!b; },
  setWaveSpawning(b) { waveSpawning = !!b; },
};
window.__dbg = { renderer, scene, sun, step: (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) step(dt, true); } };
window.__dbg.killAll = () => { for (const e of enemies) if (e.alive) damageEnemy(e, 9999, false, new THREE.Vector3(0,0,1)); };
