import * as THREE from '../vendor/three.module.js';

// ---------- shared geometry / materials ----------
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 4),
  sph: new THREE.SphereGeometry(0.5, 14, 10),
  cap: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
  proj: new THREE.SphereGeometry(0.16, 12, 8),
  taper: new THREE.CylinderGeometry(0.5, 0.36, 1, 12),
  chest: new THREE.LatheGeometry([[0, -0.5], [0.3, -0.5], [0.34, -0.3], [0.42, 0.0], [0.5, 0.25], [0.48, 0.4], [0.3, 0.5], [0, 0.52]].map(([x, y]) => new THREE.Vector2(x, y)), 16),
  tail: new THREE.CylinderGeometry(0.02, 0.14, 1, 8, 1, true),
};
G.tail.translate(0, -0.5, 0); G.tail.rotateX(Math.PI / 2); // tail extends along -Z

let glowTex = null;
function getGlowTex() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

const STATS = {
  rusher: { health: 70, speed: 6.8, dmg: 12, radius: 0.45 },
  shooter: { health: 120, speed: 3.6, dmg: 12, radius: 0.6, fireInterval: 2.3 },
};

// scratch vectors (no per-frame allocs)
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _ray = new THREE.Ray(), _hit = new THREE.Vector3();
const _cols = new THREE.Color();

let armorTex = null;
function getArmorTex() {
  if (armorTex) return armorTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6b7280'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) { const v = 95 + Math.random() * 30 | 0; g.fillStyle = `rgba(${v},${v + 4},${v + 10},0.35)`; g.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 3 + Math.random() * 10); }
  g.strokeStyle = '#2a2e36'; g.lineWidth = 3;
  for (const x of [0, 96, 176]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (const y of [0, 80, 168]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.strokeStyle = 'rgba(140,148,160,0.5)'; g.lineWidth = 1;
  for (const x of [2, 98, 178]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (const y of [2, 82, 170]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  for (const [x, y] of [[8, 8], [88, 8], [104, 8], [168, 8], [8, 72], [88, 72], [104, 88], [168, 88], [184, 176], [248, 176], [8, 176], [88, 248]]) {
    g.fillStyle = '#12151a'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
    g.fillStyle = '#9aa2ae'; g.beginPath(); g.arc(x - 0.8, y - 0.8, 1.6, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(190,198,210,0.35)';
  for (let i = 0; i < 40; i++) { const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 10); g.stroke(); }
  g.save(); g.beginPath(); g.rect(110, 100, 56, 18); g.clip();
  for (let i = -2; i < 8; i++) { g.fillStyle = i % 2 ? '#e8b400' : '#111'; g.beginPath(); g.moveTo(110 + i * 10, 118); g.lineTo(120 + i * 10, 100); g.lineTo(130 + i * 10, 100); g.lineTo(120 + i * 10, 118); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(230,232,236,0.85)'; g.font = 'bold 22px monospace'; g.fillText('07', 20, 130); g.fillText('X-4', 190, 60);
  g.font = 'bold 12px monospace'; g.fillText('UNIT', 20, 150); g.fillText('A2', 200, 230);
  armorTex = new THREE.CanvasTexture(c); armorTex.colorSpace = THREE.SRGBColorSpace;
  armorTex.wrapS = armorTex.wrapT = THREE.RepeatWrapping; armorTex.anisotropy = 4;
  return armorTex;
}

function makeMats(accentHex) {
  return {
    armor: new THREE.MeshStandardMaterial({ map: getArmorTex(), bumpMap: getArmorTex(), bumpScale: 0.02, color: 0xffffff, roughness: 0.4, metalness: 0.2, emissive: 0x000000 }),
    joint: new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.6, metalness: 0.3, emissive: 0x000000 }),
    accent: new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 2, roughness: 0.4, toneMapped: false }),
    accentBase: new THREE.Color(accentHex),
  };
}

function part(geo, mat, parent, sx, sy, sz, x, y, z, list) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); list.push(m);
  return m;
}
function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

function limb(M, parent, r, len, y, P) { r *= 1.6; return part(G.taper, M, parent, r * 2, len * 1.05, r * 2, 0, y, 0, P); }

function buildRusher(e) {
  const M = e.mats, P = e.parts, root = e.root;
  const hips = pivot(root, 0, 1.0, 0); e.hips = hips;
  part(G.sph, M.joint, hips, 0.36, 0.2, 0.26, 0, 0, 0, P);
  const torso = pivot(hips, 0, 0.08, 0); torso.rotation.x = 0.35; e.torso = torso;
  part(G.cyl, M.joint, torso, 0.14, 0.32, 0.14, 0, 0.16, 0, P); // spine
  part(G.chest, M.armor, torso, 0.56, 0.5, 0.38, 0, 0.4, 0.0, P); // chest (lathe)
  part(G.box, M.joint, torso, 0.3, 0.34, 0.16, 0, 0.44, -0.2, P); // backpack
  part(G.cyl, M.armor, torso, 0.12, 0.36, 0.12, 0.1, 0.46, -0.28, P); part(G.cyl, M.armor, torso, 0.12, 0.36, 0.12, -0.1, 0.46, -0.28, P);
  part(G.box, M.armor, torso, 0.36, 0.22, 0.08, 0, 0.5, 0.15, P); // chest plate
  part(G.box, M.accent, torso, 0.1, 0.26, 0.04, 0, 0.48, 0.2, P); // chest stripe (vertical)
  part(G.box, M.accent, torso, 0.34, 0.05, 0.04, 0, 0.58, 0.2, P); // chest stripe (bar)
  const head = pivot(torso, 0, 0.72, 0.08); e.head = head;
  part(G.cyl, M.joint, head, 0.1, 0.12, 0.1, 0, -0.05, 0, P);
  part(G.sph, M.armor, head, 0.28, 0.26, 0.32, 0, 0.09, 0.02, P);
  part(G.sph, M.accent, head, 0.26, 0.1, 0.2, 0, 0.1, 0.1, P); // big visor
  e.arms = []; e.fore = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, 0.32 * s, 0.56, 0);
    part(G.sph, M.joint, sh, 0.17, 0.17, 0.17, 0, 0, 0, P);
    part(G.sph, M.armor, sh, 0.26, 0.16, 0.26, 0.04 * s, 0.07, 0, P); // pauldron
    limb(M.armor, sh, 0.06, 0.3, -0.18, P);
    const el = pivot(sh, 0, -0.36, 0); el.rotation.x = -1.1;
    part(G.sph, M.joint, el, 0.11, 0.11, 0.11, 0, 0, 0, P);
    limb(M.armor, el, 0.065, 0.28, -0.16, P);
    part(G.taper, M.armor, el, 0.26, 0.2, 0.26, 0, -0.2, 0.02, P); // forearm shell
    const blade = part(G.cone, M.accent, el, 0.06, 0.55, 0.14, 0, -0.54, 0.02, P);
    blade.rotation.x = Math.PI;
    e.arms.push(sh); e.fore.push(el);
  }
  buildLegs(e, 0.13, 0.46, 0.46, 0.13);
}

function buildLegs(e, hx, thigh, shin, thick) {
  const M = e.mats, P = e.parts;
  e.legs = []; e.knees = [];
  for (const s of [-1, 1]) {
    const hp = pivot(e.hips, hx * s, -0.05, 0);
    part(G.sph, M.joint, hp, thick * 1.3, thick * 1.3, thick * 1.3, 0, 0, 0, P);
    limb(M.armor, hp, thick * 0.55, thigh, -thigh / 2, P);
    part(G.box, M.armor, hp, thick * 1.1, thigh * 0.55, thick * 0.35, 0, -thigh * 0.45, thick * 0.85, P); // thigh plate
    const kn = pivot(hp, 0, -thigh, 0);
    part(G.sph, M.joint, kn, thick * 1.05, thick * 1.05, thick * 1.05, 0, 0, 0, P);
    limb(M.armor, kn, thick * 0.5, shin, -shin / 2, P);
    part(G.taper, M.armor, kn, thick * 1.9, shin * 0.55, thick * 1.9, 0, -shin * 0.35, 0.02, P); // shin shell
    part(G.box, M.joint, kn, thick * 1.1, 0.08, thick * 2.2, 0, -shin - 0.02, thick * 0.4, P); // foot
    e.legs.push(hp); e.knees.push(kn);
  }
}

function buildShooter(e) {
  const M = e.mats, P = e.parts, root = e.root;
  const hips = pivot(root, 0, 1.15, 0); e.hips = hips;
  part(G.sph, M.joint, hips, 0.5, 0.24, 0.36, 0, 0, 0, P);
  const torso = pivot(hips, 0, 0.12, 0); torso.rotation.x = 0.1; e.torso = torso;
  part(G.chest, M.armor, torso, 0.88, 0.7, 0.6, 0, 0.38, 0, P);
  part(G.box, M.joint, torso, 0.5, 0.5, 0.24, 0, 0.42, -0.3, P); // backpack
  part(G.cyl, M.armor, torso, 0.16, 0.5, 0.16, 0.16, 0.44, -0.42, P); part(G.cyl, M.armor, torso, 0.16, 0.5, 0.16, -0.16, 0.44, -0.42, P);
  part(G.box, M.armor, torso, 0.56, 0.3, 0.1, 0, 0.42, 0.27, P); // chest plate
  part(G.cyl, M.accent, torso, 0.86, 0.05, 0.62, 0, 0.18, 0, P); // waist band
  part(G.cyl, M.joint, torso, 0.36, 0.06, 0.36, 0, 0.4, 0.31, P).rotation.x = Math.PI / 2;
  e.core = part(G.sph, M.accent, torso, 0.3, 0.3, 0.14, 0, 0.4, 0.34, P);
  const head = pivot(torso, 0, 0.8, 0.06); e.head = head;
  part(G.sph, M.armor, head, 0.36, 0.26, 0.34, 0, 0.05, 0, P);
  part(G.sph, M.accent, head, 0.3, 0.1, 0.18, 0, 0.06, 0.1, P); // eye visor
  const cm = pivot(torso, 0.5, 0.8, 0); e.cannon = cm;
  part(G.sph, M.joint, cm, 0.26, 0.26, 0.3, 0, 0, 0, P);
  const barrel = part(G.cyl, M.armor, cm, 0.2, 0.7, 0.2, 0, 0.05, 0.32, P); barrel.rotation.x = Math.PI / 2;
  part(G.cyl, M.accent, cm, 0.23, 0.05, 0.23, 0, 0.05, 0.2, P).rotation.x = Math.PI / 2;
  part(G.cyl, M.joint, cm, 0.24, 0.1, 0.24, 0, 0.05, 0.62, P).rotation.x = Math.PI / 2;
  e.muzzle = part(G.sph, M.accent, cm, 0.14, 0.14, 0.14, 0, 0.05, 0.68, P);
  e.arms = []; e.fore = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, 0.48 * s, 0.5, 0);
    part(G.sph, M.joint, sh, 0.22, 0.22, 0.22, 0, 0, 0, P);
    part(G.sph, M.armor, sh, 0.34, 0.2, 0.34, 0.05 * s, 0.1, 0, P); // pauldron
    part(G.cyl, M.accent, sh, 0.35, 0.04, 0.35, 0.05 * s, 0.07, 0, P); // pauldron edge
    limb(M.armor, sh, 0.09, 0.36, -0.2, P);
    const el = pivot(sh, 0.04 * s, -0.42, 0); el.rotation.x = -0.9;
    part(G.sph, M.joint, el, 0.14, 0.14, 0.14, 0, 0, 0, P);
    part(G.taper, M.armor, el, 0.3, 0.36, 0.3, 0, -0.18, 0, P);
    part(G.cyl, M.accent, el, 0.24, 0.05, 0.24, 0, -0.1, 0, P);
    e.arms.push(sh); e.fore.push(el);
  }
  buildLegs(e, 0.22, 0.55, 0.58, 0.19);
}


class Projectile {
  constructor(scene) {
    this.mesh = new THREE.Mesh(G.proj, new THREE.MeshBasicMaterial({ color: 0xaaffee }));
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTex(), color: 0x33ffcc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.glow.scale.set(1.1, 1.1, 1);
    this.tail = new THREE.Mesh(G.tail, new THREE.MeshBasicMaterial({ color: 0x22ffbb, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tail.scale.set(1, 1, 1.4);
    this.mesh.add(this.glow); this.mesh.add(this.tail);
    this.mesh.visible = false; scene.add(this.mesh);
    this.vel = new THREE.Vector3(); this.origin = new THREE.Vector3();
    this.active = false; this.life = 0; this.dmg = 10;
  }
}

export class EnemyManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.enemies = [];
    this.nextId = 1;
    this.hitMeshes = []; this.hitDirty = true;
    this.diff = { speed: 1, health: 1, dmg: 1, fire: 1 };
    this.projectiles = [];
    for (let i = 0; i < 32; i++) this.projectiles.push(new Projectile(ctx.scene));
    this._listOut = [];
    this._staggerIdx = 0;
    this._initNav();
  }

  _initNav() {
    const n = this.ctx.nav; if (!n) return;
    const N = n.w * n.h;
    this.aG = new Float32Array(N); this.aF = new Float32Array(N);
    this.aPar = new Int32Array(N); this.aStamp = new Uint32Array(N); this.aClosed = new Uint32Array(N);
    this.heap = new Int32Array(N + 8); this.stamp = 0;
  }

  setDifficulty(wave) {
    const w = Math.max(0, (wave | 0) - 1);
    this.diff.speed = 1 + 0.08 * w; this.diff.health = 1 + 0.18 * w;
    this.diff.dmg = 1 + 0.12 * w; this.diff.fire = 1 + 0.15 * w;
  }

  spawn(type, x, y, z) {
    if (type !== 'shooter') type = 'rusher';
    const st = STATS[type];
    const e = {
      id: this.nextId++, type, alive: true, dying: false, deathT: 0,
      health: Math.round(st.health * this.diff.health), radius: st.radius,
      speed: st.speed * this.diff.speed * (0.92 + Math.random() * 0.16),
      root: new THREE.Group(), parts: [], mats: makeMats(type === 'rusher' ? 0xff2020 : 0x20e0ff),
      pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), knock: new THREE.Vector3(),
      yaw: 0, phase: Math.random() * 6, flash: 0, stagger: 0,
      path: new Float32Array(512), pathLen: 0, pathIdx: 0, replan: Math.random() * 0.5,
      atkState: 0, atkT: 0, cool: 0.5 + Math.random(), strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: 2,
      fireT: 1 + Math.random() * 1.5, charge: 0, hasLOS: false, losT: 0,
      partVel: null, partAng: null, _pdx: 0, _pdz: 0, _usePath: false, struck: false, aimYaw: 0, aimPitch: 0, inRange: false,
    };
    if (type === 'rusher') buildRusher(e); else buildShooter(e);
    for (const m of e.parts) m.userData.enemyId = e.id;
    e.root.position.copy(e.pos);
    const p = this.ctx.player && this.ctx.player.pos;
    if (p) e.yaw = Math.atan2(p.x - x, p.z - z);
    e.root.rotation.y = e.yaw;
    this.ctx.scene.add(e.root);
    this.enemies.push(e); this.hitDirty = true;
    return e.id;
  }

  getHitMeshes() {
    if (this.hitDirty) {
      this.hitMeshes.length = 0;
      for (const e of this.enemies) if (e.alive) for (const m of e.parts) this.hitMeshes.push(m);
      this.hitDirty = false;
    }
    return this.hitMeshes;
  }

  _find(id) { for (const e of this.enemies) if (e.id === id) return e; return null; }

  damage(id, amount, point, dir) {
    const e = this._find(id);
    if (!e || !e.alive) return false;
    e.health -= amount; e.flash = 0.12;
    if (dir) { e.knock.x += dir.x * amount * 0.12; e.knock.z += dir.z * amount * 0.12; }
    e.stagger = Math.min(0.35, e.stagger + amount * 0.012);
    if (e.type === 'rusher' && e.atkState === 1 && amount >= 30) { e.atkState = 0; e.cool = 0.6; }
    if (e.health <= 0) { e.health = 0; this._kill(e, dir); return true; }
    if (this.ctx.audio) this.ctx.audio.play('hit');
    return false;
  }

  _kill(e, dir) {
    e.alive = false; e.dying = true; e.deathT = 0; this.hitDirty = true;
    const scene = this.ctx.scene;
    e.root.updateMatrixWorld(true);
    e.partVel = []; e.partAng = [];
    const dx = dir ? dir.x : 0, dz = dir ? dir.z : 0;
    for (const m of e.parts) {
      scene.attach(m);
      e.partVel.push(new THREE.Vector3(dx * 3 + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 3, dz * 3 + (Math.random() - 0.5) * 3));
      e.partAng.push(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10));
    }
    for (const k of ['armor', 'joint', 'accent']) { e.mats[k].transparent = true; }
    e.mats.armor.emissive.setRGB(0, 0, 0);
    if (this.ctx.audio) this.ctx.audio.play('enemyDeath');
    const pos = e.pos.clone(); pos.y = 1;
    if (this.ctx.onEnemyKilled) this.ctx.onEnemyKilled(e.type, pos);
  }

  _remove(e) {
    for (const m of e.parts) m.removeFromParent();
    e.root.removeFromParent();
    for (const k of ['armor', 'joint', 'accent']) e.mats[k].dispose();
  }

  list() {
    const out = [];
    for (const e of this.enemies) if (e.alive) out.push({ id: e.id, type: e.type, health: e.health, pos: [e.pos.x, e.pos.y, e.pos.z], alive: e.alive });
    return out;
  }
  aliveCount() { let n = 0; for (const e of this.enemies) if (e.alive) n++; return n; }
  clear() {
    for (const e of this.enemies) this._remove(e);
    this.enemies.length = 0; this.hitDirty = true;
    for (const p of this.projectiles) { p.active = false; p.mesh.visible = false; }
  }

  // ---------- navigation ----------
  _cellOf(x, z) {
    const n = this.ctx.nav;
    const cx = Math.floor((x - n.minX) / n.cell), cz = Math.floor((z - n.minZ) / n.cell);
    if (cx < 0 || cz < 0 || cx >= n.w || cz >= n.h) return -1;
    return cz * n.w + cx;
  }
  _blockedAt(x, z) { const c = this._cellOf(x, z); return c < 0 || this.ctx.nav.blocked[c] === 1; }
  _nearestFree(c) {
    const n = this.ctx.nav; if (c >= 0 && !n.blocked[c]) return c;
    if (c < 0) return -1;
    const cx = c % n.w, cz = (c / n.w) | 0;
    for (let r = 1; r < 5; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= n.w || z >= n.h) continue;
      if (!n.blocked[z * n.w + x]) return z * n.w + x;
    }
    return -1;
  }
  _gridClear(ax, az, bx, bz) {
    const n = this.ctx.nav, dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz), steps = Math.ceil(len / (n.cell * 0.4));
    for (let i = 1; i <= steps; i++) { const t = i / steps; if (this._blockedAt(ax + dx * t, az + dz * t)) return false; }
    return true;
  }
  _astar(e, tx, tz) {
    const n = this.ctx.nav; if (!n || !this.aG) return false;
    const W = n.w, H = n.h, B = n.blocked;
    const s = this._nearestFree(this._cellOf(e.pos.x, e.pos.z));
    const goal = this._nearestFree(this._cellOf(tx, tz));
    if (s < 0 || goal < 0) return false;
    const st = ++this.stamp, gS = this.aG, fS = this.aF, par = this.aPar, stp = this.aStamp, cl = this.aClosed, heap = this.heap;
    const gx = goal % W, gz = (goal / W) | 0;
    let hn = 0;
    const push = (i) => { let k = hn++; heap[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (fS[heap[p]] <= fS[i]) break; heap[k] = heap[p]; heap[p] = i; k = p; } };
    const pop = () => { const top = heap[0]; const last = heap[--hn]; let k = 0; heap[0] = last;
      for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hn && fS[heap[l]] < fS[heap[m]]) m = l; if (r < hn && fS[heap[r]] < fS[heap[m]]) m = r; if (m === k) break; heap[k] = heap[m]; heap[m] = last; k = m; } return top; };
    const hfn = (i) => { const dx = Math.abs(i % W - gx), dz = Math.abs(((i / W) | 0) - gz); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
    stp[s] = st; gS[s] = 0; fS[s] = hfn(s); par[s] = -1; push(s);
    let found = false, iter = 0;
    while (hn > 0 && iter++ < 6000) {
      const c = pop(); if (cl[c] === st) continue; cl[c] = st;
      if (c === goal) { found = true; break; }
      const cx = c % W, cz = (c / W) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= H) continue;
        const ni = z * W + x; if (B[ni]) continue;
        if (dx && dz && (B[cz * W + x] || B[z * W + cx])) continue; // no corner cutting
        if (cl[ni] === st) continue;
        const g = gS[c] + (dx && dz ? 1.4142 : 1);
        if (stp[ni] !== st || g < gS[ni]) { stp[ni] = st; gS[ni] = g; par[ni] = c; fS[ni] = g + hfn(ni); push(ni); }
      }
    }
    if (!found) return false;
    // count & write reversed
    let len = 0; for (let c = goal; c !== -1; c = par[c]) len++;
    len = Math.min(len, 256);
    let k = len - 1;
    for (let c = goal; c !== -1 && k >= 0; c = par[c], k--) {
      e.path[k * 2] = n.minX + (c % W + 0.5) * n.cell; e.path[k * 2 + 1] = n.minZ + (((c / W) | 0) + 0.5) * n.cell;
    }
    e.path[(len - 1) * 2] = tx; e.path[(len - 1) * 2 + 1] = tz;
    e.pathLen = len; e.pathIdx = Math.min(1, len - 1);
    return true;
  }

  _los(ox, oy, oz, tx, ty, tz) {
    _v1.set(tx - ox, ty - oy, tz - oz); const d = _v1.length(); if (d < 1e-4) return true;
    _ray.origin.set(ox, oy, oz); _ray.direction.copy(_v1).multiplyScalar(1 / d);
    for (const b of this.ctx.colliders) {
      if (_ray.intersectBox(b, _hit) && _hit.distanceToSquared(_ray.origin) < d * d) return false;
    }
    return true;
  }

  _collide(e) {
    const r = e.radius, p = e.pos;
    for (const b of this.ctx.colliders) {
      if (b.max.y < 0.4 || b.min.y > 1.6) continue;
      const cx = Math.max(b.min.x, Math.min(p.x, b.max.x)), cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
      let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); }
      else { // center inside box: push out along smallest axis
        const l = p.x - b.min.x, rr = b.max.x - p.x, f = p.z - b.min.z, bk = b.max.z - p.z;
        const m = Math.min(l, rr, f, bk);
        if (m === l) p.x = b.min.x - r; else if (m === rr) p.x = b.max.x + r; else if (m === f) p.z = b.min.z - r; else p.z = b.max.z + r;
      }
    }
  }

  // ---------- update ----------
  update(dt) {
    if (dt > 0.1) dt = 0.1;
    const pl = this.ctx.player, pp = pl.pos;
    // stagger replans
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dying) { this._updateDeath(e, dt); continue; }
      this._think(e, dt, pp);
      this._animate(e, dt);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; if (e.dying && e.deathT > 3.2) { this._remove(e); this.enemies.splice(i, 1); }
    }
    this._updateProjectiles(dt);
  }

  _think(e, dt, pp) {
    const toX = pp.x - e.pos.x, toZ = pp.z - e.pos.z; const dist = Math.hypot(toX, toZ) || 1e-4;
    e.losT -= dt;
    if (e.losT <= 0) { e.losT = 0.2 + Math.random() * 0.1; e.hasLOS = this._los(e.pos.x, 1.5, e.pos.z, pp.x, pp.y - 0.3, pp.z); }
    e.replan -= dt;
    let dX = 0, dZ = 0, speed = e.speed, wantFace = false;
    e.inRange = e.hasLOS && dist < 32;
    { let ay = Math.atan2(toX, toZ) - e.yaw; ay = Math.atan2(Math.sin(ay), Math.cos(ay)); e.aimYaw = Math.max(-1, Math.min(1, ay)); e.aimPitch = Math.atan2(pp.y - 0.45 - 2.0, dist); }
    const pl = this.ctx.player;

    if (e.type === 'rusher') {
      if (e.atkState === 1) { // windup
        e.atkT += dt; speed = 0; wantFace = true;
        if (e.atkT >= 0.4) { e.atkState = 2; e.atkT = 0; if (this.ctx.audio) this.ctx.audio.play('enemyMelee', { pos: e.pos }); }
      } else if (e.atkState === 2) { // lunge strike
        e.atkT += dt; wantFace = true;
        dX = toX / dist; dZ = toZ / dist; speed = dist > 1.1 ? e.speed * 1.6 : 0;
        if (!e.struck && e.atkT > 0.08 && dist < 2.0 && Math.abs(pp.y - 1.7 - e.pos.y) < 1.6 && pl.alive !== false) {
          e.struck = true; _v2.set(e.pos.x, 1.2, e.pos.z);
          pl.damage(Math.round(STATS.rusher.dmg * this.diff.dmg), _v2);
        }
        if (e.atkT > 0.3) { e.atkState = 3; e.atkT = 0; }
      } else if (e.atkState === 3) { // recover
        e.atkT += dt; speed = 0; if (e.atkT > 0.45) { e.atkState = 0; e.cool = 0.4; }
      } else {
        e.cool -= dt;
        if (dist < 1.9 && e.cool <= 0 && e.hasLOS && pl.alive !== false) { e.atkState = 1; e.atkT = 0; e.struck = false; }
        if (dist < 3.5 && e.hasLOS) { dX = toX / dist; dZ = toZ / dist; if (dist < 1.2) speed = 0; }
        else this._followPath(e, pp.x, pp.z);
      }
    } else {
      // shooter
      wantFace = e.hasLOS;
      e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = 1.5 + Math.random() * 2; e.strafeDir *= -1; }
      if (!e.hasLOS || dist > 20) { this._followPath(e, pp.x, pp.z); }
      else if (dist < 12) { dX = -toX / dist; dZ = -toZ / dist; dX += -toZ / dist * e.strafeDir * 0.5; dZ += toX / dist * e.strafeDir * 0.5; speed *= 0.9; }
      else { dX = -toZ / dist * e.strafeDir; dZ = toX / dist * e.strafeDir; speed *= 0.6; }
      if (dX || dZ) { // don't walk into blocked cells
        if (this._blockedAt(e.pos.x + dX * 1.0, e.pos.z + dZ * 1.0)) { e.strafeDir *= -1; if (!e.hasLOS) {} else { dX = 0; dZ = 0; } }
      }
      // firing
      e.fireT -= dt * this.diff.fire;
      if (e.charge > 0) {
        e.charge += dt; speed *= 0.3;
        if (e.charge > 0.75) { e.charge = 0; if (e.hasLOS) this._fire(e, pp); e.fireT = STATS.shooter.fireInterval * (0.8 + Math.random() * 0.4); }
      } else if (e.fireT <= 0 && e.hasLOS && dist < 32) { e.charge = 0.001; }
    }
    if (e._usePath) { dX = e._pdx; dZ = e._pdz; e._usePath = false; }

    // separation
    let sx = 0, sz = 0;
    for (const o of this.enemies) {
      if (o === e || !o.alive) continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, d2 = ox * ox + oz * oz, rr = e.radius + o.radius + 0.3;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); sx += ox / d * (rr - d) / rr; sz += oz / d * (rr - d) / rr; }
    }
    const stag = e.stagger > 0 ? 0.25 : 1; e.stagger = Math.max(0, e.stagger - dt);
    const tvx = (dX * speed + sx * 3) * stag, tvz = (dZ * speed + sz * 3) * stag;
    const k = Math.min(1, dt * 8);
    e.vel.x += (tvx - e.vel.x) * k; e.vel.z += (tvz - e.vel.z) * k;
    e.pos.x += (e.vel.x + e.knock.x) * dt; e.pos.z += (e.vel.z + e.knock.z) * dt;
    const kd = Math.exp(-dt * 8); e.knock.x *= kd; e.knock.z *= kd;
    this._collide(e);
    e.root.position.set(e.pos.x, e.pos.y, e.pos.z);
    // facing
    let fy;
    if (wantFace) fy = Math.atan2(toX, toZ);
    else if (e.vel.x * e.vel.x + e.vel.z * e.vel.z > 0.3) fy = Math.atan2(e.vel.x, e.vel.z);
    else fy = e.yaw;
    let dy = fy - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    e.yaw += dy * Math.min(1, dt * 10); e.root.rotation.y = e.yaw;
  }

  _followPath(e, tx, tz) {
    if (e.replan <= 0 || e.pathLen === 0) {
      e.replan = 0.5 + Math.random() * 0.1;
      if (!this._astar(e, tx, tz)) e.pathLen = 0;
    }
    if (e.pathLen === 0) { const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz) || 1; e._pdx = dx / d; e._pdz = dz / d; e._usePath = true; return; }
    let wx = e.path[e.pathIdx * 2], wz = e.path[e.pathIdx * 2 + 1];
    if (Math.hypot(wx - e.pos.x, wz - e.pos.z) < 0.5 && e.pathIdx < e.pathLen - 1) e.pathIdx++;
    // look ahead / smooth
    if (e.pathIdx < e.pathLen - 1) {
      const nx = e.path[e.pathIdx * 2 + 2], nz = e.path[e.pathIdx * 2 + 3];
      if (this._gridClear(e.pos.x, e.pos.z, nx, nz)) e.pathIdx++;
    }
    wx = e.path[e.pathIdx * 2]; wz = e.path[e.pathIdx * 2 + 1];
    const dx = wx - e.pos.x, dz = wz - e.pos.z, d = Math.hypot(dx, dz) || 1;
    e._pdx = dx / d; e._pdz = dz / d; e._usePath = true;
  }

  _fire(e, pp) {
    let p = null; for (const q of this.projectiles) if (!q.active) { p = q; break; }
    if (!p) return;
    e.muzzle.getWorldPosition(p.origin);
    // slight lead-free aim at chest
    _v3.set(pp.x, pp.y - 0.45, pp.z).sub(p.origin).normalize();
    p.vel.copy(_v3).multiplyScalar(14);
    p.mesh.position.copy(p.origin); p.mesh.lookAt(_v3.add(p.origin));
    p.active = true; p.life = 4; p.dmg = Math.round(STATS.shooter.dmg * this.diff.dmg); p.mesh.visible = true;
    if (this.ctx.audio) this.ctx.audio.play('enemyShoot', { pos: p.origin });
  }

  _updateProjectiles(dt) {
    const pl = this.ctx.player, pp = pl.pos;
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      const m = p.mesh.position;
      m.addScaledVector(p.vel, dt);
      let dead = p.life <= 0 || m.y < 0;
      if (!dead) for (const b of this.ctx.colliders) if (b.containsPoint(m)) { dead = true; break; }
      if (!dead && pl.alive !== false) {
        const cy = Math.max(pp.y - 1.7 + 0.4, Math.min(m.y, pp.y - 0.4 + 0.4));
        const dx = m.x - pp.x, dy = m.y - cy, dz = m.z - pp.z;
        if (dx * dx + dy * dy + dz * dz < 0.55 * 0.55) { pl.damage(p.dmg, p.origin); dead = true; }
      }
      p.glow.material.opacity = 0.8 + Math.sin(p.life * 40) * 0.2;
      if (dead) { p.active = false; p.mesh.visible = false; }
    }
  }

  _animate(e, dt) {
    const sp = Math.hypot(e.vel.x, e.vel.z);
    const rate = e.type === 'rusher' ? 1.7 : 1.3;
    e.phase += dt * sp * rate;
    const ph = e.phase, amp = Math.min(1, sp / 3);
    const s = Math.sin(ph), c = Math.cos(ph);
    // flash
    if (e.flash > 0) { e.flash -= dt; const f = Math.max(0, e.flash / 0.12); e.mats.armor.emissive.setRGB(f, f, f); e.mats.joint.emissive.setRGB(f * 0.6, f * 0.6, f * 0.6); }
    else if (e.mats.joint.emissive.r !== 0) { e.mats.armor.emissive.setRGB(0, 0, 0); e.mats.joint.emissive.setRGB(0, 0, 0); }
    const lg = e.type === 'rusher' ? 0.9 : 0.55;
    e.legs[0].rotation.x = s * lg * amp; e.legs[1].rotation.x = -s * lg * amp;
    e.knees[0].rotation.x = Math.max(0, -c) * 1.2 * amp + 0.18; e.knees[1].rotation.x = Math.max(0, c) * 1.2 * amp + 0.18;
    e.legs[0].rotation.x -= 0.1; e.legs[1].rotation.x -= 0.1;
    e.hips.position.y = (e.type === 'rusher' ? 1.0 : 1.15) - Math.abs(c) * 0.06 * amp - (e.type === 'rusher' ? 0.05 * amp : 0);
    e.hips.rotation.y = s * 0.12 * amp;
    const stg = e.stagger > 0 ? e.stagger : 0;
    if (e.type === 'rusher') {
      e.torso.rotation.x = 0.2 + amp * 0.15 - stg * 1.2;
      let a0 = -0.5 - s * 0.9 * amp, a1 = -0.5 + s * 0.9 * amp, f0 = -1.2, f1 = -1.2;
      if (e.atkState === 1) { const t = Math.min(1, e.atkT / 0.4); a0 = a1 = -2.4 * t; f0 = f1 = -0.3 * t - 0.9; e.torso.rotation.x = 0.45 - 0.35 * t; }
      else if (e.atkState === 2) { const t = Math.min(1, e.atkT / 0.15); a0 = a1 = -2.4 + 3.4 * t; f0 = f1 = -0.2; e.torso.rotation.x = 0.1 + 0.6 * t; }
      else if (e.atkState === 3) { const t = Math.min(1, e.atkT / 0.45); a0 = a1 = 1.0 * (1 - t); f0 = f1 = -0.2 - 0.7 * t; }
      e.arms[0].rotation.x = a0; e.arms[1].rotation.x = a1; e.fore[0].rotation.x = f0; e.fore[1].rotation.x = f1;
      e.arms[0].rotation.z = -0.25; e.arms[1].rotation.z = 0.25;
      const glow = e.atkState === 1 ? 1.6 + Math.min(1, e.atkT / 0.4) * 4 : 1.6;
      e.mats.accent.emissiveIntensity = glow;
      e.head.rotation.x = -0.35;
    } else {
      e.torso.rotation.x = 0.1 - stg * 1.0;
      const k = Math.min(1, dt * 8);
      e.torso.rotation.y += ((e.inRange ? e.aimYaw : 0) - e.torso.rotation.y) * k;
      e.arms[0].rotation.x = -0.7 - s * 0.4 * amp; e.fore[0].rotation.x = -1.0;
      e.arms[1].rotation.x += ((e.inRange ? -1.35 : -0.6 + s * 0.4 * amp) - e.arms[1].rotation.x) * k;
      e.fore[1].rotation.x = e.inRange ? -0.5 : -0.9;
      e.torso.rotation.z = s * 0.04 * amp;
      const ch = e.charge > 0 ? Math.min(1, e.charge / 0.75) : 0;
      e.mats.accent.emissiveIntensity = 1.4 + ch * 5 + Math.sin(performance.now() * 0.004) * 0.3;
      e.muzzle.scale.setScalar(0.12 + ch * 0.14);
      e.core.scale.set(0.24 + ch * 0.06, 0.24 + ch * 0.06, 0.12);
      e.cannon.rotation.x += ((e.inRange ? -e.aimPitch - 0.1 : -0.05) - e.cannon.rotation.x) * k;
    }
  }

  _updateDeath(e, dt) {
    e.deathT += dt;
    const t = e.deathT;
    for (let i = 0; i < e.parts.length; i++) {
      const m = e.parts[i], v = e.partVel[i], a = e.partAng[i];
      if (t < 2) {
        v.y -= 14 * dt;
        m.position.addScaledVector(v, dt);
        m.rotation.x += a.x * dt; m.rotation.y += a.y * dt; m.rotation.z += a.z * dt;
        const floor = 0.08;
        if (m.position.y < floor) { m.position.y = floor; v.y *= -0.3; v.x *= 0.6; v.z *= 0.6; a.multiplyScalar(0.6); }
      } else {
        m.position.y -= dt * 0.3;
      }
    }
    if (t < 0.15) { const f = 1 - t / 0.15; e.mats.accent.emissiveIntensity = 2 + f * 6; }
    else e.mats.accent.emissiveIntensity = Math.max(0, 2 * (1 - t / 1.5));
    const op = t < 2 ? 1 : Math.max(0, 1 - (t - 2) / 1.2);
    e.mats.armor.opacity = e.mats.joint.opacity = e.mats.accent.opacity = op;
  }
}
