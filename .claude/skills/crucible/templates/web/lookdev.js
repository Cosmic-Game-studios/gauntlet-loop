// Crucible look-dev starter for three.js (copied to <game>/src/lookdev.js by kickoff.sh).
// A known-good starting point for the Tech Art defaults in craft.md - the Art Director replaces or tunes anything here.
//   import { createRenderer, createPost, createAutoScale, precompile, toonMaterial, addOutline, mergeByMaterial, canvasTexture } from './lookdev.js';
// createPost is async (it loads the AO pass only when quality is 'high'): const post = await createPost(renderer, scene, camera, { quality: 'medium' });
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Renderer with colour management, filmic tone mapping, soft shadows and a neutral image-based environment.
export function createRenderer({ canvas, exposure = 1.0, pixelRatioCap = 1.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return { renderer, envMap };
}

// Colour grade + vignette after tone mapping: the cheapest single step from "rendered" to "shot". One full-screen pass.
export const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1.12 }, uContrast: { value: 1.08 }, uLift: { value: new THREE.Color(0x020308) },
    uGain: { value: new THREE.Color(0xfff6ea) }, uVignette: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uContrast, uVignette; uniform vec3 uLift, uGain; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = (c.rgb - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = uLift + col * (uGain - uLift);
      vec2 d = vUv - 0.5; col *= 1.0 - uVignette * smoothstep(0.35, 0.85, length(d * vec2(1.0, 0.8)) * 1.4);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

// Post chain by quality level - one setting the player can change, never a silent downgrade:
//   'low'    render + output + FXAA                      (weak GPUs, software rendering)
//   'medium' + bloom at half resolution + grade          (default)
//   'high'   + ambient occlusion (GTAO, half resolution) (desktop GPUs; measure it)
// Bloom threshold stays above gameplay colours so effects never wash out the target.
export async function createPost(renderer, scene, camera, { quality = 'medium', bloom = 0.35, radius = 0.4, threshold = 0.85, grade = {} } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const size = renderer.getSize(new THREE.Vector2());
  let aoPass = null, bloomPass = null, gradePass = null;
  if (quality === 'high') {
    const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
    aoPass = new GTAOPass(scene, camera, size.x / 2, size.y / 2);
    aoPass.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.0, scale: 1.0, samples: 12 });
    aoPass.blendIntensity = 0.8;
    composer.addPass(aoPass);
  }
  if (quality !== 'low') {
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), bloom, radius, threshold);
    composer.addPass(bloomPass);
  }
  composer.addPass(new OutputPass());
  if (quality !== 'low') {
    gradePass = new ShaderPass(GradeShader);
    for (const [k, v] of Object.entries(grade)) { const u = gradePass.uniforms[k]; if (!u) continue; if (u.value && u.value.isColor) u.value.set(v); else u.value = v; }
    composer.addPass(gradePass);
  }
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);
  const resize = () => {
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight);
    if (bloomPass) bloomPass.resolution.set(innerWidth / 2, innerHeight / 2);
    if (aoPass) aoPass.setSize(innerWidth / 2, innerHeight / 2);
    fxaa.material.uniforms.resolution.value.set(1 / (innerWidth * pr), 1 / (innerHeight * pr));
  };
  resize();
  return { composer, bloomPass, gradePass, aoPass, resize };
}

// Dynamic resolution: keeps the frame time near the target by scaling the pixel ratio between min and max.
// Call update(frameMs) once per rendered frame; set .enabled = false while capturing so review images are comparable.
export function createAutoScale(renderer, onResize, { targetMs = 16.7, min = 0.6, max = Math.min(devicePixelRatio, 1.5), every = 45 } = {}) {
  let acc = 0, n = 0, good = 0;
  return {
    enabled: true,
    update(frameMs) {
      if (!this.enabled) return;
      acc += Math.min(frameMs, 50); if (++n < every) return;   // clamp: one tab switch or hitch must not decide the resolution
      const avg = acc / n; acc = 0; n = 0;
      const pr = renderer.getPixelRatio();
      let next = pr;
      if (avg > targetMs * 1.2) { next = Math.max(min, pr * 0.85); good = 0; }
      else if (avg <= targetMs * 1.05 && ++good >= 3) { next = Math.min(max, pr * 1.1); good = 0; }   // up only after 3 steady windows
      if (Math.abs(next - pr) > 0.01) { renderer.setPixelRatio(next); onResize && onResize(); }
    },
  };
}

// Compile every material before the first frame, so shaders never hitch mid-fight. Await it behind the loading screen.
// Pass the composer when there is one: materials compile for its render target (linear, no tone mapping), not for the screen.
export async function precompile(renderer, scene, camera, composer = null) {
  const prev = renderer.getRenderTarget();
  if (composer) renderer.setRenderTarget(composer.readBuffer);
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
  renderer.setRenderTarget(prev);
  if (composer) composer.render(0);   // also builds the post passes' programs
}

// Cel shading: a 2-4 band ramp shared by every toon material, so characters and world light the same way.
const ramps = new Map();
export function toonRamp(bands = 3) {
  if (!ramps.has(bands)) {
    const data = new Uint8Array(bands);
    for (let i = 0; i < bands; i++) data[i] = Math.round(40 + (215 * i) / (bands - 1));
    const t = new THREE.DataTexture(data, bands, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    ramps.set(bands, t);
  }
  return ramps.get(bands);
}
export function toonMaterial(color, { bands = 3, map = null, emissive = 0x000000, vertexColors = false } = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(bands), map, emissive, vertexColors });
}

// Ink outline by inverted hull: a back-face shell pushed out along normals. Thickness in world units; thicker on characters than on the world.
// Hard-edged geometry (boxes) splits at seams - use smooth-normal or bevelled geometry for outlined parts, or a screen-space edge pass.
const inkMats = new Map();
export function inkMaterial(thickness = 0.03, color = 0x111111) {
  const key = thickness + ':' + color;
  if (!inkMats.has(key)) {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    m.onBeforeCompile = s => {
      s.uniforms.ink = { value: thickness };
      s.vertexShader = 'uniform float ink;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * ink;');
    };
    m.customProgramCacheKey = () => 'ink' + thickness;
    inkMats.set(key, m);
  }
  return inkMats.get(key);
}
export function addOutline(mesh, thickness = 0.03, color = 0x111111) {
  // safe inside traverse(): never outline an outline, never outline twice
  if (mesh.userData.isOutline) return null;
  const had = mesh.children.find(c => c.userData.isOutline); if (had) return had;
  const hull = mesh.isSkinnedMesh
    ? new THREE.SkinnedMesh(mesh.geometry, inkMaterial(thickness, color))
    : new THREE.Mesh(mesh.geometry, inkMaterial(thickness, color));
  if (mesh.isSkinnedMesh) hull.bind(mesh.skeleton, mesh.bindMatrix);
  hull.castShadow = false; hull.receiveShadow = false; hull.raycast = () => {};
  hull.userData.isOutline = true;
  mesh.add(hull);
  return hull;
}

// Detail without draw calls: build a model from many parts, then merge static parts per material (one draw call per material).
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(), keep = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    // moving parts (userData.keep), skinned and instanced meshes stay separate objects, re-parented with their transform
    if (o.isSkinnedMesh || o.isInstancedMesh || o.userData.keep) { keep.push(o); return; }
    const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    const ng = g.index ? g.toNonIndexed() : g;
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(ng);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of groups) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = mesh.receiveShadow = true;
    out.add(mesh);
  }
  for (const o of keep) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    o.removeFromParent(); m.decompose(o.position, o.quaternion, o.scale); out.add(o);
  }
  return out;
}

// Painted surfaces in canvas: base colour, large-scale variation, grime, edge wear, a few decals. draw(ctx, size) adds the specifics.
export function canvasTexture(size = 256, base = '#888', draw = null, { repeat = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
    ctx.beginPath(); ctx.arc(Math.random() * size, Math.random() * size, size * (0.05 + Math.random() * 0.15), 0, Math.PI * 2); ctx.fill();
  }
  if (draw) draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
