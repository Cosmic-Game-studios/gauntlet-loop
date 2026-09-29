// Crucible modelling starter for three.js (copied to <game>/src/shapes.js by kickoff.sh). Used by Character Art, Weapon & Prop Art and World Design.
// Hard-surface and organic building blocks that look modelled rather than assembled from primitives: bevelled profiles, lathed forms,
// tubes, mirrored halves, baked vertex occlusion. Build a model from parts with `assemble`, then merge it per material (lookdev.js).
//   import { profile, chamferBox, lathe, tube, mirrorX, assemble, bakeOcclusion } from './shapes.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A 2D outline (side view) extruded with a bevel: receivers, stocks, blades, armour plates, brackets, building trims.
// points: [[x, y], ...] in metres, counter-clockwise; holes: optional list of point lists. Centered on its depth.
export function profile(points, depth, { bevel = 0.012, bevelSegments = 2, holes = [], curveSegments = 6 } = {}) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(depth - 2 * bevel, 0.001), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments, curveSegments });
  g.translate(0, 0, -depth / 2 + bevel);
  g.computeVertexNormals();
  return g;
}

// A box with rounded edges that catch the light - the default for anything man-made. Never use a sharp BoxGeometry for a visible prop.
export function chamferBox(w, h, d, radius = 0.02, segments = 2) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2, h / 2, d / 2));
}

// A lathed form from a half-profile [[radius, y], ...] bottom to top: barrels, muzzles, scopes, helmets, torsos, limbs, bottles, pillars.
export function lathe(points, segments = 16) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), segments);
  g.computeVertexNormals();
  return g;
}

// A tube along a smooth curve through points: cables, hoses, pipes, horns, tails, straps.
export function tube(points, radius = 0.02, { segments = 24, radial = 8, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
  return new THREE.TubeGeometry(curve, segments, radius, radial, closed);
}

// Model one half, get both: the geometry plus its mirror across x = 0, with winding and normals corrected.
export function mirrorX(geometry) {
  const a = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const b = a.clone(); b.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  for (const name of Object.keys(b.attributes)) {  // swap vertex 1 and 2 of every triangle so faces point outwards again
    const at = b.attributes[name], n = at.itemSize;
    for (let t = 0; t < at.count; t += 3) for (let k = 0; k < n; k++) { const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k, tmp = at.array[i1]; at.array[i1] = at.array[i2]; at.array[i2] = tmp; }
    at.needsUpdate = true;
  }
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(a.attributes)) {
    const x = a.attributes[name], y = b.attributes[name]; const arr = new x.array.constructor(x.array.length + y.array.length);
    arr.set(x.array); arr.set(y.array, x.array.length); out.setAttribute(name, new THREE.BufferAttribute(arr, x.itemSize, x.normalized));
  }
  return out;
}

// Build a model from parts: [{ geo, mat, pos: [x,y,z], rot: [x,y,z] (radians), scale: n | [x,y,z], name, keep }]. Returns a Group.
// `keep: true` leaves a part separate (moving parts: bolt, magazine, jaw) when the group is merged with mergeByMaterial.
export function assemble(parts) {
  const g = new THREE.Group();
  for (const p of parts) {
    const m = new THREE.Mesh(p.geo, p.mat);
    if (p.pos) m.position.set(...p.pos);
    if (p.rot) m.rotation.set(...p.rot);
    if (p.scale != null) Array.isArray(p.scale) ? m.scale.set(...p.scale) : m.scale.setScalar(p.scale);
    if (p.name) m.name = p.name;
    if (p.keep) m.userData.keep = true;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

// Baked vertex occlusion and gradient: darker low down and in concave-facing areas, lighter on top. Makes parts sit together
// like a baked AO pass, at zero runtime cost. Materials need `vertexColors: true`. Apply in model space before merging.
export function bakeOcclusion(geometry, { bottom = 0.55, top = 1.0, minY = null, maxY = null, downward = 0.25, tint = null } = {}) {
  const pos = geometry.attributes.position; geometry.computeBoundingBox();
  const y0 = minY ?? geometry.boundingBox.min.y, y1 = maxY ?? geometry.boundingBox.max.y;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const nrm = geometry.attributes.normal, col = new Float32Array(pos.count * 3), t = tint ? new THREE.Color(tint) : null;
  for (let i = 0; i < pos.count; i++) {
    const h = y1 > y0 ? (pos.getY(i) - y0) / (y1 - y0) : 1;
    let v = bottom + (top - bottom) * Math.sqrt(Math.min(Math.max(h, 0), 1));
    v *= 1 - downward * Math.max(0, -nrm.getY(i));
    col[i * 3] = v * (t ? t.r : 1); col[i * 3 + 1] = v * (t ? t.g : 1); col[i * 3 + 2] = v * (t ? t.b : 1);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geometry;
}

// Scatter copies of one mesh as a single InstancedMesh (rocks, debris, crates, grass tufts, bolts on a panel): one draw call for all of them.
// transforms: [{ pos: [x,y,z], rot: [x,y,z], scale: n | [x,y,z] }]; optional per-instance colours for variation.
export function scatter(geo, mat, transforms, { colors = null } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  transforms.forEach((t, i) => {
    p.set(...(t.pos || [0, 0, 0])); e.set(...(t.rot || [0, 0, 0])); q.setFromEuler(e);
    const sc = t.scale ?? 1; Array.isArray(sc) ? s.set(...sc) : s.setScalar(sc);
    im.setMatrixAt(i, m.compose(p, q, s));
    if (colors) im.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  });
  im.castShadow = im.receiveShadow = true; im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}
