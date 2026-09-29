import * as THREE from '../vendor/three.module.js';

function panelTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e6f2'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#d6d0e6'; g.fillRect(8, 8, 116, 150); g.fillRect(132, 8, 116, 150);
  g.fillStyle = '#b3122a'; g.fillRect(24, 40, 84, 90); g.fillRect(148, 40, 84, 90);
  g.fillStyle = '#7a0b1c'; g.fillRect(24, 124, 84, 6); g.fillRect(148, 124, 84, 6);
  // recessed edge shading: dark top/left, light bottom/right on panels and insets
  for (const [x, y, w, h] of [[8, 8, 116, 150], [132, 8, 116, 150], [24, 40, 84, 90], [148, 40, 84, 90]]) {
    g.fillStyle = 'rgba(0,0,20,0.28)'; g.fillRect(x, y, w, 4); g.fillRect(x, y, 4, h);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y + h - 3, w, 3); g.fillRect(x + w - 3, y, 3, h);
  }
  g.fillStyle = '#111'; g.fillRect(0, 168, 256, 22); g.fillRect(0, 0, 256, 4); g.fillRect(126, 0, 4, 168);
  g.fillStyle = '#f4f2f8'; g.fillRect(0, 190, 256, 66);
  g.fillStyle = '#c9c4d8'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 190, 2, 66);
  const ao = g.createLinearGradient(0, 256, 0, 150); ao.addColorStop(0, 'rgba(20,20,35,0.55)'); ao.addColorStop(1, 'rgba(20,20,35,0)');
  g.fillStyle = ao; g.fillRect(0, 150, 256, 106);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function floorTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#9a9ca0'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#86888c'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = '#a8aaae'; g.lineWidth = 1; g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(15, 15); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function blockTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#eeecf4'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#111'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 118, 128, 10);
  g.fillStyle = '#b3122a'; g.fillRect(20, 30, 88, 60);
  const ao = g.createLinearGradient(0, 128, 0, 70); ao.addColorStop(0, 'rgba(20,20,35,0.45)'); ao.addColorStop(1, 'rgba(20,20,35,0)'); g.fillStyle = ao; g.fillRect(0, 70, 128, 58);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function topTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#1a1a20'; g.lineWidth = 6; g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// box with side UVs scaled to face size (tile ~2m) so panels aren't stretched
function tiledBox(w, h, d, tile = 2) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const sizes = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    if (!sizes[f]) continue;
    const su = Math.max(1, Math.round(sizes[f][0] / tile)), sv = Math.max(1, Math.round(sizes[f][1] / tile));
    for (let k = f * 4; k < f * 4 + 4; k++) uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv);
  }
  return geo;
}

export function createArena(scene) {
  const colliders = [], worldMeshes = [];
  const HALF = 30, WALL_H = 7;
  scene.background = new THREE.Color(0xb9c7d4);
  scene.fog = new THREE.Fog(0xaebccb, 30, 70);

  const hemi = new THREE.HemisphereLight(0xd8dcff, 0x6a6f8a, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
  sun.position.set(30, 16, -14); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 120;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor); worldMeshes.push(floor);
  // green border bands (single merged-ish: 4 thin planes as instanced)
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x1f4a33, roughness: 0.7 });
  const band = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 1), bandMat, 8);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const bands = [[0, -27.5, 59, 1.6], [0, 27.5, 59, 1.6], [-27.5, 0, 1.6, 59], [27.5, 0, 1.6, 59], [0, -24.5, 50, 0.5], [0, 24.5, 50, 0.5], [-24.5, 0, 0.5, 50], [24.5, 0, 0.5, 50]];
  bands.forEach((b, i) => { m4.compose(v.set(b[0], 0.01, b[1]), q.identity(), s.set(b[2], 1, b[3])); band.setMatrixAt(i, m4); });
  band.receiveShadow = true; band.castShadow = false; scene.add(band);

  // walls
  const wallTex = panelTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.6 });
  const wallGeo = new THREE.BoxGeometry(HALF * 2 + 2, WALL_H, 1);
  const uv = wallGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 62 / 7, uv.getY(i));
  for (const [x, z, ry] of [[0, -HALF - 0.5, 0], [0, HALF + 0.5, 0], [-HALF - 0.5, 0, Math.PI / 2], [HALF + 0.5, 0, Math.PI / 2]]) {
    const w = new THREE.Mesh(wallGeo, wallMat); w.position.set(x, WALL_H / 2, z); w.rotation.y = ry;
    w.receiveShadow = true; w.castShadow = true; scene.add(w); worldMeshes.push(w);
    w.updateMatrixWorld(); colliders.push(new THREE.Box3().setFromObject(w));
  }
  // black trim at top of wall
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.5 });

  // cover blocks (instanced)
  const blockMat = new THREE.MeshStandardMaterial({ map: blockTexture(), roughness: 0.55 });
  const covers = [ // x,z,w,h,d
    [-6, 0, 2, 1.3, 5], [6, 0, 2, 1.3, 5], [0, -8, 6, 1.3, 1.5], [0, 8, 6, 1.3, 1.5],
    [-20, 4, 1.5, 1.6, 4], [20, -4, 1.5, 1.6, 4], [-4, 18, 3, 1.4, 1.5], [4, -18, 3, 1.4, 1.5],
    [12, 6, 2, 2.2, 2], [-12, -6, 2, 2.2, 2], [-20, 20, 2.5, 1.3, 2.5], [20, -20, 2.5, 1.3, 2.5],
  ];
  const topMat = new THREE.MeshStandardMaterial({ color: 0xdcdae4, roughness: 0.7, map: topTexture() });
  const boxMats = [blockMat, blockMat, topMat, topMat, blockMat, blockMat];
  const addBox = (x, y, z, w, h, d) => {
    const m = new THREE.Mesh(tiledBox(w, h, d), boxMats); m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true; scene.add(m); worldMeshes.push(m); return m;
  };
  for (const [x, z, w, h, d] of covers) { addBox(x, h / 2, z, w, h, d); colliders.push(new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2))); }
  // pillars
  const pillarPos = [[-12, 12], [12, -12], [-24, -10], [24, 10], [10, 22], [-10, -22]];
  const pillars = new InstancedGroup(new THREE.BoxGeometry(1, 1, 1), trimMat, pillarPos.length * 2, scene, worldMeshes);
  const pillarsW = new InstancedGroup(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xe8e5f0, roughness: 0.5 }), pillarPos.length, scene, worldMeshes);
  for (const [x, z] of pillarPos) {
    pillarsW.add(x, 3, z, 1.4, 6, 1.4); pillars.add(x, 0.25, z, 1.7, 0.5, 1.7); pillars.add(x, 5.9, z, 1.6, 0.3, 1.6);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.85, 0, z - 0.85), new THREE.Vector3(x + 0.85, 6, z + 0.85)));
  }
  pillars.done(); pillarsW.done();

  // platforms with ramps
  const PH = 2;
  const platforms = [
    { x: -17, z: -17, w: 8, d: 8, ramp: { x0: -17, z0: -12.9, len: 6, dir: 1 } },   // ramp extends +z
    { x: 17, z: 17, w: 8, d: 8, ramp: { x0: 17, z0: 12.9, len: 6, dir: -1 } },       // ramp extends -z
  ];
  const platMat = new THREE.MeshStandardMaterial({ color: 0xdedbe8, roughness: 0.6 });
  const platTrims = new InstancedGroup(new THREE.BoxGeometry(1, 1, 1), trimMat, 2, scene, worldMeshes);
  const ramps = [];
  const rampMat = new THREE.MeshStandardMaterial({ color: 0x8e9095, roughness: 0.8 });
  for (const p of platforms) {
    addBox(p.x, PH / 2 - 0.06, p.z, p.w, PH - 0.12, p.d);
    platTrims.add(p.x, PH - 0.06 + 0.001, p.z, p.w + 0.08, 0.12, p.d + 0.08);
    colliders.push(new THREE.Box3(new THREE.Vector3(p.x - p.w / 2, 0, p.z - p.d / 2), new THREE.Vector3(p.x + p.w / 2, PH, p.z + p.d / 2)));
    const r = p.ramp, rw = 3;
    const len = Math.hypot(r.len, PH);
    const rm = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.2, len), rampMat);
    const zc = r.z0 + r.dir * r.len / 2;
    rm.position.set(r.x0, PH / 2 - 0.1, zc);
    rm.rotation.x = r.dir * Math.atan2(PH, r.len);
    rm.castShadow = rm.receiveShadow = true; scene.add(rm); worldMeshes.push(rm);
    ramps.push({ minX: r.x0 - rw / 2, maxX: r.x0 + rw / 2, zTop: r.z0, zBot: r.z0 + r.dir * r.len, dir: r.dir, len: r.len });
  }
  platTrims.done();

  // octagonal spawn pads
  const spawnPoints = [[-26, 0], [26, 0], [0, -26], [0, 26], [-25, 25], [25, -25], [-8, -26], [8, 26]];
  const padOuter = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.8, 1.8, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f6, roughness: 0.4 }), spawnPoints.length);
  const padInner = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.45, 1.45, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xb3122a, roughness: 0.6 }), spawnPoints.length);
  const padCore = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f6, roughness: 0.5 }), spawnPoints.length);
  spawnPoints.forEach(([x, z], i) => {
    m4.compose(v.set(x, 0.04, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8), s.set(1, 1, 1)); padOuter.setMatrixAt(i, m4);
    m4.compose(v.set(x, 0.05, z), q, s); padInner.setMatrixAt(i, m4);
    m4.compose(v.set(x, 0.06, z), q, s); padCore.setMatrixAt(i, m4);
  });
  padOuter.receiveShadow = padInner.receiveShadow = padCore.receiveShadow = true; scene.add(padOuter, padInner, padCore);

  function groundHeight(x, z) {
    let h = 0;
    for (const r of ramps) {
      if (x < r.minX || x > r.maxX) continue;
      const t = (z - r.zBot) / (r.zTop - r.zBot); // 0 at bottom, 1 at top
      if (t >= 0 && t <= 1) h = Math.max(h, t * PH);
    }
    return h;
  }

  // nav grid
  const cell = 1, minX = -HALF, minZ = -HALF, w = 60, h = 60;
  const blocked = new Uint8Array(w * h);
  const pad = 0.5;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const cx = minX + (i + 0.5) * cell, cz = minZ + (j + 0.5) * cell;
    let b = (i === 0 || j === 0 || i === w - 1 || j === h - 1) ? 1 : 0;
    for (const c of colliders) if (cx > c.min.x - pad && cx < c.max.x + pad && cz > c.min.z - pad && cz < c.max.z + pad) { b = 1; break; }
    if (!b) for (const r of ramps) if (cx > r.minX - pad && cx < r.maxX + pad && cz > Math.min(r.zTop, r.zBot) - pad && cz < Math.max(r.zTop, r.zBot) + pad) { b = 1; break; }
    blocked[j * w + i] = b;
  }
  const nav = { minX, minZ, cell, w, h, blocked, spawnPoints };
  return { colliders, worldMeshes, nav, groundHeight, sun };
}

class InstancedGroup {
  constructor(geo, mat, n, scene, worldMeshes) {
    this.mesh = new THREE.InstancedMesh(geo, mat, n); this.i = 0;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    scene.add(this.mesh); worldMeshes.push(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3();
  }
  add(x, y, z, sx, sy, sz) { this.m.compose(this.p.set(x, y, z), this.q, this.s.set(sx, sy, sz)); this.mesh.setMatrixAt(this.i++, this.m); }
  done() { this.mesh.count = this.i; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.computeBoundingSphere(); this.mesh.computeBoundingBox?.(); }
}
