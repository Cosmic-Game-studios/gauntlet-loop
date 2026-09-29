// Arena - core: renderer, arena, controller, weapons, HUD, menus, waves, test hook.
import * as THREE from 'three';
import { createEnemySystem } from './enemies.js';
import { createAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const audio = createAudio();

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x6a4a44, 30, 95);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';

// sky gradient dome
{
  const g = new THREE.SphereGeometry(150, 24, 12);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x1d2a48) }, mid: { value: new THREE.Color(0xd9774a) }, bot: { value: new THREE.Color(0x3a2826) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h>0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0),0.7)) : mix(mid, bot, clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0);}',
  });
  const sky = new THREE.Mesh(g, m); sky.frustumCulled = false; scene.add(sky);
}

const hemi = new THREE.HemisphereLight(0xffc9a0, 0x3a3040, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffa46b, 2.6);
sun.position.set(-30, 40, -20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 5; sc.far = 110;
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun);

// ---------- procedural textures ----------
function concreteTex(base, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const v = rnd(); x.fillStyle = v > 0.5 ? `rgba(255,235,210,${rnd() * 0.08})` : `rgba(30,20,15,${rnd() * 0.1})`;
    x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  x.strokeStyle = 'rgba(40,28,22,0.35)'; x.lineWidth = 2;
  x.strokeRect(1, 1, 254, 254); x.beginPath(); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke();
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(40,28,22,0.25)'; x.beginPath(); x.arc(32 + (i % 3) * 96, 64 + Math.floor(i / 3) * 128, 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const wallTex = concreteTex('#a88f7a', 7);
const floorTex = concreteTex('#8a7563', 13); floorTex.repeat.set(15, 15);

// ---------- arena ----------
const colliders = [];
const BOUNDS = { minX: -29, maxX: 29, minZ: -29, maxZ: 29 };
const boxDefs = []; // [cx, cy(bottom), cz, w, h, d, kind]
function addBox(cx, y0, cz, w, h, d, kind = 0) { boxDefs.push([cx, y0, cz, w, h, d, kind]); colliders.push(new THREE.Box3(new THREE.Vector3(cx - w / 2, y0, cz - d / 2), new THREE.Vector3(cx + w / 2, y0 + h, cz + d / 2))); }
// floor collider (thick slab below 0)
colliders.push(new THREE.Box3(new THREE.Vector3(-40, -2, -40), new THREE.Vector3(40, 0, 40)));
// perimeter walls
addBox(0, 0, -30.5, 62, 6, 1); addBox(0, 0, 30.5, 62, 6, 1); addBox(-30.5, 0, 0, 1, 6, 62); addBox(30.5, 0, 0, 1, 6, 62);
// raised platforms (1.5 m) with steps
function platform(cx, cz, w, d, stepDir) {
  addBox(cx, 0, cz, w, 1.5, d, 1);
  for (let i = 0; i < 3; i++) {
    const h = 0.5 * (i + 1), len = 1;
    if (stepDir === 'z+') addBox(cx, 0, cz + d / 2 + (3 - i) - 0.5, 3, h, len, 2);
    if (stepDir === 'z-') addBox(cx, 0, cz - d / 2 - (3 - i) + 0.5, 3, h, len, 2);
    if (stepDir === 'x+') addBox(cx + w / 2 + (3 - i) - 0.5, 0, cz, len, h, 3, 2);
    if (stepDir === 'x-') addBox(cx - w / 2 - (3 - i) + 0.5, 0, cz, len, h, 3, 2);
  }
}
platform(-18, -18, 8, 8, 'z+'); platform(18, 18, 8, 8, 'z-'); platform(18, -18, 8, 6, 'x-'); platform(-18, 18, 8, 6, 'x+');
// central raised dais (0.5) + central low cover ring
addBox(0, 0, 0, 6, 0.35, 6, 1);
addBox(0, 0.35, -2.2, 3, 1.1, 0.6); addBox(0, 0.35, 2.2, 3, 1.1, 0.6);
// cover blocks
addBox(-8, 0, -4, 4, 1.3, 1); addBox(8, 0, 4, 4, 1.3, 1); addBox(-4, 0, 9, 1, 1.3, 4); addBox(4, 0, -9, 1, 1.3, 4);
addBox(-12, 0, 6, 2, 2.2, 2); addBox(12, 0, -6, 2, 2.2, 2); addBox(0, 0, 16, 6, 1.2, 1); addBox(0, 0, -16, 6, 1.2, 1);
addBox(-22, 0, 0, 1, 1.3, 5); addBox(22, 0, 0, 1, 1.3, 5); addBox(-10, 0, -22, 3, 1.3, 1); addBox(10, 0, 22, 3, 1.3, 1);
// pillars
addBox(-9, 0, -12, 1.4, 6, 1.4, 3); addBox(9, 0, 12, 1.4, 6, 1.4, 3); addBox(-12, 0, 14, 1.4, 6, 1.4, 3); addBox(12, 0, -14, 1.4, 6, 1.4, 3);

// Merge all boxes into one geometry with world-scaled UVs (1 draw call).
function buildMerged(defs) {
  const pos = [], nor = [], uv = [], idx = [];
  const faces = [ // normal, u axis, v axis
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  for (const [cx, y0, cz, w, h, d] of defs) {
    const c = [cx, y0 + h / 2, cz], hs = [w / 2, h / 2, d / 2];
    for (const [n, u, v] of faces) {
      const base = pos.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = [0, 0, 0];
        for (let k = 0; k < 3; k++) p[k] = c[k] + (n[k] + u[k] * su + v[k] * sv) * hs[k];
        pos.push(...p); nor.push(...n);
        uv.push((p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) / 4, (p[0] * v[0] + p[1] * v[1] + p[2] * v[2]) / 4);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeBoundingSphere();
  return g;
}
const concreteMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.9, metalness: 0.02 });
const arenaMesh = new THREE.Mesh(buildMerged(boxDefs), concreteMat);
arenaMesh.castShadow = arenaMesh.receiveShadow = true; scene.add(arenaMesh);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, color: 0xd8c8b8 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// emissive trim: thin strips on top edges of every non-wall box (teal on platforms, orange on cover)
{
  const tealDefs = [], orangeDefs = [];
  boxDefs.forEach(([cx, y0, cz, w, h, d, kind], i) => {
    const t = 0.08;
    const list = (kind === 1 || kind === 3 || i < 4) ? tealDefs : orangeDefs;
    if (kind === 2) return;
    if (i < 4) { list.push([cx, 5.2, cz, w + 0.02, 0.12, d + 0.02]); return; }
    if (kind === 3) { list.push([cx, 2.4, cz, w + 0.04, 0.12, d + 0.04]); list.push([cx, 4.2, cz, w + 0.04, 0.12, d + 0.04]); return; }
    // four thin edge strips around the top rim (not a full-top slab)
    const yt = y0 + h - t, e = 0.07;
    list.push([cx, yt, cz - d / 2, w + 0.04, t, e], [cx, yt, cz + d / 2, w + 0.04, t, e]);
    list.push([cx - w / 2, yt, cz, e, t, d + 0.04], [cx + w / 2, yt, cz, e, t, d + 0.04]);
  });
  const tm = new THREE.Mesh(buildMerged(tealDefs), new THREE.MeshStandardMaterial({ color: 0x113030, emissive: 0x3fe0d8, emissiveIntensity: 1.6 }));
  const om = new THREE.Mesh(buildMerged(orangeDefs), new THREE.MeshStandardMaterial({ color: 0x301808, emissive: 0xff7a2a, emissiveIntensity: 1.6 }));
  scene.add(tm, om);
  // floor guide lines
  const lines = [[0, -0.0, 0, 0.15, 0.02, 40], [0, 0, 0, 40, 0.02, 0.15]];
  const lm = new THREE.Mesh(buildMerged(lines), new THREE.MeshStandardMaterial({ color: 0x102020, emissive: 0x2aa8a2, emissiveIntensity: 0.6 }));
  lm.position.y = 0.005; scene.add(lm);
}
const SPAWNS = [[-26, -26], [0, -27], [26, -26], [27, 0], [26, 26], [0, 27], [-26, 26], [-27, 0], [-14, -27], [14, 27], [27, -12], [-27, 12]].map(([x, z]) => new THREE.Vector3(x, 0, z));

// ---------- enemies ----------
const V = () => new THREE.Vector3();
const _dmgFrom = V();
const enemies = createEnemySystem({
  THREE, scene, colliders, bounds: BOUNDS, audio,
  onPlayerHit: (dmg, fromPos) => playerHurt(dmg, fromPos),
  onEnemyKilled: (type) => { G.score += type === 'shooter' ? 150 : 100; },
  onEnemyHurt: () => {},
});

// ---------- game state ----------
const G = {
  mode: 'menu', wave: 0, score: 0, health: 100, god: false, waveSpawning: true, paused: false,
  waveState: 'idle', waveTimer: 0, toSpawn: 0, spawnTimer: 0, shooterFrac: 0,
};
const settings = { sens: 1, vol: 0.7 };
try { const s = JSON.parse(localStorage.getItem('arena.settings') || 'null'); if (s) Object.assign(settings, s); } catch (e) { /* ignore */ }
audio.setMasterVolume(settings.vol);

// ---------- player ----------
const P = {
  pos: new THREE.Vector3(0, 0.5, 6), vel: V(), yaw: 0, pitch: 0, onGround: false,
  radius: 0.4, height: 1.8, eye: 1.6, stepT: 0, bobT: 0, landV: 0,
};
const input = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
const hookInput = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
const keys = {};
const _pbox = new THREE.Box3(), _v1 = V(), _v2 = V(), _v3 = V(), _eye = V(), _dir = V(), _fwd = V(), _right = V();

function setPBox(p) { _pbox.min.set(p.x - P.radius, p.y, p.z - P.radius); _pbox.max.set(p.x + P.radius, p.y + P.height, p.z + P.radius); }
function collideAxis(axis, delta) {
  const p = P.pos;
  p[axis] += delta;
  setPBox(p);
  for (let i = 0; i < colliders.length; i++) {
    const b = colliders[i];
    if (!_pbox.intersectsBox(b)) continue;
    // touching exactly counts in intersectsBox; require real overlap
    if (_pbox.max.x <= b.min.x + 1e-5 || _pbox.min.x >= b.max.x - 1e-5 || _pbox.max.y <= b.min.y + 1e-5 || _pbox.min.y >= b.max.y - 1e-5 || _pbox.max.z <= b.min.z + 1e-5 || _pbox.min.z >= b.max.z - 1e-5) continue;
    if (axis === 'y') {
      if (delta <= 0) { p.y = b.max.y; if (P.vel.y < 0) { P.landV = P.vel.y; P.vel.y = 0; } P.onGround = true; }
      else { p.y = b.min.y - P.height; if (P.vel.y > 0) P.vel.y = 0; }
    } else {
      // step up
      const rise = b.max.y - p.y;
      if (rise > 0 && rise <= 0.55 && P.groundedRecently) {
        const oy = p.y; p.y = b.max.y + 0.001; setPBox(p);
        let free = true;
        for (let j = 0; j < colliders.length; j++) { const c = colliders[j]; if (_pbox.intersectsBox(c) && !(_pbox.max.y <= c.min.y + 1e-5 || _pbox.min.y >= c.max.y - 1e-5 || _pbox.max.x <= c.min.x + 1e-5 || _pbox.min.x >= c.max.x - 1e-5 || _pbox.max.z <= c.min.z + 1e-5 || _pbox.min.z >= c.max.z - 1e-5)) { free = false; break; } }
        if (free) continue;
        p.y = oy; setPBox(p);
      }
      const other = axis === 'x' ? 'x' : 'z';
      if (delta > 0) p[other] = b.min[other] - P.radius - 1e-4; else p[other] = b.max[other] + P.radius + 1e-4;
      P.vel[other] = 0;
      setPBox(p);
    }
  }
}

function updatePlayer(dt) {
  const inp = input;
  const f = (inp.forward || hookInput.forward ? 1 : 0) - (inp.back || hookInput.back ? 1 : 0);
  const s = (inp.right || hookInput.right ? 1 : 0) - (inp.left || hookInput.left ? 1 : 0);
  const sprint = inp.sprint || hookInput.sprint;
  _fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  _right.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  _v1.set(0, 0, 0).addScaledVector(_fwd, f).addScaledVector(_right, s);
  if (_v1.lengthSq() > 0) _v1.normalize();
  const speed = sprint && f > 0 ? 9.5 : 6;
  const accel = P.onGround ? 60 : 14;
  const tx = _v1.x * speed, tz = _v1.z * speed;
  P.vel.x += THREE.MathUtils.clamp(tx - P.vel.x, -accel * dt, accel * dt);
  P.vel.z += THREE.MathUtils.clamp(tz - P.vel.z, -accel * dt, accel * dt);
  if ((inp.jump || hookInput.jump) && P.onGround) { P.vel.y = 6.2; P.onGround = false; audio.play('jump'); }
  P.vel.y -= 20 * dt;
  if (P.vel.y < -40) P.vel.y = -40;
  const wasGround = P.onGround;
  P.groundedRecently = wasGround;
  P.onGround = false; P.landV = 0;
  // sub-step so no step exceeds ~0.2 m
  const maxD = Math.max(Math.abs(P.vel.x), Math.abs(P.vel.y), Math.abs(P.vel.z)) * dt;
  const n = Math.min(8, Math.max(1, Math.ceil(maxD / 0.2)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    collideAxis('x', P.vel.x * h);
    collideAxis('z', P.vel.z * h);
    collideAxis('y', P.vel.y * h);
  }
  if (P.pos.y < 0) { P.pos.y = 0; P.vel.y = 0; P.onGround = true; }
  P.pos.x = THREE.MathUtils.clamp(P.pos.x, -29.5, 29.5); P.pos.z = THREE.MathUtils.clamp(P.pos.z, -29.5, 29.5);
  if (!wasGround && P.onGround && P.landV < -7) audio.play('land');
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && hs > 1) {
    P.bobT += dt * hs * 1.25; P.stepT += dt * hs;
    if (P.stepT > 2.4) { P.stepT = 0; audio.play('footstep', { volume: 0.5 }); }
  }
}

// ---------- weapons ----------
const WEAPONS = {
  rifle: { name: 'rifle', mag: 30, reserveMax: 90, rate: 0.095, reload: 1.6, dmg: 20, pellets: 1, spread: 0.012, spreadMove: 0.03, recoil: 0.012, auto: true, sound: 'rifle', range: 150 },
  shotgun: { name: 'shotgun', mag: 6, reserveMax: 24, rate: 0.85, reload: 2.2, dmg: 12, pellets: 8, spread: 0.075, spreadMove: 0.085, recoil: 0.06, auto: false, sound: 'shotgun', range: 60 },
};
const W = { cur: 'rifle', state: {}, cool: 0, reloadT: 0, reloading: false, kick: 0, heat: 0, switchT: 0, firedHeld: false, pumpPending: 0 };
function resetWeapons() {
  W.state.rifle = { ammo: 30, reserve: 90 };
  W.state.shotgun = { ammo: 6, reserve: 24 };
  W.cur = 'rifle'; W.cool = 0; W.reloading = false; W.reloadT = 0; W.kick = 0; W.heat = 0; W.switchT = 0; W.pumpPending = 0; W.autoReload = 0; W.firedHeld = false;
}
resetWeapons();
function switchWeapon(name) {
  if (name === W.cur || G.mode !== 'playing') return;
  W.cur = name; W.reloading = false; W.switchT = 0.35; W.cool = Math.max(W.cool, 0.25); W.pumpPending = 0;
  audio.play('uiClick', { volume: 0.4 });
}
function startReload() {
  const def = WEAPONS[W.cur], st = W.state[W.cur];
  if (W.reloading || st.ammo >= def.mag || st.reserve <= 0) return;
  W.reloading = true; W.reloadT = def.reload; audio.play('reload');
}

// world raycast vs colliders
const _ray = new THREE.Ray(), _hitP = V(), _bestN = V();
function rayWorld(origin, dir, maxD, outPoint, outNormal) {
  _ray.origin.copy(origin); _ray.direction.copy(dir);
  let best = maxD, found = false;
  for (let i = 0; i < colliders.length; i++) {
    const b = colliders[i];
    if (!_ray.intersectBox(b, _hitP)) continue;
    const d = _hitP.distanceTo(origin);
    if (d < best) {
      best = d; found = true; outPoint.copy(_hitP);
      // normal: axis with nearest face
      const eps = 0.002;
      if (Math.abs(_hitP.x - b.min.x) < eps) outNormal.set(-1, 0, 0); else if (Math.abs(_hitP.x - b.max.x) < eps) outNormal.set(1, 0, 0);
      else if (Math.abs(_hitP.y - b.max.y) < eps) outNormal.set(0, 1, 0); else if (Math.abs(_hitP.y - b.min.y) < eps) outNormal.set(0, -1, 0);
      else if (Math.abs(_hitP.z - b.min.z) < eps) outNormal.set(0, 0, -1); else outNormal.set(0, 0, 1);
    }
  }
  return found ? best : -1;
}

const _shotDir = V(), _wp = V(), _wn = V(), _muzzleW = V(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function fire() {
  const def = WEAPONS[W.cur], st = W.state[W.cur];
  if (W.cool > 0 || W.reloading || W.switchT > 0) return false;
  if (st.ammo <= 0) {
    W.cool = 0.25; audio.play('dryfire');
    if (st.reserve > 0) startReload();
    return true;
  }
  st.ammo--; W.cool = def.rate;
  audio.play(def.sound);
  if (W.cur === 'shotgun') W.pumpPending = 0.35;
  camera.getWorldPosition(_eye);
  const hs = Math.hypot(P.vel.x, P.vel.z);
  const spread = def.spread + (hs > 1 ? def.spreadMove * Math.min(1, hs / 6) : 0) + (P.onGround ? 0 : 0.03) + (W.cur === 'rifle' ? W.heat * 0.02 : 0);
  // muzzle world pos (approx, right-down of eye)
  _muzzleW.set(0.18, -0.14, -0.6).applyQuaternion(camera.quaternion).add(_eye);
  let anyHit = false, killed = false;
  for (let p = 0; p < def.pellets; p++) {
    _e.set(P.pitch + (Math.random() - 0.5) * 2 * spread, P.yaw + (Math.random() - 0.5) * 2 * spread, 0, 'YXZ');
    _shotDir.set(0, 0, -1).applyEuler(_e).normalize();
    const wd = rayWorld(_eye, _shotDir, def.range, _wp, _wn);
    const eh = enemies.raycast(_eye, _shotDir, wd >= 0 ? wd : def.range);
    let endD;
    if (eh && (wd < 0 || eh.distance < wd)) {
      endD = eh.distance; anyHit = true;
      if (enemies.damage(eh.id, def.dmg, eh.point, _shotDir)) killed = true;
      spawnSpark(eh.point, 0xff5a3a);
    } else if (wd >= 0) {
      endD = wd; spawnDecal(_wp, _wn); spawnSpark(_wp, 0xffc070);
    } else endD = def.range;
    _v3.copy(_eye).addScaledVector(_shotDir, endD);
    if (p < 4) spawnTracer(_muzzleW, _v3);
  }
  if (anyHit) { hitMarker(killed); audio.play('hitmarker'); }
  // recoil
  W.kick = 1;
  P.pitch = Math.min(1.5, P.pitch + def.recoil * (0.7 + Math.random() * 0.6));
  P.yaw += (Math.random() - 0.5) * def.recoil * 0.5;
  W.heat = Math.min(1, W.heat + 0.12);
  flashT = 0.05;
  if (st.ammo === 0 && st.reserve > 0) W.autoReload = 0.3;
  return true;
}

function updateWeapons(dt) {
  const def = WEAPONS[W.cur], st = W.state[W.cur];
  W.cool = Math.max(0, W.cool - dt); W.switchT = Math.max(0, W.switchT - dt);
  W.kick = Math.max(0, W.kick - dt * 8); W.heat = Math.max(0, W.heat - dt * 1.5);
  if (W.pumpPending > 0) { W.pumpPending -= dt; if (W.pumpPending <= 0) audio.play('pump'); }
  if (W.autoReload > 0) { W.autoReload -= dt; if (W.autoReload <= 0) startReload(); }
  if (W.reloading) {
    W.reloadT -= dt;
    if (W.reloadT <= 0) {
      const need = def.mag - st.ammo, take = Math.min(need, st.reserve);
      st.ammo += take; st.reserve -= take; W.reloading = false;
    }
  }
  const firing = input.fire || hookInput.fire;
  if (firing) { if ((def.auto || !W.firedHeld) && fire()) W.firedHeld = true; } else W.firedHeld = false;
}

// ---------- viewmodels ----------
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(60, camera.aspect, 0.01, 10);
// viewmodel lighting: warm key from upper-left-front (matches arena sun), cool fill, teal rim from behind
vmScene.add(new THREE.HemisphereLight(0xffd8c0, 0x40384a, 0.9));
const vmSun = new THREE.DirectionalLight(0xffb080, 2.4); vmSun.position.set(-0.6, 1.4, 1.0); vmScene.add(vmSun);
const vmFill = new THREE.DirectionalLight(0x9ab0ff, 0.6); vmFill.position.set(1.2, -0.3, 0.5); vmScene.add(vmFill);
const vmRim = new THREE.DirectionalLight(0x60fff0, 1.4); vmRim.position.set(0.4, 0.8, -1.5); vmScene.add(vmRim);
const gunDark = new THREE.MeshStandardMaterial({ color: 0x4a4c54, roughness: 0.38, metalness: 0.25 });
const gunMid = new THREE.MeshStandardMaterial({ color: 0x7a6252, roughness: 0.75, metalness: 0.05 });
const gunTeal = new THREE.MeshStandardMaterial({ color: 0x0c2626, emissive: 0x3fe0d8, emissiveIntensity: 0.9 });
const gunOr = new THREE.MeshStandardMaterial({ color: 0x2a1406, emissive: 0xff7a2a, emissiveIntensity: 0.9 });
function part(parent, geo, mat, x, y, z, rx = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; parent.add(m); return m; }
function makeRifle() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.07, 0.09, 0.45), gunDark, 0, 0, 0);
  part(g, new THREE.BoxGeometry(0.074, 0.012, 0.26), gunTeal, 0, 0.02, -0.02);
  part(g, new THREE.BoxGeometry(0.05, 0.02, 0.28), gunMid, 0, 0.055, -0.02);
  part(g, new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), gunDark, 0, 0.01, -0.38, Math.PI / 2);
  part(g, new THREE.BoxGeometry(0.05, 0.14, 0.06), gunMid, 0, -0.1, 0.02, 0.25);
  const mag = part(g, new THREE.BoxGeometry(0.045, 0.15, 0.07), gunDark, 0, -0.1, -0.1, -0.15);
  part(g, new THREE.BoxGeometry(0.06, 0.08, 0.18), gunMid, 0, -0.01, 0.3);
  part(g, new THREE.BoxGeometry(0.03, 0.04, 0.05), gunDark, 0, 0.075, 0.1);
  g.userData.mag = mag; g.userData.muzzle = new THREE.Vector3(0, 0.01, -0.56);
  return g;
}
function makeShotgun() {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.025, 0.025, 0.6, 10), gunDark, 0.0, 0.02, -0.2, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 10), gunDark, 0.0, -0.028, -0.18, Math.PI / 2);
  const pump = part(g, new THREE.CylinderGeometry(0.032, 0.032, 0.16, 10), gunMid, 0, -0.028, -0.25, Math.PI / 2);
  part(g, new THREE.BoxGeometry(0.075, 0.1, 0.22), gunDark, 0, 0, 0.12);
  part(g, new THREE.BoxGeometry(0.078, 0.01, 0.18), gunOr, 0, 0.015, 0.12);
  part(g, new THREE.BoxGeometry(0.06, 0.13, 0.26), gunMid, 0, -0.06, 0.34, 0.3);
  g.userData.mag = pump; g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.52);
  return g;
}
const vmRoot = new THREE.Group(); vmRoot.scale.setScalar(0.7); vmScene.add(vmRoot);
const vmRifle = makeRifle(), vmShotgun = makeShotgun();
vmRoot.add(vmRifle, vmShotgun);
const flashTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.3, 'rgba(255,170,60,0.9)'); gr.addColorStop(1, 'rgba(255,80,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
flashSprite.scale.set(0.25, 0.25, 1); flashSprite.visible = false; vmScene.add(flashSprite);
const muzzleLight = new THREE.PointLight(0xffa050, 0, 8, 2); scene.add(muzzleLight);
let flashT = 0;

function updateViewmodel(dt, t) {
  vmRifle.visible = W.cur === 'rifle'; vmShotgun.visible = W.cur === 'shotgun';
  const g = W.cur === 'rifle' ? vmRifle : vmShotgun;
  const hs = Math.hypot(P.vel.x, P.vel.z);
  const bobAmp = P.onGround ? Math.min(1, hs / 6) : 0.2;
  const bx = Math.sin(P.bobT) * 0.012 * bobAmp, by = Math.abs(Math.cos(P.bobT)) * 0.014 * bobAmp + Math.sin(t * 1.6) * 0.002;
  let reloadDip = 0, magDrop = 0;
  if (W.reloading) {
    const def = WEAPONS[W.cur]; const k = 1 - W.reloadT / def.reload; // 0..1
    reloadDip = Math.sin(k * Math.PI);
    magDrop = Math.sin(k * Math.PI) * 0.12;
  }
  const sw = W.switchT / 0.35;
  vmRoot.position.set(0.17 + bx, -0.155 + by - reloadDip * 0.08 - sw * 0.3 - P.vel.y * 0.002, -0.55 + W.kick * 0.07);
  vmRoot.rotation.set(W.kick * 0.12 + reloadDip * 0.5, 0.06, reloadDip * 0.4);
  const mag = g.userData.mag;
  if (W.cur === 'rifle') mag.position.y = -0.1 - magDrop;
  else mag.position.z = -0.25 + (W.pumpPending > 0 && W.pumpPending < 0.25 ? 0.07 : 0) + magDrop * 0.4;
  flashT -= dt;
  const on = flashT > 0;
  flashSprite.visible = on; muzzleLight.intensity = on ? 30 : 0;
  if (on) {
    _v1.copy(g.userData.muzzle); g.localToWorld(_v1); flashSprite.position.copy(_v1);
    flashSprite.material.rotation = Math.random() * 6.28;
    const s = W.cur === 'shotgun' ? 0.4 : 0.25; flashSprite.scale.set(s, s, 1);
    muzzleLight.position.copy(_muzzleW);
  }
}

// ---------- pooled effects ----------
const TR_N = 32, tracers = [];
const trGeo = new THREE.BoxGeometry(1, 1, 1); trGeo.translate(0, 0, -0.5);
const trMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
const trMesh = new THREE.InstancedMesh(trGeo, trMat, TR_N); trMesh.frustumCulled = false; scene.add(trMesh);
const _m4 = new THREE.Matrix4(), _s = V(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
for (let i = 0; i < TR_N; i++) { tracers.push({ life: 0, a: V(), b: V() }); trMesh.setMatrixAt(i, _zero); }
let trIdx = 0;
function spawnTracer(a, b) { const t = tracers[trIdx]; trIdx = (trIdx + 1) % TR_N; t.a.copy(a); t.b.copy(b); t.life = 0.06; }
const _up = new THREE.Vector3(0, 1, 0), _lookM = new THREE.Matrix4();
function updateTracers(dt) {
  for (let i = 0; i < TR_N; i++) {
    const t = tracers[i];
    if (t.life <= 0) { trMesh.setMatrixAt(i, _zero); continue; }
    t.life -= dt;
    const len = t.a.distanceTo(t.b);
    _lookM.lookAt(t.a, t.b, _up); _q.setFromRotationMatrix(_lookM);
    // lookAt makes -z point from a toward b when eye=a,target=b
    const w = 0.012 + t.life * 0.2;
    _s.set(w, w, Math.max(0.01, len * Math.min(1, 0.4 + t.life * 10)));
    _m4.compose(t.a, _q, _s); trMesh.setMatrixAt(i, _m4);
  }
  trMesh.instanceMatrix.needsUpdate = true;
}
const DEC_N = 64;
const decGeo = new THREE.CircleGeometry(0.08, 8);
const decMat = new THREE.MeshBasicMaterial({ color: 0x1a120e, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const decMesh = new THREE.InstancedMesh(decGeo, decMat, DEC_N); decMesh.frustumCulled = false; scene.add(decMesh);
for (let i = 0; i < DEC_N; i++) decMesh.setMatrixAt(i, _zero);
let decIdx = 0; const _zAxis = new THREE.Vector3(0, 0, 1), _one = new THREE.Vector3(1, 1, 1);
function spawnDecal(p, n) {
  _q.setFromUnitVectors(_zAxis, n); _v2.copy(p).addScaledVector(n, 0.01);
  const sc = 0.7 + Math.random() * 0.6; _s.set(sc, sc, sc);
  _m4.compose(_v2, _q, _s); decMesh.setMatrixAt(decIdx, _m4); decIdx = (decIdx + 1) % DEC_N; decMesh.instanceMatrix.needsUpdate = true;
}
const SP_N = 24, sparks = [];
const spMats = [];
for (let i = 0; i < SP_N; i++) {
  const m = new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffc070 });
  const s = new THREE.Sprite(m); s.visible = false; scene.add(s); sparks.push({ s, life: 0 }); spMats.push(m);
}
let spIdx = 0;
function spawnSpark(p, color) { const k = sparks[spIdx]; spIdx = (spIdx + 1) % SP_N; k.s.position.copy(p); k.s.material.color.setHex(color); k.life = 0.12; k.s.visible = true; }
function updateSparks(dt) {
  for (let i = 0; i < SP_N; i++) { const k = sparks[i]; if (k.life <= 0) continue; k.life -= dt; const sc = 0.15 + (0.12 - k.life) * 3; k.s.scale.set(sc, sc, 1); k.s.material.opacity = Math.max(0, k.life / 0.12); if (k.life <= 0) k.s.visible = false; }
}

// ---------- HUD ----------
const hud = { hp: $('hptxt'), hpf: $('hpfill'), mag: $('mag'), res: $('res'), wn: $('wname'), wave: $('wave'), score: $('score'), alive: $('alive'), banner: $('banner'), hitm: $('hitm'), vign: $('vign'), reload: $('reloadtxt') };
const arcs = Array.from(document.querySelectorAll('#dmg .arc')).map((el) => ({ el, t: 0, x: 0, z: 0 }));
let arcI = 0, hitmT = 0, vignT = 0, bannerT = 0;
const last = {};
function setText(el, key, v) { if (last[key] !== v) { last[key] = v; el.textContent = v; } }
function hitMarker(kill) { hitmT = kill ? 0.35 : 0.18; hud.hitm.style.transform = `translate(-50%,-50%) rotate(45deg) scale(${kill ? 1.4 : 1})`; }
function banner(text, dur = 2.5) { hud.banner.textContent = text; hud.banner.style.opacity = 1; bannerT = dur; }
function updateHUD(dt) {
  const st = W.state[W.cur];
  setText(hud.hp, 'hp', String(Math.ceil(G.health)));
  if (last.hpw !== Math.ceil(G.health)) { last.hpw = Math.ceil(G.health); hud.hpf.style.width = Math.max(0, G.health) + '%'; }
  setText(hud.mag, 'mag', String(st.ammo)); setText(hud.res, 'res', String(st.reserve)); setText(hud.wn, 'wn', W.cur);
  setText(hud.wave, 'wave', String(Math.max(1, G.wave))); setText(hud.score, 'score', String(G.score)); setText(hud.alive, 'alive', String(enemies.aliveCount()));
  const rl = W.reloading ? 'block' : 'none'; if (last.rl !== rl) { last.rl = rl; hud.reload.style.display = rl; }
  hitmT = Math.max(0, hitmT - dt); hud.hitm.style.opacity = hitmT > 0 ? 1 : 0;
  vignT = Math.max(0, vignT - dt); hud.vign.style.opacity = (vignT * 1.5 + (G.health < 30 ? 0.25 : 0)).toFixed(2);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) hud.banner.style.opacity = 0; }
  for (const a of arcs) {
    if (a.t <= 0) { if (a.on) { a.on = false; a.el.style.opacity = 0; } continue; }
    a.t -= dt; a.on = true;
    const ang = Math.atan2(a.x - P.pos.x, a.z - P.pos.z); // world angle
    const rel = ang - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw));
    a.el.style.transform = `rotate(${(-rel)}rad)`;
    a.el.style.opacity = Math.min(1, a.t).toFixed(2);
  }
}

function playerHurt(dmg, fromPos) {
  if (G.mode !== 'playing' || G.god) return;
  G.health = Math.max(0, G.health - dmg);
  audio.play('playerHurt'); vignT = 0.4;
  if (fromPos) { const a = arcs[arcI]; arcI = (arcI + 1) % arcs.length; a.x = fromPos.x; a.z = fromPos.z; a.t = 1.2; }
  if (G.health <= 0) endGame(false);
}

// ---------- waves ----------
const WAVES = [{ n: 4, sh: 0 }, { n: 6, sh: 0.25 }, { n: 8, sh: 0.35 }, { n: 10, sh: 0.45 }, { n: 12, sh: 0.5 }];
function beginWave(w) {
  G.wave = w; G.waveState = 'spawning'; const def = WAVES[w - 1];
  G.toSpawn = def.n; G.shooterFrac = def.sh; G.spawned = 0; G.spawnTimer = 0.5; G.shootersSpawned = 0;
  enemies.setDifficulty(w);
  banner('WAVE ' + w); audio.play('waveStart');
}
function pickSpawn() {
  let best = null, bd = -1;
  for (let tries = 0; tries < 4; tries++) {
    const s = SPAWNS[(Math.random() * SPAWNS.length) | 0];
    const d = Math.hypot(s.x - P.pos.x, s.z - P.pos.z);
    if (d > 18) return s;
    if (d > bd) { bd = d; best = s; }
  }
  return best;
}
function updateWaves(dt) {
  if (!G.waveSpawning) return;
  if (G.waveState === 'spawning') {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0 && G.toSpawn > 0) {
      const s = pickSpawn(); const def = WAVES[G.wave - 1];
      const shooters = Math.round(def.n * G.shooterFrac);
      const type = (G.spawned % Math.max(1, Math.floor(def.n / Math.max(1, shooters))) === 1 && G.shootersSpawned < shooters) ? 'shooter' : 'rusher';
      if (type === 'shooter') G.shootersSpawned++;
      enemies.spawn(type, s.x + (Math.random() - 0.5) * 2, 0, s.z + (Math.random() - 0.5) * 2);
      G.toSpawn--; G.spawned++; G.spawnTimer = 0.9;
    }
    if (G.toSpawn <= 0) G.waveState = 'fighting';
  } else if (G.waveState === 'fighting') {
    if (enemies.aliveCount() === 0) {
      if (G.wave >= 5) { endGame(true); return; }
      G.waveState = 'break'; G.waveTimer = 5; G.score += 250 * G.wave;
      banner('WAVE ' + G.wave + ' CLEAR', 3); audio.play('waveClear');
      // top up some reserve between waves
      W.state.rifle.reserve = Math.min(WEAPONS.rifle.reserveMax, W.state.rifle.reserve + 30);
      W.state.shotgun.reserve = Math.min(WEAPONS.shotgun.reserveMax, W.state.shotgun.reserve + 8);
      G.health = Math.min(100, G.health + 25);
    }
  } else if (G.waveState === 'break') {
    G.waveTimer -= dt;
    if (G.waveTimer < 3 && G.waveTimer + dt >= 3) banner('NEXT WAVE IN 3', 2);
    if (G.waveTimer <= 0) beginWave(G.wave + 1);
  } else if (G.waveState === 'idle') {
    beginWave(Math.max(1, G.wave + 1));
  }
}

// ---------- menus / modes ----------
const overlays = ['menu', 'pause', 'settings', 'gameover', 'victory'];
let settingsReturn = 'menu';
function show(id) { for (const o of overlays) $(o).classList.toggle('show', o === id); $('hud').classList.toggle('show', G.mode === 'playing' || G.mode === 'paused' || G.mode === 'gameover' || G.mode === 'victory'); }
function startGame() {
  enemies.clear(); resetWeapons();
  G.mode = 'playing'; G.wave = 0; G.score = 0; G.health = 100; G.waveState = 'idle'; G.shootersSpawned = 0; G.paused = false;
  P.pos.set(0, 0.5, 6); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0; P.onGround = false;
  for (const k in input) input[k] = false;
  for (const a of arcs) a.t = 0;
  G.waveSpawning = true; G.god = false; acc = 0;
  for (const t of tracers) t.life = 0;
  for (let i = 0; i < TR_N; i++) trMesh.setMatrixAt(i, _zero); trMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < DEC_N; i++) decMesh.setMatrixAt(i, _zero); decMesh.instanceMatrix.needsUpdate = true; decIdx = 0;
  for (const k of sparks) { k.life = 0; k.s.visible = false; }
  flashT = 0; flashSprite.visible = false; muzzleLight.intensity = 0;
  show(null);
  requestLock();
}
function endGame(won) {
  G.mode = won ? 'victory' : 'gameover';
  audio.play(won ? 'victory' : 'gameover');
  $(won ? 'vscore' : 'goscore').textContent = `Score ${G.score} - reached wave ${G.wave}`;
  show(won ? 'victory' : 'gameover');
  if (document.pointerLockElement) document.exitPointerLock();
}
function pauseGame() { if (G.mode !== 'playing') return; G.mode = 'paused'; for (const k in input) input[k] = false; show('pause'); }
function resumeGame() { if (G.mode !== 'paused') return; G.mode = 'playing'; show(null); requestLock(); }
function requestLock() {
  if (navigator.webdriver) return;
  try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
}
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.mode === 'playing') pauseGame(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-act]');
  audio.resume();
  if (!b) { if (G.mode === 'playing' && !document.pointerLockElement) requestLock(); return; }
  audio.play('uiClick');
  const act = b.dataset.act;
  if (act === 'play' || act === 'restart') startGame();
  else if (act === 'settings') { settingsReturn = G.mode === 'paused' ? 'pause' : 'menu'; show('settings'); }
  else if (act === 'back') show(settingsReturn);
  else if (act === 'resume') resumeGame();
  else if (act === 'quit') { enemies.clear(); G.mode = 'menu'; show('menu'); }
});
function bindSlider(id, key, fmt, apply) {
  const el = $(id), out = $(id + 'v'); el.value = settings[key]; out.textContent = fmt(settings[key]);
  el.addEventListener('input', () => { settings[key] = parseFloat(el.value); out.textContent = fmt(settings[key]); apply(settings[key]); try { localStorage.setItem('arena.settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } });
}
bindSlider('sens', 'sens', (v) => v.toFixed(2), () => {});
bindSlider('vol', 'vol', (v) => String(Math.round(v * 100)), (v) => audio.setMasterVolume(v));

// ---------- input ----------
function lookBy(dx, dy) {
  const k = 0.0022 * settings.sens;
  P.yaw -= dx * k; P.pitch = THREE.MathUtils.clamp(P.pitch - dy * k, -1.5, 1.5);
}
document.addEventListener('mousemove', (e) => { if (G.mode === 'playing' && document.pointerLockElement) lookBy(e.movementX, e.movementY); });
document.addEventListener('mousedown', (e) => { if (G.mode === 'playing' && e.button === 0 && document.pointerLockElement) input.fire = true; });
document.addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; });
document.addEventListener('wheel', (e) => { if (G.mode === 'playing') switchWeapon(W.cur === 'rifle' ? 'shotgun' : 'rifle'); }, { passive: true });
const KEYMAP = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump' };
function oneShot(key) {
  if (key === 'Escape') { if (G.mode === 'playing') pauseGame(); else if (G.mode === 'paused') resumeGame(); return; }
  if (G.mode !== 'playing') return;
  if (key === 'r' || key === 'R') startReload();
  else if (key === '1') switchWeapon('rifle');
  else if (key === '2') switchWeapon('shotgun');
}
document.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; if (e.code === 'Space') e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'KeyR') oneShot('r'); else if (e.code === 'Digit1') oneShot('1'); else if (e.code === 'Digit2') oneShot('2');
  else if (e.code === 'Escape') oneShot('Escape');
  else if (e.code === 'KeyP') oneShot('Escape');
});
document.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { for (const k in input) input[k] = false; });
window.addEventListener('resize', () => {
  camera.aspect = vmCam.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- main loop ----------
const STEP = 1 / 120;
let acc = 0, lastT = performance.now(), time = 0;
function simulate(dt) {
  updatePlayer(dt);
  updateWeapons(dt);
  _eye.set(P.pos.x, P.pos.y + P.eye, P.pos.z);
  enemies.update(dt, _eye, G.mode === 'playing' && G.health > 0);
  if (G.mode === 'playing') updateWaves(dt);
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; time += dt;
  if (G.mode === 'playing' && !G.paused) {
    acc += dt; let n = 0;
    while (acc >= STEP && n < 12 && G.mode === 'playing' && !G.paused) { simulate(STEP); acc -= STEP; n++; }
    if (n >= 12 || G.mode !== 'playing') acc = 0;
  } else { acc = 0; dt = G.mode === 'playing' ? 0 : dt; }
  camera.position.set(P.pos.x, P.pos.y + P.eye, P.pos.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  camera.updateMatrixWorld();
  if (G.mode === 'playing' || G.mode === 'paused') { updateViewmodel(dt, time); updateTracers(dt); updateSparks(dt); }
  updateHUD(dt);
  renderer.clear();
  renderer.render(scene, camera);
  if (G.mode === 'playing' || G.mode === 'paused') { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
}
// attract-mode camera for the menu
P.pos.set(-20, 6, 24); P.yaw = -0.6; P.pitch = -0.25;
show('menu');
requestAnimationFrame(frame);

// ---------- test hook ----------
window.__game = {
  start() { audio.resume(); startGame(); },
  getState() {
    const st = W.state[W.cur];
    return { mode: G.mode, wave: G.wave, health: G.health, weapon: W.cur, ammo: st.ammo, reserve: st.reserve, score: G.score, enemiesAlive: enemies.aliveCount(), playerPos: [P.pos.x, P.pos.y, P.pos.z], yaw: P.yaw, pitch: P.pitch };
  },
  setInput(o) { for (const k in o) if (k in hookInput) hookInput[k] = !!o[k]; },
  look(dx, dy) { lookBy(dx, dy); },
  pressKey(key) { oneShot(key); },
  setPlayerPose(x, y, z, yaw, pitch) { P.pos.set(x, y, z); P.vel.set(0, 0, 0); if (yaw !== undefined) P.yaw = yaw; if (pitch !== undefined) P.pitch = pitch; },
  spawnEnemy(type, x, y, z) { return enemies.spawn(type, x, y || 0, z); },
  getEnemies() { return enemies.list(); },
  setPaused(b) { G.paused = !!b; },
  setGodMode(b) { G.god = !!b; },
  setWaveSpawning(b) { G.waveSpawning = !!b; },
};
