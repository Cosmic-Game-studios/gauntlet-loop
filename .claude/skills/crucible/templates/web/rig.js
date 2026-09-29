// Crucible animation starter for three.js (copied to <game>/src/rig.js by kickoff.sh). Used by Animation and Character Art.
// Skeletons from a joint list, clips authored as key poses with real easing (anticipation, overshoot, settle), an animator with
// cross-fades and one-shot actions, and procedural layers on top: hit reactions, look-at, springs for secondary motion, two-bone IK.
//
//   import { createRig, poseClip, Animator, Spring, twoBoneIK } from './rig.js';
//   const rig = createRig([{ name: 'hips', pos: [0, 0.95, 0] }, { name: 'spine', parent: 'hips', pos: [0, 1.15, 0] }, ...]);
//   const mesh = rig.bind(sculptedGeometry, material);          // SkinnedMesh, bind pose = the joint positions
//   const walk = poseClip('walk', rig, 0.8, [ { t: 0, pose: { 'thigh.L': [-30, 0, 0], ... }, root: [0, -0.03, 0] }, ... ], { loop: true });
//   const anim = new Animator(mesh, rig, [idle, walk, attack, hit, death]); anim.play('walk'); ... anim.update(dt);
// Characters face +z, y is up. Pose rotations are Euler angles in degrees (x, y, z), relative to the bind pose, in the bone's frame (bind frames are
// axis-aligned, so x swings forward/back, z raises sideways, y twists).
import * as THREE from 'three';

const D2R = Math.PI / 180;

export function createRig(joints) {
  const bones = [], byName = {}, index = {};
  for (const j of joints) {
    const b = new THREE.Bone(); b.name = j.name; b.userData.bindWorld = new THREE.Vector3(...j.pos);
    const parent = j.parent ? byName[j.parent] : null;
    if (j.parent && !parent) throw new Error(`rig: parent ${j.parent} of ${j.name} is not defined before it`);
    b.position.copy(b.userData.bindWorld); if (parent) { b.position.sub(parent.userData.bindWorld); parent.add(b); }
    index[j.name] = bones.length; bones.push(b); byName[j.name] = b;
  }
  const roots = bones.filter(b => !b.parent);
  const skeleton = new THREE.Skeleton(bones);
  return {
    bones: byName, list: bones, index, skeleton, roots,
    bind(geometry, material) {
      const mesh = new THREE.SkinnedMesh(geometry, material);
      for (const r of roots) mesh.add(r);
      mesh.updateMatrixWorld(true);
      mesh.bind(skeleton);
      mesh.castShadow = true; mesh.frustumCulled = false;  // skinned bounds move; cull by the character's own sphere in game code
      return mesh;
    },
    // Debug view of the skeleton (lines), for turntables and animation reviews.
    helper(mesh) { const h = new THREE.SkeletonHelper(mesh); h.material.depthTest = false; return h; },
  };
}

export const Ease = {
  linear: t => t,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },   // overshoot, then settle
  anticipate: t => { const c = 1.70158, c3 = c + 1; return c3 * t * t * t - c * t * t; },                          // pull back, then go
  snap: t => 1 - Math.pow(1 - t, 5),
};

// A clip from key poses. keys: [{ t: 0..1 (fraction of duration), pose: { bone: [x,y,z] degrees }, root: [x,y,z] metres (offset of the
// first root bone), ease: name of Ease used to arrive at this key (default 'inOut'), events: ['footstep'] }].
// Bones not named in a key hold their previous value. The curves are baked at `fps` so any easing survives interpolation.
// Returns an AnimationClip; its events are in clip.userData.events as [{ time, name }].
export function poseClip(name, rig, duration, keys, { loop = false, fps = 30 } = {}) {
  keys = [...keys].sort((a, b) => a.t - b.t);
  const boneNames = [...new Set(keys.flatMap(k => Object.keys(k.pose || {})))];
  const rootBone = rig.roots[0];
  const hasRoot = keys.some(k => k.root);
  const frames = Math.max(2, Math.round(duration * fps) + 1);
  const times = new Float32Array(frames); for (let f = 0; f < frames; f++) times[f] = (f / (frames - 1)) * duration;
  const valueAt = (getter, t, zero) => {  // value of a channel at normalised time t, eased per segment; channels hold between keys
    const ks = keys.filter(k => getter(k) !== undefined);
    if (!ks.length) return zero;
    if (t <= ks[0].t) return getter(ks[0]);
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t <= b.t) { const u = (Ease[b.ease || 'inOut'] || Ease.inOut)((t - a.t) / Math.max(b.t - a.t, 1e-6)); const va = getter(a), vb = getter(b); return va.map((x, n) => x + (vb[n] - x) * u); }
    }
    return getter(ks[ks.length - 1]);
  };
  const tracks = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const bn of boneNames) {
    if (!rig.bones[bn]) throw new Error(`poseClip ${name}: unknown bone ${bn}`);
    const vals = new Float32Array(frames * 4);
    for (let f = 0; f < frames; f++) {
      const r = valueAt(k => k.pose && k.pose[bn], f / (frames - 1), [0, 0, 0]);
      q.setFromEuler(e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ')); q.toArray(vals, f * 4);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bn}.quaternion`, times, vals));
  }
  if (hasRoot) {
    const base = rootBone.position.clone(), vals = new Float32Array(frames * 3);
    for (let f = 0; f < frames; f++) { const r = valueAt(k => k.root, f / (frames - 1), [0, 0, 0]); vals[f * 3] = base.x + r[0]; vals[f * 3 + 1] = base.y + r[1]; vals[f * 3 + 2] = base.z + r[2]; }
    tracks.push(new THREE.VectorKeyframeTrack(`${rootBone.name}.position`, times, vals));
  }
  const clip = new THREE.AnimationClip(name, duration, tracks);
  clip.userData = { loop, events: keys.flatMap(k => (k.events || []).map(n => ({ time: k.t * duration, name: n }))) };
  return clip;
}

// Damped spring (critically damped by default): secondary motion, recoil recovery, hit reactions, camera lag.
export class Spring {
  constructor(stiffness = 120, damping = null) { this.k = stiffness; this.c = damping ?? 2 * Math.sqrt(stiffness); this.x = 0; this.v = 0; this.target = 0; }
  impulse(v) { this.v += v; return this; }
  update(dt) { const a = -this.k * (this.x - this.target) - this.c * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; }
}

// Plays loops and one-shots with cross-fades, fires clip events, and applies procedural layers after the clips:
//   hit(dirX, strength)  - a flinch through the spine chain, spring-driven, direction-aware
//   lookAt(worldPos, w)  - head (and a little chest) turn towards a target
//   onEvent(fn)          - fn(name, clipName) for footsteps, hit frames, VFX and sound cues
export class Animator {
  constructor(mesh, rig, clips, { spine = ['spine', 'chest'], head = 'head' } = {}) {
    this.mesh = mesh; this.rig = rig; this.mixer = new THREE.AnimationMixer(mesh);
    this.actions = {}; this.clips = {}; this.current = null; this.base = null; this.listeners = [];
    for (const c of clips) { this.clips[c.name] = c; const a = this.mixer.clipAction(c); a.setLoop(c.userData.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !c.userData.loop; this.actions[c.name] = a; }
    this.mixer.addEventListener('finished', e => { const n = e.action.getClip().name; if (n !== this.hold && this.base && n === this.current) this.play(this.base, { fade: 0.2 }); });
    this.spine = spine.map(n => rig.bones[n]).filter(Boolean); this.head = rig.bones[head];
    this.hitX = new Spring(160); this.hitZ = new Spring(160); this.look = null; this.lookW = 0; this.lastT = {};
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._m = new THREE.Matrix4();
    this._base = new Map();   // bone -> quaternion before the procedural layers, so layers never accumulate on bones no clip animates
  }
  onEvent(fn) { this.listeners.push(fn); }
  // play(name): loops become the base state; one-shots play once and return to the base (unless { hold: true }, e.g. death)
  play(name, { fade = 0.15, speed = 1, hold = false, restart = false } = {}) {
    const next = this.actions[name]; if (!next) throw new Error('Animator: no clip ' + name);
    if (this.current === name && !restart) { next.timeScale = speed; return; }
    const prev = this.current && this.actions[this.current];
    next.reset(); next.timeScale = speed; next.enabled = true; next.setEffectiveWeight(1); next.play();
    if (prev && prev !== next) prev.crossFadeTo(next, fade, false);
    if (this.clips[name].userData.loop) this.base = name;
    if (hold) this.hold = name;
    this.current = name; this.lastT[name] = -1;
  }
  hit(dirX = 0, strength = 1) { this.hitX.impulse(-6 * strength); this.hitZ.impulse(dirX * 5 * strength); }
  lookAt(worldPos, weight = 1) { this.look = worldPos; this.lookW = weight; }
  update(dt) {
    for (const [b, q] of this._base) b.quaternion.copy(q);
    this.mixer.update(dt);
    for (const b of [...this.spine, this.head]) if (b) { if (!this._base.has(b)) this._base.set(b, new THREE.Quaternion()); this._base.get(b).copy(b.quaternion); }
    for (const [name, a] of Object.entries(this.actions)) {   // events crossed this frame
      if (!a.isRunning()) continue; const t = a.time, last = this.lastT[name] ?? t;
      for (const ev of this.clips[name].userData.events) if ((last < ev.time && t >= ev.time) || (t < last && (ev.time > last || ev.time <= t))) for (const f of this.listeners) f(ev.name, name);
      this.lastT[name] = t;
    }
    const hx = this.hitX.update(dt), hz = this.hitZ.update(dt);   // flinch: spread through the spine chain
    if (Math.abs(hx) + Math.abs(hz) > 1e-4) for (const b of this.spine) b.quaternion.multiply(this._q.setFromEuler(this._e.set(hx * 0.12, 0, hz * 0.12)));
    if (this.look && this.head && this.lookW > 0) {
      this.head.updateWorldMatrix(true, false);
      const rel = this._v.copy(this.look).applyMatrix4(this._m.copy(this.head.parent.matrixWorld).invert()).sub(this.head.position);
      const yaw = Math.atan2(rel.x, rel.z), pitch = -Math.atan2(rel.y, Math.hypot(rel.x, rel.z));   // characters face +z
      const clamp = (v, m) => Math.max(-m, Math.min(m, v));
      this.head.quaternion.multiply(this._q.setFromEuler(this._e.set(clamp(pitch, 0.6) * this.lookW, clamp(yaw, 1.1) * this.lookW, 0)));
    }
  }
}

// Two-bone IK (arm or leg): rotates `upper` and `lower` so the tip of `end` reaches `target` (world), bending towards `pole` (world).
// Call after Animator.update - e.g. feet planted on uneven ground, hands on a weapon. Returns false if the target is out of reach (it then stretches towards it).
export function twoBoneIK(upper, lower, end, target, pole) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  upper.updateWorldMatrix(true, true);
  upper.getWorldPosition(a); lower.getWorldPosition(b); end.getWorldPosition(c);
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c), toT = target.clone().sub(a), dist = Math.min(toT.length(), l1 + l2 - 1e-4);
  const reach = toT.length() <= l1 + l2;
  // desired joint position in the plane of (target, pole)
  const dir = toT.clone().normalize(), poleDir = pole.clone().sub(a); poleDir.sub(dir.clone().multiplyScalar(poleDir.dot(dir))).normalize();
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const joint = a.clone().add(dir.clone().multiplyScalar(cosA * l1)).add(poleDir.multiplyScalar(sinA * l1));
  const endPos = a.clone().add(dir.multiplyScalar(dist));
  const aim = (bone, to, childWorld) => {   // rotate bone so its child moves from `from` direction to `to` direction (world)
    const pw = new THREE.Quaternion(); bone.parent.getWorldQuaternion(pw);
    const bw = new THREE.Quaternion(); bone.getWorldQuaternion(bw);
    const bp = new THREE.Vector3(); bone.getWorldPosition(bp);
    const q = new THREE.Quaternion().setFromUnitVectors(childWorld.clone().sub(bp).normalize(), to.clone().sub(bp).normalize());
    bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
    bone.updateWorldMatrix(false, true);
  };
  aim(upper, joint, b);
  lower.getWorldPosition(b); end.getWorldPosition(c);
  aim(lower, endPos, c);
  return reach;
}
