// T3 enemies: procedural models, code animation, grid A* nav, pooled projectiles + particles.
// Interface: studio/ARCHITECTURE.md (enemies.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, ENEMY } from './config.js';

const CELL = 1, MAX_PROJ = 32, MAX_PART = 96, PATH_MAX = 256;

export function createEnemies(ctx) {
  const { scene, world, audio, player } = ctx;
  // ---- shared geometry / materials
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 14, 10),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 10), cone: new THREE.ConeGeometry(1, 1, 8),
  };
  const matDark = new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: 0.55, metalness: 0.6 });
  const matProj = new THREE.MeshBasicMaterial({ color: PALETTE.projectile });
  const matTrail = new THREE.MeshBasicMaterial({ color: PALETTE.projectile, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  const matPart = { rusher: new THREE.MeshBasicMaterial({ color: PALETTE.rusher }), shooter: new THREE.MeshBasicMaterial({ color: PALETTE.shooter }), proj: new THREE.MeshBasicMaterial({ color: PALETTE.projectile }) };
  const T = new THREE.Vector3(), T2 = new THREE.Vector3(), T3 = new THREE.Vector3();

  // fresnel rim on body materials so silhouettes read against the dark floor at 20 m
  function rimify(mat, rimHex, str) {
    const rc = new THREE.Color(rimHex);
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n{ float fr = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);\n' +
        '  totalEmissiveRadiance += vec3(' + rc.r.toFixed(3) + ',' + rc.g.toFixed(3) + ',' + rc.b.toFixed(3) + ') * pow(fr, 2.2) * ' + str.toFixed(2) + '; }');
    };
    mat.customProgramCacheKey = () => 'rim' + rimHex + str;
    return mat;
  }
  const HIT_P = new THREE.Vector3(), HIT = { id: 0, point: HIT_P, distance: 0 }, LIST = [];

  const MERGED = new Map(); // per type: merged geometry shared across enemies
  function part(parent, geo, mat, sx, sy, sz, x, y, z) { // recorded, merged per (group, material) in bake()
    const o = new THREE.Object3D(); o.scale.set(sx, sy, sz); o.position.set(x, y, z);
    (parent.userData.pend || (parent.userData.pend = [])).push({ o, geo, mat }); return o;
  }
  function realPart(parent, geo, mat, sx, sy, sz, x, y, z) {
    const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m;
  }
  function bake(root, e) {
    let gi = 0; const type = e.type;
    root.traverse((g) => {
      const pend = g.userData.pend; if (!pend) return; const my = gi++;
      const byMat = new Map();
      for (const p of pend) { if (!byMat.has(p.mat)) byMat.set(p.mat, []); byMat.get(p.mat).push(p); }
      let mi = 0;
      for (const [mat, list] of byMat) {
        const key = type + ':' + my + ':' + (mi++); let geo = MERGED.get(key);
        if (!geo) {
          geo = mergeGeometries(list.map(p => { p.o.updateMatrix(); const gg = p.geo.clone(); gg.applyMatrix4(p.o.matrix); return gg; }));
          MERGED.set(key, geo);
        }
        const m = new THREE.Mesh(geo, mat); m.castShadow = g === e.torso; g.add(m);
      }
      g.userData.pend = null;
    });
  }
  function grp(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  function buildRusher(e) {
    const col = PALETTE.rusher;
    const body = rimify(new THREE.MeshStandardMaterial({ color: 0xd8401a, roughness: 0.5, metalness: 0.1, emissive: 0xe8300a, emissiveIntensity: 0.4 }), 0xff9a50, 1.0);
    e.baseEm = new THREE.Color(0xe8300a).multiplyScalar(0.4);
    const glow = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2 });
    e.mats = [body, glow]; e.glow = glow; e.body = body;
    const root = new THREE.Group();
    const hips = grp(root, 0, 0.78, 0); e.hips = hips;
    const torso = grp(hips, 0, 0.05, 0.05); torso.rotation.x = 0.75; e.torso = torso;
    part(torso, G.sph, body, 0.34, 0.3, 0.42, 0, 0.25, 0.05);
    part(torso, G.box, matDark, 0.44, 0.12, 0.5, 0, 0.44, 0.0); // spine plate
    for (let i = 0; i < 3; i++) part(torso, G.cone, glow, 0.07, 0.22, 0.07, 0, 0.55, -0.15 + i * 0.16).rotation.x = -0.4; // dorsal spikes
    const head = grp(torso, 0, 0.35, 0.42); head.rotation.x = -0.6; e.head = head;
    part(head, G.box, body, 0.3, 0.2, 0.34, 0, 0, 0.1);
    part(head, G.box, matDark, 0.26, 0.08, 0.3, 0, -0.12, 0.14); // jaw
    part(head, G.box, glow, 0.24, 0.05, 0.04, 0, 0.03, 0.28); // visor slit
    e.arms = [];
    for (const s of [-1, 1]) {
      const sh = grp(torso, 0.3 * s, 0.3, 0.3);
      part(sh, G.box, body, 0.12, 0.42, 0.12, 0, -0.2, 0);
      const fore = grp(sh, 0, -0.4, 0);
      part(fore, G.box, matDark, 0.1, 0.4, 0.1, 0, -0.18, 0.04);
      e.arms.push({ sh, fore });
    }
    e.legs = [];
    for (const s of [-1, 1]) {
      const th = grp(hips, 0.2 * s, 0, -0.05);
      part(th, G.box, body, 0.15, 0.42, 0.17, 0, -0.18, 0.06).rotation.x = -0.35;
      const sh = grp(th, 0, -0.38, 0.12);
      part(sh, G.box, matDark, 0.1, 0.44, 0.1, 0, -0.2, -0.06).rotation.x = 0.3;
      e.legs.push({ th, sh });
    }
    bake(root, e);
    e.hitSpheres = [[0, 0.95, 0.25, 0.55], [0, 0.45, 0, 0.35]];
    return root;
  }

  function buildShooter(e) {
    const col = PALETTE.shooter;
    const body = rimify(new THREE.MeshStandardMaterial({ color: 0x9a78e0, roughness: 0.45, metalness: 0.15, emissive: 0x6a3ae0, emissiveIntensity: 0.45 }), 0xd8b8ff, 2.2);
    e.baseEm = new THREE.Color(0x6a3ae0).multiplyScalar(0.45);
    const glow = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.0 });
    const eye = new THREE.MeshStandardMaterial({ color: PALETTE.projectile, emissive: PALETTE.projectile, emissiveIntensity: 1.5 });
    e.mats = [body, glow, eye]; e.glow = glow; e.body = body; e.eye = eye;
    const root = new THREE.Group();
    const hips = grp(root, 0, 1.15, 0); e.hips = hips;
    part(hips, G.box, matDark, 0.5, 0.18, 0.35, 0, 0, 0);
    const torso = grp(hips, 0, 0.12, 0); e.torso = torso;
    part(torso, G.box, body, 0.7, 0.55, 0.5, 0, 0.35, 0);
    part(torso, G.box, glow, 0.72, 0.06, 0.52, 0, 0.2, 0);
    const head = grp(torso, 0, 0.72, 0.05); e.head = head;
    part(head, G.sph, body, 0.3, 0.27, 0.3, 0, 0.02, 0);
    part(head, G.cyl, matDark, 0.2, 0.1, 0.2, 0, 0, 0.22).rotation.x = Math.PI / 2;
    part(head, G.sph, eye, 0.17, 0.17, 0.08, 0, 0, 0.29);
    e.arms = [];
    for (const s of [-1, 1]) {
      const sh = grp(torso, 0.45 * s, 0.5, 0);
      part(sh, G.sph, matDark, 0.13, 0.13, 0.13, 0, 0, 0);
      if (s > 0) { // cannon arm
        part(sh, G.box, body, 0.16, 0.16, 0.5, 0.05, -0.1, 0.2);
        part(sh, G.cyl, matDark, 0.1, 0.5, 0.1, 0.05, -0.1, 0.55).rotation.x = Math.PI / 2;
        e.muzzle = realPart(sh, G.sph, eye, 0.09, 0.09, 0.09, 0.05, -0.1, 0.82);
      } else part(sh, G.box, body, 0.12, 0.55, 0.14, 0, -0.3, 0.05);
      e.arms.push({ sh, fore: sh });
    }
    e.legs = [];
    for (const s of [-1, 1]) {
      const th = grp(hips, 0.2 * s, -0.05, 0);
      part(th, G.box, body, 0.16, 0.6, 0.18, 0, -0.28, 0);
      const sh = grp(th, 0, -0.56, 0);
      part(sh, G.box, matDark, 0.12, 0.55, 0.12, 0, -0.26, 0);
      part(sh, G.box, glow, 0.2, 0.06, 0.34, 0, -0.52, 0.05);
      e.legs.push({ th, sh });
    }
    bake(root, e);
    e.hitSpheres = [[0, 1.65, 0, 0.55], [0, 2.0, 0.05, 0.3], [0, 0.75, 0, 0.4]];
    return root;
  }

  // ---- nav grid
  let grid = null, gw = 0, gh = 0, gx0 = 0, gz0 = 0, gScore, fScore, came, closed, heap, heapN = 0, stamp, curStamp = 0;
  function buildGrid() {
    const b = world.bounds; gx0 = b.minX; gz0 = b.minZ;
    gw = Math.max(1, Math.ceil((b.maxX - b.minX) / CELL)); gh = Math.max(1, Math.ceil((b.maxZ - b.minZ) / CELL));
    const n = gw * gh; grid = new Uint8Array(n);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grid[j * gw + i] = world.isBlocked(gx0 + (i + 0.5) * CELL, gz0 + (j + 0.5) * CELL, 0.45) ? 1 : 0;
    gScore = new Float32Array(n); fScore = new Float32Array(n); came = new Int32Array(n); closed = new Uint32Array(n); stamp = new Uint32Array(n); heap = new Int32Array(n * 4);
  }
  const cellOf = (x, z) => { const i = Math.min(gw - 1, Math.max(0, Math.floor((x - gx0) / CELL))), j = Math.min(gh - 1, Math.max(0, Math.floor((z - gz0) / CELL))); return j * gw + i; };
  function nearestOpen(c) {
    if (!grid[c]) return c; const ci = c % gw, cj = (c / gw) | 0;
    for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= gw || j >= gh) continue; if (!grid[j * gw + i]) return j * gw + i;
    }
    return c;
  }
  function hpush(c) { let k = heapN++; heap[k] = c; while (k > 0) { const p = (k - 1) >> 1; if (fScore[heap[p]] <= fScore[heap[k]]) break; const t = heap[p]; heap[p] = heap[k]; heap[k] = t; k = p; } }
  function hpop() { const top = heap[0]; heap[0] = heap[--heapN]; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heapN && fScore[heap[l]] < fScore[heap[m]]) m = l; if (r < heapN && fScore[heap[r]] < fScore[heap[m]]) m = r; if (m === k) break; const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m; } return top; }
  function astar(sx, sz, tx, tz, out) { // writes cells goal->start into out, returns length
    let s = nearestOpen(cellOf(sx, sz)); const g = nearestOpen(cellOf(tx, tz)); curStamp++; heapN = 0;
    const gi = g % gw, gj = (g / gw) | 0;
    gScore[s] = 0; stamp[s] = curStamp; came[s] = -1; fScore[s] = Math.hypot(s % gw - gi, ((s / gw) | 0) - gj); hpush(s);
    let found = false, iter = 0;
    while (heapN > 0 && iter++ < 4000) {
      const c = hpop(); if (c === g) { found = true; break; }
      if (closed[c] === curStamp) continue; closed[c] = curStamp;
      const ci = c % gw, cj = (c / gw) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
        const n = j * gw + i; if (grid[n] || closed[n] === curStamp) continue;
        if (di && dj && (grid[cj * gw + i] || grid[j * gw + ci])) continue; // no corner cutting
        const ng = gScore[c] + (di && dj ? 1.4142 : 1);
        if (stamp[n] !== curStamp || ng < gScore[n]) { stamp[n] = curStamp; gScore[n] = ng; came[n] = c; fScore[n] = ng + Math.hypot(i - gi, j - gj); if (heapN < heap.length) hpush(n); }
      }
    }
    if (!found) return 0;
    let len = 0, c = g; while (c !== -1 && len < PATH_MAX) { out[len++] = c; c = came[c]; }
    return len;
  }
  function losClear(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.4);
    for (let k = 1; k < n; k++) { const t = k / n; if (world.isBlocked(ax + (bx - ax) * t, az + (bz - az) * t, 0.3)) return false; }
    return true;
  }

  // ---- projectiles & particles (pooled)
  const projs = [];
  for (let i = 0; i < MAX_PROJ; i++) {
    const m = new THREE.Mesh(G.sph, matProj); m.scale.setScalar(0.16); m.visible = false; scene.add(m);
    const halo = new THREE.Mesh(G.sph, matTrail); halo.scale.setScalar(2.1); m.add(halo);
    const tr = new THREE.Mesh(G.cone, matTrail); tr.visible = false; scene.add(tr);
    projs.push({ m, tr, vel: new THREE.Vector3(), life: 0, dmg: 0, active: false });
  }
  const parts = [];
  for (let i = 0; i < MAX_PART; i++) { const m = new THREE.Mesh(G.box, matPart.rusher); m.visible = false; scene.add(m); parts.push({ m, vel: new THREE.Vector3(), life: 0 }); }
  let partIdx = 0;
  function burst(pos, mat, n, speed) {
    for (let k = 0; k < n; k++) {
      const p = parts[partIdx = (partIdx + 1) % MAX_PART]; p.m.material = mat; p.m.visible = true; p.life = 0.6 + Math.random() * 0.5;
      p.m.position.copy(pos); p.m.scale.setScalar(0.06 + Math.random() * 0.08);
      p.vel.set(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
    }
  }
  const UP = new THREE.Vector3(0, 1, 0), QT = new THREE.Quaternion();
  function fire(e) {
    const p = projs.find(q => !q.active); if (!p) return;
    e.muzzle.getWorldPosition(T); p.m.position.copy(T);
    T2.copy(player.eye).addScaledVector(player.position, 0).sub(T); T2.y -= 0.25; T2.normalize();
    p.vel.copy(T2).multiplyScalar(ENEMY.shooter.projSpeed); p.life = 4; p.dmg = ENEMY.shooter.dmg * e.dmgMul; p.active = true; p.m.visible = true; p.tr.visible = true;
    audio.play('shooter_fire', { pos: T }); burst(T, matPart.proj, 4, 2);
  }

  // ---- enemies
  const enemies = []; let nextId = 1;
  function spawn(type, x, y, z, opts = {}) {
    if (!grid) buildGrid();
    const st = ENEMY[type] || ENEMY.rusher; type = ENEMY[type] ? type : 'rusher';
    const e = { id: nextId++, type, hpMax: st.hp * (opts.hpMul || 1), speed: st.speed * (opts.speedMul || 1), dmgMul: opts.dmgMul || 1,
      pos: new THREE.Vector3(x, y || 0, z), vel: new THREE.Vector3(), knock: new THREE.Vector3(), yaw: 0, alive: true, dying: 0, removed: false,
      phase: Math.random() * 6, t: Math.random() * 3, flash: 0, flinch: 0, atkCd: 0.5, atk: 0, charge: 0, fireCd: 1.5 + Math.random(), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 2,
      path: new Int32Array(PATH_MAX), pathLen: 0, pathIdx: 0, repath: 0, alerted: false, radius: type === 'rusher' ? 0.45 : 0.5, _out: { id: 0, type, health: 0, pos: [0, 0, 0], alive: true } };
    e.health = e.hpMax;
    e.root = type === 'rusher' ? buildRusher(e) : buildShooter(e);
    e.root.position.copy(e.pos); scene.add(e.root); enemies.push(e);
    return e.id;
  }
  function resolveCollide(e) {
    const cs = world.colliders, r = e.radius, p = e.pos;
    for (let i = 0; i < cs.length; i++) {
      const b = cs[i]; if (b.max.y < p.y + 0.4 || b.min.y > p.y + 1.5) continue;
      const cx = Math.max(b.min.x, Math.min(p.x, b.max.x)), cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
      let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; }
      else { // center inside: push out along smallest axis
        const l = p.x - b.min.x, rr = b.max.x - p.x, f = p.z - b.min.z, bk = b.max.z - p.z, m = Math.min(l, rr, f, bk);
        if (m === l) p.x = b.min.x - r; else if (m === rr) p.x = b.max.x + r; else if (m === f) p.z = b.min.z - r; else p.z = b.max.z + r;
      }
    }
    const bd = world.bounds; p.x = Math.min(bd.maxX, Math.max(bd.minX, p.x)); p.z = Math.min(bd.maxZ, Math.max(bd.minZ, p.z));
  }
  const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

  function steerTo(e, dt, tx, tz, desiredX, desiredZ) {
    // desired direction into T (x,z) via LOS or A* path
    const tp = player.position;
    e.repath -= dt;
    if (losClear(e.pos.x, e.pos.z, tx, tz)) { T.set(tx - e.pos.x, 0, tz - e.pos.z); e.pathLen = 0; }
    else {
      if (e.repath <= 0 || e.pathLen === 0) { e.repath = 0.5; e.pathLen = astar(e.pos.x, e.pos.z, tx, tz, e.path); e.pathIdx = e.pathLen - 2; }
      while (e.pathIdx >= 0) {
        const c = e.path[e.pathIdx], cx = gx0 + (c % gw + 0.5) * CELL, cz = gz0 + (((c / gw) | 0) + 0.5) * CELL;
        if (Math.hypot(cx - e.pos.x, cz - e.pos.z) < 0.6) { e.pathIdx--; continue; }
        // skip ahead if next-next visible
        T.set(cx - e.pos.x, 0, cz - e.pos.z); break;
      }
      if (e.pathIdx < 0) T.set(tx - e.pos.x, 0, tz - e.pos.z);
    }
    void tp; void desiredX; void desiredZ;
    const l = T.length(); if (l > 1e-4) T.multiplyScalar(1 / l);
    return T;
  }

  function flashSet(e, k) { const b = e.baseEm; e.body.emissiveIntensity = 1; e.body.emissive.setRGB(b.r + (1 - b.r) * k, b.g + (1 - b.g) * k, b.b + (1 - b.b) * k); }
  function update(dt) {
    if (!grid) buildGrid();
    const pp = player.position;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]; e.t += dt;
      if (e.flash > 0) { e.flash -= dt; const k = Math.max(0, e.flash / 0.12); flashSet(e, k); }
      if (!e.alive) { dieUpdate(e, dt); if (e.removed) enemies.splice(i, 1); continue; }
      const dx = pp.x - e.pos.x, dz = pp.z - e.pos.z, dist = Math.hypot(dx, dz);
      if (!e.alerted && dist < 40) { e.alerted = true; if (e.type === 'rusher') audio.play('rusher_alert', { pos: e.pos }); }
      let moveX = 0, moveZ = 0, spd = e.speed;
      if (e.flinch > 0) { e.flinch -= dt; spd *= 0.3; }
      if (e.type === 'rusher') {
        e.atkCd -= dt;
        if (e.atk > 0) { // lunge swipe
          e.atk -= dt; spd *= 0.4;
          if (e.atk < 0.2 && !e.hitDone) { e.hitDone = true; if (dist < 2.0 && Math.abs(pp.y - e.pos.y) < 1.5) player.damage(ENEMY.rusher.dmg * e.dmgMul, e.pos); }
        } else if (dist < 1.9 && e.atkCd <= 0) { e.atk = 0.45; e.atkCd = 1.0; e.hitDone = false; audio.play('rusher_attack', { pos: e.pos }); e.knock.set(dx / dist, 0, dz / dist).multiplyScalar(5); }
        if (dist > 1.2) { const d = steerTo(e, dt, pp.x, pp.z); moveX = d.x; moveZ = d.z; }
      } else {
        e.strafeT -= dt; if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = 1.5 + Math.random() * 2; }
        const [rmin, rmax] = ENEMY.shooter.range, los = losClear(e.pos.x, e.pos.z, pp.x, pp.z);
        if (dist > rmax || !los) { const d = steerTo(e, dt, pp.x, pp.z); moveX = d.x; moveZ = d.z; }
        else {
          const nx = dx / dist, nz = dz / dist; const radial = dist < rmin ? -1 : (dist > (rmin + rmax) * 0.5 + 2 ? 0.5 : 0);
          moveX = nx * radial - nz * e.strafe * 0.8; moveZ = nz * radial + nx * e.strafe * 0.8; spd *= 0.7;
          if (world.isBlocked(e.pos.x + moveX, e.pos.z + moveZ, e.radius)) e.strafe = -e.strafe;
        }
        // firing
        if (e.charge > 0) { e.charge -= dt; spd *= 0.25; if (e.charge <= 0) { fire(e); e.fireCd = 1.6 + Math.random() * 1.2; } }
        else { e.fireCd -= dt; if (e.fireCd <= 0 && los && dist < rmax + 6) e.charge = 0.4; }
        const cg = e.charge > 0 ? 1 - e.charge / 0.4 : 0; e.eye.emissiveIntensity = 1.5 + cg * 6; e.muzzle.scale.setScalar(0.09 + cg * 0.1);
      }
      // separation
      for (let j = 0; j < enemies.length; j++) { const o = enemies[j]; if (o === e || !o.alive) continue; const sx = e.pos.x - o.pos.x, sz = e.pos.z - o.pos.z, s2 = sx * sx + sz * sz, rr = e.radius + o.radius + 0.3; if (s2 < rr * rr && s2 > 1e-6) { const s = Math.sqrt(s2), k = (rr - s) / rr * 1.5; moveX += sx / s * k; moveZ += sz / s * k; } }
      const ml = Math.hypot(moveX, moveZ); if (ml > 1) { moveX /= ml; moveZ /= ml; }
      const a = 1 - Math.exp(-10 * dt);
      e.vel.x += (moveX * spd - e.vel.x) * a; e.vel.z += (moveZ * spd - e.vel.z) * a;
      e.pos.x += (e.vel.x + e.knock.x) * dt; e.pos.z += (e.vel.z + e.knock.z) * dt;
      e.knock.multiplyScalar(Math.exp(-8 * dt));
      resolveCollide(e); e.pos.y = world.groundHeight(e.pos.x, e.pos.z);
      e.yaw = lerpAng(e.yaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
      animate(e, dt);
    }
    // projectiles
    for (let i = 0; i < MAX_PROJ; i++) {
      const p = projs[i]; if (!p.active) continue;
      p.life -= dt; T.copy(p.m.position); p.m.position.addScaledVector(p.vel, dt);
      const q = p.m.position; let hit = p.life <= 0 || q.y < 0;
      if (!hit) { const cs = world.colliders; for (let k = 0; k < cs.length; k++) if (cs[k].containsPoint(q)) { hit = true; break; } }
      if (!hit && q.distanceToSquared(T2.copy(pp).setY(pp.y + 0.9)) < 0.7 * 0.7 + 0.25) { hit = true; player.damage(p.dmg, T); }
      if (hit) { p.active = false; p.m.visible = false; p.tr.visible = false; audio.play('projectile_impact', { pos: q }); burst(q, matPart.proj, 8, 3.5); continue; }
      T3.copy(p.vel).normalize(); p.tr.position.copy(q).addScaledVector(T3, -0.55);
      QT.setFromUnitVectors(UP, T3); p.tr.quaternion.copy(QT); p.tr.scale.set(0.13, 1.0, 0.13);
    }
    for (let i = 0; i < MAX_PART; i++) { const p = parts[i]; if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.m.visible = false; continue; } p.vel.y -= 9 * dt; p.m.position.addScaledVector(p.vel, dt); if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.vel.multiplyScalar(0.5); p.vel.y = Math.abs(p.vel.y) * 0.4; } p.m.rotation.x += dt * 8; p.m.scale.multiplyScalar(1 - dt * 1.2); }
  }

  function animate(e, dt) {
    const v = Math.hypot(e.vel.x, e.vel.z), run = Math.min(1, v / e.speed);
    const rate = e.type === 'rusher' ? 2.6 : 1.7;
    e.phase += dt * (1.5 + v * rate);
    const s = Math.sin(e.phase), c = Math.cos(e.phase), idle = Math.sin(e.t * 2.2);
    const L = e.legs, A = e.arms;
    if (e.type === 'rusher') {
      const amp = 0.25 + run * 0.9;
      L[0].th.rotation.x = s * amp; L[1].th.rotation.x = -s * amp;
      L[0].sh.rotation.x = Math.max(0, -c) * 1.3 * run + 0.2; L[1].sh.rotation.x = Math.max(0, c) * 1.3 * run + 0.2;
      e.hips.position.y = 0.72 + Math.abs(c) * 0.1 * run + idle * 0.015 - run * 0.05;
      e.torso.rotation.x = 0.45 + run * 0.3 + Math.abs(s) * 0.08 * run;
      e.head.rotation.x = -0.25 - run * 0.25 + idle * 0.05;
      let arm0 = -s * amp * 0.9, arm1 = s * amp * 0.9;
      if (e.atk > 0) { const k = 1 - e.atk / 0.45, sw = k < 0.4 ? -2.4 * (k / 0.4) : -2.4 + 3.6 * Math.min(1, (k - 0.4) / 0.25); arm0 = sw; arm1 = sw * 0.6; e.torso.rotation.x += Math.sin(k * Math.PI) * 0.35; }
      A[0].sh.rotation.x = arm0 - 0.6; A[1].sh.rotation.x = arm1 - 0.6; A[0].sh.rotation.z = 0.25; A[1].sh.rotation.z = -0.25;
      A[0].fore.rotation.x = -0.8 - Math.max(0, s) * 0.4; A[1].fore.rotation.x = -0.8 - Math.max(0, -s) * 0.4;
      e.glow.emissiveIntensity = 2.0 + (e.atk > 0 ? 3 : 0) + idle * 0.3;
    } else {
      const amp = 0.15 + run * 0.55;
      L[0].th.rotation.x = s * amp; L[1].th.rotation.x = -s * amp;
      L[0].sh.rotation.x = Math.max(0, -c) * 0.8 * run; L[1].sh.rotation.x = Math.max(0, c) * 0.8 * run;
      e.hips.position.y = 1.15 + Math.abs(c) * 0.05 * run + idle * 0.02;
      e.torso.rotation.y = s * 0.08 * run; e.torso.rotation.z = c * 0.04 * run;
      e.head.rotation.y = Math.sin(e.t * 0.9) * 0.25 * (1 - run);
      A[0].sh.rotation.x = -s * 0.4 * run + idle * 0.05; A[1].sh.rotation.x = e.charge > 0 ? -0.15 : idle * 0.04;
      // aim the cannon arm up/down at player
      const pd = Math.hypot(player.position.x - e.pos.x, player.position.z - e.pos.z) || 1;
      A[1].sh.rotation.x -= Math.atan2(player.eye.y - (e.pos.y + 1.6), pd) * 0.8;
    }
    const fl = e.flinch > 0 ? e.flinch / 0.25 : 0;
    e.root.position.copy(e.pos); e.root.rotation.set(-fl * 0.35, e.yaw, 0);
  }

  function dieUpdate(e, dt) {
    e.dying += dt; const k = Math.min(1, e.dying / 1.0);
    e.pos.addScaledVector(e.knock, dt); e.knock.multiplyScalar(Math.exp(-6 * dt));
    e.root.position.set(e.pos.x, e.pos.y - Math.max(0, k - 0.5) * 1.2, e.pos.z);
    e.root.rotation.set(-Math.min(1, k * 2.2) * 1.45 * e.fallDir, e.yaw, Math.min(1, k * 2) * 0.3);
    for (const l of e.legs) { l.th.rotation.x *= 0.9; l.sh.rotation.x += dt * 2; }
    for (const a of e.arms) a.sh.rotation.x += dt * 3;
    e.glow.emissiveIntensity = Math.max(0, 2.5 * (1 - k * 1.5));
    for (const m of e.mats) m.opacity = 1 - Math.max(0, (k - 0.5) * 2);
    if (e.dying > 0.45 && !e.burst2) { e.burst2 = true; T.copy(e.pos); T.y += 0.4; burst(T, matPart[e.type], 10, 3); }
    if (e.dying >= 1.1) { scene.remove(e.root); for (const m of e.mats) m.dispose(); e.removed = true; }
  }

  function raycast(origin, dir, maxDist) {
    let best = null, bd = maxDist;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]; if (!e.alive) continue;
      const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
      for (const h of e.hitSpheres) {
        T.set(e.pos.x + h[0] * cy + h[2] * sy, e.pos.y + h[1], e.pos.z - h[0] * sy + h[2] * cy);
        T2.subVectors(T, origin); const b = T2.dot(dir), c2 = T2.lengthSq() - h[3] * h[3];
        if (c2 > 0 && b < 0) continue; const disc = b * b - c2; if (disc < 0) continue;
        const t = Math.max(0, b - Math.sqrt(disc)); if (t < bd) { bd = t; best = e; }
      }
    }
    if (!best) return null;
    HIT.id = best.id; HIT_P.copy(origin).addScaledVector(dir, bd); HIT.distance = bd; return HIT; // scratch: copy if kept
  }

  function damage(id, amount, hitPoint, dir) {
    const e = enemies.find(q => q.id === id); if (!e || !e.alive) return { killed: false };
    e.health -= amount; e.flash = 0.12; flashSet(e, 1); e.flinch = 0.25;
    if (dir) e.knock.set(dir.x, 0, dir.z).multiplyScalar(e.type === 'rusher' ? 3.5 : 2);
    if (hitPoint) burst(hitPoint, matPart[e.type], 3, 2.5);
    if (e.health <= 0) {
      e.health = 0; e.alive = false; e.dying = 0; e.atk = 0; e.charge = 0;
      e.fallDir = dir ? (Math.sign(dir.x * Math.sin(e.yaw) + dir.z * Math.cos(e.yaw)) || 1) * -1 : 1;
      for (const m of e.mats) { m.transparent = true; }
      T.copy(e.pos); T.y += e.type === 'rusher' ? 0.8 : 1.5; burst(T, matPart[e.type], 16, 4.5);
      audio.play('enemy_death', { pos: e.pos }); return { killed: true };
    }
    audio.play('enemy_hurt', { pos: e.pos }); return { killed: false };
  }

  return {
    spawn, update, raycast, damage,
    list() { LIST.length = enemies.length; for (let i = 0; i < enemies.length; i++) { const e = enemies[i], o = e._out; o.id = e.id; o.health = e.health; o.pos[0] = e.pos.x; o.pos[1] = e.pos.y; o.pos[2] = e.pos.z; o.alive = e.alive; LIST[i] = o; } return LIST; },
    aliveCount() { let n = 0; for (const e of enemies) if (e.alive) n++; return n; },
    clear() {
      for (const e of enemies) { scene.remove(e.root); for (const m of e.mats) m.dispose(); } enemies.length = 0;
      for (const p of projs) { p.active = false; p.m.visible = false; p.tr.visible = false; }
      for (const p of parts) { p.life = 0; p.m.visible = false; }
    },
    _debug: { enemies },
  };
}
