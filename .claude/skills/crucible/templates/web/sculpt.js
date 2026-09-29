// Crucible sculpting for three.js (copied to <game>/src/sculpt.js by kickoff.sh). Used by Character Art.
// Organic characters and creatures as one seamless mesh: shapes (capsules, ellipsoids, rounded boxes) melt into each other
// with smooth blends, like clay or a ZBrush dynamesh - no visible seams between limbs and body. The field is polygonized once
// at load (surface nets), vertices are projected onto the true surface, normals come from the field. Colour zones and bone
// weights come from the parts themselves, so the result is a skinned mesh with vertex colours: one draw call per character.
//
//   import { sculpt, attachRigid } from './sculpt.js';
//   const geo = sculpt([
//     { shape: 'ellipsoid', c: [0, 1.2, 0], r: [0.22, 0.3, 0.16], color: 0x3a4050, bone: 'chest', blend: 0.08 },
//     { shape: 'capsule', a: [0.22, 1.35, 0], b: [0.45, 1.05, 0.05], r: 0.07, r2: 0.055, color: 0xd9562b, bone: 'upperarm.L', mirror: true },
//     { shape: 'sphere', c: [0.05, 1.72, 0.12], r: 0.035, subtract: true, blend: 0.02 },   // carve an eye socket
//   ], { voxel: 0.02, bones: rig.index });
// Shapes: sphere {c, r} | ellipsoid {c, r:[x,y,z]} | capsule {a, b, r, r2?} (r2 tapers towards b) | box {c, size:[x,y,z], round, rot?:[x,y,z]}
// Options per part: color, bone (name in opts.bones), blend (smooth-union radius, default 0.04), mirror (adds the x-mirrored twin, '.L' <-> '.R'),
//                   subtract (carves instead of adds), sharpColor (colour edge softness in metres, default 0.35 voxel; crisp trims and straps are better as their own thin parts).
// Parts apply in list order, like sculpting steps: a subtract carves everything before it; parts after it add back (eyes into sockets).
// Characters face +z, y up. Budget for a humanoid: voxel 0.018 m gives about 20k triangles, 0.025 m about 10k, 0.035 m about 5k (use coarser voxels for LODs); polygonize once at load, share the
// geometry between all enemies of a type (clone the SkinnedMesh with SkeletonUtils.clone), never per spawn.
import * as THREE from 'three';

const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
const mirrorName = n => (n && n.endsWith('.L') ? n.slice(0, -2) + '.R' : n && n.endsWith('.R') ? n.slice(0, -2) + '.L' : n);

function prepare(parts) {
  const out = [];
  for (const p of parts) {
    out.push(p);
    if (p.mirror) {
      const m = { ...p, mirror: false, bone: mirrorName(p.bone) };
      for (const k of ['c', 'a', 'b']) if (p[k]) m[k] = [-p[k][0], p[k][1], p[k][2]];
      if (p.rot) m.rot = [p.rot[0], -p.rot[1], -p.rot[2]];
      out.push(m);
    }
  }
  return out.map(p => {
    const q = { ...p, blend: p.blend ?? 0.04 };
    if (p.shape === 'capsule') { q.A = v3(p.a); q.B = v3(p.b); q.BA = q.B.clone().sub(q.A); q.len2 = q.BA.lengthSq(); q.r2 = p.r2 ?? p.r; }
    else if (p.shape === 'box') { q.C = v3(p.c); q.half = v3(p.size).multiplyScalar(0.5); q.round = Math.min(p.round ?? 0.02, ...p.size.map(s => s / 2)); q.inv = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(p.rot || [0, 0, 0]))).invert(); }
    else { q.C = v3(p.c); q.R = Array.isArray(p.r) ? v3(p.r) : new THREE.Vector3(p.r, p.r, p.r); }
    return q;
  });
}

const _t = new THREE.Vector3(), _u = new THREE.Vector3();
function partDist(q, x, y, z) {
  if (q.shape === 'capsule') {
    _t.set(x - q.A.x, y - q.A.y, z - q.A.z);
    const h = q.len2 > 0 ? Math.min(Math.max(_t.dot(q.BA) / q.len2, 0), 1) : 0;
    _u.copy(q.BA).multiplyScalar(h); return _t.sub(_u).length() - (q.r + (q.r2 - q.r) * h);
  }
  if (q.shape === 'box') {
    _t.set(x - q.C.x, y - q.C.y, z - q.C.z).applyMatrix4(q.inv);
    const dx = Math.abs(_t.x) - q.half.x + q.round, dy = Math.abs(_t.y) - q.half.y + q.round, dz = Math.abs(_t.z) - q.half.z + q.round;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0) - q.round;
  }
  if (q.shape === 'ellipsoid') {  // good-enough ellipsoid distance (bound-corrected)
    const px = (x - q.C.x) / q.R.x, py = (y - q.C.y) / q.R.y, pz = (z - q.C.z) / q.R.z;
    const k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / q.R.x, py / q.R.y, pz / q.R.z);
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(q.R.x, q.R.y, q.R.z);
  }
  return Math.hypot(x - q.C.x, y - q.C.y, z - q.C.z) - q.R.x;   // sphere
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

function field(Q, x, y, z) {   // parts apply in list order, like sculpting steps: a carve removes what came before it, later parts add back
  let d = 1e9;
  for (const q of Q) {
    if (q.subtract) { if (d < 1e8) d = smax(d, -partDist(q, x, y, z), q.blend); }
    else d = d > 1e8 ? partDist(q, x, y, z) : smin(d, partDist(q, x, y, z), q.blend);
  }
  return d;
}

export function sculpt(parts, { voxel = 0.02, bones = null, smoothPasses = 1 } = {}) {
  const Q = prepare(parts);
  // bounds from the parts
  const min = new THREE.Vector3(1e9, 1e9, 1e9), max = new THREE.Vector3(-1e9, -1e9, -1e9);
  for (const q of Q) {
    if (q.subtract) continue;
    const pts = q.shape === 'capsule' ? [q.A, q.B] : [q.C];
    const r = q.shape === 'capsule' ? Math.max(q.r, q.r2) : q.shape === 'box' ? q.half.length() : Math.max(q.R.x, q.R.y, q.R.z);
    for (const p of pts) { min.min(_t.copy(p).subScalar(r + q.blend)); max.max(_t.copy(p).addScalar(r + q.blend)); }
  }
  min.subScalar(voxel * 2); max.addScalar(voxel * 2);
  const nx = Math.ceil((max.x - min.x) / voxel) + 1, ny = Math.ceil((max.y - min.y) / voxel) + 1, nz = Math.ceil((max.z - min.z) / voxel) + 1;
  const F = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[id(i, j, k)] = field(Q, min.x + i * voxel, min.y + j * voxel, min.z + k * voxel);

  // surface nets: one vertex per cell that the surface crosses, at the mean of its edge crossings
  const cellV = new Int32Array((nx - 1) * (ny - 1) * nz).fill(-1), cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const corner = c => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = []; let inside = 0;
    for (let c = 0; c < 8; c++) { const [a, b, d] = corner(c); const f = F[id(i + a, j + b, k + d)]; v.push(f); if (f < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [e0, e1] of E) {
      if ((v[e0] < 0) === (v[e1] < 0)) continue;
      const t = v[e0] / (v[e0] - v[e1]), c0 = corner(e0), c1 = corner(e1);
      sx += c0[0] + (c1[0] - c0[0]) * t; sy += c0[1] + (c1[1] - c0[1]) * t; sz += c0[2] + (c1[2] - c0[2]) * t; n++;
    }
    cellV[cid(i, j, k)] = P.length / 3;
    P.push(min.x + (i + sx / n) * voxel, min.y + (j + sy / n) * voxel, min.z + (k + sz / n) * voxel);
  }
  // quads across every grid edge with a sign change
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {   // x edges
    const f0 = F[id(i, j, k)], f1 = F[id(i + 1, j, k)]; if ((f0 < 0) === (f1 < 0)) continue;
    quad(cellV[cid(i, j - 1, k - 1)], cellV[cid(i, j, k - 1)], cellV[cid(i, j, k)], cellV[cid(i, j - 1, k)], f0 < 0);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // y edges
    const f0 = F[id(i, j, k)], f1 = F[id(i, j + 1, k)]; if ((f0 < 0) === (f1 < 0)) continue;
    quad(cellV[cid(i - 1, j, k - 1)], cellV[cid(i - 1, j, k)], cellV[cid(i, j, k)], cellV[cid(i, j, k - 1)], f0 < 0);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // z edges
    const f0 = F[id(i, j, k)], f1 = F[id(i, j, k + 1)]; if ((f0 < 0) === (f1 < 0)) continue;
    quad(cellV[cid(i - 1, j - 1, k)], cellV[cid(i, j - 1, k)], cellV[cid(i, j, k)], cellV[cid(i - 1, j, k)], f0 < 0);
  }

  // project onto the true surface, normals from the field gradient
  const count = P.length / 3, N = new Float32Array(count * 3), e = voxel * 0.5;
  for (let s = 0; s < smoothPasses + 1; s++) for (let v = 0; v < count; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    let gx = field(Q, x + e, y, z) - field(Q, x - e, y, z), gy = field(Q, x, y + e, z) - field(Q, x, y - e, z), gz = field(Q, x, y, z + e) - field(Q, x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
    if (s < smoothPasses) { const d = field(Q, x, y, z); P[v * 3] -= gx * d; P[v * 3 + 1] -= gy * d; P[v * 3 + 2] -= gz * d; }
    else { N[v * 3] = gx; N[v * 3 + 1] = gy; N[v * 3 + 2] = gz; }
  }

  // colour zones and bone weights from part influence (the same blend that shapes the surface)
  const C = new Float32Array(count * 3), SI = new Uint16Array(count * 4), SW = new Float32Array(count * 4), col = new THREE.Color();
  const add = Q.filter(q => !q.subtract);
  const colors = add.map(q => new THREE.Color(q.color ?? 0xcccccc));
  for (let v = 0; v < count; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    // colour: the part whose own surface is nearest (|distance|, so a part inside another or in a carved socket still shows its colour),
    // softened across a narrow band so zones read as painted, not noisy
    let best = 1e9; const ds = add.map(q => { const d = Math.abs(partDist(q, x, y, z)); if (d < best) best = d; return d; });
    let wr = 0, wg = 0, wb = 0, wsum = 0;
    add.forEach((q, i) => { const w = Math.exp(-(ds[i] - best) / (q.sharpColor ?? voxel * 0.35)); wr += colors[i].r * w; wg += colors[i].g * w; wb += colors[i].b * w; wsum += w; });
    C[v * 3] = wr / wsum; C[v * 3 + 1] = wg / wsum; C[v * 3 + 2] = wb / wsum;
    if (bones) {  // weights: every part pulls its bone, falling off over its blend radius; top 4, normalised
      const acc = new Map();
      add.forEach((q, i) => { if (q.bone == null || bones[q.bone] == null) return; const w = Math.exp(-Math.max(ds[i] - best, 0) / Math.max(q.blend, 0.01) * 2.5); acc.set(bones[q.bone], (acc.get(bones[q.bone]) || 0) + w); });
      const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const s = top.reduce((a, t) => a + t[1], 0) || 1;
      top.forEach(([b, w], k) => { SI[v * 4 + k] = b; SW[v * 4 + k] = w / s; });
      if (!top.length) SW[v * 4] = 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  if (bones) { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4)); }
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Hard-surface parts (masks, armour plates, helmets, weapons in hand - built with shapes.js) fused into the sculpted mesh,
// rigidly bound to one bone, with one colour: still one geometry, one material, one draw call.
export function attachRigid(target, geo, { bone = 0, color = 0xffffff, matrix = null } = {}) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone());
  if (matrix) g.applyMatrix4(matrix);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count, c = new THREE.Color(color);
  const tgt = target.index ? target.toNonIndexed() : target;
  const cat = (name, size, extra) => {
    const a = tgt.attributes[name]; if (!a) return;
    const arr = new a.array.constructor(a.array.length + n * size); arr.set(a.array); arr.set(extra, a.array.length);
    tgt.setAttribute(name, new THREE.BufferAttribute(arr, size, a.normalized));
  };
  const gc = g.attributes.color, colors = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {   // colour = part colour x its own vertex colour (e.g. baked occlusion); weight 1 on the bone
    colors[i * 3] = c.r * (gc ? gc.getX(i) : 1); colors[i * 3 + 1] = c.g * (gc ? gc.getY(i) : 1); colors[i * 3 + 2] = c.b * (gc ? gc.getZ(i) : 1);
    si[i * 4] = bone; sw[i * 4] = 1;
  }
  cat('position', 3, g.attributes.position.array); cat('normal', 3, g.attributes.normal.array);
  cat('color', 3, colors); cat('skinIndex', 4, si); cat('skinWeight', 4, sw);
  for (const name of Object.keys(tgt.attributes)) if (!['position', 'normal', 'color', 'skinIndex', 'skinWeight'].includes(name)) tgt.deleteAttribute(name);
  tgt.computeBoundingSphere();
  return tgt;
}
