// Crucible look-dev starter for three.js (copied to <game>/src/lookdev.js by kickoff.sh).
// A known-good starting point for the Tech Art defaults in craft.md - the Art Director replaces or tunes anything here.
//   import { createRenderer, createPost, toonMaterial, addOutline, mergeByMaterial, canvasTexture } from './lookdev.js';
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

// Post chain: bloom at half resolution with a threshold above gameplay colours (effects must never wash out the target), FXAA, output.
export function createPost(renderer, scene, camera, { bloom = 0.35, radius = 0.4, threshold = 0.85 } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const size = renderer.getSize(new THREE.Vector2());
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), bloom, radius, threshold);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);
  const resize = () => {
    const pr = renderer.getPixelRatio();
    composer.setSize(innerWidth, innerHeight);
    bloomPass.resolution.set(innerWidth / 2, innerHeight / 2);
    fxaa.material.uniforms.resolution.value.set(1 / (innerWidth * pr), 1 / (innerHeight * pr));
  };
  resize();
  return { composer, bloomPass, resize };
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
  const hull = mesh.isSkinnedMesh
    ? new THREE.SkinnedMesh(mesh.geometry, inkMaterial(thickness, color))
    : new THREE.Mesh(mesh.geometry, inkMaterial(thickness, color));
  if (mesh.isSkinnedMesh) hull.bind(mesh.skeleton, mesh.bindMatrix);
  hull.castShadow = false; hull.receiveShadow = false; hull.raycast = () => {};
  mesh.add(hull);
  return hull;
}

// Detail without draw calls: build a model from many parts, then merge static parts per material (one draw call per material).
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.userData.keep) return;
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
