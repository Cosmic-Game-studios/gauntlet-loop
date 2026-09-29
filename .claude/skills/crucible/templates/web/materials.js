// Crucible shader starter for three.js (copied to <game>/src/materials.js by kickoff.sh). Owned by the Shaders & Rendering department.
// Every function patches or builds materials so they keep three's lighting, shadows, fog and skinning - one small program per material kind,
// uniforms shared, nothing allocated per frame. A starting point: the department tunes, replaces or extends it for the game's look.
//   import { stylize, noiseNormalMap, createSky, dissolvable, tickMaterials } from './materials.js';
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
const WORLDPOS_VERTEX = /* glsl */ `
  vec4 cruWP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    cruWP = instanceMatrix * cruWP;
  #endif
  vCruWorld = (modelMatrix * cruWP).xyz;
`;

// Stylised surface on any built-in lit material (MeshStandardMaterial, MeshToonMaterial, MeshLambertMaterial, MeshPhongMaterial):
//  - rim light (fresnel) so characters and props separate from the background,
//  - world-space colour variation at two scales (breaks up flat colour without textures or UVs),
//  - grime: darkening towards the ground (fake contact occlusion), the cheapest way to make things sit in the world,
//  - optional hit flash (per material: clone the material for things that flash individually, or keep it shared for a group).
export function stylize(material, o = {}) {
  const u = {
    uRimColor: { value: new THREE.Color(o.rim ?? 0xbfd8ff) }, uRimPower: { value: o.rimPower ?? 3.0 }, uRimStrength: { value: o.rimStrength ?? 0.35 },
    uVar: { value: o.variation ?? 0.12 }, uVarScale: { value: o.variationScale ?? 0.6 },
    uGrime: { value: o.grime ?? 0.0 }, uGrimeHeight: { value: o.grimeHeight ?? 1.2 }, uGround: { value: o.ground ?? 0.0 },
    uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(o.flashColor ?? 0xffffff) },
  };
  material.userData.stylize = u;
  material.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = 'varying vec3 vCruWorld;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLDPOS_VERTEX);
    s.fragmentShader = 'varying vec3 vCruWorld;\nuniform vec3 uRimColor; uniform float uRimPower, uRimStrength, uVar, uVarScale, uGrime, uGrimeHeight, uGround, uFlash; uniform vec3 uFlashColor;\n' + NOISE +
      s.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          float cruN = cru_fbm(vCruWorld * uVarScale) * 0.7 + cru_noise(vCruWorld * uVarScale * 7.0) * 0.3;
          diffuseColor.rgb *= 1.0 + uVar * (cruN - 0.5) * 2.0;
          diffuseColor.rgb *= mix(1.0 - uGrime, 1.0, smoothstep(0.0, uGrimeHeight, vCruWorld.y - uGround));`)
        .replace('#include <opaque_fragment>', `
          float cruRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
          outgoingLight += uRimColor * cruRim * uRimStrength;
          outgoingLight = mix(outgoingLight, uFlashColor * 2.0, uFlash);
          #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'cru-stylize';
  material.needsUpdate = true;
  return material;
}

// Dissolve for deaths and spawns: set material.userData.dissolve.value from 0 (solid) to 1 (gone); a glowing edge follows the cut.
// Clone the material per dying object so the rest of the group stays solid.
export function dissolvable(material, { edge = 0xffa040, width = 0.08, scale = 3.0 } = {}) {
  const u = { uDissolve: { value: 0 }, uEdge: { value: new THREE.Color(edge) }, uEdgeW: { value: width }, uDScale: { value: scale } };
  material.userData.dissolve = u.uDissolve;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (s, r) => {
    if (prev) prev.call(material, s, r);
    Object.assign(s.uniforms, u);
    if (!s.vertexShader.includes('vCruWorld')) {
      s.vertexShader = 'varying vec3 vCruWorld;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLDPOS_VERTEX);
      s.fragmentShader = 'varying vec3 vCruWorld;\n' + NOISE + s.fragmentShader;
    }
    s.fragmentShader = 'uniform float uDissolve, uEdgeW, uDScale; uniform vec3 uEdge;\n' + s.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float cruD = cru_fbm(vCruWorld * uDScale);
        if (cruD < uDissolve) discard;`)
      .replace('#include <opaque_fragment>', `outgoingLight += uEdge * 3.0 * (1.0 - smoothstep(0.0, uEdgeW, cruD - uDissolve)) * step(0.001, uDissolve);
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'cru-dissolve' + (prev ? '+s' : '');
  material.needsUpdate = true;
  return material;
}

// Micro surface detail without assets: a tileable normal map from fractal noise. Use as `normalMap` with `normalScale` 0.3-1.
// Kinds: 'noise' (cast metal, rock), 'brushed' (machined metal), 'plates' (panels with seams, every `cells` tiles).
export function noiseNormalMap({ size = 256, scale = 8, strength = 2.0, kind = 'noise', cells = 4 } = {}) {
  const h = new Float32Array(size * size);
  const rnd = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a, b) => rnd(((a % p) + p) % p, ((b % p) + p) % p);
    return (w(xi, yi) * (1 - u) + w(xi + 1, yi) * u) * (1 - v) + (w(xi, yi + 1) * (1 - u) + w(xi + 1, yi + 1) * u) * v; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / size) * scale, fy = (y / size) * scale;
    let v = vn(fx, fy, scale) * 0.55 + vn(fx * 2, fy * 2, scale * 2) * 0.3 + vn(fx * 4, fy * 4, scale * 4) * 0.15;
    if (kind === 'brushed') v = vn(fx * 0.25, fy * 16, scale * 16) * 0.8 + v * 0.2;
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
