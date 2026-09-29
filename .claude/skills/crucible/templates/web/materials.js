// Crucible shader starter for three.js (copied to <game>/src/materials.js by kickoff.sh). Owned by the Shaders & Rendering department.
// Every function patches or builds materials so they keep three's lighting, shadows, fog and skinning - one small program per material kind,
// uniforms shared, nothing allocated per frame. A starting point: the department tunes, replaces or extends it for the game's look.
//   import { stylize, paintedTexture, noiseNormalMap, createSky, dissolvable, tickMaterials } from './materials.js';
// World-space patterns are for static geometry; pass { space: 'object' } for characters, weapons and anything that moves.
import * as THREE from 'three';

// One clock for every animated shader, advanced by the simulation (never by wall-clock), so captures and pauses freeze it.
export const shared = { uTime: { value: 0 } };
export function tickMaterials(dt) { shared.uTime.value += dt; }

const NOISE = /* glsl */ `
float cru_hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cru_noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cru_hash(i), cru_hash(i + vec3(1,0,0)), f.x), mix(cru_hash(i + vec3(0,1,0)), cru_hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cru_hash(i + vec3(0,0,1)), cru_hash(i + vec3(1,0,1)), f.x), mix(cru_hash(i + vec3(0,1,1)), cru_hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float cru_fbm(vec3 p) { return 0.5 * cru_noise(p) + 0.25 * cru_noise(p * 2.03) + 0.125 * cru_noise(p * 4.01); }
`;
// Patches are recorded as plain data in material.userData.cru and rebuilt from it, so they combine (stylize + dissolve), keep one
// program per combination, and survive material.clone() - clone a material for per-object flash or dissolve.
const hex = c => new THREE.Color(c).getHex();
function rebuild(m) {
  const patches = m.userData.cru || [], space = m.userData.cruSpace || 'world', u = {};
  const st = patches.find(p => p.kind === 'stylize'), dz = patches.find(p => p.kind === 'dissolve');
  if (st) Object.assign(u, {
    uRimColor: { value: new THREE.Color(st.rim) }, uRimPower: { value: st.rimPower }, uRimStrength: { value: st.rimStrength },
    uVar: { value: st.variation }, uVarScale: { value: st.variationScale }, uGrime: { value: st.grime }, uGrimeHeight: { value: st.grimeHeight },
    uGround: { value: st.ground }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(st.flashColor) },
    uHatch: { value: st.hatch }, uHatchScale: { value: st.hatchScale }, uHatchColor: { value: new THREE.Color(st.hatchColor) } });
  if (dz) Object.assign(u, { uDissolve: { value: 0 }, uEdge: { value: new THREE.Color(dz.edge) }, uEdgeW: { value: dz.width }, uDScale: { value: dz.scale } });
  m.userData.stylize = st ? u : undefined;                 // u.uFlash.value = 0..1 for a hit flash
  m.userData.dissolve = dz ? u.uDissolve : undefined;      // .value = 0 (solid) .. 1 (gone)
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    // world space for static things; object space (rest pose) for anything that moves, so the pattern does not slide over it
    const pos = space === 'object' ? 'vCruPos = position;' : 'vec4 cruWP = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\ncruWP = instanceMatrix * cruWP;\n#endif\nvCruPos = (modelMatrix * cruWP).xyz;';
    sh.vertexShader = 'varying vec3 vCruPos;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + pos);
    let head = 'varying vec3 vCruPos;\n' + NOISE, frag = sh.fragmentShader, light = '';
    if (st) {
      head += 'uniform vec3 uRimColor, uFlashColor, uHatchColor; uniform float uRimPower, uRimStrength, uVar, uVarScale, uGrime, uGrimeHeight, uGround, uFlash, uHatch, uHatchScale;\n';
      frag = frag.replace('#include <color_fragment>', `#include <color_fragment>
        float cruN = cru_fbm(vCruPos * uVarScale) * 0.7 + cru_noise(vCruPos * uVarScale * 7.0) * 0.3;
        diffuseColor.rgb *= 1.0 + uVar * (cruN - 0.5) * 2.0;
        diffuseColor.rgb *= mix(1.0 - uGrime, 1.0, smoothstep(0.0, uGrimeHeight, vCruPos.y - uGround));`);
      light += `float cruRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
        outgoingLight += uRimColor * cruRim * uRimStrength;
        if (uHatch > 0.0) {   // comic ink hatching in the shadows: diagonal screen-space lines, denser where it is darker
          float cruL = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
          float cruDark = 1.0 - smoothstep(0.08, 0.45, cruL);
          vec2 cruF = gl_FragCoord.xy / uHatchScale;
          float cruLine = smoothstep(0.72, 0.9, abs(fract(cruF.x + cruF.y) - 0.5) * 2.0);
          float cruLine2 = smoothstep(0.72, 0.9, abs(fract(cruF.x - cruF.y) - 0.5) * 2.0) * step(0.75, cruDark);
          outgoingLight = mix(outgoingLight, uHatchColor, max(cruLine, cruLine2) * cruDark * uHatch);
        }
        outgoingLight = mix(outgoingLight, uFlashColor * 2.0, uFlash);\n`;
    }
    if (dz) {
      head += 'uniform float uDissolve, uEdgeW, uDScale; uniform vec3 uEdge;\n';
      frag = frag.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float cruD = cru_fbm(vCruPos * uDScale);
        if (cruD < uDissolve) discard;`);
      light += 'outgoingLight += uEdge * 3.0 * (1.0 - smoothstep(0.0, uEdgeW, cruD - uDissolve)) * step(0.001, uDissolve);\n';
    }
    sh.fragmentShader = head + frag.replace('#include <opaque_fragment>', light + '#include <opaque_fragment>');
  };
  const key = 'cru:' + space + ':' + patches.map(p => p.kind).sort().join('+');
  m.customProgramCacheKey = () => key;
  const baseClone = Object.getPrototypeOf(m).clone;
  m.clone = function () { const c = baseClone.call(this); c.userData.cru = JSON.parse(JSON.stringify(patches)); c.userData.cruSpace = space; rebuild(c); return c; };
  m.needsUpdate = true;
  return m;
}
const setPatch = (m, patch, space) => { m.userData.cru = [...(m.userData.cru || []).filter(p => p.kind !== patch.kind), patch]; if (space) m.userData.cruSpace = space; return rebuild(m); };

// Stylised surface on any built-in lit material (MeshStandardMaterial, MeshToonMaterial, MeshLambertMaterial, MeshPhongMaterial):
//  - rim light (fresnel) so characters and props separate from the background,
//  - colour variation at two scales (breaks up flat colour without textures or UVs),
//  - grime: darkening towards the ground (fake contact occlusion), the cheapest way to make things sit in the world,
//  - hit flash: material.userData.stylize.uFlash.value = 0..1 (clone the material for things that flash individually),
//  - hatch: comic ink hatching in the shadows (0 = off, 0.5-0.9 for a Borderlands-like look; hatchScale = line spacing in pixels).
// space: 'world' (default, static geometry) or 'object' (characters, weapons, anything that moves; y is measured from the object's origin).
export function stylize(material, o = {}) {
  return setPatch(material, { kind: 'stylize', rim: hex(o.rim ?? 0xbfd8ff), rimPower: o.rimPower ?? 3.0, rimStrength: o.rimStrength ?? 0.35,
    variation: o.variation ?? 0.12, variationScale: o.variationScale ?? 0.6, grime: o.grime ?? 0.0, grimeHeight: o.grimeHeight ?? 1.2,
    ground: o.ground ?? 0.0, flashColor: hex(o.flashColor ?? 0xffffff), hatch: o.hatch ?? 0.0, hatchScale: o.hatchScale ?? 7.0, hatchColor: hex(o.hatchColor ?? 0x1a1410) }, o.space);
}

// Dissolve for deaths and spawns: material.userData.dissolve.value from 0 (solid) to 1 (gone); a glowing edge follows the cut.
// Clone the material per dying object so the rest of the group stays solid, and set mesh.castShadow = false while it dissolves
// (shadow and depth passes do not dissolve).
export function dissolvable(material, { edge = 0xffa040, width = 0.08, scale = 3.0, space } = {}) {
  return setPatch(material, { kind: 'dissolve', edge: hex(edge), width, scale }, space);
}

// Micro surface detail without assets: a tileable normal map from fractal noise. Use as `normalMap` with `normalScale` 0.3-1.
// Kinds: 'noise' (cast metal, rock), 'brushed' (machined metal), 'plates' (panels with seams, every `cells` tiles).
export function noiseNormalMap({ size = 256, scale = 8, strength = 2.0, kind = 'noise', cells = 4 } = {}) {
  const h = new Float32Array(size * size);
  const rnd = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, p, q = p) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a, b) => rnd(((a % p) + p) % p, ((b % q) + q) % q);
    return (w(xi, yi) * (1 - u) + w(xi + 1, yi) * u) * (1 - v) + (w(xi, yi + 1) * (1 - u) + w(xi + 1, yi + 1) * u) * v; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / size) * scale, fy = (y / size) * scale;
    let v = vn(fx, fy, scale) * 0.55 + vn(fx * 2, fy * 2, scale * 2) * 0.3 + vn(fx * 4, fy * 4, scale * 4) * 0.15;
    if (kind === 'brushed') v = vn(fx * 0.25, fy * 16, Math.max(1, Math.round(scale * 0.25)), scale * 16) * 0.8 + v * 0.2;
    if (kind === 'plates') { const c = size / cells, gx = x % c, gy = y % c, e = Math.min(gx, gy, c - 1 - gx, c - 1 - gy); v = v * 0.3 + (e < 2 ? 0 : e < 4 ? 0.5 : 1) * 0.7; }
    h[y * size + x] = v;
  }
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const H = (i, j) => h[((j + size) % size) * size + ((i + size) % size)];
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), k = (y * size + x) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}

// Sky dome in one draw call: vertical gradient, sun disc with glow, and a band of soft stylised clouds that drift on the simulation clock.
export function createSky({ top = 0x2a6fd6, horizon = 0xbfe3ff, bottom = 0xe8d8b0, sunDir = new THREE.Vector3(0.4, 0.5, -0.6), sun = 0xfff1c8,
  sunSize = 0.03, clouds = 0.55, cloudColor = 0xffffff, cloudShade = 0x9fb4d8, radius = 450 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uHor: { value: new THREE.Color(horizon) }, uBot: { value: new THREE.Color(bottom) },
      uSunDir: { value: sunDir.clone().normalize() }, uSun: { value: new THREE.Color(sun) }, uSunSize: { value: sunSize }, uClouds: { value: clouds },
      uCloud: { value: new THREE.Color(cloudColor) }, uCloudShade: { value: new THREE.Color(cloudShade) }, uTime: shared.uTime },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 uTop,uHor,uBot,uSunDir,uSun,uCloud,uCloudShade; uniform float uSunSize,uClouds,uTime;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 col = y > 0.0 ? mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.55)) : mix(uHor, uBot, pow(clamp(-y,0.0,1.0), 0.4));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, s) * 2.0 + pow(s, 64.0) * 0.6 + pow(s, 6.0) * 0.12);
        if (uClouds > 0.0 && y > 0.0) {
          vec2 uv = d.xz / (y + 0.18) * 1.6 + vec2(uTime * 0.01, 0.0);
          float n = cru_fbm(vec3(uv, 0.0)) + 0.5 * cru_fbm(vec3(uv * 2.7, 1.7));
          float c = smoothstep(1.05 - uClouds * 0.5, 1.25 - uClouds * 0.5, n) * smoothstep(0.0, 0.25, y);
          float shade = smoothstep(0.9, 1.5, n);
          col = mix(col, mix(uCloud, uCloudShade, shade * 0.8), c);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  sky.frustumCulled = false; sky.renderOrder = -1; sky.matrixAutoUpdate = false; sky.raycast = () => {};
  return sky;
}

// Hand-painted texture in canvas (albedo, sRGB): the Borderlands-style surface - flat painted base, big value shapes, brush strokes,
// ink scratches and cracks, worn light edges on panel borders, dirt at the bottom. Kinds tune the marks; palette gives [base, shade, light, ink].
// Paint large (512) for hero surfaces and tile it; keep one texture per surface type and reuse it (every texture is memory and a upload).
export function paintedTexture({ kind = 'metal', size = 512, palette = ['#8a7a64', '#5e5140', '#c4b392', '#1c1612'], seed = 1, panels = 2, repeat = 1 } = {}) {
  const [base, shade, light, ink] = palette;
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  let s0 = seed * 9301 + 49297; const R = () => ((s0 = (s0 * 9301 + 49297) % 233280) / 233280);
  const wrapDraw = f => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };  // tileable
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  // big value shapes: soft painted patches of shade and light
  for (let i = 0; i < 18; i++) { const x = R() * size, y = R() * size, r = size * (0.08 + R() * 0.22), col = R() < 0.55 ? shade : light;
    wrapDraw(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }); }
  // brush strokes along the surface direction
  const strokes = kind === 'fabric' ? 220 : kind === 'wood' ? 160 : 120;
  for (let i = 0; i < strokes; i++) { const x = R() * size, y = R() * size, len = size * (0.03 + R() * (kind === 'wood' ? 0.4 : 0.12)), w = 1 + R() * (kind === 'rock' ? 6 : 3), a = kind === 'wood' ? (R() - 0.5) * 0.15 : (R() - 0.5) * 1.2;
    wrapDraw(() => { g.strokeStyle = (R() < 0.5 ? shade : light) + (kind === 'fabric' ? '30' : '48'); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (R() - 0.5) * 8, y + Math.sin(a) * len * 0.5 + (R() - 0.5) * 8, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke(); }); }
  // panel borders with worn light edges and an ink line (metal, concrete)
  if (kind === 'metal' || kind === 'concrete') {
    const step = size / panels;
    for (let i = 0; i <= panels; i++) for (const vertical of [true, false]) {
      const p = i * step; g.strokeStyle = ink + 'cc'; g.lineWidth = 2.5; g.beginPath(); vertical ? (g.moveTo(p, 0), g.lineTo(p, size)) : (g.moveTo(0, p), g.lineTo(size, p)); g.stroke();
      g.strokeStyle = light + 'aa'; g.lineWidth = 3; g.beginPath(); vertical ? (g.moveTo(p + 3, 0), g.lineTo(p + 3, size)) : (g.moveTo(0, p + 3), g.lineTo(size, p + 3)); g.stroke();
    }
    if (kind === 'metal') for (let i = 0; i < panels * panels * 4; i++) { const x = (Math.floor(R() * panels) + (R() < 0.5 ? 0.06 : 0.94)) * step, y = (Math.floor(R() * panels) + (R() < 0.5 ? 0.06 : 0.94)) * step;   // rivets
      g.fillStyle = ink; g.beginPath(); g.arc(x, y, size / 140, 0, 7); g.fill(); g.fillStyle = light; g.beginPath(); g.arc(x - 1, y - 1, size / 260, 0, 7); g.fill(); }
  }
  // ink scratches and cracks - the comic line work that sells the style
  const marks = kind === 'rock' || kind === 'concrete' ? 26 : kind === 'skin' ? 10 : 18;
  for (let i = 0; i < marks; i++) { let x = R() * size, y = R() * size; const n = 3 + Math.floor(R() * 5);
    wrapDraw(() => { g.strokeStyle = ink + 'b0'; g.lineWidth = 1 + R() * 1.6; g.beginPath(); g.moveTo(x, y); let px = x, py = y; for (let k = 0; k < n; k++) { px += (R() - 0.5) * size * 0.08; py += (R() - 0.3) * size * 0.06; g.lineTo(px, py); } g.stroke(); }); }
  // chipped paint: light flecks
  for (let i = 0; i < 60; i++) { const x = R() * size, y = R() * size; g.fillStyle = light + '90'; g.beginPath(); g.ellipse(x, y, 1 + R() * 4, 1 + R() * 2.5, R() * 3, 0, 7); g.fill(); }
  // dirt towards the bottom edge (textures are painted "upright")
  const gr = g.createLinearGradient(0, size * 0.6, 0, size); gr.addColorStop(0, shade + '00'); gr.addColorStop(1, shade + '88'); g.fillStyle = gr; g.fillRect(0, size * 0.6, size, size * 0.4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  return t;
}
