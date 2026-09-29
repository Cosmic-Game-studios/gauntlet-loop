import * as THREE from 'three';
import { PLAYER, TICK } from './config.js';
// Capsule(approximated as vertical AABB column) vs world.colliders, per-axis resolve, step-up <=0.5 m.
export function createPlayer(world, camera) {
  const R = PLAYER.radius, H = PLAYER.height, STEP = 0.5;
  const p = { position: new THREE.Vector3(), eye: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
    onGround: true, health: PLAYER.maxHealth, maxHealth: PLAYER.maxHealth, bob: 0, bobAmt: 0, speed: 0, landKick: 0, stepAcc: 0 };
  const cols = () => world.colliders || [];
  function overlaps(x, y, z) { // returns highest-top overlapping box or null
    let hit = null;
    for (const b of cols()) {
      if (x + R <= b.min.x || x - R >= b.max.x || z + R <= b.min.z || z - R >= b.max.z) continue;
      if (y + H <= b.min.y || y >= b.max.y - 1e-4) continue;
      if (!hit || b.max.y > hit.max.y) hit = b;
    }
    return hit;
  }
  function groundAt(x, y, z) { // highest top under feet within reach
    let g = 0;
    for (const b of cols()) {
      if (x + R <= b.min.x || x - R >= b.max.x || z + R <= b.min.z || z - R >= b.max.z) continue;
      if (b.max.y <= y + 0.05 && b.max.y > g) g = b.max.y;
    }
    return g;
  }
  function moveAxis(axis, d) {
    if (d === 0) return;
    const pos = p.position; const n = Math.ceil(Math.abs(d) / (R * 0.5)); const s = d / n;
    for (let i = 0; i < n; i++) {
      pos[axis] += s;
      const b = overlaps(pos.x, pos.y, pos.z);
      if (!b) continue;
      const rise = b.max.y - pos.y;
      if (rise <= STEP && (p.onGround || rise < 0.2) && !overlaps(pos.x, b.max.y + 0.001, pos.z)) { pos.y = b.max.y; continue; }
      pos[axis] = s > 0 ? (axis === 'x' ? b.min.x : b.min.z) - R - 1e-3 : (axis === 'x' ? b.max.x : b.max.z) + R + 1e-3;
      if (axis === 'x') p.vel.x = 0; else p.vel.z = 0;
      break;
    }
  }
  const fwd = new THREE.Vector3(), right = new THREE.Vector3();
  p.update = (dt, input) => {
    fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)); right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    let mx = 0, mz = 0;
    const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0), r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    mx = fwd.x * f + right.x * r; mz = fwd.z * f + right.z * r;
    const len = Math.hypot(mx, mz); if (len > 0) { mx /= len; mz /= len; }
    const sp = input.sprint && f > 0 ? PLAYER.sprint : PLAYER.walk;
    const accel = p.onGround ? 14 : 3;
    const k = 1 - Math.exp(-accel * dt);
    p.vel.x += (mx * sp - p.vel.x) * k; p.vel.z += (mz * sp - p.vel.z) * k;
    let jumped = false;
    if (input.jump && p.onGround) { p.vel.y = PLAYER.jump; p.onGround = false; jumped = true; }
    p.vel.y -= PLAYER.gravity * dt;
    moveAxis('x', p.vel.x * dt); moveAxis('z', p.vel.z * dt);
    // vertical
    const wasAir = !p.onGround, vy = p.vel.y;
    p.position.y += p.vel.y * dt;
    const b = overlaps(p.position.x, p.position.y, p.position.z);
    if (b) { if (p.vel.y > 0) { p.position.y = b.min.y - H - 1e-3; p.vel.y = 0; } else if (b.max.y - p.position.y <= STEP) { p.position.y = b.max.y; p.vel.y = 0; }
      else { // too tall to step onto: push out horizontally along least penetration
        const px = p.position.x, pz = p.position.z;
        const dl = px + R - b.min.x, dr = b.max.x + R - px, dn = pz + R - b.min.z, df = b.max.z + R - pz, m = Math.min(dl, dr, dn, df);
        if (m === dl) p.position.x = b.min.x - R - 1e-3; else if (m === dr) p.position.x = b.max.x + R + 1e-3;
        else if (m === dn) p.position.z = b.min.z - R - 1e-3; else p.position.z = b.max.z + R + 1e-3;
        p.position.y -= p.vel.y * dt; if (p.vel.y < 0) p.vel.y = 0;
      } }
    const g = groundAt(p.position.x, p.position.y + 0.05, p.position.z);
    let landed = false;
    if (p.position.y <= g + 0.02 && p.vel.y <= 0) {
      // snap down small steps when walking
      p.position.y = g; p.vel.y = 0; if (wasAir && vy < -3) { landed = true; p.landKick = Math.min(0.12, -vy * 0.012); } p.onGround = true;
    } else if (p.onGround && p.vel.y <= 0 && p.position.y - g <= STEP && !jumped) { p.position.y = g; p.vel.y = 0; }
    else p.onGround = false;
    if (p.position.y < 0) { p.position.y = 0; p.vel.y = 0; p.onGround = true; }
    const bd = world.bounds; if (bd) { p.position.x = Math.min(bd.maxX - R, Math.max(bd.minX + R, p.position.x)); p.position.z = Math.min(bd.maxZ - R, Math.max(bd.minZ + R, p.position.z)); }
    p.speed = Math.hypot(p.vel.x, p.vel.z);
    const moving = p.onGround && p.speed > 0.5;
    p.bobAmt += ((moving ? Math.min(1, p.speed / PLAYER.walk) : 0) - p.bobAmt) * Math.min(1, dt * 10);
    const prevB = p.bob; if (moving) p.bob += dt * p.speed * 1.6;
    let footstep = moving && Math.floor(prevB / Math.PI) !== Math.floor(p.bob / Math.PI);
    p.landKick *= Math.exp(-dt * 8);
    p.eye.set(p.position.x, p.position.y + H - 0.1, p.position.z);
    return { jumped, landed, footstep };
  };
  p.applyCamera = () => {
    camera.position.copy(p.eye);
    camera.position.y += Math.abs(Math.sin(p.bob)) * 0.05 * p.bobAmt - p.landKick;
    camera.position.x += Math.cos(p.bob) * 0.025 * p.bobAmt * Math.cos(p.yaw);
    camera.position.z -= Math.cos(p.bob) * 0.025 * p.bobAmt * Math.sin(p.yaw);
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
  };
  p.reset = (spawn) => { p.position.copy(spawn || new THREE.Vector3(0, 0, 0)); p.vel.set(0, 0, 0); p.health = p.maxHealth; p.onGround = true; p.eye.set(p.position.x, p.position.y + H - 0.1, p.position.z); };
  return p;
}
