import * as THREE from 'three';

// ---------- basics ----------
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1622);
scene.fog = new THREE.Fog(0x0c1622, 30, 90);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 200);
scene.add(camera);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- procedural textures ----------
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function noise(g, s, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); } }
const floorTex = canvasTex(512, (g, s) => {
  g.fillStyle = '#b9bcc8'; g.fillRect(0, 0, s, s); noise(g, s, 5000, .05);
  g.strokeStyle = '#8d909e'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); }
  g.fillStyle = '#3fbf5a'; g.fillRect(s / 2 - 5, 0, 10, s);
  g.fillStyle = '#d8343a'; g.fillRect(0, s / 2 - 5, s, 10);
  g.fillStyle = '#34363f'; g.fillRect(s / 8 - 10, s / 8 - 10, 20, 20); g.fillRect(s * 5 / 8 - 10, s * 5 / 8 - 10, 20, 20);
}, 7.5);
const wallTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#dcd8ea'; g.fillRect(0, 0, s, s); noise(g, s, 2000, .04);
  g.strokeStyle = '#a9a3c2'; g.lineWidth = 3; g.strokeRect(10, 10, s / 2 - 16, s * .6); g.strokeRect(s / 2 + 6, 10, s / 2 - 16, s * .6);
  g.fillStyle = '#9c5a66'; g.fillRect(s * .2, s * .22, s * .1, s * .3); g.fillRect(s * .7, s * .22, s * .1, s * .3);
  g.fillStyle = '#2c2c38'; g.fillRect(0, s * .76, s, s * .24);
  g.fillStyle = '#5a5a70'; g.fillRect(0, s * .8, s, 6);
  g.strokeStyle = '#3a3848'; g.lineWidth = 4; g.strokeRect(0, 0, s, s);
});
const crateTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#e4e2ee'; g.fillRect(0, 0, s, s); noise(g, s, 2000, .05);
  g.strokeStyle = '#2c2c38'; g.lineWidth = 14; g.strokeRect(7, 7, s - 14, s - 14);
  g.beginPath(); g.moveTo(10, 10); g.lineTo(s - 10, s - 10); g.stroke();
});
const metalTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#9d9ab0'; g.fillRect(0, 0, s, s); noise(g, s, 3000, .06);
  g.fillStyle = '#6f6c82'; for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 3);
  g.strokeStyle = '#2c2c38'; g.lineWidth = 10; g.strokeRect(0, 0, s, s);
});

// ---------- arena ----------
const solids = []; // {min:Vector3,max:Vector3}
const ARENA = 30; // half size
const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: .85, metalness: .1 });
const matWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: .8 });
const matCrate = new THREE.MeshStandardMaterial({ map: crateTex, roughness: .9 });
const matMetal = new THREE.MeshStandardMaterial({ map: metalTex, roughness: .5, metalness: .5 });
const matGlow = new THREE.MeshStandardMaterial({ color: 0x3fd0ff, emissive: 0x3fd0ff, emissiveIntensity: 2 });
const matGlowO = new THREE.MeshStandardMaterial({ color: 0xe8323c, emissive: 0xd8202a, emissiveIntensity: 1.2 });
matCrate.color.set(0xe0606a);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(x, y, z, w, h, d, mat, solid = true) {
  const m = new THREE.Mesh(boxGeo, mat); m.position.set(x, y + h / 2, z); m.scale.set(w, h, d);
  m.castShadow = m.receiveShadow = true; scene.add(m);
  if (solid) solids.push({ min: new THREE.Vector3(x - w / 2, y, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h, z + d / 2) });
  return m;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), matFloor);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// perimeter walls
const WH = 6;
box(0, 0, -ARENA - .5, ARENA * 2 + 2, WH, 1, matWall); box(0, 0, ARENA + .5, ARENA * 2 + 2, WH, 1, matWall);
box(-ARENA - .5, 0, 0, 1, WH, ARENA * 2, matWall); box(ARENA + .5, 0, 0, 1, WH, ARENA * 2, matWall);
// glow trims along walls
for (const s of [-1, 1]) { box(0, WH, s * (ARENA + .3), ARENA * 2, .15, .3, matGlow, false); box(s * (ARENA + .3), WH, 0, .3, .15, ARENA * 2, matGlow, false); }
// corner towers / platforms with stairs (height variation)
function platform(x, z, sx, sz) {
  box(x, 0, z, 6, 2.4, 6, matMetal);
  box(x, 2.4, z, 6, .12, .3, matGlowO, false);
  // stairs toward centre
  for (let i = 0; i < 4; i++) {
    const h = 0.6 * (i + 1), off = 3 + (3.5 - i) * 0.9 + 0.45;
    box(x - sx * 0, 0, z - sz * off, 3, h, 0.9, matMetal);
  }
  // railing blocks
  box(x + sx * 2.8, 2.4, z, .4, 1, 6, matWall); box(x, 2.4, z + sz * 2.8, 6, 1, .4, matWall);
}
platform(-27, -27, -1, -1); platform(27, 27, 1, 1); platform(27, -27, 1, -1); platform(-27, 27, -1, 1);
// central structure
box(0, 0, 0, 6, 1.2, 6, matMetal); box(0, 1.2, 0, 2, 3.5, 2, matWall);
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; box(Math.cos(a) * 3.55, 0, Math.sin(a) * 3.55, i % 2 ? 2 : 1, 0.6, i % 2 ? 1 : 2, matMetal); }
{ // octagonal pads (visual, flush with floor) + mid-lane raised ledges
  const trimM = new THREE.MeshStandardMaterial({ color: 0x2c2c38, roughness: .6 });
  const padM = new THREE.MeshStandardMaterial({ color: 0x7a7888, roughness: .7 });
  for (const [x, z, r] of [[0, 0, 5.2], [-21, 0, 2.4], [21, 0, 2.4], [0, -21, 2.4], [0, 21, 2.4]]) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .04, 8), trimM); o.position.set(x, .02, z); o.rotation.y = Math.PI / 8; o.receiveShadow = true; scene.add(o);
    const i = new THREE.Mesh(new THREE.CylinderGeometry(r * .85, r * .85, .06, 8), padM); i.position.set(x, .03, z); i.rotation.y = Math.PI / 8; scene.add(i);
  }
  // ring walls splitting quadrants (wide doorways on axes and corners)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(sx * 9, 0, sz * 18, 8, WH, .6, matWall); box(sx * 18, 0, sz * 9, .6, WH, 8, matWall);
    // corner room walls (x/z = ±16, doorways 18..22)
    box(sx * 17, 0, sz * 16, 2, WH, .6, matWall); box(sx * 26, 0, sz * 16, 8, WH, .6, matWall);
    box(sx * 16, 0, sz * 17, .6, WH, 2, matWall); box(sx * 16, 0, sz * 26, .6, WH, 8, matWall);
    const tq = [[0xff3a44, 0xffaa22], [0x3fd0ff, 0x44ff66]][(sx + 1) / 2][(sz + 1) / 2], tm = matGlow.clone(); tm.color.set(tq); tm.emissive.set(tq); tm.emissiveIntensity = 1.2;
    box(sx * 9, WH, sz * 18, 8, .15, .8, tm, false); box(sx * 18, WH, sz * 9, .8, .15, 8, tm, false); box(sx * 26, WH, sz * 16, 8, .15, .8, tm, false); box(sx * 16, WH, sz * 26, .8, .15, 8, tm, false); box(sx * 26, 4.8, sz * (16 - .35), 8, .12, .1, tm, false); box(sx * (16 - .35), 4.8, sz * 26, .1, .12, 8, tm, false);
  }
  for (const [x, z, w, d] of [[-21, 0, 4, 8], [21, 0, 4, 8]]) { box(x, 0, z, w, .6, d, matMetal); box(x, .6, z, w - 1.4, .6, d - 3, matMetal); }
}
const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), matGlow); core.position.set(0, 6, 0); scene.add(core);
// cover: crates and walls
const cover = [[-10, -6, 2, 1.4, 2], [10, 6, 2, 1.4, 2], [-8, 10, 5, 2.2, 1], [8, -10, 5, 2.2, 1], [-15, 2, 1, 2.2, 6], [15, -2, 1, 2.2, 6],
  [0, -15, 7, 1.2, 1], [0, 15, 7, 1.2, 1], [-4, -22, 2, 2, 2], [4, 22, 2, 2, 2], [-24, 6, 2, 1.4, 2], [24, -6, 2, 1.4, 2], [-6, 5, 1.4, 1.4, 1.4], [6, -5, 1.4, 1.4, 1.4]];
for (const [x, z, w, h, d] of cover) box(x, 0, z, w, h, d, h < 2 ? matCrate : matWall);
// pillars with lights
const pillarLights = [[-12, -12], [12, 12], [-12, 12], [12, -12]];
for (const [x, z] of pillarLights) {
  box(x, 0, z, 1.2, 5, 1.2, matWall); box(x, 5, z, 1.4, .2, 1.4, matGlow, false);
  const qc = [0xff3a44, 0x44ff66, 0xffaa22, 0x3fd0ff][pillarLights.findIndex(p => p[0] === x && p[1] === z)];
  const qm = matGlow.clone(); qm.color.set(qc); qm.emissive.set(qc); box(x, 5.2, z, 1.6, .15, 1.6, qm, false);
  const dm = new THREE.MeshStandardMaterial({ color: new THREE.Color(qc).lerp(new THREE.Color(0x6a6878), .7), roughness: .7 }); const dec = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, .05, 8), dm); dec.position.set(x * 1.75, .03, z * 1.75); scene.add(dec);
  const l = new THREE.PointLight(qc, 25, 16, 1.6); l.position.set(x, 4.5, z); scene.add(l);
}
// lighting
scene.background = new THREE.Color(0x9aa4b4); scene.fog = new THREE.Fog(0x9aa4b4, 45, 120); matFloor.color.set(0x8a8898);
scene.add(new THREE.HemisphereLight(0xf2f0ff, 0x6a6478, 0.45));
const sun = new THREE.DirectionalLight(0xfff6ea, 3.6);
sun.position.set(22, 40, 14); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 5, far: 90 }); sun.shadow.bias = -0.0005;
scene.add(sun);
// sky dome with gradient + stars
{
  const g = new THREE.SphereGeometry(150, 32, 16);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {},
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;void main(){float h=normalize(p).y;vec3 c=mix(vec3(.6,.64,.7),vec3(.3,.36,.5),clamp(h,0.,1.));c+=vec3(1.,.8,.7)*pow(1.-abs(h),12.)*.2;gl_FragColor=vec4(c,1.);}' });
  scene.add(new THREE.Mesh(g, m));
}

// ---------- nav grid (flow field) ----------
const CELL = 1, GN = ARENA * 2;
const blocked = new Uint8Array(GN * GN), dist = new Int32Array(GN * GN), queue = new Int32Array(GN * GN);
for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
  const x = -ARENA + i + .5, z = -ARENA + j + .5;
  for (const s of solids) if (x > s.min.x - .7 && x < s.max.x + .7 && z > s.min.z - .7 && z < s.max.z + .7 && s.min.y < 1.5) { blocked[i * GN + j] = 1; break; }
}
const cellOf = (x, z) => [Math.max(0, Math.min(GN - 1, Math.floor(x + ARENA))), Math.max(0, Math.min(GN - 1, Math.floor(z + ARENA)))];
function buildFlow(px, pz) {
  dist.fill(1e9); let [ci, cj] = cellOf(px, pz);
  if (blocked[ci * GN + cj]) { // find nearest free
    let best = 1e9; for (let i = 0; i < GN * GN; i++) if (!blocked[i]) { const d = Math.abs((i / GN | 0) - ci) + Math.abs(i % GN - cj); if (d < best) { best = d; ci = i / GN | 0; cj = i % GN; } }
  }
  let h = 0, t = 0; dist[ci * GN + cj] = 0; queue[t++] = ci * GN + cj;
  while (h < t) {
    const c = queue[h++], i = c / GN | 0, j = c % GN, d = dist[c] + 1;
    if (i > 0 && !blocked[c - GN] && dist[c - GN] > d) { dist[c - GN] = d; queue[t++] = c - GN; }
    if (i < GN - 1 && !blocked[c + GN] && dist[c + GN] > d) { dist[c + GN] = d; queue[t++] = c + GN; }
    if (j > 0 && !blocked[c - 1] && dist[c - 1] > d) { dist[c - 1] = d; queue[t++] = c - 1; }
    if (j < GN - 1 && !blocked[c + 1] && dist[c + 1] > d) { dist[c + 1] = d; queue[t++] = c + 1; }
  }
}
const _dir = new THREE.Vector2();
function flowDir(x, z, out) {
  const [i, j] = cellOf(x, z); let best = dist[i * GN + j], bi = i, bj = j;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue;
    if (di && dj && (blocked[ni * GN + j] || blocked[i * GN + nj])) continue;
    const d = dist[ni * GN + nj] + (di && dj ? .4 : 0); if (d < best) { best = d; bi = ni; bj = nj; }
  }
  out.set(bi - i, bj - j); if (out.lengthSq() === 0) return false; out.normalize(); return true;
}
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz), n = Math.ceil(L / .4);
  for (let k = 1; k < n; k++) { const t = k / n; if (pointSolid(ax + dx * t, ay + dy * t, az + dz * t)) return false; }
  return true;
}
function pointSolid(x, y, z) { for (const s of solids) if (x > s.min.x && x < s.max.x && y > s.min.y && y < s.max.y && z > s.min.z && z < s.max.z) return true; return y < 0; }

// ---------- audio ----------
let actx = null, master = null, noiseBuf = null;
const settings = { sens: 1, vol: 0.6 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('arena-settings') || '{}')); } catch (e) {}
function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = settings.vol; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function noiseHit(freq, q, peak, dec, type = 'lowpass', delay = 0) {
  if (!actx) return; const t = actx.currentTime + delay, s = actx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = .5 + Math.random() * .5;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = actx.createGain(); env(g, t, .003, peak, dec);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dec + .05);
}
function tone(f0, f1, dur, type, peak, delay = 0) {
  if (!actx) return; const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, .004, peak, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
}
const sfx = {
  rifle() { noiseHit(2500, .7, .5, .09); tone(180, 60, .08, 'square', .15); },
  shotgun() { noiseHit(1200, .5, .9, .35); tone(120, 40, .25, 'sawtooth', .3); },
  pump() { noiseHit(3000, 3, .25, .05, 'bandpass', .12); noiseHit(2000, 3, .25, .06, 'bandpass', .26); },
  reload() { noiseHit(3500, 4, .25, .05, 'bandpass'); noiseHit(2500, 4, .3, .06, 'bandpass', .35); tone(900, 500, .05, 'square', .06, .7); },
  empty() { tone(1500, 1200, .03, 'square', .08); },
  hit() { tone(1400, 900, .05, 'triangle', .2); },
  kill() { tone(900, 1800, .12, 'triangle', .22); },
  melee() { noiseHit(700, 1, .5, .15); tone(90, 40, .15, 'sawtooth', .25); },
  enemyShot() { tone(900, 200, .2, 'sawtooth', .12); },
  death() { noiseHit(500, 1, .5, .5); tone(300, 40, .5, 'sawtooth', .2); },
  hurt() { tone(220, 110, .18, 'square', .25); noiseHit(400, 1, .3, .15); },
  wave() { tone(440, 440, .15, 'triangle', .2); tone(660, 660, .25, 'triangle', .2, .15); },
  jump() { noiseHit(800, 1, .08, .06); },
};

// ---------- player ----------
const P = { pos: new THREE.Vector3(0, 0, 20), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true, health: 100, radius: .4, height: 1.7 };
const input = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
function collidePlayer(axis) {
  const r = P.radius, p = P.pos;
  for (const s of solids) {
    if (p.x + r <= s.min.x || p.x - r >= s.max.x || p.z + r <= s.min.z || p.z - r >= s.max.z || p.y + P.height <= s.min.y || p.y >= s.max.y) continue;
    if (axis === 'y') {
      if (P.vel.y <= 0 && p.y - P.vel.y * 0 >= s.max.y - 0.65) { p.y = s.max.y; P.vel.y = 0; P.onGround = true; }
      else if (P.vel.y > 0) { p.y = s.min.y - P.height; P.vel.y = 0; }
      else { p.y = s.max.y; P.vel.y = 0; P.onGround = true; }
    } else {
      // step up small ledges
      if (s.max.y - p.y <= 0.65 && s.max.y - p.y > 0) { p.y = s.max.y; continue; }
      if (axis === 'x') p.x = P.vel.x > 0 ? s.min.x - r - 1e-4 : s.max.x + r + 1e-4;
      else p.z = P.vel.z > 0 ? s.min.z - r - 1e-4 : s.max.z + r + 1e-4;
    }
  }
}
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _wish = new THREE.Vector3();
function updatePlayer(dt) {
  _fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); _right.set(-_fwd.z, 0, _fwd.x);
  _wish.set(0, 0, 0);
  if (input.forward) _wish.add(_fwd); if (input.back) _wish.sub(_fwd); if (input.right) _wish.add(_right); if (input.left) _wish.sub(_right);
  if (_wish.lengthSq()) _wish.normalize();
  const speed = input.sprint && input.forward ? 9 : 5.5;
  const accel = P.onGround ? 12 : 3;
  P.vel.x += (_wish.x * speed - P.vel.x) * Math.min(1, accel * dt);
  P.vel.z += (_wish.z * speed - P.vel.z) * Math.min(1, accel * dt);
  if (input.jump && P.onGround) { P.vel.y = 7.5; P.onGround = false; sfx.jump(); }
  P.vel.y -= 22 * dt;
  const steps = Math.ceil(dt / 0.01), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    P.pos.x += P.vel.x * h; collidePlayer('x');
    P.pos.z += P.vel.z * h; collidePlayer('z');
    P.onGround = false; P.pos.y += P.vel.y * h; collidePlayer('y');
    if (P.pos.y <= 0) { P.pos.y = 0; P.vel.y = 0; P.onGround = true; }
  }
  P.pos.x = Math.max(-ARENA + P.radius, Math.min(ARENA - P.radius, P.pos.x));
  P.pos.z = Math.max(-ARENA + P.radius, Math.min(ARENA - P.radius, P.pos.z));
}

// ---------- weapons + viewmodel ----------
const W = {
  rifle: { name: 'RIFLE', mag: 30, magSize: 30, reserve: 90, rate: 0.095, auto: true, reload: 1.8, dmg: 22, pellets: 1, spread: 0.012, recoil: 0.018 },
  shotgun: { name: 'SHOTGUN', mag: 6, magSize: 6, reserve: 24, rate: 0.85, auto: false, reload: 2.2, dmg: 13, pellets: 8, spread: 0.07, recoil: 0.07 },
};
let weapon = 'rifle', fireCd = 0, reloading = 0, switchT = 0, spreadBloom = 0, recoilKick = 0, firedLatch = false;
const vmRoot = new THREE.Group(); camera.add(vmRoot);
const vmMatDark = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: .55, metalness: .25, emissive: 0x151a20 });
const vmMatMid = new THREE.MeshStandardMaterial({ color: 0x6a7682, roughness: .45, metalness: .3, emissive: 0x1a2028 });
const vmMatWood = new THREE.MeshStandardMaterial({ color: 0xb8642a, roughness: .6, emissive: 0x3a1a08 });
const vmMatSkin = new THREE.MeshStandardMaterial({ color: 0x6a7a55, roughness: .85, emissive: 0x1a2012 });
const vmFill = new THREE.PointLight(0xffffff, 3, 2); vmFill.position.set(.3, .2, .1); camera.add(vmFill);
function part(g, geo, mat, x, y, z, rx = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; }
const vmSleeve = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: .9, emissive: 0x0c1016 });
const vmGlove = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: .8, emissive: 0x201a12 });
function addArms(g, fz, gz) { // fz: foregrip z, gz: grip z
  part(g, new THREE.BoxGeometry(.075, .07, .1), vmGlove, -.01, -.05, fz); // support glove
  for (let i = 0; i < 3; i++) part(g, new THREE.BoxGeometry(.016, .06, .02), vmGlove, .045, -.03, fz - .03 + i * .03); // fingers
  const s1 = part(g, new THREE.BoxGeometry(.08, .08, .4), vmSleeve, -.08, -.14, fz + .2, .35); s1.rotation.y = -.6; // support forearm
  part(g, new THREE.BoxGeometry(.075, .085, .09), vmGlove, .01, -.12, gz); // grip glove
  part(g, new THREE.BoxGeometry(.02, .07, .07), vmGlove, -.035, -.1, gz - .02); // wrapped fingers
  const s2 = part(g, new THREE.BoxGeometry(.09, .09, .35), vmSleeve, .1, -.2, gz + .18, .5); s2.rotation.y = -.5; // grip forearm
}
function makeRifle() {
  const g = new THREE.Group();
  const cyl = (r, l, n = 12) => new THREE.CylinderGeometry(r, r, l, n), X = Math.PI / 2;
  part(g, new THREE.BoxGeometry(.062, .075, .3), vmMatDark, 0, -.005, .01); // lower receiver
  part(g, new THREE.BoxGeometry(.068, .05, .34), vmMatMid, 0, .05, -.01); // upper receiver
  part(g, cyl(.036, .28, 14), vmMatMid, 0, .035, -.31, X); // barrel shroud
  part(g, new THREE.BoxGeometry(.046, .12, .065), vmMatDark, 0, -.1, -.06, .25); // mag (index 3)
  part(g, new THREE.BoxGeometry(.042, .11, .05), vmMatDark, 0, -.09, .11, -.3); // grip
  part(g, new THREE.BoxGeometry(.05, .065, .12), vmMatDark, 0, .0, .22); // short stock
  part(g, new THREE.BoxGeometry(.03, .035, .05), vmMatDark, 0, .092, .1); // rear sight
  part(g, new THREE.BoxGeometry(.074, .01, .2), matGlow, 0, .028, -.05); // glow strip
  part(g, cyl(.012, .16, 8), vmMatDark, 0, .035, -.52, X); // barrel
  part(g, cyl(.02, .05, 8), vmMatDark, 0, .035, -.61, X); // muzzle brake
  part(g, new THREE.BoxGeometry(.074, .02, .3), vmMatDark, 0, .005, -.02); // bevel band
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) part(g, new THREE.BoxGeometry(.012, .016, .04), vmMatDark, sx * .031, .035, -.4 + i * .055); // handguard cut-outs
  part(g, new THREE.BoxGeometry(.03, .012, .5), vmMatDark, 0, .078, -.18); // top rail
  for (let i = 0; i < 8; i++) part(g, new THREE.BoxGeometry(.036, .008, .018), vmMatMid, 0, .086, -.4 + i * .06);
  part(g, new THREE.BoxGeometry(.008, .05, .012), vmMatDark, 0, .1, -.42); // front sight
  part(g, new THREE.BoxGeometry(.09, .06, .12), vmMatSkin, -.01, -.03, -.3); // support hand
  part(g, new THREE.BoxGeometry(.02, .07, .1), vmMatSkin, -.045, .01, -.3); // fingers
  part(g, new THREE.BoxGeometry(.07, .08, .1), vmMatSkin, .01, -.13, .13); // grip hand
  addArms(g, -.3, .13); g.userData.muzzle = new THREE.Vector3(0, .035, -.65); g.userData.mag = g.children[3];
  return g;
}
function makeShotgun() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(.12, .12, .28), vmMatDark, 0, 0, 0);
  part(g, new THREE.CylinderGeometry(.03, .03, .38, 14), vmMatMid, -.025, .03, -.32, Math.PI / 2); part(g, new THREE.CylinderGeometry(.03, .03, .38, 14), vmMatMid, .025, .03, -.32, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(.03, .03, .34, 12), vmMatDark, 0, -.035, -.3, Math.PI / 2);
  const pump = part(g, new THREE.BoxGeometry(.11, .09, .16), vmMatWood, 0, -.04, -.3);
  part(g, new THREE.BoxGeometry(.075, .1, .18), vmMatWood, 0, -.03, .22, -.12);
  part(g, new THREE.BoxGeometry(.012, .012, .12), matGlowO, .042, .03, -.05);
  part(g, new THREE.BoxGeometry(.012, .02, .012), matGlowO, 0, .06, -.5); // bead sight
  part(g, new THREE.BoxGeometry(.03, .01, .2), vmMatMid, 0, .05, -.02); // rib
  addArms(g, -.3, .1); g.userData.oy = .06; g.userData.muzzle = new THREE.Vector3(0, .03, -.52); g.userData.pump = pump; g.userData.pumpZ = pump.position.z; g.userData.mag = pump;
  return g;
}
const vms = { rifle: makeRifle(), shotgun: makeShotgun() };
for (const k in vms) { vms[k].traverse(o => { o.castShadow = false; }); vmRoot.add(vms[k]); vms[k].visible = k === weapon; }
vmRoot.position.set(.13, -.13, -.36); vmRoot.scale.setScalar(.62); vmRoot.rotation.y = -.03;
const flash = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ map: canvasTex(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(.3, 'rgba(255,190,80,.9)'); gr.addColorStop(1, 'rgba(255,100,0,0)'); g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 12 : 32; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
const flashLight = new THREE.PointLight(0xffb060, 0, 8, 2);
flash.add(new THREE.Mesh(flash.geometry, flash.material).rotateY(Math.PI / 2)); flash.add(new THREE.Mesh(flash.geometry, flash.material).rotateX(Math.PI / 2)); vmRoot.add(flash); camera.add(flashLight); flashLight.position.set(.2, -.1, -.8); flash.visible = false;
let flashT = 0, recoilAcc = 0;

// tracers & impacts (pooled)
const tracerPool = [], impactPool = [];
const tracerMat = new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
for (let i = 0; i < 24; i++) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const l = new THREE.Line(g, tracerMat); l.frustumCulled = false; l.visible = false; l.userData.t = 0; scene.add(l); tracerPool.push(l);
}
const impactGeo = new THREE.SphereGeometry(.06, 6, 4), impactMat = new THREE.MeshBasicMaterial({ color: 0xffd080 });
for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(impactGeo, impactMat); m.visible = false; m.userData.t = 0; scene.add(m); impactPool.push(m); }
let tracerI = 0, impactI = 0;
function spawnTracer(a, b) { const l = tracerPool[tracerI++ % tracerPool.length], p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; l.geometry.computeBoundingSphere(); l.visible = true; l.userData.t = .08; }
function spawnImpact(p, color) { const m = impactPool[impactI++ % impactPool.length]; m.position.copy(p); m.visible = true; m.userData.t = .25; m.scale.setScalar(1); m.material = color ? bloodMat : impactMat; }
const bloodMat = new THREE.MeshBasicMaterial({ color: 0xff3050 });

// ---------- enemies ----------
const enemies = []; let enemyId = 1;
const eMat = {
  rusherBody: new THREE.MeshStandardMaterial({ color: 0x8a1f1f, roughness: .5, metalness: .3 }),
  rusherDark: new THREE.MeshStandardMaterial({ color: 0x2a0e0e, roughness: .6, metalness: .4 }),
  shooterBody: new THREE.MeshStandardMaterial({ color: 0x35536e, roughness: .4, metalness: .6 }),
  shooterDark: new THREE.MeshStandardMaterial({ color: 0x151d26, roughness: .5, metalness: .5 }),
  eyeR: new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 3 }),
  eyeG: new THREE.MeshStandardMaterial({ color: 0x40ff90, emissive: 0x30ff80, emissiveIntensity: 3 }),
  flash: new THREE.MeshStandardMaterial({ color: 0xff7040, emissive: 0xff4010, emissiveIntensity: 1.4 }),
};
const _eg = {}; function eg(k, f) { return _eg[k] || (_eg[k] = f()); }
eMat.coreR = new THREE.MeshStandardMaterial({ color: 0xff6030, emissive: 0xff3a10, emissiveIntensity: 2.5 });
eMat.coreG = new THREE.MeshStandardMaterial({ color: 0x60ffc0, emissive: 0x20ffa0, emissiveIntensity: 2.2 });
function limb(parent, len, rad, mat, x, y, z) { const pivot = new THREE.Group(); pivot.position.set(x, y, z); const h = len / 2, geo = eg('cap' + h + '_' + rad, () => new THREE.CapsuleGeometry(rad, h, 3, 8)); const m = new THREE.Mesh(geo, mat); m.position.y = -h / 2 - rad; m.castShadow = true; pivot.add(m);
  const lo = new THREE.Group(); lo.position.y = -h - rad * 1.2; pivot.add(lo); const m2 = new THREE.Mesh(geo, mat); m2.scale.setScalar(.92); m2.position.y = -h / 2 - rad; m2.castShadow = true; lo.add(m2); pivot.lo = lo; parent.add(pivot); return pivot; }
function buildRusher() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = 1.05;
  const torso = new THREE.Mesh(eg('rTorso', () => new THREE.DodecahedronGeometry(.42, 0)), eMat.rusherBody); torso.scale.set(1.15, 1.05, .8); torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(eg('rHead', () => new THREE.ConeGeometry(.22, .45, 6)), eMat.rusherDark); head.position.set(0, .5, -.1); head.rotation.x = -.6; body.add(head);
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(eg('eye', () => new THREE.SphereGeometry(.06, 8, 6)), eMat.eyeR); eye.position.set(s * .09, .45, -.3); body.add(eye);
    const horn = new THREE.Mesh(eg('horn', () => new THREE.ConeGeometry(.06, .4, 5)), eMat.rusherDark); horn.position.set(s * .2, .62, -.05); horn.rotation.set(-.3, 0, -s * .7); body.add(horn); }
  const core = new THREE.Mesh(eg('rCore', () => new THREE.IcosahedronGeometry(.14, 0)), eMat.coreR); core.position.set(0, .05, -.3); body.add(core);
  for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(eg('spike', () => new THREE.ConeGeometry(.07, .35, 5)), i % 2 ? eMat.coreR : eMat.rusherDark); sp.position.set(Math.sin(i) * .2, .25 + i * .05, .3); sp.rotation.x = .9; body.add(sp); }
  const legL = limb(g, .45, .09, eMat.rusherDark, -.2, .75, 0), legR = limb(g, .45, .09, eMat.rusherDark, .2, .75, 0);
  const armL = limb(body, .5, .08, eMat.rusherBody, -.5, .2, 0), armR = limb(body, .5, .08, eMat.rusherBody, .5, .2, 0);
  for (const a of [armL, armR]) for (const s of [-1, 1]) { const claw = new THREE.Mesh(eg('claw', () => new THREE.ConeGeometry(.05, .35, 4)), eMat.coreR); claw.position.set(s * .05, -.5, 0); claw.rotation.x = Math.PI; a.lo.add(claw); }
  return { g, body, legL, legR, armL, armR, mats: [torso], core };
}
function buildShooter() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = 1.5;
  const torso = new THREE.Mesh(eg('sTorso', () => new THREE.CylinderGeometry(.38, .24, .75, 8)), eMat.shooterBody); torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(eg('sHead', () => new THREE.SphereGeometry(.25, 12, 8)), eMat.shooterDark); head.position.y = .52; head.scale.set(1, .9, 1.1); body.add(head);
  const visor = new THREE.Mesh(eg('visor', () => new THREE.BoxGeometry(.36, .08, .1)), eMat.eyeG); visor.position.set(0, .54, -.22); body.add(visor);
  const ant = new THREE.Mesh(eg('ant', () => new THREE.CylinderGeometry(.015, .015, .45, 4)), eMat.shooterDark); ant.position.set(.15, .85, .05); body.add(ant);
  const antTip = new THREE.Mesh(eg('eye', () => new THREE.SphereGeometry(.06, 8, 6)), eMat.eyeG); antTip.position.set(.15, 1.08, .05); body.add(antTip);
  const core = new THREE.Mesh(eg('sCore', () => new THREE.BoxGeometry(.22, .1, .05)), eMat.coreG); core.position.set(0, .1, -.34); body.add(core);
  const pack = new THREE.Mesh(eg('pack', () => new THREE.BoxGeometry(.46, .5, .24)), eMat.shooterDark); pack.position.set(0, .05, .32); body.add(pack);
  for (const s of [-1, 1]) { const pad = new THREE.Mesh(eg('pad', () => new THREE.BoxGeometry(.3, .14, .34)), eMat.shooterBody); pad.position.set(s * .44, .32, 0); pad.rotation.z = -s * .3; body.add(pad);
    const strip = new THREE.Mesh(eg('strip', () => new THREE.BoxGeometry(.04, .3, .04)), eMat.coreG); strip.position.set(s * .16, .05, .45); body.add(strip); }
  const legL = limb(g, .6, .1, eMat.shooterDark, -.17, 1.15, 0), legR = limb(g, .6, .1, eMat.shooterDark, .17, 1.15, 0);
  const armL = limb(body, .35, .08, eMat.shooterBody, -.44, .25, 0), armR = new THREE.Group(); armR.position.set(.4, .15, 0); body.add(armR);
  const gun = new THREE.Mesh(eg('gun', () => new THREE.BoxGeometry(.14, .16, .7)), eMat.shooterDark); gun.position.set(0, 0, -.3); armR.add(gun);
  const tip = new THREE.Mesh(eg('tip', () => new THREE.CylinderGeometry(.05, .05, .12, 6)), eMat.eyeG); tip.rotation.x = Math.PI / 2; tip.position.set(0, 0, -.68); armR.add(tip);
  return { g, body, legL, legR, armL, armR, mats: [torso], core };
}
const debris = []; const debrisMatR = new THREE.MeshBasicMaterial({ color: 0xff5020 }), debrisMatG = new THREE.MeshBasicMaterial({ color: 0x40ffa0 });
for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(eg('deb', () => new THREE.TetrahedronGeometry(.09, 0)), debrisMatR); m.visible = false; scene.add(m); debris.push({ m, v: new THREE.Vector3(), life: 0 }); }
function burstDebris(pos, y, green) { let n = 14; for (const d of debris) { if (d.life > 0) continue; d.life = .8 + Math.random() * .6; d.m.material = green ? debrisMatG : debrisMatR; d.m.position.set(pos.x, y, pos.z); d.v.set((Math.random() - .5) * 7, 2 + Math.random() * 5, (Math.random() - .5) * 7); d.m.visible = true; if (--n <= 0) break; } }
function updateDebris(dt) { for (const d of debris) { if (d.life <= 0) continue; d.life -= dt; d.v.y -= 14 * dt; d.m.position.addScaledVector(d.v, dt); if (d.m.position.y < .05) { d.m.position.y = .05; d.v.y *= -.4; d.v.x *= .7; d.v.z *= .7; } d.m.rotation.x += dt * 9; d.m.rotation.z += dt * 7; d.m.scale.setScalar(Math.min(1, d.life * 2)); if (d.life <= 0) d.m.visible = false; } }
function spawnEnemy(type, x, y = 0, z) {
  const rig = type === 'rusher' ? buildRusher() : buildShooter();
  rig.all = []; rig.g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.m0 = o.material; rig.all.push(o); } });
  rig.g.position.set(x, 0, z); scene.add(rig.g);
  const e = { id: enemyId++, type, rig, pos: rig.g.position, health: type === 'rusher' ? 70 : 90, maxHealth: 0, alive: true, speed: type === 'rusher' ? 6.2 : 3.4,
    atkCd: 1 + Math.random(), hitT: 0, deathT: 0, phase: Math.random() * 6, yaw: 0, strafe: Math.random() < .5 ? 1 : -1, strafeT: 0, spawnT: .6, vel: new THREE.Vector2(), prefD: 10 + Math.random() * 7, zig: Math.random() * 6, kb: new THREE.Vector2() };
  e.maxHealth = e.health;
  enemies.push(e); return e.id;
}
const projectiles = [];
const projGeo = new THREE.SphereGeometry(.14, 10, 8), projMat = new THREE.MeshBasicMaterial({ color: 0x70ffb0 });
const projHaloMat = new THREE.MeshBasicMaterial({ color: 0x30ff80, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false });
for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(projGeo, projMat); const h = new THREE.Mesh(projGeo, projHaloMat); h.scale.setScalar(2.2); m.add(h); m.visible = false; scene.add(m); projectiles.push({ m, vel: new THREE.Vector3(), life: 0 }); }
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _eye = new THREE.Vector3();
function fireProjectile(from, to, speed) {
  const p = projectiles.find(q => q.life <= 0); if (!p) return;
  p.m.position.copy(from); p.vel.subVectors(to, from).normalize().multiplyScalar(speed); p.life = 4; p.m.visible = true; sfx.enemyShot();
}
function separate(e) {
  for (const o of enemies) { if (o === e || !o.alive) continue; const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d2 = dx * dx + dz * dz; if (d2 < .8 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (.9 - d) * .5; e.pos.x += dx / d * k; e.pos.z += dz / d * k; } }
}
function enemyBlocked(x, z) { const [i, j] = cellOf(x, z); return blocked[i * GN + j]; }
function updateEnemies(dt, t) {
  for (let idx = enemies.length - 1; idx >= 0; idx--) {
    const e = enemies[idx], r = e.rig;
    if (!e.alive) {
      e.deathT += dt; const k = Math.min(1, e.deathT / .6);
      if (!e.limp) { const hx = e.hitDir ? e.hitDir.x : 0, hz = e.hitDir ? e.hitDir.y : 1; const fz = hx * Math.sin(e.yaw) + hz * Math.cos(e.yaw), fx = hx * Math.cos(e.yaw) - hz * Math.sin(e.yaw);
        e.limp = { px: (fz >= 0 ? 1 : -1) * Math.PI / 2 * .95, pz: -fx * .6, a: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1].map(v => v * 1.4), rx: 0, rz: 0 }; }
      const L = e.limp, sd = Math.min(1, 7 * dt); L.rx += (L.px - L.rx) * sd * (1 + k); L.rz += (L.pz - L.rz) * sd;
      r.g.rotation.x = L.rx; r.g.rotation.z = L.rz; r.g.position.y = -Math.abs(L.rx) / Math.PI * .5 - Math.max(0, e.deathT - 1.5) * .8;
      r.legL.rotation.x += (L.a[0] - r.legL.rotation.x) * sd; r.legR.rotation.x += (L.a[1] - r.legR.rotation.x) * sd; r.armL.rotation.z += (L.a[2] * 1.5 - r.armL.rotation.z) * sd; r.armR.rotation.z += (-L.a[3] * 1.5 - r.armR.rotation.z) * sd; r.body.rotation.x += (L.a[3] * .5 - r.body.rotation.x) * sd;
      for (const m of r.all) m.material = e.deathT < .08 ? eMat.flash : m.userData.m0;
      r.body.scale.setScalar(1 + Math.sin(k * Math.PI) * .15);
      if (e.kb) { e.pos.x += e.kb.x * dt; e.pos.z += e.kb.y * dt; e.kb.multiplyScalar(Math.max(0, 1 - 5 * dt)); }
      if (r.core) r.core.visible = Math.sin(e.deathT * 40) > (e.deathT - .3) * 2 - 1;
      if (!e.burst && e.deathT > .45) { e.burst = true; burstDebris(e.pos, e.type === 'rusher' ? .8 : 1.3, e.type !== 'rusher'); spawnImpact(_v2.set(e.pos.x, e.type === 'rusher' ? 1 : 1.5, e.pos.z), true); }
      if (e.deathT > 1.6) r.g.scale.setScalar(Math.max(.01, 1 - (e.deathT - 1.6) / 1.4));
      if (e.deathT > 3) { scene.remove(r.g); enemies.splice(idx, 1); }
      continue;
    }
    if (e.spawnT > 0) { e.spawnT -= dt; r.g.scale.setScalar(1 - Math.max(0, e.spawnT) / .6); }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    const eyeY = e.type === 'rusher' ? 1.4 : 2.0;
    const sees = losClear(e.pos.x, eyeY, e.pos.z, P.pos.x, P.pos.y + 1.4, P.pos.z);
    let mx = 0, mz = 0;
    if (e.hitT > 0) e.hitT -= dt;
    const stagger = e.hitT > 0.12 ? 0.3 : 1;
    if (e.type === 'rusher') {
      if (sees && d < 4) { mx = dx / d; mz = dz / d; } else if (flowDir(e.pos.x, e.pos.z, _dir)) { mx = _dir.x; mz = _dir.y; }
      if (d > 3.5) { const z = Math.sin(t * 3.2 + e.zig) * .55; const ox = -mz * z, oz = mx * z; mx += ox; mz += oz; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; }
      e.atkCd -= dt;
      if (d < 1.5 && Math.abs(P.pos.y - e.pos.y) < 1.5) { mx = mz = 0; if (e.atkCd <= 0) { e.atkCd = 1.0; e.attackAnim = .35; sfx.melee(); damagePlayer(12 + wave * 2, e.pos); } }
    } else {
      e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = 1.5 + Math.random() * 2; e.strafe *= -1; }
      if (!sees || d > 20) { if (flowDir(e.pos.x, e.pos.z, _dir)) { mx = _dir.x; mz = _dir.y; } }
      else { const rad = (d - e.prefD) / 4; const rc = Math.max(-1, Math.min(1, rad)); mx = dx / d * rc - dz / d * e.strafe * .8; mz = dz / d * rc + dx / d * e.strafe * .8;
        if (enemyBlocked(e.pos.x + mx * 1.2, e.pos.z + mz * 1.2)) e.strafe *= -1;
        for (const o of enemies) { if (o === e || !o.alive || o.type !== 'shooter') continue; const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = ox * ox + oz * oz; if (od < 16 && od > 1e-4) { const q = Math.sqrt(od); mx += ox / q * .6; mz += oz / q * .6; } } }
      e.atkCd -= dt;
      if (sees && d < 30 && e.atkCd <= 0 && e.spawnT <= 0) {
        e.atkCd = Math.max(.9, 2.2 - wave * .2) + Math.random() * .8;
        _eye.set(.38, .15, -.62); r.armR.localToWorld(_eye);
        _v.set(P.pos.x + P.vel.x * .25, P.pos.y + 1.2, P.pos.z + P.vel.z * .25);
        fireProjectile(_eye, _v, 13 + wave * 1.2); e.attackAnim = .2;
      }
    }
    let lun = 1;
    if (e.type === 'rusher') { e.lungeCd = (e.lungeCd || 0) - dt;
      if (!e.lunge && sees && d < 5 && d > 1.6 && e.lungeCd <= 0) { e.lunge = .8; e.lungeCd = 2.5; }
      if (e.lunge > 0) { e.lunge -= dt; if (e.lunge > .55) { lun = .1; r.g.scale.y = .8; } else { lun = 2; r.g.scale.y = 1; mx = dx / d; mz = dz / d; } if (e.lunge <= 0) { e.lunge = 0; r.g.scale.y = 1; } } }
    const sp = e.speed * stagger * lun * (e.spawnT > 0 ? 0 : 1);
    e.vel.x += (mx * sp - e.vel.x) * Math.min(1, 8 * dt); e.vel.y += (mz * sp - e.vel.y) * Math.min(1, 8 * dt);
    const nx = e.pos.x + (e.vel.x + e.kb.x) * dt, nz = e.pos.z + (e.vel.y + e.kb.y) * dt; e.kb.multiplyScalar(Math.max(0, 1 - 7 * dt));
    if (!enemyBlocked(nx, e.pos.z)) e.pos.x = nx; if (!enemyBlocked(e.pos.x, nz)) e.pos.z = nz;
    separate(e);
    // face player when attacking/seeing, else face movement
    const tyaw = (sees && (e.type === 'shooter' || d < 6)) ? Math.atan2(-dx, -dz) : (e.vel.lengthSq() > .1 ? Math.atan2(-e.vel.x, -e.vel.y) : e.yaw);
    let dy = tyaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; e.yaw += dy * Math.min(1, 10 * dt);
    r.g.rotation.y = e.yaw;
    // animation
    const spd = e.vel.length(); e.phase += dt * spd * (e.type === 'rusher' ? 2.2 : 2.6);
    const sw = Math.sin(e.phase) * Math.min(1, spd / 3) * .9;
    r.legL.rotation.x = sw; r.legR.rotation.x = -sw; const amp = Math.min(1, spd / 3);
    r.legL.lo.rotation.x = Math.max(0, -Math.sin(e.phase + .6)) * 1.3 * amp + .05; r.legR.lo.rotation.x = Math.max(0, Math.sin(e.phase + .6)) * 1.3 * amp + .05;
    r.body.rotation.y = -Math.sin(e.phase) * .18 * amp; r.body.position.x = Math.sin(e.phase) * .05 * amp; r.body.rotation.z = Math.cos(e.phase) * .06 * amp;
    r.armL.lo.rotation.x = -.35 - .5 * amp; if (r.armR.lo) r.armR.lo.rotation.x = -.35 - .5 * amp;
    r.body.position.y = (e.type === 'rusher' ? 1.05 : 1.5) + Math.abs(Math.cos(e.phase)) * .06 * Math.min(1, spd);
    if (e.type === 'rusher') { r.body.rotation.x = -.35 * Math.min(1, spd / 4); r.armL.rotation.x = -sw * .8; r.armR.rotation.x = sw * .8; }
    else { r.armL.rotation.x = -sw * .5; r.armR.rotation.x = sees ? -Math.atan2(P.pos.y + 1.2 - 1.65, Math.max(d, .1)) * -1 : 0; }
    if (e.attackAnim > 0) { e.attackAnim -= dt; if (e.type === 'rusher') { r.armL.rotation.x = r.armR.rotation.x = -2.2 * Math.sin(e.attackAnim / .35 * Math.PI); } else r.armR.position.z = .12 * e.attackAnim / .2; }
    // hit flash
    const fl = e.hitT > 0.14; if (fl !== r.fl) { r.fl = fl; for (const m of r.all) m.material = fl ? eMat.flash : m.userData.m0; }
    if (e.hitT > 0) { r.body.rotation.z = Math.sin(e.hitT * 60) * .08 * e.hitT * 5; r.body.rotation.x = (e.type === 'rusher' ? r.body.rotation.x : 0) + e.hitT * 1.6; r.armL.rotation.z = -e.hitT * 4; if (e.type === 'rusher') r.armR.rotation.z = e.hitT * 4; } else { r.armL.rotation.z = 0; if (e.type === 'rusher') r.armR.rotation.z = 0; }
    if (e.hitT <= 0) { r.body.rotation.z = 0; if (e.type !== 'rusher') r.body.rotation.x = 0; }
  }
  updateDebris(dt);
  for (const p of projectiles) {
    if (p.life <= 0) continue; p.life -= dt; p.m.position.addScaledVector(p.vel, dt);
    const q = p.m.position;
    if (pointSolid(q.x, q.y, q.z)) { p.life = 0; p.m.visible = false; spawnImpact(q); continue; }
    const dx = q.x - P.pos.x, dz = q.z - P.pos.z, dy = q.y - (P.pos.y + .9);
    if (dx * dx + dz * dz < .3 && Math.abs(dy) < .95) { p.life = 0; p.m.visible = false; damagePlayer(10 + wave * 1.5, _v2.set(q.x - p.vel.x, 0, q.z - p.vel.z)); continue; }
    if (p.life <= 0) p.m.visible = false;
  }
}
function damageEnemy(e, dmg, point) {
  if (!e.alive) return false;
  e.health -= dmg; e.hitT = .25; spawnImpact(point, true);
  if (e.type === 'shooter' && e.kb && !(e.dodgeCd > performance.now())) { e.dodgeCd = performance.now() + 1200; const kx = e.pos.x - P.pos.x, kz = e.pos.z - P.pos.z, kl = Math.hypot(kx, kz) || 1, s = Math.random() < .5 ? 1 : -1; e.kb.x += -kz / kl * s * 7; e.kb.y += kx / kl * s * 7; e.strafe = s; }
  if (e.kb) { const kx = e.pos.x - P.pos.x, kz = e.pos.z - P.pos.z, kl = Math.hypot(kx, kz) || 1, f = Math.min(9, dmg * .25) * (e.type === 'rusher' ? 1.3 : 1); e.kb.x += kx / kl * f; e.kb.y += kz / kl * f; e.hitDir = new THREE.Vector2(kx / kl, kz / kl); }
  if (e.health <= 0) { e.alive = false; e.health = 0; score += e.type === 'rusher' ? 100 : 150; sfx.death(); return true; }
  return false;
}

// ---------- shooting ----------
const ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3(), _hit = new THREE.Vector3(), _mz = new THREE.Vector3();
function rayBoxes(o, d, maxT) {
  let best = maxT;
  for (const s of solids) {
    let t0 = 0, t1 = best, ok = true;
    for (const ax of ['x', 'y', 'z']) {
      if (Math.abs(d[ax]) < 1e-8) { if (o[ax] < s.min[ax] || o[ax] > s.max[ax]) { ok = false; break; } continue; }
      let a = (s.min[ax] - o[ax]) / d[ax], b = (s.max[ax] - o[ax]) / d[ax]; if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 < best) best = t0;
  }
  if (d.y < 0) { const tf = -o.y / d.y; if (tf < best) best = tf; }
  return best;
}
function rayEnemy(o, d, maxT) { // capsule approx via sphere segments
  let best = maxT, hitE = null;
  for (const e of enemies) {
    if (!e.alive) continue;
    const top = e.type === 'rusher' ? 1.8 : 2.2;
    for (let y = .5; y <= top; y += .45) {
      _v.set(e.pos.x, y, e.pos.z).sub(o); const tc = _v.dot(d); if (tc < 0 || tc > best) continue;
      const d2 = _v.lengthSq() - tc * tc, r = .42; if (d2 < r * r) { const t = tc - Math.sqrt(r * r - d2); if (t < best) { best = t; hitE = e; } }
    }
  }
  return [best, hitE];
}
let hitmarkT = 0, killMark = false;
function shoot() {
  const w = W[weapon];
  if (reloading > 0 || switchT > 0 || fireCd > 0) return false;
  if (w.mag <= 0) { fireCd = .25; sfx.empty(); if (w.reserve > 0) startReload(); return; }
  w.mag--; fireCd = w.rate;
  camera.getWorldPosition(_o);
  let anyHit = false, anyKill = false;
  const vm = vms[weapon]; _mz.copy(vm.userData.muzzle); vm.localToWorld(_mz);
  for (let i = 0; i < w.pellets; i++) {
    const sp = w.spread + spreadBloom + (P.onGround ? 0 : .03) + (Math.hypot(P.vel.x, P.vel.z) > 6 ? .015 : 0);
    _d.set((Math.random() - .5) * 2 * sp, (Math.random() - .5) * 2 * sp, -1).normalize().applyQuaternion(camera.quaternion);
    const tw = rayBoxes(_o, _d, 150); const [te, e] = rayEnemy(_o, _d, tw);
    _hit.copy(_o).addScaledVector(_d, Math.min(te, tw));
    if (e) { anyHit = true; if (damageEnemy(e, w.dmg, _hit)) anyKill = true; } else if (tw < 150) spawnImpact(_hit);
    if (i < 3 || Math.random() < .5) spawnTracer(_mz, _hit);
  }
  if (anyHit) { hitmarkT = .15; killMark = anyKill; anyKill ? sfx.kill() : sfx.hit(); }
  spreadBloom = Math.min(.05, spreadBloom + (weapon === 'rifle' ? .006 : 0));
  { const rk = w.recoil * (0.7 + Math.random() * .6); P.pitch = Math.min(1.5, P.pitch + rk); recoilAcc += rk; } P.yaw += (Math.random() - .5) * w.recoil * .5;
  recoilKick = 1; flashT = .07; flash.visible = true; vm.add(flash); flash.position.copy(vm.userData.muzzle); flash.rotation.z = Math.random() * 6;
  flash.scale.setScalar((weapon === "shotgun" ? 1.3 : .8) * (.8 + Math.random() * .4));
  weapon === 'rifle' ? sfx.rifle() : (sfx.shotgun(), sfx.pump());
}
function startReload() {
  const w = W[weapon]; if (reloading > 0 || w.mag >= w.magSize || w.reserve <= 0 || switchT > 0) return;
  reloading = w.reload; sfx.reload();
}
function finishReload() { const w = W[weapon], n = Math.min(w.magSize - w.mag, w.reserve); w.mag += n; w.reserve -= n; }
function switchWeapon(name) {
  if (name === weapon || state.mode !== 'playing') return; weapon = name; reloading = 0; switchT = .35;
  for (const k in vms) vms[k].visible = k === weapon; sfx.pump();
}

// ---------- game state ----------
const state = { mode: 'menu' };
let wave = 0, score = 0, waveSpawning = true, godMode = false, simPaused = false, breakT = 0, toSpawn = [], spawnT = 0;
const spawnPoints = [[-26, -8], [26, 8], [-8, 26], [8, -26], [-20, 27], [20, -27], [0, -27], [0, 27], [-27, 0], [27, 0]];
function waveComp(n) { return { rusher: 2 + n * 2, shooter: n === 1 ? 1 : n + 1 }; }
function beginWave(n) {
  wave = n; const c = waveComp(n); toSpawn = [];
  for (let i = 0; i < c.rusher; i++) toSpawn.push('rusher'); for (let i = 0; i < c.shooter; i++) toSpawn.push('shooter');
  toSpawn.sort(() => Math.random() - .5); spawnT = .5; banner(`WAVE ${n}`); sfx.wave();
}
function banner(text, dur = 2) { const b = $('banner'); b.textContent = text; b.style.opacity = 1; clearTimeout(banner.t); banner.t = setTimeout(() => b.style.opacity = 0, dur * 1000); }
function resetRun() {
  for (const e of enemies) scene.remove(e.rig.g); enemies.length = 0;
  for (const p of projectiles) { p.life = 0; p.m.visible = false; }
  P.pos.set(0, 0, 22); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0; P.health = 100;
  W.rifle.mag = 30; W.rifle.reserve = 90; W.shotgun.mag = 6; W.shotgun.reserve = 24;
  weapon = 'rifle'; for (const k in vms) vms[k].visible = k === weapon; reloading = 0; switchT = 0; fireCd = 0;
  score = 0; wave = 0; breakT = 0; toSpawn = []; for (const k in input) input[k] = false;
  if (waveSpawning) beginWave(1);
}
function startGame() { audio(); resetRun(); setMode('playing'); lockPointer(); }
function setMode(m) {
  state.mode = m;
  $('menu').classList.toggle('hidden', m !== 'menu'); $('pause').classList.toggle('hidden', m !== 'paused');
  $('over').classList.toggle('hidden', m !== 'gameover' && m !== 'victory'); $('settings').classList.add('hidden');
  $('hud').classList.toggle('hidden', m === 'menu');
  if (m === 'gameover' || m === 'victory') {
    $('overTitle').textContent = m === 'victory' ? 'VICTORY' : 'YOU DIED';
    $('overText').textContent = m === 'victory' ? `All 5 waves cleared. Score ${score}` : `Fell on wave ${wave}. Score ${score}`;
    document.exitPointerLock?.();
  }
}
const dmgEls = [];
function damagePlayer(amount, from) {
  if (godMode || state.mode !== 'playing') return;
  P.health = Math.max(0, P.health - amount); sfx.hurt(); vignetteT = .5;
  const ang = Math.atan2(from.x - P.pos.x, from.z - P.pos.z); // world angle
  const el = document.createElement('div'); el.className = 'dd'; $('dmgdirs').appendChild(el); dmgEls.push({ el, ang, t: 1.2 });
  if (P.health <= 0) setMode('gameover');
}
let vignetteT = 0;
function updateWaves(dt) {
  if (!waveSpawning || state.mode !== 'playing') return;
  if (toSpawn.length) {
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = Math.max(.35, 1.2 - wave * .15);
      let best = null, bd = -1; for (let k = 0; k < 4; k++) { const sp = spawnPoints[Math.random() * spawnPoints.length | 0], dd = Math.hypot(sp[0] - P.pos.x, sp[1] - P.pos.z); if (dd > bd) { bd = dd; best = sp; } }
      spawnEnemy(toSpawn.pop(), best[0] + (Math.random() - .5) * 2, 0, best[1] + (Math.random() - .5) * 2);
    }
  } else if (!enemies.some(e => e.alive)) {
    if (breakT <= 0) { breakT = 5; if (wave >= 5) { setMode('victory'); return; } banner(`WAVE ${wave} CLEAR`, 2.5); P.health = Math.min(100, P.health + 25); W.rifle.reserve = Math.min(180, W.rifle.reserve + 30); W.shotgun.reserve = Math.min(36, W.shotgun.reserve + 8); }
    breakT -= dt; if (breakT <= 0) beginWave(wave + 1);
  }
}

// ---------- input ----------
const canvas = renderer.domElement;
function lockPointer() { if (!window.__hookDriven) canvas.requestPointerLock?.()?.catch?.(() => {}); }
function look(dx, dy) { const k = .0022 * settings.sens; P.yaw -= dx * k; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - dy * k)); }
document.addEventListener('mousemove', e => { if (document.pointerLockElement === canvas && state.mode === 'playing') look(e.movementX, e.movementY); });
canvas.addEventListener('mousedown', e => { if (state.mode === 'playing') { if (document.pointerLockElement !== canvas) lockPointer(); if (e.button === 0) input.fire = true; } });
addEventListener('mouseup', e => { if (e.button === 0) input.fire = false; });
addEventListener('wheel', e => { if (state.mode === 'playing') switchWeapon(weapon === 'rifle' ? 'shotgun' : 'rifle'); });
const keyMap = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', ArrowUp: 'forward', ArrowDown: 'back' };
function pressKey(k) {
  k = k.toLowerCase();
  if (k === 'escape') { if (state.mode === 'playing') pauseGame(); else if (state.mode === 'paused') resumeGame(); return; }
  if (state.mode !== 'playing') return;
  if (k === 'r') startReload(); else if (k === '1') switchWeapon('rifle'); else if (k === '2') switchWeapon('shotgun');
}
addEventListener('keydown', e => { if (keyMap[e.code]) { input[keyMap[e.code]] = true; e.preventDefault(); } else if (!e.repeat && e.key !== 'Escape') pressKey(e.key); });
addEventListener('keyup', e => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && state.mode === 'playing' && !window.__hookDriven) pauseGame(); });
function pauseGame() { setMode('paused'); for (const k in input) input[k] = false; document.exitPointerLock?.(); }
function resumeGame() { setMode('playing'); lockPointer(); }
$('btnPlay').onclick = startGame; $('btnRestart').onclick = startGame; $('btnResume').onclick = resumeGame;
$('btnQuit').onclick = $('btnMenu').onclick = () => { resetRun(); setMode('menu'); };
let settingsFrom = 'menu';
$('btnSettings').onclick = () => { settingsFrom = 'menu'; $('menu').classList.add('hidden'); $('settings').classList.remove('hidden'); };
$('btnSettings2').onclick = () => { settingsFrom = 'pause'; $('pause').classList.add('hidden'); $('settings').classList.remove('hidden'); };
$('btnBack').onclick = () => { $('settings').classList.add('hidden'); $(settingsFrom).classList.remove('hidden'); };
function applySettings() {
  $('sens').value = settings.sens; $('vol').value = settings.vol; $('sensVal').textContent = (+settings.sens).toFixed(2); $('volVal').textContent = Math.round(settings.vol * 100) + '%';
  if (master) master.gain.value = settings.vol; try { localStorage.setItem('arena-settings', JSON.stringify(settings)); } catch (e) {}
}
$('sens').oninput = e => { settings.sens = +e.target.value; applySettings(); };
$('vol').oninput = e => { settings.vol = +e.target.value; audio(); applySettings(); sfx.hit(); };
applySettings();

// ---------- HUD ----------
const hud = { hp: $('hpnum'), hpbar: $('hpbar'), mag: $('mag'), res: $('reserve'), wname: $('wname'), wave: $('wave'), score: $('score'), alive: $('alive'), hm: $('hitmarker'), vig: $('vignette'), rb: $('reloadbar'), rbi: $('reloadbar').firstChild, s1: $('s1'), s2: $('s2') };
const last = {};
function setText(k, v) { if (last[k] !== v) { last[k] = v; hud[k].textContent = v; } }
function updateHud(dt) {
  const w = W[weapon];
  setText('hp', Math.ceil(P.health)); setText('mag', w.mag); setText('res', w.reserve); setText('wname', w.name); setText('wave', Math.max(1, wave)); setText('score', score);
  setText('alive', enemies.filter(e => e.alive).length + toSpawn.length);
  if (last.hpw !== P.health) { last.hpw = P.health; hud.hpbar.style.width = P.health + '%'; hud.hpbar.style.background = P.health < 30 ? '#ff4a3a' : ''; }
  hud.s1.className = weapon === 'rifle' ? 'on' : ''; hud.s2.className = weapon === 'shotgun' ? 'on' : '';
  if (last.wk !== weapon) { last.wk = weapon; $('ammobox').dataset.w = weapon; }
  const lowHp = P.health < 30; if (last.low !== lowHp) { last.low = lowHp; $('hud').classList.toggle('lowhp', lowHp); }
  const lowAmmo = w.mag <= Math.ceil((w.magSize || w.max || 30) * .25); if (last.la !== lowAmmo) { last.la = lowAmmo; $('ammobox').classList.toggle('low', lowAmmo); }
  hitmarkT -= dt; hud.hm.style.opacity = hitmarkT > 0 ? 1 : 0; hud.hm.className = killMark ? 'kill' : '';
  vignetteT -= dt; hud.vig.style.opacity = Math.max(0, vignetteT * 2) + (P.health < 30 ? .35 : 0);
  hud.rb.style.opacity = reloading > 0 ? 1 : 0; if (reloading > 0) hud.rbi.style.width = (1 - reloading / w.reload) * 100 + '%';
  const gap = 8 + (spreadBloom + (weapon === 'shotgun' ? .06 : 0)) * 250 + recoilKick * 4;
  const ch = $('crosshair').children; ch[0].style.top = -gap - 8 + 'px'; ch[1].style.top = gap + 'px'; ch[2].style.left = -gap - 8 + 'px'; ch[3].style.left = gap + 'px';
  for (let i = dmgEls.length - 1; i >= 0; i--) {
    const d = dmgEls[i]; d.t -= dt; if (d.t <= 0) { d.el.remove(); dmgEls.splice(i, 1); continue; }
    const rel = d.ang - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
    d.el.style.transform = `rotate(${-rel}rad)`; d.el.style.opacity = Math.min(1, d.t);
  }
}

// ---------- main loop ----------
const clock = new THREE.Clock(); let bobT = 0;
function update(dt, t) {
  if (state.mode === 'playing' && !simPaused) {
    updatePlayer(dt);
    fireCd -= dt; { const rr = recoilAcc * Math.min(1, 7 * dt); P.pitch -= rr; recoilAcc -= rr; } spreadBloom = Math.max(0, spreadBloom - dt * .08);
    if (switchT > 0) switchT -= dt;
    if (reloading > 0) { reloading -= dt; if (reloading <= 0) { reloading = 0; finishReload(); } }
    const w = W[weapon];
    if (input.fire) { if ((w.auto || !firedLatch) && shoot() !== false) firedLatch = true; } else firedLatch = false;
    if (flowTimer <= 0) { buildFlow(P.pos.x, P.pos.z); flowTimer = .3; } flowTimer -= dt;
    updateEnemies(dt, t); updateWaves(dt);
    for (const l of tracerPool) if (l.visible) { l.userData.t -= Math.min(dt, .025); if (l.userData.t <= 0) l.visible = false; }
    for (const m of impactPool) if (m.visible) { m.userData.t -= dt; m.scale.setScalar(Math.max(.01, m.userData.t * 4)); if (m.userData.t <= 0) m.visible = false; }
  }
  core.rotation.y += dt; core.position.y = 6 + Math.sin(t) * .3;
  // camera
  camera.position.set(P.pos.x, P.pos.y + 1.6, P.pos.z);
  camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  // viewmodel anim
  const hs = Math.hypot(P.vel.x, P.vel.z); if (P.onGround) bobT += dt * hs * 1.6;
  const bob = Math.min(1, hs / 5);
  recoilKick = Math.max(0, recoilKick - dt * 10);
  const vm = vms[weapon];
  let rx = 0, py = 0;
  if (reloading > 0) { const k = 1 - reloading / W[weapon].reload, s = Math.sin(k * Math.PI); rx = -s * .7; py = -s * .12; vm.userData.mag.position.y = (weapon === 'rifle' ? -.1 : -.03) - s * (weapon === 'rifle' ? .15 : 0); if (weapon === 'shotgun') vm.userData.pump.position.z = vm.userData.pumpZ + Math.abs(Math.sin(k * Math.PI * 6)) * .06; }
  else if (weapon === 'shotgun') vm.userData.pump.position.z = vm.userData.pumpZ + (fireCd > .2 && fireCd < .6 ? .08 : 0);
  if (switchT > 0) py -= switchT * .8;
  vm.position.set(Math.cos(bobT) * .012 * bob, Math.abs(Math.sin(bobT)) * .014 * bob + py + (vm.userData.oy || 0) - (P.onGround ? 0 : .02), recoilKick * (weapon === 'shotgun' ? .12 : .06));
  vm.rotation.set(rx + recoilKick * (weapon === 'shotgun' ? .24 : .12), 0, reloading > 0 ? -rx * .4 : 0);
  if (flashT > 0) { if (!simPaused) flashT -= Math.min(dt, .025); flashLight.intensity = 30; } else { flash.visible = false; flashLight.intensity = 0; }
  if (state.mode === 'playing') updateHud(dt);
}
let flowTimer = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  update(dt, clock.elapsedTime);
  renderer.render(scene, camera);
}
buildFlow(0, 20);
frame();

// ---------- test hook ----------
window.__game = {
  start() { window.__hookDriven = true; audio(); resetRun(); setMode('playing'); },
  getState() { const w = W[weapon]; return { mode: state.mode, wave, health: P.health, weapon, ammo: w.mag, reserve: w.reserve, score, enemiesAlive: enemies.filter(e => e.alive).length, playerPos: [P.pos.x, P.pos.y, P.pos.z], yaw: P.yaw, pitch: P.pitch }; },
  setInput(o) { for (const k in o) if (k in input) input[k] = !!o[k]; },
  look, pressKey(k) { if (k === 'Escape' || k === 'escape') { window.__hookDriven = true; } pressKey(k); },
  setPlayerPose(x, y, z, yaw = P.yaw, pitch = P.pitch) { P.pos.set(x, y, z); P.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = pitch; },
  spawnEnemy(type, x, y, z) { const id = spawnEnemy(type, x, y, z); enemies[enemies.length - 1].spawnT = 0; enemies[enemies.length - 1].rig.g.scale.setScalar(1); return id; },
  getEnemies() { return enemies.map(e => ({ id: e.id, type: e.type, health: e.health, pos: [e.pos.x, e.pos.y, e.pos.z], alive: e.alive })); },
  setPaused(b) { simPaused = !!b; },
  setGodMode(b) { godMode = !!b; },
  setWaveSpawning(b) { waveSpawning = !!b; if (!b) toSpawn = []; else if (state.mode === 'playing' && wave === 0) beginWave(1); },
};
