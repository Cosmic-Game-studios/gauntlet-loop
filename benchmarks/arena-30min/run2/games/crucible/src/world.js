// T2 look + arena: renderer setup, lighting, sky/fog, procedural textures, merged arena geometry, colliders.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from './config.js';

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(repeat, repeat); return t;
}
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function grime(g, s, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * a})`; const r = 4 + rnd() * s * 0.08; g.beginPath(); g.arc(rnd() * s, rnd() * s, r, 0, 7); g.fill(); } }
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

function makeTextures() {
  const floor = canvasTex(512, (g, s) => {
    g.fillStyle = hex(PALETTE.floor); g.fillRect(0, 0, s, s); grime(g, s, 260, 0.08);
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { const p = i * s / 4; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const p = i * s / 4 + 3; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillRect(i * s / 4 + 10, j * s / 4 + 10, 6, 6); }
  });
  const wall = canvasTex(512, (g, s) => {
    g.fillStyle = hex(PALETTE.wall); g.fillRect(0, 0, s, s);
    const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    grime(g, s, 120, 0.1);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 5; g.strokeRect(0, 0, s, s); g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s * 0.62); g.lineTo(s, s * 0.62); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 2; g.strokeRect(6, 6, s - 12, s - 12);
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 24, s * 0.7, 12, 60);
  });
  const hazard = canvasTex(256, (g, s) => {
    g.fillStyle = '#55545a'; g.fillRect(0, 0, s, s); g.fillStyle = '#8c7a68'; // muted ~40% sat so barricades don't out-shout enemies
    for (let i = -s; i < s * 2; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - s, s); g.lineTo(i - s, s); g.fill(); }
    grime(g, s, 80, 0.15);
  });
  const crate = canvasTex(256, (g, s) => {
    g.fillStyle = '#5a5347'; g.fillRect(0, 0, s, s); grime(g, s, 90, 0.12);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 8; g.strokeRect(4, 4, s - 8, s - 8);
    g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, s); g.stroke();
    g.strokeStyle = 'rgba(255,220,160,0.15)'; g.lineWidth = 3; g.strokeRect(14, 14, s - 28, s - 28);
  });
  return { floor, wall, hazard, crate };
}

// world-space box UVs so textures keep a constant texel density (1 tile = `scale` metres)
function worldUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay > 0.5) uv.setXY(i, x / scale, z / scale); else if (ax > 0.5) uv.setXY(i, z / scale, y / scale); else uv.setXY(i, x / scale, y / scale);
  }
  return geo;
}

export function createWorld(scene, renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const HAZE = 0xc4907a; // horizon mauve-orange: far walls fade to a lighter mid-value haze
  scene.background = new THREE.Color(HAZE);
  scene.fog = new THREE.Fog(HAZE, 16, 85);

  // sky gradient dome: warm dusk horizon -> cool zenith
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2e5c7c) }, mid: { value: new THREE.Color(0x9a8098) }, hor: { value: new THREE.Color(0xf08a3c) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(hor, mid, smoothstep(-0.02, 0.2, h)); c = mix(c, top, smoothstep(0.2, 0.6, h)); gl_FragColor = vec4(c,1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), skyMat); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);

  // lights: warm sodium key (shadows), cool teal fill, hemisphere ambient
  scene.add(new THREE.HemisphereLight(0xa8b8d0, 0x5a4538, 1.4));
  const key = new THREE.DirectionalLight(PALETTE.keyLight, 2.6);
  key.position.set(-28, 30, 18); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 110 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(PALETTE.fillLight, 1.35); fill.position.set(25, 14, -22); scene.add(fill);

  const tex = makeTextures();
  const mats = {
    floor: new THREE.MeshStandardMaterial({ map: tex.floor, roughness: 0.85, metalness: 0.1 }),
    wall: new THREE.MeshStandardMaterial({ map: tex.wall, roughness: 0.75, metalness: 0.2 }),
    concrete: new THREE.MeshStandardMaterial({ map: tex.wall, color: 0x9a948a, roughness: 0.9, metalness: 0.05 }),
    crate: new THREE.MeshStandardMaterial({ map: tex.crate, roughness: 0.8, metalness: 0.15 }),
    hazard: new THREE.MeshStandardMaterial({ map: tex.hazard, roughness: 0.7, metalness: 0.2 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: PALETTE.trim, emissiveIntensity: 2.2 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: PALETTE.accent, emissiveIntensity: 2.0 }),
  };
  const uvScale = { floor: 4, wall: 4, concrete: 3, crate: 1.6, hazard: 1.5, trim: 1, accent: 1 };
  const buckets = {}; const colliders = []; const walkable = [];
  const addBox = (mat, cx, cy, cz, w, h, d, solid = true) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(cx, cy, cz); worldUV(g, uvScale[mat]);
    (buckets[mat] ||= []).push(g);
    if (solid) { const b = new THREE.Box3(new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2), new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2)); colliders.push(b); walkable.push(b); }
  };
  // ground-standing block helper (bottom at y0)
  const block = (mat, x, z, w, h, d, y0 = 0) => addBox(mat, x, y0 + h / 2, z, w, h, d);
  const trimTop = (mat, x, z, w, d, y) => { // glowing edge strips around a top face
    addBox(mat, x, y + 0.02, z - d / 2 + 0.04, w, 0.06, 0.08, false); addBox(mat, x, y + 0.02, z + d / 2 - 0.04, w, 0.06, 0.08, false);
  };

  // floor
  const fg = new THREE.PlaneGeometry(64, 64); fg.rotateX(-Math.PI / 2); worldUV(fg, 4); (buckets.floor ||= []).push(fg);

  // perimeter walls 5 m, with buttresses and trim line
  const H = 5, E = 30;
  block('wall', 0, -E - 0.5, 62, H, 1); block('wall', 0, E + 0.5, 62, H, 1); block('wall', -E - 0.5, 0, 1, H, 62); block('wall', E + 0.5, 0, 1, H, 62);
  for (let i = -24; i <= 24; i += 12) {
    block('concrete', i, -E + 0.4, 1.4, H + 0.6, 0.8); block('concrete', i, E - 0.4, 1.4, H + 0.6, 0.8);
    block('concrete', -E + 0.4, i, 0.8, H + 0.6, 1.4); block('concrete', E - 0.4, i, 0.8, H + 0.6, 1.4);
  }
  addBox('trim', 0, 3.2, -E + 0.02, 60, 0.12, 0.06, false); addBox('trim', 0, 3.2, E - 0.02, 60, 0.12, 0.06, false);
  addBox('accent', -E + 0.02, 3.2, 0, 0.06, 0.12, 60, false); addBox('accent', E - 0.02, 3.2, 0, 0.06, 0.12, 60, false);

  // central raised platform 10x6, top 1.8 m, stairs (0.45 m rise) north and south
  const PH = 1.8;
  block('concrete', 0, 0, 10, PH, 6); addBox('hazard', 0, PH + 0.01, 0, 10, 0.02, 6, false);
  trimTop('accent', 0, 0, 10, 6, PH);
  for (let s = 1; s <= 4; s++) {
    const h = s * 0.45, depth = 0.7, off = 3 + (4 - s) * depth + depth / 2;
    block('concrete', 0, off, 3, h, depth); block('concrete', 0, -off, 3, h, depth);
  }
  // low rail blocks on platform edges (half cover up top)
  block('wall', -4.6, 0, 0.4, 1.0, 5, PH); block('wall', 4.6, 0, 0.4, 1.0, 5, PH);

  // side catwalks along east/west walls, top 2.7 m, reached by stairs
  const CH = 2.7;
  for (const sx of [-1, 1]) {
    const x = sx * 26.5;
    block('concrete', x, -8, 5, CH, 14); trimTop('trim', x, -8, 5, 14, CH);
    addBox('trim', x - sx * 2.5, CH + 0.02, -8, 0.08, 0.06, 14, false);
    for (let s = 1; s <= 6; s++) { const h = s * 0.45; if (h >= CH) break; block("concrete", x, -1 + (6 - s) * 0.7 - 0.35, 3, h, 0.7); }
    block('wall', x - sx * 2.2, -12, 0.5, 1.1, 5, CH);
  }

  // cover: crates / barriers at mixed heights, leaving open lanes
  const cover = [
    ['crate', -10, 8, 2, 2, 2], ['crate', -11.5, 9.5, 1.2, 1.2, 1.2], ['crate', 10, -9, 2, 2, 2], ['crate', 11.5, -7.4, 1.2, 1.2, 1.2],
    ['hazard', -12, -10, 4, 1.1, 1], ['hazard', 12, 10, 4, 1.1, 1], ['hazard', 0, 14, 5, 1.1, 1], ['hazard', 0, -14, 5, 1.1, 1],
    ['crate', 18, 4, 2.4, 2.4, 2.4], ['crate', -18, -3, 2.4, 2.4, 2.4], ['crate', -19.5, 15, 1.6, 1.6, 1.6], ['crate', 19, -18, 1.6, 1.6, 1.6],
    ['concrete', -6, 21, 1, 3, 4], ['concrete', 6, -21, 1, 3, 4], ['hazard', 21, 20, 1, 1.1, 4], ['hazard', -21, -20, 1, 1.1, 4],
  ];
  for (const [m, x, z, w, h, d] of cover) block(m, x, z, w, h, d);
  // pillars with glowing bands
  for (const [x, z] of [[-9, -2], [9, 2], [-14, 18], [14, -18]]) {
    block('wall', x, z, 1.2, 7, 1.2); addBox(x < 0 ? 'accent' : 'trim', x, 2.6, z, 1.28, 0.15, 1.28, false); addBox('trim', x, 5.2, z, 1.28, 0.1, 1.28, false);
  }

  // merge per material
  const staticMeshes = [];
  for (const [m, list] of Object.entries(buckets)) {
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mats[m]);
    const emissive = m === 'trim' || m === 'accent';
    mesh.castShadow = !emissive && m !== 'floor'; mesh.receiveShadow = !emissive;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix(); scene.add(mesh);
    if (!emissive) staticMeshes.push(mesh);
    list.forEach((g) => g.dispose());
  }

  const bounds = { minX: -29.4, maxX: 29.4, minZ: -29.4, maxZ: 29.4 };
  return {
    colliders, staticMeshes, bounds, playerSpawn: new THREE.Vector3(0, 0, 20),
    enemySpawns: [[-24, -25], [24, -25], [-26, 8], [26, 8], [0, -26], [-24, 25], [24, 25], [0, -20]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
    isBlocked(x, z, r) { for (const b of colliders) if (b.max.y > 0.6 && x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z) return true; return false; },
    groundHeight(x, z) { let h = 0; for (const b of walkable) if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y > h) h = b.max.y; return h; },
    update() {},
    render(camera) { renderer.render(scene, camera); },
  };
}
