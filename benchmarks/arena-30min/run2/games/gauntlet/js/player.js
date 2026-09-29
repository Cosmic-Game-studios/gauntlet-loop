import * as THREE from '../vendor/three.module.js';

const EYE = 1.7, RADIUS = 0.4, STEP = 0.55, GRAVITY = 24, JUMP_V = 8.2;
const WALK = 6.5, SPRINT = 10, ACCEL_GROUND = 60, ACCEL_AIR = 14, DAMP = 10;

export class Player {
  constructor(ctx, arena) {
    this.ctx = ctx; this.arena = arena;
    this.pos = new THREE.Vector3(0, EYE, 12);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.health = 100; this.alive = true; this.onGround = true; this.god = false;
    this.input = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
    this.moveAmount = 0; this.sprinting = false;
    this.onDamage = null; this.onLand = null; this.onJump = null;
    this._wish = new THREE.Vector3();
  }
  reset() {
    this.pos.set(0, EYE, 12); this.vel.set(0, 0, 0); this.yaw = 0; this.pitch = 0;
    this.health = 100; this.alive = true; this.onGround = true;
  }
  damage(amount, fromPos) {
    if (!this.alive || this.god) return;
    this.health = Math.max(0, this.health - amount);
    if (this.onDamage) this.onDamage(amount, fromPos);
    if (this.health <= 0) this.alive = false;
  }
  look(dx, dy, sens) {
    this.yaw -= dx * 0.0022 * sens;
    this.pitch -= dy * 0.0022 * sens;
    this.clampPitch();
  }
  clampPitch() { const l = Math.PI / 2 - 0.01; if (this.pitch > l) this.pitch = l; if (this.pitch < -l) this.pitch = -l; }
  update(dt) {
    const inp = this.input;
    const fx = (inp.forward ? 1 : 0) - (inp.back ? 1 : 0);
    const sx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    // forward = (-sin yaw, 0, -cos yaw), right = (cos yaw, 0, -sin yaw)
    const w = this._wish.set(-sy * fx + cy * sx, 0, -cy * fx - sy * sx);
    const len = w.length(); if (len > 0) w.multiplyScalar(1 / len);
    this.sprinting = inp.sprint && fx > 0 && this.onGround;
    const speed = this.sprinting ? SPRINT : WALK;
    const acc = this.onGround ? ACCEL_GROUND : ACCEL_AIR;
    // accelerate toward target velocity
    const tx = w.x * speed, tz = w.z * speed;
    const k = Math.min(1, (acc / speed) * dt);
    if (len > 0 || !this.onGround) {
      if (len > 0) { this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k; }
    }
    if (len === 0 && this.onGround) { const d = Math.exp(-DAMP * dt); this.vel.x *= d; this.vel.z *= d; }
    if (inp.jump && this.onGround) { this.vel.y = JUMP_V; this.onGround = false; if (this.onJump) this.onJump(); }
    this.vel.y -= GRAVITY * dt;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.moveAmount = Math.min(1, hs / WALK);

    // integrate per axis with substeps
    const steps = Math.max(1, Math.ceil(hs * dt / 0.2));
    const h = dt / steps;
    let feet = this.pos.y - EYE;
    const wasAir = !this.onGround; const fallV = this.vel.y;
    for (let i = 0; i < steps; i++) {
      this.pos.x += this.vel.x * h; this.resolve(feet, 'x');
      this.pos.z += this.vel.z * h; this.resolve(feet, 'z');
      feet += this.vel.y * h;
      const g = this.groundAt(feet);
      if (feet <= g) {
        // step-up / land
        feet = g; if (this.vel.y < 0) this.vel.y = 0; this.onGround = true;
      } else if (feet > g + 0.05) {
        this.onGround = false;
      } else if (this.vel.y <= 0) { feet = g; this.vel.y = 0; this.onGround = true; }
      // ceilings
      for (const c of this.ctx.colliders) {
        if (this.vel.y > 0 && this.overlapXZ(c) && feet + EYE + 0.1 > c.min.y && feet < c.min.y) { feet = c.min.y - EYE - 0.1; this.vel.y = 0; }
      }
    }
    if (feet < 0) { feet = 0; this.vel.y = Math.max(0, this.vel.y); this.onGround = true; }
    this.pos.y = feet + EYE;
    if (wasAir && this.onGround && fallV < -6 && this.onLand) this.onLand();
    // keep within arena
    this.pos.x = Math.max(-29.5, Math.min(29.5, this.pos.x));
    this.pos.z = Math.max(-29.5, Math.min(29.5, this.pos.z));
  }
  overlapXZ(c) {
    const px = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
    const pz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
    const dx = this.pos.x - px, dz = this.pos.z - pz;
    return dx * dx + dz * dz < RADIUS * RADIUS;
  }
  groundAt(feet) {
    let g = this.arena.groundHeight(this.pos.x, this.pos.z);
    for (const c of this.ctx.colliders) {
      if (c.max.y <= feet + STEP && c.max.y > g && this.overlapXZ(c)) g = c.max.y;
    }
    return g;
  }
  resolve(feet, axis) {
    for (const c of this.ctx.colliders) {
      if (feet + STEP >= c.max.y || feet + EYE <= c.min.y) continue; // can step onto or pass under
      const px = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
      const pz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
      let dx = this.pos.x - px, dz = this.pos.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = RADIUS - d;
        this.pos.x += dx / d * push; this.pos.z += dz / d * push;
        // kill velocity into wall
        const nx = dx / d, nz = dz / d, vn = this.vel.x * nx + this.vel.z * nz;
        if (vn < 0) { this.vel.x -= vn * nx; this.vel.z -= vn * nz; }
      } else {
        // center inside box: push out along smallest axis
        const l = this.pos.x - c.min.x, r = c.max.x - this.pos.x, b = this.pos.z - c.min.z, f = c.max.z - this.pos.z;
        const m = Math.min(l, r, b, f);
        if (m === l) this.pos.x = c.min.x - RADIUS; else if (m === r) this.pos.x = c.max.x + RADIUS;
        else if (m === b) this.pos.z = c.min.z - RADIUS; else this.pos.z = c.max.z + RADIUS;
      }
    }
  }
}
