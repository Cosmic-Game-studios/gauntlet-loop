// enemies.js - Arena enemy system (T-002). Procedural models, AI, grid A* nav, pooled projectiles/particles.
import * as THREE_NS from 'three';

export function createEnemySystem(ctx) {
  const THREE = ctx.THREE || THREE_NS;
  const scene = ctx.scene;
  const colliders = ctx.colliders || [];
  const B = ctx.bounds || { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
  const audio = ctx.audio || { play() {} };
  const onPlayerHit = ctx.onPlayerHit || (() => {});
  const onEnemyKilled = ctx.onEnemyKilled || (() => {});
  const onEnemyHurt = ctx.onEnemyHurt || (() => {});

  // ---------- tuning ----------
  const T = {
    rusher: { hp: 60, speed: 6.5, radius: 0.45, dmg: 12, cd: 0.8, range: 1.6, height: 1.3 },
    shooter: { hp: 80, speed: 3.6, radius: 0.5, dmg: 10, cd: 1.8, minD: 12, maxD: 20, height: 2.2 },
  };
  let diffSpeed = 1, diffDmg = 1, diffRate = 1;

  // ---------- scratch ----------
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const rayResult = { id: -1, point: hitPoint, distance: 0 };
  const _col = new THREE.Color();

  // ---------- shared geometry / materials ----------
  const G = {
    capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
    sphere: new THREE.SphereGeometry(0.5, 14, 10),
    lowSphere: new THREE.SphereGeometry(0.5, 8, 6),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  };
  const M = {
    rBody: new THREE.MeshStandardMaterial({ color: 0xd9a288, roughness: 0.5, metalness: 0.15, emissive: 0x000000 }),
    rGlow: new THREE.MeshStandardMaterial({ color: 0xff7a30, emissive: 0xff4a10, emissiveIntensity: 4.0, roughness: 0.4 }),
    rClaw: new THREE.MeshStandardMaterial({ color: 0xf0e0c8, roughness: 0.3, metalness: 0.6 }),
    sBody: new THREE.MeshStandardMaterial({ color: 0x7fa6b8, roughness: 0.32, metalness: 0.6, emissive: 0x06202a }),
    sGlow: new THREE.MeshStandardMaterial({ color: 0x40fff0, emissive: 0x20f0e0, emissiveIntensity: 2.4, roughness: 0.3 }),
    sDark: new THREE.MeshStandardMaterial({ color: 0x3a4d58, roughness: 0.55, metalness: 0.5, emissive: 0x04121a }),
    orb: new THREE.MeshBasicMaterial({ color: 0xaafff8 }),
    orbHalo: new THREE.MeshBasicMaterial({ color: 0x20e8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    pOrange: new THREE.MeshBasicMaterial({ color: 0xff7a20 }),
    pTeal: new THREE.MeshBasicMaterial({ color: 0x30fff0 }),
    pDark: new THREE.MeshBasicMaterial({ color: 0x2a2a2a }),
  };

  function part(parent, geo, mat, sx, sy, sz, x, y, z, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = shadow;
    parent.add(m);
    return m;
  }
  function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  // ---------- models ----------
  function buildRusher(e) {
    const root = new THREE.Group();
    const body = e.bodyMat = M.rBody.clone();
    const glow = e.glowMat = M.rGlow.clone();
    const hips = pivot(root, 0, 0.78, 0);
    // hunched torso leaning forward (+z is forward)
    const torso = pivot(hips, 0, 0, 0); torso.rotation.x = 0.85;
    part(torso, G.capsule, body, 0.62, 0.5, 0.5, 0, 0.42, 0);
    // glowing spine ridge
    for (let i = 0; i < 4; i++) {
      const c = part(torso, G.cone, glow, 0.12, 0.28, 0.12, 0, 0.2 + i * 0.17, -0.27);
      c.rotation.x = -1.2;
    }
    // chest stripe
    part(torso, G.box, glow, 0.6, 0.14, 0.08, 0, 0.55, 0.28, false);
    part(torso, G.box, glow, 0.6, 0.1, 0.08, 0, 0.3, 0.3, false);
    part(torso, G.box, glow, 0.08, 0.6, 0.08, 0, 0.42, -0.3, false);
    const neck = pivot(torso, 0, 0.9, 0.05);
    const head = pivot(neck, 0, 0, 0); head.rotation.x = -0.75;
    part(head, G.sphere, body, 0.42, 0.34, 0.5, 0, 0.08, 0.12);
    part(head, G.cone, body, 0.26, 0.34, 0.2, 0, -0.02, 0.38).rotation.x = Math.PI / 2; // snout
    part(head, G.lowSphere, glow, 0.15, 0.1, 0.1, -0.12, 0.14, 0.3, false);
    part(head, G.lowSphere, glow, 0.15, 0.1, 0.1, 0.12, 0.14, 0.3, false);
    // arms: long, clawed
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = pivot(torso, s * 0.36, 0.72, 0.05);
      part(sh, G.capsule, body, 0.16, 0.42, 0.16, 0, -0.32, 0);
      part(sh, G.box, glow, 0.2, 0.08, 0.2, 0, -0.1, 0, false);
      const el = pivot(sh, 0, -0.62, 0);
      part(el, G.capsule, body, 0.13, 0.4, 0.13, 0, -0.28, 0);
      for (let k = -1; k <= 1; k++) part(el, G.cone, M.rClaw, 0.05, 0.26, 0.05, k * 0.06, -0.62, 0.04).rotation.x = Math.PI;
      arms.push({ sh, el });
    }
    // legs: digitigrade
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = pivot(hips, s * 0.22, 0, 0);
      part(hip, G.capsule, body, 0.2, 0.3, 0.2, 0, -0.22, 0.04);
      part(hip, G.box, glow, 0.24, 0.07, 0.24, 0, -0.1, 0.04, false);
      const knee = pivot(hip, 0, -0.42, 0.08);
      part(knee, G.capsule, body, 0.13, 0.28, 0.13, 0, -0.18, 0);
      part(knee, G.box, glow, 0.14, 0.04, 0.1, 0, -0.08, 0.06, false);
      part(knee, G.cone, M.rClaw, 0.14, 0.18, 0.22, 0, -0.36, 0.08).rotation.x = Math.PI / 2;
      legs.push({ hip, knee });
    }
    e.rig = { root, hips, torso, head, neck, arms, legs };
    return root;
  }

  function buildShooter(e) {
    const root = new THREE.Group();
    const body = e.bodyMat = M.sBody.clone();
    const glow = e.glowMat = M.sGlow.clone();
    const hover = pivot(root, 0, 1.25, 0);
    const torso = pivot(hover, 0, 0, 0);
    part(torso, G.capsule, body, 0.7, 0.55, 0.55, 0, 0.3, 0);
    // shoulder plates
    part(torso, G.box, M.sDark, 1.25, 0.18, 0.5, 0, 0.72, 0);
    part(torso, G.box, glow, 1.05, 0.05, 0.54, 0, 0.62, 0, false);
    part(torso, G.box, glow, 0.62, 0.08, 0.58, 0, 0.05, 0, false);
    part(torso, G.box, glow, 0.08, 0.5, 0.58, 0, 0.32, 0, false);
    // glowing core
    const core = part(torso, G.sphere, glow, 0.34, 0.34, 0.34, 0, 0.32, 0.26, false);
    part(torso, G.cyl, M.sDark, 0.46, 0.08, 0.46, 0, 0.32, 0.22).rotation.x = Math.PI / 2;
    // head: tall visor fin
    const head = pivot(torso, 0, 0.95, 0);
    part(head, G.cone, body, 0.36, 0.5, 0.36, 0, 0.1, 0);
    part(head, G.box, glow, 0.3, 0.06, 0.1, 0, 0.04, 0.14, false);
    part(head, G.box, M.sDark, 0.04, 0.4, 0.3, 0, 0.3, -0.05);
    // arm cannon (right) + small left arm
    const gunPivot = pivot(torso, 0.55, 0.55, 0);
    part(gunPivot, G.capsule, body, 0.18, 0.3, 0.18, 0, -0.2, 0);
    const gun = pivot(gunPivot, 0, -0.4, 0.1);
    part(gun, G.cyl, M.sDark, 0.24, 0.8, 0.24, 0, 0, 0.3).rotation.x = Math.PI / 2;
    part(gun, G.cyl, glow, 0.27, 0.06, 0.27, 0, 0, 0.5, false).rotation.x = Math.PI / 2;
    const muzzle = part(gun, G.sphere, glow, 0.16, 0.16, 0.16, 0, 0, 0.72, false);
    const lArm = pivot(torso, -0.55, 0.55, 0);
    part(lArm, G.capsule, body, 0.14, 0.4, 0.14, 0, -0.3, 0);
    // thin legs dangling (hover stalker)
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = pivot(hover, s * 0.24, -0.2, 0);
      part(hip, G.capsule, body, 0.13, 0.45, 0.13, 0, -0.4, 0);
      part(hip, G.box, glow, 0.17, 0.06, 0.17, 0, -0.2, 0, false);
      part(hip, G.cone, M.sDark, 0.18, 0.3, 0.18, 0, -0.85, 0).rotation.x = Math.PI;
      legs.push(hip);
    }
    // hover thruster glow under body
    const jet = part(hover, G.lowSphere, glow, 0.3, 0.1, 0.3, 0, -0.1, 0, false);
    e.rig = { root, hover, torso, head, gunPivot, gun, muzzle, lArm, legs, core, jet };
    return root;
  }

  // ---------- nav grid ----------
  const gx0 = Math.floor(B.minX), gz0 = Math.floor(B.minZ);
  const GW = Math.max(1, Math.ceil(B.maxX) - gx0), GH = Math.max(1, Math.ceil(B.maxZ) - gz0);
  const NC = GW * GH;
  const blocked = new Uint8Array(NC);
  const INFL = 0.5;
  for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
    const x0 = gx0 + cx, z0 = gz0 + cz;
    for (const b of colliders) {
      if (b.max.y <= 0.4) continue;
      if (b.min.x - INFL < x0 + 1 && b.max.x + INFL > x0 && b.min.z - INFL < z0 + 1 && b.max.z + INFL > z0) { blocked[cz * GW + cx] = 1; break; }
    }
  }
  const gScore = new Float32Array(NC), fScore = new Float32Array(NC), cameFrom = new Int32Array(NC);
  const stamp = new Uint32Array(NC), closed = new Uint32Array(NC);
  let searchId = 0;
  const heap = new Int32Array(NC * 4); let heapN = 0;
  function hpush(n) { let i = heapN++; heap[i] = n; while (i > 0) { const p = (i - 1) >> 1; if (fScore[heap[p]] <= fScore[heap[i]]) break; const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
  function hpop() { const top = heap[0]; heap[0] = heap[--heapN]; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heapN && fScore[heap[l]] < fScore[heap[m]]) m = l; if (r < heapN && fScore[heap[r]] < fScore[heap[m]]) m = r; if (m === i) break; const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } return top; }
  const cellOf = (x, z) => { const cx = Math.min(GW - 1, Math.max(0, Math.floor(x - gx0))); const cz = Math.min(GH - 1, Math.max(0, Math.floor(z - gz0))); return cz * GW + cx; };
  function nearestFree(c) {
    if (!blocked[c]) return c;
    const cx = c % GW, cz = (c / GW) | 0;
    for (let r = 1; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= GW || z >= GH) continue;
      if (!blocked[z * GW + x]) return z * GW + x;
    }
    return c;
  }
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
  // writes path cells (start excluded) into out (Int32Array), returns length
  function findPath(sx, sz, tx, tz, out) {
    const s = nearestFree(cellOf(sx, sz)), t = nearestFree(cellOf(tx, tz));
    if (s === t) return 0;
    searchId++; heapN = 0;
    const tcx = t % GW, tcz = (t / GW) | 0;
    stamp[s] = searchId; gScore[s] = 0; cameFrom[s] = -1;
    fScore[s] = Math.hypot(s % GW - tcx, ((s / GW) | 0) - tcz); hpush(s);
    let found = false, iter = 0, best = s, bestH = 1e9;
    while (heapN > 0 && iter++ < 4000) {
      const c = hpop();
      if (closed[c] === searchId) continue;
      closed[c] = searchId;
      if (c === t) { found = true; break; }
      const cx = c % GW, cz = (c / GW) | 0;
      const h = Math.abs(cx - tcx) + Math.abs(cz - tcz); if (h < bestH) { bestH = h; best = c; }
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], nz = cz + DZ[k];
        if (nx < 0 || nz < 0 || nx >= GW || nz >= GH) continue;
        const n = nz * GW + nx;
        if (blocked[n] || closed[n] === searchId) continue;
        if (k >= 4 && (blocked[cz * GW + nx] || blocked[nz * GW + cx])) continue; // no corner cutting
        const g = gScore[c] + (k >= 4 ? 1.4142 : 1);
        if (stamp[n] !== searchId || g < gScore[n]) {
          stamp[n] = searchId; gScore[n] = g; cameFrom[n] = c;
          fScore[n] = g + Math.hypot(nx - tcx, nz - tcz);
          if (heapN < heap.length) hpush(n);
        }
      }
    }
    let c = found ? t : best, len = 0;
    while (c !== s && c >= 0 && len < 512) { tmpPath[len++] = c; c = cameFrom[c]; }
    const n = Math.min(len, out.length);
    for (let i = 0; i < n; i++) out[i] = tmpPath[len - 1 - i];
    return n;
  }
  const tmpPath = new Int32Array(512);

  // ---------- collision helpers ----------
  function circleBlocked(x, z, r, y0, y1) {
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (b.max.y <= 0.4 || b.max.y < y0 || b.min.y > y1) continue;
      const cx = Math.max(b.min.x, Math.min(x, b.max.x)), cz = Math.max(b.min.z, Math.min(z, b.max.z));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }
  function moveSlide(e, dx, dz) {
    const r = e.cfg.radius, p = e.pos;
    const nx = Math.min(B.maxX - r, Math.max(B.minX + r, p.x + dx));
    if (!circleBlocked(nx, p.z, r, 0.05, e.cfg.height)) p.x = nx;
    const nz = Math.min(B.maxZ - r, Math.max(B.minZ + r, p.z + dz));
    if (!circleBlocked(p.x, nz, r, 0.05, e.cfg.height)) p.z = nz;
  }
  function rayAABB(o, d, mn, mx, maxT) {
    let t0 = 0, t1 = maxT;
    for (let a = 0; a < 3; a++) {
      const oa = a === 0 ? o.x : a === 1 ? o.y : o.z;
      const da = a === 0 ? d.x : a === 1 ? d.y : d.z;
      const lo = a === 0 ? mn.x : a === 1 ? mn.y : mn.z;
      const hi = a === 0 ? mx.x : a === 1 ? mx.y : mx.z;
      if (Math.abs(da) < 1e-8) { if (oa < lo || oa > hi) return -1; continue; }
      let ta = (lo - oa) / da, tb = (hi - oa) / da;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
      if (t0 > t1) return -1;
    }
    return t0;
  }
  const losO = new THREE.Vector3(), losD = new THREE.Vector3();
  function lineOfSight(a, b) {
    losD.subVectors(b, a); const len = losD.length(); if (len < 1e-4) return true;
    losD.multiplyScalar(1 / len); losO.copy(a);
    for (let i = 0; i < colliders.length; i++) {
      const bx = colliders[i];
      if (rayAABB(losO, losD, bx.min, bx.max, len) >= 0) return false;
    }
    return true;
  }

  // ---------- pools ----------
  const PROJ_N = 48;
  const projectiles = [];
  for (let i = 0; i < PROJ_N; i++) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(G.lowSphere, M.orb); core.scale.setScalar(0.22); g.add(core);
    const halo = new THREE.Mesh(G.lowSphere, M.orbHalo); halo.scale.setScalar(0.5); g.add(halo);
    const trail = new THREE.Mesh(G.cone, M.orbHalo); trail.scale.set(0.3, 1.4, 0.3); trail.rotation.x = -Math.PI / 2; trail.position.z = -0.7; g.add(trail);
    g.visible = false; scene.add(g);
    projectiles.push({ obj: g, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, active: false, dmg: 10 });
  }
  const PART_N = 220;
  const particles = [];
  for (let i = 0; i < PART_N; i++) {
    const m = new THREE.Mesh(G.box, M.pOrange); m.visible = false; m.frustumCulled = true; scene.add(m);
    particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1, size: 0.1, active: false });
  }
  let partCursor = 0;
  function burst(pos, mat, count, speed, size) {
    for (let i = 0; i < count; i++) {
      const p = particles[partCursor]; partCursor = (partCursor + 1) % PART_N;
      p.active = true; p.life = p.max = 0.6 + Math.random() * 0.6; p.size = size * (0.6 + Math.random() * 0.8);
      p.mesh.material = (i % 4 === 3) ? M.pDark : mat; p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.position.y += Math.random() * 0.8;
      p.vel.set(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    }
  }
  function fireProjectile(from, dir, dmg) {
    for (let i = 0; i < PROJ_N; i++) {
      const p = projectiles[i]; if (p.active) continue;
      p.active = true; p.life = 4; p.dmg = dmg;
      p.pos.copy(from); p.vel.copy(dir).multiplyScalar(14);
      p.obj.position.copy(from); p.obj.visible = true;
      v3.copy(from).add(dir); p.obj.lookAt(v3);
      return;
    }
  }

  // ---------- enemies ----------
  const enemies = [];
  let nextId = 1, alive = 0, clock = 0;

  function spawn(type, x, y, z) {
    type = type === 'shooter' ? 'shooter' : 'rusher';
    const e = {
      id: nextId++, type, cfg: T[type], health: T[type].hp, alive: true,
      pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), knock: new THREE.Vector3(),
      yaw: 0, path: new Int32Array(96), pathLen: 0, pathIdx: 0, repath: Math.random() * 0.5,
      phase: Math.random() * 6.28, attackCd: 0.5 + Math.random(), windup: 0, lunge: 0,
      flash: 0, stagger: 0, deathT: 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0,
      charge: 0, fireCd: 1 + Math.random() * 1.2, hasLOS: false, listEntry: null,
    };
    e.root = type === 'rusher' ? buildRusher(e) : buildShooter(e);
    e.root.position.copy(e.pos);
    scene.add(e.root);
    // spawn in open space
    if (circleBlocked(e.pos.x, e.pos.z, e.cfg.radius, 0.05, e.cfg.height)) {
      const c = nearestFree(cellOf(x, z)); e.pos.x = gx0 + (c % GW) + 0.5; e.pos.z = gz0 + ((c / GW) | 0) + 0.5;
    }
    enemies.push(e); alive++;
    return e.id;
  }

  function byId(id) { for (let i = 0; i < enemies.length; i++) if (enemies[i].id === id) return enemies[i]; return null; }

  function setFlash(e, k) {
    // k: 0..1 flash strength; white-hot for body, glow boosted
    if (k > 0) { e.bodyMat.emissive.setRGB(k, k * 0.55, k * 0.45); e.glowMat.emissiveIntensity = 2.4 + k * 4; }
    else { e.bodyMat.emissive.setRGB(0, 0, 0); }
  }

  function damage(id, amount, point, dir) {
    const e = byId(id); if (!e || !e.alive) return false;
    e.health -= amount;
    e.flash = 0.14; e.stagger = e.type === 'rusher' ? 0.18 : 0.12;
    if (dir) { e.knock.x += dir.x * 3.5; e.knock.z += dir.z * 3.5; }
    if (e.type === 'rusher') { e.windup = 0; e.lunge = 0; } else e.charge = 0;
    audio.play('hit');
    onEnemyHurt(id);
    if (point) burst(point, e.type === 'rusher' ? M.pOrange : M.pTeal, 4, 3, 0.06);
    if (e.health <= 0) {
      e.health = 0; e.alive = false; e.deathT = 0; alive--;
      e.deathSpin = (Math.random() - 0.5) * 1.5;
      audio.play('enemyDeath');
      v1.copy(e.pos); v1.y += 0.3;
      burst(v1, e.type === 'rusher' ? M.pOrange : M.pTeal, 26, 5.5, 0.12);
      v2.copy(e.pos);
      onEnemyKilled(e.type, v2);
      return true;
    }
    return false;
  }

  // Hit volumes: rusher = sphere body + sphere head; shooter = tall capsule approximated by 2 spheres
  function raySphere(o, d, cx, cy, cz, r, maxT) {
    const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz;
    const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r;
    if (c > 0 && b > 0) return -1;
    const disc = b * b - c; if (disc < 0) return -1;
    const t = Math.max(0, -b - Math.sqrt(disc));
    return t <= maxT ? t : -1;
  }
  function raycast(origin, dir, maxDist) {
    let best = maxDist, bestE = null;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]; if (!e.alive) continue;
      const p = e.pos; let t;
      if (e.type === 'rusher') {
        const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
        t = raySphere(origin, dir, p.x, p.y + 0.85, p.z, 0.55, best); if (t >= 0 && t < best) { best = t; bestE = e; }
        t = raySphere(origin, dir, p.x + fx * 0.55, p.y + 1.15, p.z + fz * 0.55, 0.32, best); if (t >= 0 && t < best) { best = t; bestE = e; }
        t = raySphere(origin, dir, p.x, p.y + 0.35, p.z, 0.35, best); if (t >= 0 && t < best) { best = t; bestE = e; }
      } else {
        const hy = e.rig.hover.position.y;
        t = raySphere(origin, dir, p.x, p.y + hy + 0.3, p.z, 0.5, best); if (t >= 0 && t < best) { best = t; bestE = e; }
        t = raySphere(origin, dir, p.x, p.y + hy + 0.95, p.z, 0.32, best); if (t >= 0 && t < best) { best = t; bestE = e; }
        t = raySphere(origin, dir, p.x, p.y + hy - 0.55, p.z, 0.3, best); if (t >= 0 && t < best) { best = t; bestE = e; }
      }
    }
    if (!bestE) return null;
    rayResult.id = bestE.id; rayResult.distance = best;
    hitPoint.copy(dir).multiplyScalar(best).add(origin);
    return rayResult;
  }

  // ---------- update ----------
  const toP = new THREE.Vector3(), steer = new THREE.Vector3(), muzzleW = new THREE.Vector3(), aimDir = new THREE.Vector3();
  const playerFeet = new THREE.Vector3(), playerChest = new THREE.Vector3();
  function angLerp(a, b, k) { let d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return a + d * k; }

  function followPath(e, tx, tz) {
    // returns steer target in steer (xz)
    while (e.pathIdx < e.pathLen) {
      const c = e.path[e.pathIdx];
      const cx = gx0 + (c % GW) + 0.5, cz = gz0 + ((c / GW) | 0) + 0.5;
      const dx = cx - e.pos.x, dz = cz - e.pos.z;
      if (dx * dx + dz * dz < 0.36 && e.pathIdx < e.pathLen - 1) { e.pathIdx++; continue; }
      steer.set(dx, 0, dz); return;
    }
    steer.set(tx - e.pos.x, 0, tz - e.pos.z);
  }

  function update(dt, playerPos, playerAlive) {
    if (dt > 0.1) dt = 0.1;
    clock += dt;
    playerFeet.set(playerPos.x, 0, playerPos.z);
    playerChest.set(playerPos.x, playerPos.y - 0.5, playerPos.z);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i], cfg = e.cfg, rig = e.rig;
      if (!e.alive) {
        e.deathT += dt;
        const k = Math.min(1, e.deathT / 0.6);
        setFlash(e, Math.max(0, 0.6 - e.deathT) * 1.2);
        e.glowMat.emissiveIntensity = 2.4 * (1 - k);
        if (e.type === 'rusher') { rig.root.rotation.z = k * 1.4 * Math.sign(e.deathSpin || 1); rig.root.position.y = -k * 0.3; }
        else { rig.hover.position.y = Math.max(0.35, rig.hover.position.y - dt * 4); rig.root.rotation.x = k * 1.2; }
        const s = e.deathT < 0.6 ? 1 : Math.max(0.01, 1 - (e.deathT - 0.6) / 0.45);
        rig.root.scale.setScalar(s);
        if (e.deathT >= 1.05) {
          scene.remove(rig.root); e.bodyMat.dispose(); e.glowMat.dispose();
          enemies.splice(i, 1);
        }
        continue;
      }
      e.phase += dt;
      if (e.flash > 0) { e.flash -= dt; setFlash(e, Math.max(0, e.flash / 0.14)); } else if (e.bodyMat.emissive.r !== 0) setFlash(e, 0);
      if (e.type === 'rusher' && e.flash <= 0) e.glowMat.emissiveIntensity = 4.0;
      if (e.type === 'shooter' && e.flash <= 0) e.glowMat.emissiveIntensity = 2.0 + e.charge * 5 + Math.sin(e.phase * 3) * 0.3;

      toP.subVectors(playerFeet, e.pos); toP.y = 0;
      const dist = toP.length();
      // repath
      e.repath -= dt;
      if (e.repath <= 0) {
        e.repath = 0.5;
        let tx = playerFeet.x, tz = playerFeet.z;
        if (e.type === 'shooter' && dist > 1e-3 && e.hasLOS) {
          const want = dist < cfg.minD ? cfg.minD + 2 : dist > cfg.maxD ? cfg.maxD - 3 : dist;
          tx = playerFeet.x - (toP.x / dist) * want; tz = playerFeet.z - (toP.z / dist) * want;
        }
        e.pathLen = findPath(e.pos.x, e.pos.z, tx, tz, e.path); e.pathIdx = 0;
        e.goalX = tx; e.goalZ = tz;
      }
      let speed = cfg.speed * diffSpeed;
      let desiredYaw = Math.atan2(toP.x, toP.z);
      steer.set(0, 0, 0);

      if (e.type === 'rusher') {
        e.attackCd -= dt;
        if (e.windup > 0) {
          e.windup -= dt; speed = 0;
          if (e.windup <= 0) { e.lunge = 0.22; }
        } else if (e.lunge > 0) {
          e.lunge -= dt;
          steer.copy(toP); speed = cfg.speed * 1.9 * diffSpeed;
          if (playerAlive && dist < cfg.range + 0.2 && !e.hitDone) {
            e.hitDone = true; audio.play('enemyMelee');
            v1.copy(e.pos); v1.y = 1;
            onPlayerHit(Math.round(cfg.dmg * diffDmg), v1);
          }
          if (e.lunge <= 0) e.attackCd = cfg.cd / diffRate;
        } else if (playerAlive && dist < cfg.range + 0.5 && e.attackCd <= 0 && Math.abs(playerPos.y - 1.6) < 1.8) {
          e.windup = 0.28; e.hitDone = false;
        } else if (playerAlive) {
          if (dist < 3.5 && lineOfSight(v1.set(e.pos.x, 0.8, e.pos.z), v2.set(playerFeet.x, 0.8, playerFeet.z))) steer.copy(toP);
          else followPath(e, playerFeet.x, playerFeet.z);
          if (dist < cfg.range * 0.7) speed = 0;
        } else speed *= 0.2, steer.set(Math.sin(e.phase * 0.7), 0, Math.cos(e.phase * 0.7));
      } else {
        // shooter
        muzzleW.set(e.pos.x, e.pos.y + rig.hover.position.y + 0.3, e.pos.z);
        e.hasLOS = playerAlive && lineOfSight(muzzleW, playerChest);
        e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = 1.5 + Math.random() * 2; e.strafe = -e.strafe; }
        if (dist < cfg.minD - 1 || dist > cfg.maxD || !e.hasLOS) {
          followPath(e, e.goalX ?? e.pos.x, e.goalZ ?? e.pos.z);
          if (!e.hasLOS && e.pathIdx >= e.pathLen && dist > 1e-3) { steer.set(toP.z / dist * e.strafe, 0, -toP.x / dist * e.strafe); } // path spent, no LOS: sidestep
          if (dist < cfg.minD - 1 && e.hasLOS) { steer.set(-toP.x, 0, -toP.z); }
        } else if (dist > 1e-3) {
          steer.set(toP.z / dist * e.strafe, 0, -toP.x / dist * e.strafe); speed *= 0.45;
        }
        if (e.charge > 0 || (e.hasLOS && dist < cfg.maxD + 6)) e.fireCd -= dt * diffRate;
        if (e.fireCd <= 0.45 && e.hasLOS && playerAlive) {
          e.charge = Math.min(1, 1 - e.fireCd / 0.45); speed *= 0.3;
          if (e.fireCd <= 0) {
            e.charge = 0; e.fireCd = cfg.cd;
            rig.muzzle.getWorldPosition(muzzleW);
            aimDir.subVectors(playerChest, muzzleW).normalize();
            fireProjectile(muzzleW, aimDir, Math.round(cfg.dmg * diffDmg));
            e.recoil = 0.15;
            audio.play('enemyShoot');
          }
        } else if (e.fireCd <= 0) { e.fireCd = 0.2; e.charge = 0; } else e.charge = Math.max(0, e.charge - dt * 3);
      }

      // separation
      for (let j = 0; j < enemies.length; j++) {
        const o = enemies[j]; if (o === e || !o.alive) continue;
        const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d2 = dx * dx + dz * dz, rr = cfg.radius + o.cfg.radius + 0.4;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), w = (rr - d) / rr * 2.5; steer.x += dx / d * w; steer.z += dz / d * w; }
      }
      if (e.stagger > 0) { e.stagger -= dt; speed *= 0.15; }
      const sl = Math.hypot(steer.x, steer.z);
      let tvx = 0, tvz = 0;
      if (sl > 1e-4) { tvx = steer.x / sl * speed; tvz = steer.z / sl * speed; }
      const acc = Math.min(1, dt * (e.type === 'rusher' ? 10 : 5));
      e.vel.x += (tvx - e.vel.x) * acc; e.vel.z += (tvz - e.vel.z) * acc;
      moveSlide(e, (e.vel.x + e.knock.x) * dt, (e.vel.z + e.knock.z) * dt);
      const kd = Math.max(0, 1 - dt * 8); e.knock.x *= kd; e.knock.z *= kd;
      const moveSpd = Math.hypot(e.vel.x, e.vel.z);
      if (e.type === 'shooter' || moveSpd < 0.5 || e.windup > 0 || e.lunge > 0 || dist < 4) { /* face player */ }
      else desiredYaw = Math.atan2(e.vel.x, e.vel.z);
      e.yaw = angLerp(e.yaw, desiredYaw, Math.min(1, dt * 10));

      // ---- animation ----
      rig.root.position.copy(e.pos); rig.root.rotation.y = e.yaw;
      if (e.type === 'rusher') {
        const run = Math.min(1, moveSpd / cfg.speed);
        e.gait = (e.gait || 0) + dt * (4 + moveSpd * 1.9);
        const g = e.gait, sw = Math.sin(g), sw2 = Math.sin(g * 2);
        rig.hips.position.y = 0.78 - run * 0.06 + Math.abs(Math.cos(g)) * 0.09 * run + Math.sin(e.phase * 2) * 0.015;
        rig.legs[0].hip.rotation.x = sw * 0.9 * run; rig.legs[1].hip.rotation.x = -sw * 0.9 * run;
        rig.legs[0].knee.rotation.x = (0.5 + Math.max(0, -sw) * 1.1) * run - 0.2;
        rig.legs[1].knee.rotation.x = (0.5 + Math.max(0, sw) * 1.1) * run - 0.2;
        let torsoX = 0.85 + run * 0.15 + sw2 * 0.04 * run, armA = -sw * 0.8 * run, armB = sw * 0.8 * run, elbow = -0.5;
        if (e.windup > 0) { const k = 1 - e.windup / 0.28; torsoX = 0.6 - k * 0.2; armA = armB = -2.4 * k; elbow = -1.2 * k; }
        else if (e.lunge > 0) { const k = e.lunge / 0.22; torsoX = 1.25; armA = armB = -2.4 * k + 0.4 * (1 - k); elbow = -0.1; }
        if (e.stagger > 0) torsoX -= e.stagger * 2.5;
        rig.torso.rotation.x = torsoX; rig.torso.rotation.z = Math.sin(g) * 0.08 * run;
        rig.arms[0].sh.rotation.x = armA; rig.arms[1].sh.rotation.x = armB;
        rig.arms[0].sh.rotation.z = 0.25; rig.arms[1].sh.rotation.z = -0.25;
        rig.arms[0].el.rotation.x = elbow; rig.arms[1].el.rotation.x = elbow;
        rig.neck.rotation.x = -torsoX * 0.5 + 0.35 + Math.sin(e.phase * 5) * 0.05;
      } else {
        const t = e.phase;
        rig.hover.position.y = 1.25 + Math.sin(t * 2.1) * 0.12;
        rig.torso.rotation.z = -e.vel.x * 0.02 + Math.sin(t * 1.3) * 0.04;
        rig.torso.rotation.x = e.stagger > 0 ? -e.stagger * 2 : Math.sin(t * 1.7) * 0.03;
        rig.legs[0].rotation.x = Math.sin(t * 2.1) * 0.15 + 0.1; rig.legs[1].rotation.x = -Math.sin(t * 2.1) * 0.15 + 0.1;
        // aim gun arm at player (pitch)
        const hy = e.pos.y + rig.hover.position.y + 0.15;
        const pitch = Math.atan2(playerChest.y - hy, Math.max(0.5, dist));
        e.recoil = Math.max(0, (e.recoil || 0) - dt);
        rig.gunPivot.rotation.x = -Math.PI / 2 - pitch + e.recoil * 3; // arm points forward
        rig.gun.rotation.x = Math.PI / 2;
        rig.muzzle.scale.setScalar(0.16 + e.charge * 0.22 + Math.sin(t * 30) * 0.02 * e.charge);
        rig.core.scale.setScalar(0.34 + Math.sin(t * 4) * 0.02 + e.charge * 0.08);
        rig.jet.scale.set(0.3 + Math.sin(t * 20) * 0.03, 0.1, 0.3 + Math.sin(t * 20) * 0.03);
        rig.lArm.rotation.x = Math.sin(t * 1.5) * 0.15 - 0.2;
        rig.head.rotation.y = Math.sin(t * 0.9) * 0.15;
      }
    }

    // projectiles
    const pr = 0.5, pr2 = pr * pr;
    for (let i = 0; i < PROJ_N; i++) {
      const p = projectiles[i]; if (!p.active) continue;
      p.life -= dt;
      const sx = p.pos.x, sy = p.pos.y, sz = p.pos.z;
      p.pos.addScaledVector(p.vel, dt);
      let dead = p.life <= 0 || p.pos.x < B.minX - 5 || p.pos.x > B.maxX + 5 || p.pos.z < B.minZ - 5 || p.pos.z > B.maxZ + 5 || p.pos.y < 0;
      if (!dead) for (let c = 0; c < colliders.length; c++) {
        const b = colliders[c];
        for (let s = 1; s <= 2; s++) { // end and midpoint, avoids tunnelling on long frames
          const f = s === 1 ? 1 : 0.5, qx = sx + (p.pos.x - sx) * f, qy = sy + (p.pos.y - sy) * f, qz = sz + (p.pos.z - sz) * f;
          if (qx > b.min.x && qx < b.max.x && qy > b.min.y && qy < b.max.y && qz > b.min.z && qz < b.max.z) { dead = true; break; }
        }
        if (dead) break;
      }
      if (!dead && playerAlive) {
        // segment (eye-0.8 .. eye) vs point, radius 0.5, checked at start/mid/end of step
        for (let s = 0; s <= 2 && !dead; s++) {
          const f = s / 2;
          const px = sx + (p.pos.x - sx) * f, py = sy + (p.pos.y - sy) * f, pz = sz + (p.pos.z - sz) * f;
          const cy = Math.max(playerPos.y - 0.8 - 0.8, Math.min(py, playerPos.y)); // capsule body spans to feet-ish
          const dx = px - playerPos.x, dy = py - cy, dz = pz - playerPos.z;
          if (dx * dx + dy * dy + dz * dz < pr2) {
            dead = true; v1.set(sx, sy, sz); onPlayerHit(p.dmg, v1);
          }
        }
      }
      if (dead) { p.active = false; p.obj.visible = false; burst(p.pos, M.pTeal, 5, 2.5, 0.05); continue; }
      p.obj.position.copy(p.pos);
      const pulse = 1 + Math.sin(clock * 40 + i) * 0.12; p.obj.children[1].scale.setScalar(0.5 * pulse);
    }
    // particles
    for (let i = 0; i < PART_N; i++) {
      const p = particles[i]; if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.mesh.visible = false; continue; }
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.03) { p.mesh.position.y = 0.03; p.vel.y *= -0.3; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      p.mesh.rotation.x += dt * 6; p.mesh.rotation.y += dt * 4;
      p.mesh.scale.setScalar(p.size * Math.min(1, p.life / p.max * 2));
    }
  }

  function list() {
    const out = [];
    for (const e of enemies) out.push({ id: e.id, type: e.type, health: e.health, pos: [e.pos.x, e.pos.y, e.pos.z], alive: e.alive });
    return out;
  }
  function clear() {
    for (const e of enemies) { scene.remove(e.rig.root); e.bodyMat.dispose(); e.glowMat.dispose(); }
    enemies.length = 0; alive = 0;
    for (const p of projectiles) { p.active = false; p.obj.visible = false; }
    for (const p of particles) { p.active = false; p.mesh.visible = false; }
  }
  function setDifficulty(level) {
    const l = Math.max(1, Math.min(5, level | 0 || 1)) - 1;
    diffSpeed = 1 + l * 0.06; diffDmg = 1 + l * 0.1; diffRate = 1 + l * 0.1;
  }

  return { spawn, update, raycast, damage, list, aliveCount: () => alive, clear, setDifficulty, _debug: { enemies, projectiles, blocked, GW, GH } };
}
