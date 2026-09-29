import * as THREE from 'three';

// ---------------------------------------------------------------- constants
const HALF = 30;              // arena half size
const CELL = 1;               // nav grid cell size
const GRID = HALF * 2 / CELL;
const GRAVITY = 20;
const PLAYER_R = 0.4, PLAYER_H = 1.8, EYE = 1.6;
const WALK = 5.2, SPRINT = 8.4, JUMP_V = 7.2, STEP = 0.55;
const MAX_WAVE = 5, WAVE_BREAK = 5;

const WEAPONS = {
  rifle: { mag: 30, reserve: 90, rate: 0.095, reload: 2.0, dmg: 22, pellets: 1, spread: 0.01, bloom: 0.006, maxBloom: 0.05, kick: 0.012, auto: true },
  shotgun: { mag: 6, reserve: 24, rate: 0.85, reload: 2.4, dmg: 13, pellets: 8, spread: 0.075, bloom: 0, maxBloom: 0, kick: 0.05, auto: false },
};

// ---------------------------------------------------------------- settings
const settings = { sens: 1, volume: 0.7 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('arena-settings') || '{}')); } catch (e) {}
function saveSettings() { try { localStorage.setItem('arena-settings', JSON.stringify(settings)); } catch (e) {} }

// ---------------------------------------------------------------- renderer / scenes
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.autoClear = false;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3a50);
scene.fog = new THREE.Fog(0x2a3a50, 40, 100);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';

const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 10);
vmScene.add(new THREE.HemisphereLight(0xcfe8ff, 0x303040, 1.6));
const vmSun = new THREE.DirectionalLight(0xffe6c8, 2.2); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = vmCamera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); vmCamera.updateProjectionMatrix();
});

// ---------------------------------------------------------------- procedural textures
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
function noiseFill(g, s, base, amt) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < s * s / 18; i++) {
    const v = Math.random() * amt | 0;
    g.fillStyle = `rgba(${v},${v},${v},0.08)`;
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
}
const floorTex = canvasTex(256, (g, s) => {
  noiseFill(g, s, '#39434f', 255);
  g.strokeStyle = 'rgba(10,15,20,.8)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  g.strokeStyle = 'rgba(95,212,255,.18)'; g.lineWidth = 1; g.strokeRect(6, 6, s - 12, s - 12);
}, 15);
const wallTex = canvasTex(256, (g, s) => {
  noiseFill(g, s, '#56606c', 255);
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (let y = 0; y < s; y += 64) g.fillRect(0, y, s, 3);
  g.fillStyle = 'rgba(255,170,40,.6)'; g.fillRect(0, s - 20, s, 8);
});
const crateTex = canvasTex(128, (g, s) => {
  noiseFill(g, s, '#b86a26', 255);
  g.strokeStyle = '#4b2a10'; g.lineWidth = 8; g.strokeRect(4, 4, s - 8, s - 8);
  g.lineWidth = 6; g.beginPath(); g.moveTo(8, 8); g.lineTo(s - 8, s - 8); g.stroke();
});
const platTex = canvasTex(128, (g, s) => {
  noiseFill(g, s, '#2c4a57', 255);
  g.strokeStyle = 'rgba(95,212,255,.5)'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4);
});

// ---------------------------------------------------------------- lighting
scene.add(new THREE.HemisphereLight(0xa8d0ff, 0x3a3028, 1.7));
const sun = new THREE.DirectionalLight(0xffe2b8, 2.6);
sun.position.set(18, 32, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 90 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun);
const muzzleLight = new THREE.PointLight(0xffb060, 0, 9, 2);
scene.add(muzzleLight);

// ---------------------------------------------------------------- arena
const boxes = []; // collision AABBs
const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.1 });
const matWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8 });
const matCrate = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.7 });
const matPlat = new THREE.MeshStandardMaterial({ map: platTex, roughness: 0.6, metalness: 0.3 });
const matCover = new THREE.MeshStandardMaterial({ color: 0x8a939e, roughness: 0.75, metalness: 0.2 });
const matGlow = new THREE.MeshStandardMaterial({ color: 0x0b1a22, emissive: 0x39c8ff, emissiveIntensity: 2.2 });
const matGlowO = new THREE.MeshStandardMaterial({ color: 0x221407, emissive: 0xff8a20, emissiveIntensity: 2.0 });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function addBox(x, z, w, d, h, mat, y0 = 0, collide = true) {
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if (collide) boxes.push({ minX: x - w / 2, maxX: x + w / 2, minY: y0, maxY: y0 + h, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
function glowStrip(x, z, w, d, h, y0, mat = matGlow) {
  const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z); scene.add(m);
}
function glowRim(x, z, w, d, y, mat) { // thin emissive band around the top edge of a block
  const t = 0.06;
  glowStrip(x, z - d / 2, w + t, t, 0.08, y, mat); glowStrip(x, z + d / 2, w + t, t, 0.08, y, mat);
  glowStrip(x - w / 2, z, t, d + t, 0.08, y, mat); glowStrip(x + w / 2, z, t, d + t, 0.08, y, mat);
}

{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // perimeter walls
  const W = HALF * 2 + 2;
  addBox(0, -HALF - 0.5, W, 1, 6, matWall); addBox(0, HALF + 0.5, W, 1, 6, matWall);
  addBox(-HALF - 0.5, 0, 1, W, 6, matWall); addBox(HALF + 0.5, 0, 1, W, 6, matWall);
  glowStrip(0, -HALF + 0.02, W, 0.05, 0.15, 3.2); glowStrip(0, HALF - 0.02, W, 0.05, 0.15, 3.2);
  glowStrip(-HALF + 0.02, 0, 0.05, W, 0.15, 3.2); glowStrip(HALF - 0.02, 0, 0.05, W, 0.15, 3.2);
  // central platform with stairs
  addBox(0, 0, 10, 10, 1.5, matPlat);
  glowRim(0, 0, 10, 10, 1.4, matGlow);
  for (const s of [-1, 1]) {
    addBox(0, s * 5.5, 4, 1, 1.0, matPlat); addBox(0, s * 6.5, 4, 1, 0.5, matPlat);
    addBox(s * 5.5, 0, 1, 4, 1.0, matPlat); addBox(s * 6.5, 0, 1, 4, 0.5, matPlat);
  }
  // cover on platform
  addBox(-3, -3, 1.4, 1.4, 1.2, matCrate, 1.5); addBox(3, 3, 1.4, 1.4, 1.2, matCrate, 1.5);
  // corner bunkers (raised)
  for (const [sx, sz] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) {
    const cx = sx * 21, cz = sz * 21;
    addBox(cx, cz, 7, 7, 1.0, matPlat);
    addBox(cx - sx * 4, cz, 1, 3, 0.5, matPlat);
    addBox(cx + sx * 2.5, cz + sz * 2.5, 2, 2, 3.5, matWall, 1.0);
    glowRim(cx, cz, 7, 7, 0.9, matGlowO);
  }
  // pillars
  for (const [x, z] of [[-12, 0], [12, 0], [0, -14], [0, 14]]) {
    addBox(x, z, 2, 2, 5, matWall); glowRim(x, z, 2, 2, 4.2, matGlowO);
  }
  // low cover walls
  for (const [x, z, w, d] of [[-13, -10, 6, 0.8], [13, 10, 6, 0.8], [-13, 10, 0.8, 5], [13, -10, 0.8, 5],
    [-6, -20, 5, 0.8], [6, 20, 5, 0.8], [-22, 6, 0.8, 5], [22, -6, 0.8, 5], [20, 0, 0.8, 4], [-20, 0, 0.8, 4]]) {
    addBox(x, z, w, d, 1.25, matCover);
  }
  // crates
  for (const [x, z, s, h] of [[8, -9, 1.5, 1.5], [9.4, -9.3, 1.2, 1.2], [8.6, -9.1, 1.1, 1.1], [-8, 9, 1.5, 1.5], [-9.6, 8.7, 1.2, 2.4],
    [17, 17, 1.5, 1.5], [-17, -16, 1.5, 1.5], [-6, 22, 1.5, 1.5], [6, -22, 1.5, 1.5], [24, 12, 1.5, 3], [-24, -12, 1.5, 3],
    [15, -18, 1.3, 1.3], [-15, 18, 1.3, 1.3]]) {
    if (x === 8.6) { addBox(x, z, s, s, h, matCrate, 1.5); continue; }
    addBox(x, z, s, s, h, matCrate);
  }
}

// ---------------------------------------------------------------- nav grid (flow field toward player)
const blocked = new Uint8Array(GRID * GRID);
const flow = new Int16Array(GRID * GRID);
const bfsQueue = new Int32Array(GRID * GRID);
for (let gz = 0; gz < GRID; gz++) for (let gx = 0; gx < GRID; gx++) {
  const x0 = -HALF + gx * CELL, z0 = -HALF + gz * CELL, m = 0.45;
  for (const b of boxes) {
    if (b.minY > 1.4 || b.maxY <= STEP) continue;
    if (x0 + CELL > b.minX - m && x0 < b.maxX + m && z0 + CELL > b.minZ - m && z0 < b.maxZ + m) { blocked[gz * GRID + gx] = 1; break; }
  }
  if (gx === 0 || gz === 0 || gx === GRID - 1 || gz === GRID - 1) blocked[gz * GRID + gx] = 1;
}
const cellOf = (x, z) => {
  const gx = Math.max(0, Math.min(GRID - 1, Math.floor((x + HALF) / CELL)));
  const gz = Math.max(0, Math.min(GRID - 1, Math.floor((z + HALF) / CELL)));
  return gz * GRID + gx;
};
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function nearestFree(c) {
  if (!blocked[c]) return c;
  const cx = c % GRID, cz = (c / GRID) | 0;
  for (let r = 1; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const x = cx + dx, z = cz + dz;
    if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
    if (!blocked[z * GRID + x]) return z * GRID + x;
  }
  return c;
}
function buildFlow(px, pz) {
  flow.fill(-1);
  const start = nearestFree(cellOf(px, pz));
  let head = 0, tail = 0;
  flow[start] = 0; bfsQueue[tail++] = start;
  while (head < tail) {
    const c = bfsQueue[head++], cx = c % GRID, cz = (c / GRID) | 0, d = flow[c];
    for (let i = 0; i < 8; i++) {
      const x = cx + DIRS[i][0], z = cz + DIRS[i][1];
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
      const n = z * GRID + x;
      if (blocked[n] || flow[n] >= 0) continue;
      if (i >= 4 && (blocked[cz * GRID + x] || blocked[z * GRID + cx])) continue;
      flow[n] = d + 1; bfsQueue[tail++] = n;
    }
  }
}
// writes a steering target into out; returns false if no path
function flowTarget(x, z, out) {
  const c = cellOf(x, z), cx = c % GRID, cz = (c / GRID) | 0;
  let best = -1, bestD = flow[c] >= 0 ? flow[c] : 1e9;
  for (let i = 0; i < 8; i++) {
    const nx = cx + DIRS[i][0], nz = cz + DIRS[i][1];
    if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
    const n = nz * GRID + nx;
    if (flow[n] < 0) continue;
    if (i >= 4 && (blocked[cz * GRID + nx] || blocked[nz * GRID + cx])) continue;
    if (flow[n] < bestD) { bestD = flow[n]; best = n; }
  }
  if (best < 0) return false;
  out.x = -HALF + (best % GRID + 0.5) * CELL; out.z = -HALF + (((best / GRID) | 0) + 0.5) * CELL;
  return true;
}

// ---------------------------------------------------------------- geometry helpers
function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let tmin = 0, tmax = 1e9;
  const o = [ox, oy, oz], d = [dx, dy, dz], mn = [b.minX, b.minY, b.minZ], mx = [b.maxX, b.maxY, b.maxZ];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-8) { if (o[a] < mn[a] || o[a] > mx[a]) return Infinity; continue; }
    let t1 = (mn[a] - o[a]) / d[a], t2 = (mx[a] - o[a]) / d[a];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}
const _hitN = new THREE.Vector3();
function rayWorld(o, d, maxT) {
  let t = maxT;
  _hitN.set(0, 1, 0);
  if (d.y < -1e-6) { const tf = -o.y / d.y; if (tf < t) t = tf; }
  for (const b of boxes) {
    const tb = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, b);
    if (tb < t) t = tb;
  }
  return t;
}
function raySphere(o, d, cx, cy, cz, r) {
  const lx = o.x - cx, ly = o.y - cy, lz = o.z - cz;
  const b = lx * d.x + ly * d.y + lz * d.z, c = lx * lx + ly * ly + lz * lz - r * r;
  const h = b * b - c;
  if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  return t >= 0 ? t : Infinity;
}
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  for (const b of boxes) if (rayBox(ax, ay, az, dx / len, dy / len, dz / len, b) < len) return false;
  return true;
}
function pushOutBoxes(p, r, feetY, height) {
  for (const b of boxes) {
    if (feetY >= b.maxY - 0.01 || feetY + height <= b.minY) continue;
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX)), cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else { // centre inside: push along the smallest axis
      const l = p.x - b.minX, rr = b.maxX - p.x, n = p.z - b.minZ, f = b.maxZ - p.z, m = Math.min(l, rr, n, f);
      if (m === l) p.x = b.minX - r; else if (m === rr) p.x = b.maxX + r; else if (m === n) p.z = b.minZ - r; else p.z = b.maxZ + r;
    }
  }
}
function groundHeight(x, z, r, feetY) {
  let g = 0;
  for (const b of boxes) {
    if (b.maxY > feetY + STEP) continue;
    if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ && b.maxY > g) g = b.maxY;
  }
  return g;
}

// ---------------------------------------------------------------- audio
let actx = null, master = null, noiseBuf = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = settings.volume; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 1, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { actx = null; }
}
function setVolume(v) { settings.volume = v; if (master) master.gain.setTargetAtTime(v, actx.currentTime, 0.02); }
function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function noise(t, dur, type, freq, q, peak, dest = master) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = actx.createGain(); env(g, t, 0.003, peak, dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  return f;
}
function tone(t, dur, type, f0, f1, peak, a = 0.005) {
  const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = actx.createGain(); env(g, t, a, peak, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
const sfx = {
  rifle() { const t = actx.currentTime; noise(t, 0.11, 'bandpass', 1800, 0.8, 0.5); noise(t, 0.2, 'lowpass', 500, 1, 0.5); tone(t, 0.08, 'square', 180, 60, 0.15); },
  shotgun() { const t = actx.currentTime; noise(t, 0.4, 'lowpass', 1400, 0.7, 0.9); tone(t, 0.25, 'sine', 120, 40, 0.7); noise(t, 0.06, 'highpass', 3000, 1, 0.3); },
  pump() { const t = actx.currentTime + 0.25; noise(t, 0.05, 'bandpass', 2500, 4, 0.35); noise(t + 0.18, 0.06, 'bandpass', 1800, 4, 0.35); },
  reload() { const t = actx.currentTime; noise(t + 0.2, 0.05, 'bandpass', 2200, 5, 0.3); noise(t + 0.9, 0.06, 'bandpass', 1500, 5, 0.35); tone(t + 1.5, 0.05, 'square', 900, 700, 0.08); noise(t + 1.55, 0.05, 'bandpass', 3000, 5, 0.3); },
  empty() { const t = actx.currentTime; tone(t, 0.04, 'square', 1400, 1200, 0.08); },
  hit(kill) { const t = actx.currentTime; tone(t, 0.06, 'sine', kill ? 1500 : 2100, kill ? 900 : 1900, 0.25); },
  melee() { const t = actx.currentTime; tone(t, 0.25, 'sawtooth', 160, 70, 0.25, 0.02); noise(t, 0.15, 'bandpass', 700, 2, 0.3); },
  enemyShot() { const t = actx.currentTime; tone(t, 0.22, 'square', 900, 220, 0.12); tone(t, 0.18, 'sine', 500, 120, 0.15); },
  enemyDeath() { const t = actx.currentTime; noise(t, 0.5, 'lowpass', 900, 1, 0.5); tone(t, 0.5, 'sawtooth', 300, 40, 0.18, 0.01); },
  hurt() { const t = actx.currentTime; tone(t, 0.2, 'sine', 90, 45, 0.6); noise(t, 0.18, 'lowpass', 400, 1, 0.5); },
  wave() { const t = actx.currentTime; [440, 554, 659].forEach((f, i) => tone(t + i * 0.12, 0.5, 'triangle', f, f, 0.15, 0.02)); },
  switchW() { const t = actx.currentTime; noise(t, 0.05, 'bandpass', 1200, 3, 0.25); },
};
function play(name, arg) { if (actx && actx.state === 'running') { try { sfx[name](arg); } catch (e) {} } }
function playAt(name, x, z, arg) { // attenuate distant sounds cheaply
  if (!actx) return; const d = Math.hypot(x - player.pos.x, z - player.pos.z); if (d > 45) return; play(name, arg);
}

// ---------------------------------------------------------------- particles (instanced)
const MAXP = 300;
const pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), MAXP);
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
pMesh.frustumCulled = false;
scene.add(pMesh);
const pPos = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP), pSize = new Float32Array(MAXP);
let pNext = 0;
const _m4 = new THREE.Matrix4(), _col = new THREE.Color(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
for (let i = 0; i < MAXP; i++) { _m4.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m4); pMesh.setColorAt(i, _col.set(0xffffff)); }
function emit(x, y, z, n, color, speed, life, size, up = 2) {
  for (let k = 0; k < n; k++) {
    const i = pNext; pNext = (pNext + 1) % MAXP;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = (Math.random() - 0.5) * speed; pVel[i * 3 + 1] = Math.random() * speed * 0.6 + up; pVel[i * 3 + 2] = (Math.random() - 0.5) * speed;
    pLife[i] = pMax[i] = life * (0.6 + Math.random() * 0.6); pSize[i] = size * (0.6 + Math.random() * 0.8);
    pMesh.setColorAt(i, _col.set(color));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParticles(dt) {
  for (let i = 0; i < MAXP; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    const j = i * 3;
    pVel[j + 1] -= 14 * dt;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
    if (pPos[j + 1] < 0.02) { pPos[j + 1] = 0.02; pVel[j + 1] *= -0.3; pVel[j] *= 0.6; pVel[j + 2] *= 0.6; }
    const s = pLife[i] > 0 ? pSize[i] * Math.min(1, pLife[i] / pMax[i] * 2) : 0;
    _m4.makeScale(s, s, s); _m4.setPosition(pPos[j], pPos[j + 1], pPos[j + 2]);
    pMesh.setMatrixAt(i, _m4);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- tracers
const tracerGeo = new THREE.BoxGeometry(0.025, 0.025, 1); tracerGeo.translate(0, 0, 0.5);
const tracers = [];
for (let i = 0; i < 24; i++) {
  const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffd48a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.visible = false; m.life = 0; scene.add(m); tracers.push(m);
}
let tracerNext = 0;
function spawnTracer(from, to) {
  const m = tracers[tracerNext]; tracerNext = (tracerNext + 1) % tracers.length;
  m.position.copy(from); m.lookAt(to); m.scale.set(1, 1, from.distanceTo(to));
  m.visible = true; m.life = 0.07; m.material.opacity = 0.9;
}
function updateTracers(dt) {
  for (const m of tracers) if (m.visible) { m.life -= dt; m.material.opacity = Math.max(0, m.life / 0.07) * 0.9; if (m.life <= 0) m.visible = false; }
}

// ---------------------------------------------------------------- enemy projectiles
const projGeo = new THREE.SphereGeometry(0.18, 12, 8);
const projMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, toneMapped: false });
const projHaloMat = new THREE.MeshBasicMaterial({ color: 0xff7a30, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const projs = [];
for (let i = 0; i < 40; i++) {
  const m = new THREE.Mesh(projGeo, projMat); const h = new THREE.Mesh(projGeo, projHaloMat); h.scale.setScalar(2.2); m.add(h);
  m.visible = false; m.vel = new THREE.Vector3(); m.dmg = 0; m.life = 0; scene.add(m); projs.push(m);
}
function fireProjectile(from, dir, speed, dmg) {
  const p = projs.find(p => !p.visible); if (!p) return;
  p.position.copy(from); p.vel.copy(dir).multiplyScalar(speed); p.dmg = dmg; p.life = 5; p.visible = true;
}
function updateProjectiles(dt) {
  for (const p of projs) {
    if (!p.visible) continue;
    p.life -= dt;
    p.position.addScaledVector(p.vel, dt);
    const x = p.position.x, y = p.position.y, z = p.position.z;
    // player capsule test
    const py = Math.max(player.pos.y + 0.3, Math.min(y, player.pos.y + 1.5));
    const dx = x - player.pos.x, dy = y - py, dz = z - player.pos.z;
    if (dx * dx + dy * dy + dz * dz < 0.55 * 0.55) {
      damagePlayer(p.dmg, x - p.vel.x, z - p.vel.z); p.visible = false; emit(x, y, z, 8, 0xff7a30, 4, 0.3, 0.08, 1); continue;
    }
    let hit = p.life <= 0 || y < 0;
    if (!hit) for (const b of boxes) if (x > b.minX && x < b.maxX && y > b.minY && y < b.maxY && z > b.minZ && z < b.maxZ) { hit = true; break; }
    if (hit) { p.visible = false; emit(x, Math.max(y, 0.1), z, 8, 0xff7a30, 4, 0.3, 0.08, 1); }
  }
}

// ---------------------------------------------------------------- enemies
const G = {
  torso: new THREE.SphereGeometry(1, 16, 12), head: new THREE.SphereGeometry(1, 14, 10), cap: new THREE.CapsuleGeometry(0.1, 0.55, 4, 8),
  capL: new THREE.CapsuleGeometry(0.11, 0.8, 4, 8), cone: new THREE.ConeGeometry(0.09, 0.35, 6), box: boxGeo,
  cyl: new THREE.CylinderGeometry(0.1, 0.13, 0.9, 10), ring: new THREE.TorusGeometry(0.16, 0.04, 6, 14), eye: new THREE.SphereGeometry(0.06, 8, 6),
};
G.cap.translate(0, -0.35, 0); G.capL.translate(0, -0.5, 0); G.cyl.rotateX(Math.PI / 2); G.cyl.translate(0, 0, 0.35);
const M = {
  rusherDark: new THREE.MeshStandardMaterial({ color: 0x2a1414, roughness: 0.6, metalness: 0.3 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.5 }),
  eyeY: new THREE.MeshBasicMaterial({ color: 0xffe040, toneMapped: false }),
  shooterDark: new THREE.MeshStandardMaterial({ color: 0x1c2630, roughness: 0.4, metalness: 0.7 }),
  visor: new THREE.MeshBasicMaterial({ color: 0x40f0ff, toneMapped: false }),
};
function part(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m;
}
function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

function buildRusher() {
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const skin = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.55, metalness: 0.1, emissive: 0x000000 });
  part(G.torso, skin, 0, 1.05, 0, 0.42, 0.5, 0.36, body);
  part(G.torso, M.rusherDark, 0, 0.78, 0, 0.3, 0.2, 0.28, body);
  for (let i = 0; i < 3; i++) { const c = part(G.cone, M.bone, 0, 1.3 - i * 0.2, -0.3, 1, 1, 1, body); c.rotation.x = -1.2; }
  const head = pivot(body, 0, 1.58, 0.08);
  part(G.head, skin, 0, 0, 0, 0.24, 0.22, 0.26, head);
  part(G.eye, M.eyeY, -0.09, 0.03, 0.21, 1, 1, 1, head); part(G.eye, M.eyeY, 0.09, 0.03, 0.21, 1, 1, 1, head);
  const hl = part(G.cone, M.bone, -0.14, 0.2, 0, 0.8, 0.8, 0.8, head); hl.rotation.z = 0.5;
  const hr = part(G.cone, M.bone, 0.14, 0.2, 0, 0.8, 0.8, 0.8, head); hr.rotation.z = -0.5;
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.45, 1.32, 0); part(G.cap, skin, 0, 0, 0, 1, 1, 1, a);
    for (let k = -1; k <= 1; k++) { const cl = part(G.cone, M.bone, k * 0.05, -0.85, 0.05, 0.5, 0.6, 0.5, a); cl.rotation.x = Math.PI; }
    arms.push(a);
    const l = pivot(root, s * 0.2, 0.8, 0); part(G.cap, M.rusherDark, 0, 0, 0, 1.2, 1.1, 1.2, l); legs.push(l);
  }
  return { root, body, head, arms, legs, skin, hitSpheres: [[0, 1.05, 0.5, 1], [0, 1.6, 0.28, 2]] };
}
function buildShooter() {
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const skin = new THREE.MeshStandardMaterial({ color: 0x4d6a86, roughness: 0.35, metalness: 0.6, emissive: 0x000000 });
  part(G.box, skin, 0, 1.5, 0, 0.8, 0.7, 0.55, body);
  part(G.box, M.shooterDark, 0, 1.08, 0, 0.55, 0.25, 0.4, body);
  part(G.box, M.shooterDark, -0.5, 1.8, 0, 0.35, 0.18, 0.5, body); part(G.box, M.shooterDark, 0.5, 1.8, 0, 0.35, 0.18, 0.5, body);
  const head = pivot(body, 0, 2.0, 0);
  part(G.head, skin, 0, 0, 0, 0.26, 0.22, 0.26, head);
  part(G.box, M.visor, 0, 0.02, 0.2, 0.34, 0.07, 0.1, head);
  part(G.cone, M.shooterDark, 0.1, 0.3, -0.05, 0.3, 1, 0.3, head);
  const arms = [], legs = [];
  const gun = pivot(body, 0.55, 1.55, 0.1);
  part(G.cyl, M.shooterDark, 0, 0, 0, 1.2, 1.2, 1, gun);
  part(G.ring, skin, 0, 0, 0.55, 1, 1, 1, gun);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, toneMapped: false, transparent: true, opacity: 0.2 });
  const glow = part(G.eye, glowMat, 0, 0, 0.82, 2.2, 2.2, 2.2, gun); glow.castShadow = false;
  const la = pivot(body, -0.5, 1.6, 0); part(G.cap, skin, 0, 0, 0, 1.1, 1, 1.1, la); arms.push(la);
  for (const s of [-1, 1]) { const l = pivot(root, s * 0.25, 1.0, 0); part(G.capL, M.shooterDark, 0, 0, 0, 1, 1, 1, l); part(G.box, skin, 0, -1.0, 0.08, 0.2, 0.08, 0.35, l); legs.push(l); }
  return { root, body, head, arms, legs, skin, gun, glow, hitSpheres: [[0, 1.4, 0.55, 1], [0, 2.0, 0.3, 2]] };
}

const enemies = [];
let enemyId = 1;
const ENEMY_DEF = {
  rusher: { hp: 60, speed: 5.4, radius: 0.45, score: 100 },
  shooter: { hp: 90, speed: 3.0, radius: 0.5, score: 150 },
};
function spawnEnemy(type, x, y, z) {
  if (!ENEMY_DEF[type]) type = 'rusher';
  let e = enemies.find(e => e.free && e.type === type);
  if (!e) {
    const model = type === 'rusher' ? buildRusher() : buildShooter();
    e = { type, ...model, pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3() };
    scene.add(e.root); enemies.push(e);
  }
  const def = ENEMY_DEF[type], w = game.wave || 1;
  Object.assign(e, {
    id: enemyId++, free: false, alive: true, health: def.hp * (1 + (w - 1) * 0.12), maxHealth: def.hp,
    speed: def.speed * (1 + (w - 1) * 0.07), radius: def.radius, phase: Math.random() * 6, attackCd: 1 + Math.random(),
    windup: 0, flash: 0, stagger: 0, deathT: 0, strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: 0, yaw: 0, vy: 0,
  });
  e.pos.set(x, y || 0, z); e.vel.set(0, 0, 0);
  e.root.visible = true; e.root.position.copy(e.pos); e.root.rotation.set(0, 0, 0); e.root.scale.setScalar(1);
  e.body.rotation.set(0, 0, 0); e.skin.emissive.setHex(0);
  return e.id;
}
function hitEnemy(e, dmg, dirX, dirZ, head) {
  if (!e.alive) return false;
  e.health -= dmg * (head ? 1.8 : 1);
  e.flash = 0.1; e.stagger = 0.12;
  e.vel.x += dirX * 3; e.vel.z += dirZ * 3;
  if (e.health <= 0) {
    e.alive = false; e.deathT = 0;
    game.score += ENEMY_DEF[e.type].score * (head ? 1.5 : 1) | 0;
    emit(e.pos.x, e.pos.y + 1.1, e.pos.z, 26, e.type === 'rusher' ? 0xc03020 : 0x40f0ff, 6, 0.9, 0.12, 2);
    emit(e.pos.x, e.pos.y + 1.1, e.pos.z, 10, 0x222222, 4, 1.2, 0.18, 1);
    playAt('enemyDeath', e.pos.x, e.pos.z);
    // salvage ammo from every kill so the run can't soft-lock on empty reserves
    weapon.rifle.reserve = Math.min(180, weapon.rifle.reserve + 10);
    weapon.shotgun.reserve = Math.min(48, weapon.shotgun.reserve + 2);
    return true;
  }
  return false;
}
const _tgt = { x: 0, z: 0 }, _dir = new THREE.Vector3(), _from = new THREE.Vector3();
function updateEnemies(dt) {
  const px = player.pos.x, pz = player.pos.z;
  for (const e of enemies) {
    if (e.free) continue;
    if (!e.alive) {
      e.deathT += dt;
      const k = Math.min(1, e.deathT / 0.5);
      e.body.rotation.x = -k * k * 1.45; e.body.position.y = 0;
      e.root.position.y = e.pos.y - Math.max(0, e.deathT - 1.2) * 0.8;
      e.skin.emissive.setHex(e.deathT < 0.15 ? 0xffffff : 0x000000);
      if (e.deathT > 2.4) { e.free = true; e.root.visible = false; }
      continue;
    }
    const dx = px - e.pos.x, dz = pz - e.pos.z, dist = Math.hypot(dx, dz);
    let mx = 0, mz = 0, moving = false;
    e.flash -= dt; e.stagger -= dt; e.attackCd -= dt;
    const def = e;
    if (e.stagger <= 0) {
      if (e.type === 'rusher') {
        if (dist < 1.6 && Math.abs(player.pos.y - e.pos.y) < 2) {
          if (e.windup <= 0 && e.attackCd <= 0) { e.windup = 0.3; }
        } else if (dist < 3.5 && losClear(e.pos.x, e.pos.y + 1, e.pos.z, px, player.pos.y + 1, pz)) { mx = dx / dist; mz = dz / dist; moving = true; }
        else if (flowTarget(e.pos.x, e.pos.z, _tgt)) { mx = _tgt.x - e.pos.x; mz = _tgt.z - e.pos.z; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; moving = true; }
        else if (dist > 1.2) { mx = dx / dist; mz = dz / dist; moving = true; }
        if (e.windup > 0) {
          e.windup -= dt; moving = false; mx = mz = 0;
          if (e.windup <= 0) {
            e.attackCd = Math.max(0.55, 0.95 - game.wave * 0.06);
            if (dist < 2.0 && Math.abs(player.pos.y - e.pos.y) < 2) { damagePlayer(10 + game.wave * 2, e.pos.x, e.pos.z); }
            playAt('melee', e.pos.x, e.pos.z);
          }
        }
      } else {
        const eyeY = e.pos.y + 1.6;
        const los = dist < 40 && losClear(e.pos.x, eyeY, e.pos.z, px, player.pos.y + 1.3, pz);
        e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = 1.5 + Math.random() * 2; e.strafeDir *= -1; }
        if (!los || dist > 17) {
          if (flowTarget(e.pos.x, e.pos.z, _tgt)) { mx = _tgt.x - e.pos.x; mz = _tgt.z - e.pos.z; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; moving = true; }
        } else if (dist < 8) { mx = -dx / dist; mz = -dz / dist; moving = true; }
        else { mx = -dz / dist * e.strafeDir * 0.7; mz = dx / dist * e.strafeDir * 0.7; moving = true; }
        // shooting with a telegraphed charge
        if (los && dist < 30) {
          if (e.attackCd <= 0 && e.windup <= 0) e.windup = 0.6;
        }
        if (e.windup > 0) {
          e.windup -= dt;
          e.glow.material.opacity = 0.2 + (1 - e.windup / 0.6) * 0.8; e.glow.scale.setScalar(2.2 + (1 - e.windup / 0.6) * 2);
          if (e.windup <= 0) {
            e.attackCd = Math.max(1.1, 2.4 - game.wave * 0.25) + Math.random() * 0.6;
            e.gun.getWorldPosition(_from); _from.y += 0;
            _from.x += Math.sin(e.yaw) * 0.8; _from.z += Math.cos(e.yaw) * 0.8;
            _dir.set(px - _from.x, player.pos.y + 1.1 - _from.y, pz - _from.z).normalize();
            fireProjectile(_from, _dir, 13 + game.wave, 8 + game.wave * 2);
            playAt('enemyShot', e.pos.x, e.pos.z);
            e.glow.material.opacity = 0.2; e.glow.scale.setScalar(2.2);
          }
        }
      }
    }
    // separation from other enemies
    for (const o of enemies) {
      if (o === e || o.free || !o.alive) continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, d2 = ox * ox + oz * oz, rr = e.radius + o.radius;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); mx += ox / d * 0.8; mz += oz / d * 0.8; }
    }
    const sp = e.speed * (e.type === 'shooter' && moving ? 1 : 1);
    e.vel.x += (mx * sp - e.vel.x) * Math.min(1, dt * 8);
    e.vel.z += (mz * sp - e.vel.z) * Math.min(1, dt * 8);
    e.pos.x += e.vel.x * dt; e.pos.z += e.vel.z * dt;
    { // keep out of the player's body
      const ox = e.pos.x - player.pos.x, oz = e.pos.z - player.pos.z, d = Math.hypot(ox, oz), rr = e.radius + PLAYER_R + 0.2;
      if (d < rr && d > 1e-4 && Math.abs(player.pos.y - e.pos.y) < 1.8) { e.pos.x = player.pos.x + ox / d * rr; e.pos.z = player.pos.z + oz / d * rr; }
    }
    const step = groundHeight(e.pos.x, e.pos.z, e.radius * 0.5, e.pos.y);
    if (step > e.pos.y && step - e.pos.y <= STEP) e.pos.y = step;
    pushOutBoxes(e.pos, e.radius, e.pos.y, 2);
    e.pos.x = Math.max(-HALF + 1, Math.min(HALF - 1, e.pos.x)); e.pos.z = Math.max(-HALF + 1, Math.min(HALF - 1, e.pos.z));
    // gravity / ground
    const gh = groundHeight(e.pos.x, e.pos.z, e.radius * 0.5, e.pos.y);
    e.vy -= GRAVITY * dt; e.pos.y += e.vy * dt; if (e.pos.y <= gh) { e.pos.y = gh; e.vy = 0; }
    // facing + animation
    const faceYaw = Math.atan2(dx, dz);
    let dy = faceYaw - e.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    e.yaw += dy * Math.min(1, dt * 8);
    e.root.position.copy(e.pos); e.root.rotation.y = e.yaw;
    const spd = Math.hypot(e.vel.x, e.vel.z);
    e.phase += dt * spd * (e.type === 'rusher' ? 2.4 : 1.8);
    const sw = Math.sin(e.phase) * Math.min(1, spd / 3);
    e.legs[0].rotation.x = sw * 0.9; e.legs[1].rotation.x = -sw * 0.9;
    e.body.position.y = Math.abs(Math.cos(e.phase)) * 0.08 * Math.min(1, spd / 3);
    if (e.type === 'rusher') {
      e.body.rotation.x = 0.25 * Math.min(1, spd / 4);
      const raise = e.windup > 0 ? -2.4 * (1 - e.windup / 0.3) : 0;
      e.arms[0].rotation.x = e.windup > 0 ? raise : -sw * 1.1 - 0.4; e.arms[1].rotation.x = e.windup > 0 ? raise : sw * 1.1 - 0.4;
      e.head.rotation.y = Math.sin(e.phase * 0.5) * 0.2;
    } else {
      e.arms[0].rotation.x = -sw * 0.6;
      const pitch = Math.atan2(player.pos.y + 1.1 - (e.pos.y + 1.55), dist);
      e.gun.rotation.x = -pitch;
      e.head.rotation.y = Math.sin(performance.now() * 0.002 + e.id) * 0.3;
    }
    if (e.flash > 0) e.skin.emissive.setHex(0xffffff); else e.skin.emissive.setHex(0x000000);
    if (e.stagger > 0) e.body.rotation.x = -0.3;
  }
}
const aliveCount = () => { let n = 0; for (const e of enemies) if (!e.free && e.alive) n++; return n; };

// ---------------------------------------------------------------- viewmodel
const vmMetal = new THREE.MeshStandardMaterial({ color: 0x4a515c, roughness: 0.35, metalness: 0.5 });
const vmBody = new THREE.MeshStandardMaterial({ color: 0x3f5566, roughness: 0.5, metalness: 0.4 });
const vmAccent = new THREE.MeshStandardMaterial({ color: 0xff8a20, roughness: 0.4, emissive: 0x552200 });
const vmWood = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.7 });
const flashTex = canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,80,.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = gr; g.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? s * 0.18 : s * 0.5; g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); }
  g.fill();
});
const flashMat = new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
function vmPart(parent, geo, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; }
const cylZ = new THREE.CylinderGeometry(1, 1, 1, 12); cylZ.rotateX(Math.PI / 2);
function buildGun(kind) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  let mag, flash, muzzleZ;
  if (kind === 'rifle') {
    vmPart(g, boxGeo, vmBody, 0, 0, 0, 0.07, 0.09, 0.42);
    vmPart(g, boxGeo, vmMetal, 0, 0.055, -0.02, 0.05, 0.03, 0.36);
    vmPart(g, cylZ, vmMetal, 0, 0.01, -0.36, 0.014, 0.014, 0.3);
    vmPart(g, boxGeo, vmAccent, 0, 0.0, -0.2, 0.075, 0.02, 0.1);
    vmPart(g, boxGeo, vmBody, 0, -0.02, 0.28, 0.06, 0.08, 0.16);
    vmPart(g, boxGeo, vmMetal, 0, -0.08, 0.08, 0.045, 0.1, 0.05).rotation.x = 0.3;
    vmPart(g, boxGeo, vmMetal, 0, 0.1, 0.02, 0.02, 0.04, 0.02);
    mag = vmPart(g, boxGeo, vmMetal, 0, -0.1, -0.06, 0.045, 0.14, 0.07); mag.rotation.x = 0.2;
    muzzleZ = -0.52;
  } else {
    vmPart(g, boxGeo, vmMetal, 0, 0, 0.02, 0.08, 0.09, 0.3);
    vmPart(g, cylZ, vmMetal, 0, 0.03, -0.35, 0.022, 0.022, 0.5);
    vmPart(g, cylZ, vmMetal, 0, -0.015, -0.3, 0.018, 0.018, 0.4);
    mag = vmPart(g, cylZ, vmWood, 0, -0.015, -0.3, 0.032, 0.032, 0.16); // pump
    vmPart(g, boxGeo, vmWood, 0, -0.04, 0.27, 0.07, 0.1, 0.22).rotation.x = -0.15;
    vmPart(g, boxGeo, vmAccent, 0, 0.05, -0.02, 0.085, 0.015, 0.12);
    muzzleZ = -0.62;
  }
  flash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), flashMat); flash.position.set(0, 0.02, muzzleZ - 0.05); flash.visible = false; g.add(flash);
  root.scale.setScalar(0.8); root.visible = false; vmScene.add(root);
  return { root, g, mag, magBase: mag.position.clone(), flash, muzzleZ };
}
const guns = { rifle: buildGun('rifle'), shotgun: buildGun('shotgun') };

// ---------------------------------------------------------------- player / game state
const player = { pos: new THREE.Vector3(), vy: 0, onGround: true, yaw: 0, pitch: 0, health: 100, lastHurt: 0 };
const input = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
const hookInput = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
const keyInput = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
const game = {
  mode: 'menu', wave: 0, score: 0, frozen: false, god: false, spawning: true,
  spawnQueue: [], spawnTimer: 0, breakTimer: 0, inBreak: false, time: 0,
};
const weapon = { cur: 'rifle', rifle: { ammo: 30, reserve: 90 }, shotgun: { ammo: 6, reserve: 24 }, cooldown: 0, reloadT: 0, switchT: 0, bloom: 0, kick: 0, triggerHeld: false, bobT: 0 };

function resetRun() {
  for (const e of enemies) { e.free = true; e.alive = false; e.root.visible = false; }
  for (const p of projs) p.visible = false;
  player.pos.set(0, 1.5, 2); player.vy = 0; player.yaw = 0; player.pitch = 0; player.health = 100;
  weapon.cur = 'rifle'; weapon.rifle.ammo = 30; weapon.rifle.reserve = 90; weapon.shotgun.ammo = 6; weapon.shotgun.reserve = 24;
  weapon.cooldown = weapon.reloadT = weapon.switchT = weapon.bloom = weapon.kick = 0;
  game.wave = 0; game.score = 0; game.spawnQueue.length = 0; game.inBreak = true; game.breakTimer = 1.5;
  buildFlow(player.pos.x, player.pos.z);
}

// ---------------------------------------------------------------- waves
const SPAWNS = [[0, -27], [0, 27], [-27, 0], [27, 0], [-26, -14], [26, 14], [14, -26], [-14, 26]];
function startWave(n) {
  game.wave = n; game.inBreak = false;
  const rushers = 2 + n * 2, shooters = n === 1 ? 1 : n;
  const q = game.spawnQueue; q.length = 0;
  for (let i = 0; i < rushers; i++) q.push('rusher');
  for (let i = 0; i < shooters; i++) q.splice((Math.random() * (q.length + 1)) | 0, 0, 'shooter');
  game.spawnTimer = 0.5;
  showBanner(`WAVE ${n}`, n === MAX_WAVE ? 'final wave' : `${rushers + shooters} hostiles`);
  play('wave');
}
function updateWaves(dt) {
  if (!game.spawning) return;
  if (game.inBreak) {
    game.breakTimer -= dt;
    if (game.breakTimer <= 0) startWave(game.wave + 1);
    return;
  }
  if (game.spawnQueue.length) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && aliveCount() < 6 + game.wave) {
      // choose a spawn point away from the player
      let best = null, bd = -1;
      for (let k = 0; k < 3; k++) {
        const s = SPAWNS[(Math.random() * SPAWNS.length) | 0], d = Math.hypot(s[0] - player.pos.x, s[1] - player.pos.z);
        if (d > bd) { bd = d; best = s; }
      }
      spawnEnemy(game.spawnQueue.shift(), best[0] + Math.random() - 0.5, 0, best[1] + Math.random() - 0.5);
      game.spawnTimer = Math.max(0.5, 1.6 - game.wave * 0.2);
    }
  } else if (aliveCount() === 0) {
    game.score += 250 * game.wave;
    if (game.wave >= MAX_WAVE) { endRun('victory'); return; }
    game.inBreak = true; game.breakTimer = WAVE_BREAK;
    showBanner(`WAVE ${game.wave} CLEAR`, `next wave in ${WAVE_BREAK}s`);
    player.health = Math.min(100, player.health + 25);
    weapon.rifle.reserve = Math.max(weapon.rifle.reserve, 90); weapon.shotgun.reserve = Math.max(weapon.shotgun.reserve, 24);
  }
}

// ---------------------------------------------------------------- UI
const $ = id => document.getElementById(id);
const screens = ['menu', 'settings', 'pause', 'gameover', 'victory'];
let settingsReturn = 'menu';
function showScreen(name) { for (const s of screens) $(s).classList.toggle('hidden', s !== name); $('hud').classList.toggle('hidden', !(game.mode === 'playing' || game.mode === 'paused')); }
let bannerT = 0;
function showBanner(t, sub) { $('banner').innerHTML = `${t}<small>${sub || ''}</small>`; $('banner').style.opacity = 1; bannerT = 2.2; }
let hitT = 0;
function hitMarker(kill) { const h = $('hitmarker'); h.classList.toggle('kill', !!kill); h.style.transition = 'none'; h.style.opacity = 1; hitT = 0.15; play('hit', kill); }
const dmgEls = [...document.querySelectorAll('#dmg div')], dmgLife = [0, 0, 0, 0]; let dmgNext = 0;
const dmgSrc = [[0, 0], [0, 0], [0, 0], [0, 0]];
let vignetteT = 0;

function damagePlayer(amount, sx, sz) {
  if (game.mode !== 'playing') return;
  const i = dmgNext; dmgNext = (dmgNext + 1) % 4; dmgLife[i] = 1.0; dmgSrc[i][0] = sx; dmgSrc[i][1] = sz;
  vignetteT = 0.4;
  play('hurt');
  if (game.god) return;
  player.health -= amount; player.lastHurt = game.time;
  if (player.health <= 0) { player.health = 0; endRun('gameover'); }
}
function endRun(mode) {
  game.mode = mode;
  input.fire = keyInput.fire = hookInput.fire = false;
  if (document.pointerLockElement) document.exitPointerLock();
  const stats = `Score ${game.score} · Wave ${game.wave} / ${MAX_WAVE}`;
  $('goStats').textContent = stats; $('vicStats').textContent = stats;
  showScreen(mode);
}

let lastHud = '';
function updateHud(dt) {
  const w = weapon[weapon.cur];
  const key = `${Math.ceil(player.health)}|${w.ammo}|${w.reserve}|${weapon.cur}|${game.wave}|${game.score}|${aliveCount() + game.spawnQueue.length}|${weapon.reloadT > 0}`;
  if (key !== lastHud) {
    lastHud = key;
    $('hpTxt').textContent = Math.ceil(player.health);
    $('hpfill').style.width = player.health + '%'; $('hpfill').classList.toggle('low', player.health < 35);
    $('magTxt').textContent = w.ammo; $('resTxt').textContent = w.reserve;
    $('w1').classList.toggle('on', weapon.cur === 'rifle'); $('w2').classList.toggle('on', weapon.cur === 'shotgun');
    $('waveTxt').textContent = `${Math.max(1, game.wave)} / ${MAX_WAVE}`;
    $('scoreTxt').textContent = game.score; $('enemyTxt').textContent = aliveCount() + game.spawnQueue.length;
    $('reloadTxt').textContent = weapon.reloadT > 0 ? 'RELOADING' : (w.ammo === 0 ? (w.reserve ? 'PRESS R' : 'NO AMMO') : '');
  }
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) { const h = $('hitmarker'); h.style.transition = ''; h.style.opacity = 0; } }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').style.opacity = 0; }
  if (vignetteT > 0) { vignetteT -= dt; }
  $('vignette').style.opacity = Math.max(0, vignetteT / 0.4) * 0.6 + (player.health < 30 ? 0.25 : 0);
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  for (let i = 0; i < 4; i++) {
    if (dmgLife[i] <= 0) { if (dmgEls[i].style.opacity !== '0') dmgEls[i].style.opacity = 0; continue; }
    dmgLife[i] -= dt;
    const dx = dmgSrc[i][0] - player.pos.x, dz = dmgSrc[i][1] - player.pos.z;
    const lx = dx * cy - dz * sy, lf = -dx * sy - dz * cy;
    dmgEls[i].style.transform = `rotate(${Math.atan2(lx, lf)}rad)`;
    dmgEls[i].style.opacity = Math.max(0, dmgLife[i]);
  }
}

// ---------------------------------------------------------------- weapons
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3(), _end = new THREE.Vector3(), _mz = new THREE.Vector3();
function camBasis() {
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw), sp = Math.sin(player.pitch), cp = Math.cos(player.pitch);
  _fw.set(-sy * cp, sp, -cy * cp); _rt.set(cy, 0, -sy); _up.set(sy * sp, cp, cy * sp);
}
function tryReload() {
  const w = weapon[weapon.cur], def = WEAPONS[weapon.cur];
  if (weapon.reloadT > 0 || weapon.switchT > 0 || w.ammo >= def.mag || w.reserve <= 0) return;
  weapon.reloadT = def.reload; play('reload');
}
function finishReload() {
  const w = weapon[weapon.cur], def = WEAPONS[weapon.cur], n = Math.min(def.mag - w.ammo, w.reserve);
  w.ammo += n; w.reserve -= n;
}
function switchWeapon(name) {
  if (name === weapon.cur || game.mode !== 'playing') return;
  weapon.cur = name; weapon.reloadT = 0; weapon.switchT = 0.35; weapon.cooldown = Math.max(weapon.cooldown, 0.1); weapon.bloom = 0; play('switchW');
}
function fire() {
  const w = weapon[weapon.cur], def = WEAPONS[weapon.cur];
  if (w.ammo <= 0) { if (!weapon.triggerHeld) { play('empty'); } if (w.reserve > 0) tryReload(); weapon.triggerHeld = true; return; }
  if (!def.auto && weapon.triggerHeld && false) return;
  w.ammo--; weapon.cooldown = def.rate;
  camBasis();
  _o.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  _mz.copy(_o).addScaledVector(_rt, 0.18).addScaledVector(_up, -0.12).addScaledVector(_fw, 0.7);
  const moving = input.forward || input.back || input.left || input.right;
  const spread = def.spread + weapon.bloom + (moving ? def.spread * 0.8 : 0) + (player.onGround ? 0 : 0.03);
  let anyHit = false, anyKill = false;
  for (let p = 0; p < def.pellets; p++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
    _d.copy(_fw).addScaledVector(_rt, Math.cos(a) * r).addScaledVector(_up, Math.sin(a) * r).normalize();
    let t = rayWorld(_o, _d, 150), hitE = null, head = false;
    for (const e of enemies) {
      if (e.free || !e.alive) continue;
      for (const hs of e.hitSpheres) {
        const th = raySphere(_o, _d, e.pos.x, e.pos.y + hs[1] + e.body.position.y, e.pos.z, hs[2]);
        if (th < t) { t = th; hitE = e; head = hs[3] === 2; }
      }
    }
    _end.copy(_o).addScaledVector(_d, t);
    if (hitE) {
      const dmg = def.dmg * (weapon.cur === 'shotgun' ? Math.max(0.35, 1 - t / 25) : 1);
      if (hitEnemy(hitE, dmg, _d.x, _d.z, head)) anyKill = true;
      anyHit = true;
      emit(_end.x, _end.y, _end.z, 5, hitE.type === 'rusher' ? 0xd02818 : 0x60e8ff, 3, 0.35, 0.07, 1);
    } else if (t < 150) {
      emit(_end.x, _end.y, _end.z, 4, 0xffd080, 4, 0.25, 0.05, 1.5);
      emit(_end.x, _end.y, _end.z, 2, 0x55606a, 2, 0.6, 0.08, 1);
    }
    if (p < 4) spawnTracer(_mz, _end);
  }
  if (anyHit) hitMarker(anyKill);
  // recoil
  player.pitch = Math.min(1.5, player.pitch + def.kick * (0.7 + Math.random() * 0.6));
  player.yaw += (Math.random() - 0.5) * def.kick * 0.5;
  weapon.bloom = Math.min(def.maxBloom, weapon.bloom + def.bloom);
  weapon.kick = 1;
  const gun = guns[weapon.cur]; gun.flash.visible = true; gun.flash.rotation.z = Math.random() * 6; gun.flash.scale.setScalar(weapon.cur === 'shotgun' ? 1.6 : 1 + Math.random() * 0.3);
  flashT = 0.05; muzzleLight.position.copy(_mz); muzzleLight.intensity = weapon.cur === 'shotgun' ? 40 : 22;
  if (weapon.cur === 'shotgun') { play('shotgun'); play('pump'); } else play('rifle');
}
let flashT = 0;
function updateWeapon(dt) {
  const def = WEAPONS[weapon.cur];
  weapon.cooldown -= dt;
  weapon.bloom = Math.max(0, weapon.bloom - dt * 0.08);
  if (weapon.switchT > 0) weapon.switchT -= dt;
  if (weapon.reloadT > 0) { weapon.reloadT -= dt; if (weapon.reloadT <= 0) { weapon.reloadT = 0; finishReload(); } }
  if (input.fire && weapon.reloadT <= 0 && weapon.switchT <= 0 && weapon.cooldown <= 0) {
    if (def.auto || !weapon.triggerHeld || true) fire();
  }
  if (!input.fire) weapon.triggerHeld = false;
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) { guns.rifle.flash.visible = guns.shotgun.flash.visible = false; muzzleLight.intensity = 0; } }
}
function updateViewmodel(dt, moveSpeed) {
  for (const k in guns) guns[k].root.visible = k === weapon.cur && (game.mode === 'playing' || game.mode === 'paused');
  const gun = guns[weapon.cur], def = WEAPONS[weapon.cur];
  weapon.bobT += dt * (moveSpeed > 0.5 && player.onGround ? moveSpeed * 1.4 : 0);
  const bobAmt = Math.min(1, moveSpeed / 6) * (player.onGround ? 1 : 0.3);
  weapon.kick = Math.max(0, weapon.kick - dt * (weapon.cur === 'shotgun' ? 4 : 14));
  const k = weapon.kick * (weapon.cur === 'shotgun' ? 1.6 : 1);
  let reloadP = 0; // 0..1 envelope
  if (weapon.reloadT > 0) { const t = 1 - weapon.reloadT / def.reload; reloadP = Math.sin(Math.min(1, t) * Math.PI); }
  const sw = weapon.switchT > 0 ? weapon.switchT / 0.35 : 0;
  gun.root.position.set(0.26 + Math.sin(weapon.bobT) * 0.012 * bobAmt, -0.25 - Math.abs(Math.cos(weapon.bobT)) * 0.012 * bobAmt - reloadP * 0.08 - sw * 0.3, -0.62 + k * 0.06);
  gun.g.rotation.set(k * 0.12 + reloadP * 0.5, reloadP * 0.3, -reloadP * 0.6);
  // magazine / pump motion
  if (weapon.cur === 'rifle') {
    const t = weapon.reloadT > 0 ? 1 - weapon.reloadT / def.reload : 0;
    const drop = t > 0.2 && t < 0.7 ? Math.sin((t - 0.2) / 0.5 * Math.PI) * 0.25 : 0;
    gun.mag.position.set(gun.magBase.x, gun.magBase.y - drop, gun.magBase.z);
  } else {
    const pumpT = weapon.cooldown > 0 ? 1 - weapon.cooldown / def.rate : 1;
    const pump = pumpT > 0.25 && pumpT < 0.8 ? Math.sin((pumpT - 0.25) / 0.55 * Math.PI) * 0.1 : 0;
    const shell = weapon.reloadT > 0 ? Math.abs(Math.sin(weapon.reloadT * 8)) * 0.03 : 0;
    gun.mag.position.set(gun.magBase.x, gun.magBase.y, gun.magBase.z + pump + shell);
  }
}

// ---------------------------------------------------------------- player movement
function updatePlayer(dt) {
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  let fx = 0, fz = 0;
  const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0), r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  fx = -sy * f + cy * r; fz = -cy * f - sy * r;
  const l = Math.hypot(fx, fz); if (l > 0) { fx /= l; fz /= l; }
  const speed = input.sprint && f > 0 ? SPRINT : WALK;
  const p = player.pos;
  const nx = fx * speed, nz = fz * speed;
  // move per axis then resolve, with step-up
  p.x += nx * dt; p.z += nz * dt;
  const g0 = groundHeight(p.x, p.z, PLAYER_R * 0.9, p.y);
  if (player.onGround && g0 > p.y && g0 - p.y <= STEP) p.y = g0;
  pushOutBoxes(p, PLAYER_R, p.y, PLAYER_H);
  p.x = Math.max(-HALF + PLAYER_R, Math.min(HALF - PLAYER_R, p.x)); p.z = Math.max(-HALF + PLAYER_R, Math.min(HALF - PLAYER_R, p.z));
  if (input.jump && player.onGround) { player.vy = JUMP_V; player.onGround = false; }
  player.vy -= GRAVITY * dt;
  p.y += player.vy * dt;
  const gh = groundHeight(p.x, p.z, PLAYER_R * 0.9, Math.max(p.y, p.y - player.vy * dt));
  if (p.y <= gh) { p.y = gh; player.vy = 0; player.onGround = true; } else player.onGround = p.y - gh < 0.02;
  if (game.time - player.lastHurt > 5 && player.health < 100 && player.health > 0) player.health = Math.min(100, player.health + dt * 4);
  return l > 0 ? speed : 0;
}

// ---------------------------------------------------------------- input
const canvas = renderer.domElement;
const locked = () => document.pointerLockElement === canvas;
function requestLock() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
function applyLook(dx, dy) {
  const k = settings.sens * 0.0022;
  player.yaw -= dx * k; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - dy * k));
}
const KEYMAP = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump' };
addEventListener('keydown', e => {
  if (KEYMAP[e.code]) { keyInput[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'KeyR') pressKey('r');
  if (e.code === 'Digit1') pressKey('1');
  if (e.code === 'Digit2') pressKey('2');
  if (e.code === 'Escape' || e.code === 'KeyP') { if (game.mode === 'paused' && e.code === 'KeyP') resume(); else if (game.mode === 'playing') pause(); }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) keyInput[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keyInput) keyInput[k] = false; });
canvas.addEventListener('mousedown', e => { if (game.mode !== 'playing') return; if (!locked()) requestLock(); if (e.button === 0) keyInput.fire = true; });
addEventListener('mouseup', e => { if (e.button === 0) keyInput.fire = false; });
addEventListener('mousemove', e => { if (locked() && game.mode === 'playing') applyLook(e.movementX, e.movementY); });
addEventListener('wheel', e => { if (game.mode === 'playing') switchWeapon(weapon.cur === 'rifle' ? 'shotgun' : 'rifle'); }, { passive: true });
document.addEventListener('pointerlockchange', () => { if (!locked() && game.mode === 'playing') pause(); });
function pressKey(k) {
  if (k === 'Escape') { if (game.mode === 'playing') pause(); else if (game.mode === 'paused') resume(); return; }
  if (game.mode !== 'playing') return;
  if (k === 'r' || k === 'R') tryReload();
  else if (k === '1') switchWeapon('rifle');
  else if (k === '2') switchWeapon('shotgun');
}

function startGame() { initAudio(); resetRun(); game.mode = 'playing'; showScreen(null); }
function pause() { if (game.mode !== 'playing') return; game.mode = 'paused'; keyInput.fire = false; for (const k in keyInput) keyInput[k] = false; showScreen('pause'); if (document.pointerLockElement) document.exitPointerLock(); }
function resume() { if (game.mode !== 'paused') return; game.mode = 'playing'; showScreen(null); requestLock(); initAudio(); }
function toMenu() { game.mode = 'menu'; showScreen('menu'); }

$('btnPlay').onclick = () => { startGame(); requestLock(); };
$('btnSettings').onclick = () => { settingsReturn = 'menu'; showScreen('settings'); };
$('btnPauseSettings').onclick = () => { settingsReturn = 'pause'; showScreen('settings'); };
$('btnBack').onclick = () => showScreen(settingsReturn);
$('btnResume').onclick = resume;
$('btnQuit').onclick = toMenu;
$('btnRestart1').onclick = $('btnRestart2').onclick = () => { startGame(); requestLock(); };
$('btnMenu1').onclick = $('btnMenu2').onclick = toMenu;
const sensEl = $('sens'), volEl = $('vol');
sensEl.value = settings.sens; volEl.value = settings.volume;
const showVals = () => { $('sensVal').textContent = (+settings.sens).toFixed(2); $('volVal').textContent = Math.round(settings.volume * 100) + '%'; };
sensEl.oninput = () => { settings.sens = +sensEl.value; showVals(); saveSettings(); };
volEl.oninput = () => { initAudio(); setVolume(+volEl.value); showVals(); saveSettings(); play('hit'); };
showVals();

// ---------------------------------------------------------------- main loop
let flowT = 0, last = performance.now();
// dynamic resolution: drop the render scale when frames are slow, recover when fast
const baseRatio = Math.min(window.devicePixelRatio, 1.5);
let resScale = 1, frameAvg = 1 / 60, resCooldown = 0;
function adaptResolution(rawDt) {
  frameAvg += (Math.min(rawDt, 0.5) - frameAvg) * 0.1;
  resCooldown -= rawDt; if (resCooldown > 0) return;
  let next = resScale;
  if (frameAvg > 1 / 40 && resScale > 0.5) next = Math.max(0.5, resScale - 0.15);
  else if (frameAvg < 1 / 58 && resScale < 1) next = Math.min(1, resScale + 0.1);
  if (next !== resScale) { resScale = next; renderer.setPixelRatio(baseRatio * resScale); resCooldown = 1; }
}
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000; last = now;
  const dt = Math.min(0.25, rawDt);
  adaptResolution(rawDt);
  for (const k in input) input[k] = keyInput[k] || hookInput[k];
  let moveSpeed = 0;
  if (game.mode === 'playing' && !game.frozen) {
    // fixed-size substeps keep physics stable when the frame rate drops
    const steps = Math.ceil(dt / 0.034);
    const h = dt / steps;
    for (let i = 0; i < steps && game.mode === 'playing'; i++) {
      game.time += h;
      moveSpeed = updatePlayer(h);
      flowT -= h; if (flowT <= 0) { flowT = 0.25; buildFlow(player.pos.x, player.pos.z); }
      updateWeapon(h);
      updateEnemies(h);
      updateProjectiles(h);
      updateWaves(h);
    }
    updateParticles(dt);
    updateTracers(dt);
  } else if (game.mode === 'menu') {
    // slow orbiting attract camera
    const t = now * 0.00006;
    player.pos.set(Math.sin(t) * 24, 6, Math.cos(t) * 24); player.yaw = t; player.pitch = -0.2;
  }
  if (game.mode === 'playing' || game.mode === 'paused') { updateHud(dt); updateViewmodel(game.frozen || game.mode === 'paused' ? 0 : dt, moveSpeed); }
  else for (const k in guns) guns[k].root.visible = false;
  camera.position.set(player.pos.x, player.pos.y + (game.mode === 'menu' ? 0 : EYE), player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(vmScene, vmCamera);
}
requestAnimationFrame(frame);
showScreen('menu');

// ---------------------------------------------------------------- test hook
window.__game = {
  start() { startGame(); },
  getState() {
    const w = weapon[weapon.cur];
    return {
      mode: game.mode, wave: game.wave, health: Math.round(player.health * 10) / 10, weapon: weapon.cur, ammo: w.ammo, reserve: w.reserve,
      score: game.score, enemiesAlive: aliveCount(), playerPos: [player.pos.x, player.pos.y, player.pos.z], yaw: player.yaw, pitch: player.pitch,
    };
  },
  setInput(o) { for (const k in hookInput) if (o && k in o) hookInput[k] = !!o[k]; },
  look(dx, dy) { applyLook(dx, dy); },
  pressKey(k) { pressKey(k); },
  setPlayerPose(x, y, z, yaw, pitch) { player.pos.set(x, y, z); player.vy = 0; if (yaw !== undefined) player.yaw = yaw; if (pitch !== undefined) player.pitch = pitch; },
  spawnEnemy(type, x, y, z) { return spawnEnemy(type, x, y, z); },
  getEnemies() { return enemies.filter(e => !e.free).map(e => ({ id: e.id, type: e.type, health: Math.max(0, Math.round(e.health)), pos: [e.pos.x, e.pos.y, e.pos.z], alive: e.alive })); },
  setPaused(b) { game.frozen = !!b; },
  setGodMode(b) { game.god = !!b; },
  setWaveSpawning(b) { game.spawning = !!b; },
};
