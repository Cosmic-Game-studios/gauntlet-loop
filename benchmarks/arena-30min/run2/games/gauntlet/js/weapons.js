import * as THREE from '../vendor/three.module.js';

// ---------- shared materials ----------
const M = {
  gun: new THREE.MeshStandardMaterial({ color: 0x6a707c, metalness: 0.3, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x24262c, metalness: 0.35, roughness: 0.6 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe9e7f0, metalness: 0.1, roughness: 0.45 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc0182a, metalness: 0.2, roughness: 0.4, emissive: 0x3a0005 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xff3344 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x1d1f24, metalness: 0.05, roughness: 0.9 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.1, roughness: 0.8 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb0302a, metalness: 0.4, roughness: 0.4 }),
};

function panelTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#e4e3ea'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#d2d0da'; x.fillRect(0, 0, 256, 10); x.fillRect(0, 118, 256, 10);
  x.strokeStyle = '#9d9aa8'; x.lineWidth = 2;
  for (const px of [40, 120, 200]) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 128); x.stroke(); }
  x.fillStyle = '#c0182a'; x.fillRect(0, 70, 256, 12);
  x.beginPath(); x.moveTo(140, 70); x.lineTo(170, 70); x.lineTo(150, 50); x.lineTo(120, 50); x.fill();
  x.fillStyle = '#222228';
  for (let i = 0; i < 5; i++) x.fillRect(56 + i * 11, 22, 6, 30);
  x.fillStyle = '#2a2a30'; x.font = 'bold 12px monospace'; x.fillText('DV-7', 206, 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
M.shell = new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.5, metalness: 0.3 });
M.white.roughness = 0.5; M.white.metalness = 0.3; M.red.roughness = 0.5;

// chamfered box: extruded bevelled rectangle, length along z
function bbox(parent, mat, w, h, d, x, y, z, bev = 0.008) {
  const hw = w / 2 - bev, hh = h / 2 - bev, sh = new THREE.Shape();
  sh.moveTo(-hw, -hh); sh.lineTo(hw, -hh); sh.lineTo(hw, hh); sh.lineTo(-hw, hh); sh.lineTo(-hw, -hh);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 1 });
  geo.center();
  // planar UVs from side (x) projection so the texture wraps along the length
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getZ(i) / d) + 0.5, (pos.getY(i) / h) + 0.5);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = false; m.frustumCulled = false; parent.add(m); return m;
}

function box(parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false;
  parent.add(m); return m;
}
function cyl(parent, mat, r, len, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.rotation.x = Math.PI / 2; m.position.set(x, y, z);
  m.castShadow = false; m.frustumCulled = false;
  parent.add(m); return m;
}

function buildRifle() {
  const g = new THREE.Group();
  // receiver
  bbox(g, M.shell, 0.07, 0.085, 0.32, 0, 0, -0.08);
  bbox(g, M.shell, 0.076, 0.05, 0.22, 0, 0.035, -0.1, 0.01);   // upper textured shell
  box(g, M.dark, 0.02, 0.03, 0.06, 0.038, 0.01, -0.05);       // ejection port
  // handguard
  bbox(g, M.shell, 0.078, 0.075, 0.22, 0, 0.005, -0.34, 0.012);
  box(g, M.dark, 0.08, 0.012, 0.2, 0, -0.012, -0.34);
  for (let i = 0; i < 4; i++) box(g, M.dark, 0.082, 0.03, 0.018, 0, 0.018, -0.27 - i * 0.045); // vents
  box(g, M.red, 0.08, 0.02, 0.03, 0, 0.03, -0.45);
  // barrel + muzzle brake
  cyl(g, M.gun, 0.013, 0.2, 0, 0.012, -0.54);
  cyl(g, M.dark, 0.022, 0.06, 0, 0.012, -0.64);
  box(g, M.dark, 0.05, 0.012, 0.03, 0, 0.012, -0.64);
  // sight + rail
  box(g, M.dark, 0.03, 0.012, 0.3, 0, 0.07, -0.16);
  box(g, M.gun, 0.045, 0.045, 0.08, 0, 0.1, -0.1);
  box(g, M.dark, 0.036, 0.032, 0.005, 0, 0.102, -0.058);
  box(g, M.glow, 0.006, 0.006, 0.002, 0, 0.104, -0.054);
  // grip, trigger guard
  box(g, M.dark, 0.045, 0.11, 0.05, 0, -0.08, 0.02, -0.3);
  box(g, M.gun, 0.012, 0.012, 0.07, 0, -0.06, -0.05);
  // magazine (separate so it can drop)
  const mag = new THREE.Group(); mag.position.set(0, -0.05, -0.16); g.add(mag);
  box(mag, M.gun, 0.04, 0.14, 0.065, 0, -0.06, -0.01, 0.18);
  box(mag, M.red, 0.042, 0.02, 0.067, 0, -0.12, -0.02, 0.18);
  // stock
  bbox(g, M.shell, 0.045, 0.055, 0.16, 0, -0.005, 0.15);
  bbox(g, M.white, 0.055, 0.1, 0.05, 0, -0.02, 0.25);
  box(g, M.dark, 0.058, 0.105, 0.012, 0, -0.02, 0.28);
  // hands
  bbox(g, M.glove, 0.07, 0.03, 0.09, -0.004, -0.045, -0.34, 0.01);      // left palm under handguard
  for (let i = 0; i < 3; i++) box(g, M.glove, 0.012, 0.05, 0.02, 0.041, -0.02, -0.37 + i * 0.026); // fingers
  box(g, M.glove, 0.012, 0.045, 0.03, -0.041, -0.02, -0.33);            // thumb
  box(g, M.glove, 0.065, 0.075, 0.07, 0.01, -0.07, 0.02, -0.3);       // right hand on grip
  box(g, M.sleeve, 0.085, 0.085, 0.22, 0.03, -0.1, 0.15, 0.3, 0.2, 0);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.012, -0.68); g.add(muzzle);
  return { group: g, mag, muzzle, pump: null };
}

function buildShotgun() {
  const g = new THREE.Group();
  bbox(g, M.shell, 0.075, 0.09, 0.26, 0, 0, -0.05);
  bbox(g, M.shell, 0.082, 0.055, 0.24, 0, 0.03, -0.05, 0.01);
  cyl(g, M.gun, 0.02, 0.56, 0, 0.022, -0.46, 14);           // barrel
  cyl(g, M.dark, 0.016, 0.46, 0, -0.022, -0.41, 12);        // magazine tube
  cyl(g, M.dark, 0.024, 0.03, 0, 0.022, -0.74);             // muzzle ring
  box(g, M.red, 0.01, 0.012, 0.02, 0, 0.048, -0.72);        // front bead
  box(g, M.dark, 0.012, 0.02, 0.03, 0, 0.07, -0.12);        // rear sight
  box(g, M.glow, 0.004, 0.004, 0.002, 0, 0.08, -0.105);
  // pump
  const pump = new THREE.Group(); pump.position.set(0, -0.02, -0.38); g.add(pump);
  bbox(pump, M.shell, 0.07, 0.06, 0.16, 0, 0, 0, 0.012);
  for (let i = 0; i < 4; i++) box(pump, M.dark, 0.074, 0.008, 0.012, 0, -0.01, -0.05 + i * 0.034);
  bbox(pump, M.glove, 0.068, 0.03, 0.09, 0, -0.042, 0, 0.01);
  for (let i = 0; i < 3; i++) box(pump, M.glove, 0.012, 0.05, 0.02, 0.039, -0.018, -0.03 + i * 0.026);
  // grip + stock
  box(g, M.dark, 0.045, 0.11, 0.05, 0, -0.08, 0.06, -0.35);
  bbox(g, M.shell, 0.05, 0.06, 0.2, 0, -0.03, 0.2);
  bbox(g, M.white, 0.058, 0.11, 0.05, 0, -0.05, 0.31);
  box(g, M.red, 0.06, 0.02, 0.052, 0, 0.0, 0.31);
  box(g, M.glove, 0.065, 0.075, 0.07, 0.01, -0.07, 0.06, -0.3);
  box(g, M.sleeve, 0.085, 0.085, 0.22, 0.03, -0.1, 0.19, 0.3, 0.2, 0);
  // shell (for reload anim)
  const shell = new THREE.Group(); g.add(shell); shell.visible = false;
  cyl(shell, M.brass, 0.011, 0.05, 0, 0, 0, 8);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.022, -0.76); g.add(muzzle);
  return { group: g, mag: shell, muzzle, pump };
}

function makeGlowTexture(star) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,230,1)');
  gr.addColorStop(0.25, 'rgba(255,200,90,0.9)');
  gr.addColorStop(1, 'rgba(255,90,20,0)');
  x.fillStyle = gr;
  if (star) {
    x.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? 9 : 32;
      x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    x.closePath(); x.fill();
  } else x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const DEFS = {
  rifle: { mag: 30, reserve: 90, dmg: 22, rate: 0.1, auto: true, pellets: 1, reload: 1.6, range: 120 },
  shotgun: { mag: 6, reserve: 24, dmg: 12, rate: 0.85, auto: false, pellets: 8, reload: 0.5, range: 60 },
};

const N_TRACERS = 24, N_SPARKS = 48, N_DECALS = 48;

export class Weapons {
  constructor(ctx) {
    this.ctx = ctx;
    this.cam = ctx.camera;
    this.root = new THREE.Group();
    this.root.position.set(0.26, -0.28, -0.62); this.root.scale.setScalar(0.75); this.root.rotation.y = 0.06;
    this.cam.add(this.root);
    this.models = { rifle: buildRifle(), shotgun: buildShotgun() };
    for (const k in this.models) { this.root.add(this.models[k].group); this.models[k].group.renderOrder = 10; }

    // muzzle flash
    const starTex = makeGlowTexture(true), glowTex = makeGlowTexture(false);
    const fm = new THREE.MeshBasicMaterial({ map: starTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.flash = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), fm);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), fm); p2.rotation.y = Math.PI / 2; p2.position.z = -0.1;
    const p3 = p2.clone(); p3.rotation.set(0, Math.PI / 2, Math.PI / 2);
    this.flash.add(p1, p2, p3); this.flash.visible = false;
    this.flash.traverse(o => { o.frustumCulled = false; o.renderOrder = 11; });
    this.flashLight = new THREE.PointLight(0xffaa55, 0, 8, 2);
    this.flashLight.castShadow = false;
    this.cam.add(this.flashLight); this.flashLight.position.set(0.2, -0.1, -0.9);
    this.flashTime = 0;

    // tracers
    this.tracers = [];
    const tm = new THREE.LineBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < N_TRACERS; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const l = new THREE.Line(geo, tm.clone()); l.frustumCulled = false; l.visible = false;
      ctx.scene.add(l); this.tracers.push({ line: l, t: 0 });
    }
    this.tracerIdx = 0;

    // sparks
    this.sparks = [];
    const sm = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const sg = new THREE.PlaneGeometry(0.08, 0.08);
    for (let i = 0; i < N_SPARKS; i++) {
      const s = new THREE.Mesh(sg, sm); s.visible = false; s.frustumCulled = false;
      ctx.scene.add(s); this.sparks.push({ mesh: s, vel: new THREE.Vector3(), t: 0 });
    }
    this.sparkIdx = 0;

    // decals
    this.decals = [];
    const dg = new THREE.CircleGeometry(0.06, 8);
    for (let i = 0; i < N_DECALS; i++) {
      const d = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: 0x151518, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      d.visible = false; ctx.scene.add(d); this.decals.push(d);
    }
    this.decalIdx = 0;

    // scratch
    this.ray = new THREE.Raycaster();
    this.hits = [];
    this.targets = [];
    this._o = new THREE.Vector3(); this._d = new THREE.Vector3(); this._f = new THREE.Vector3();
    this._r = new THREE.Vector3(); this._u = new THREE.Vector3(); this._m = new THREE.Vector3();
    this._n = new THREE.Vector3(); this._p = new THREE.Vector3();
    this._nm = new THREE.Matrix3();
    this.recoilOut = { pitch: 0, yaw: 0 };
    this.state = { weapon: 'rifle', ammo: 0, reserve: 0, reloading: false };
    this.reset();
  }

  reset() {
    this.ammo = { rifle: DEFS.rifle.mag, shotgun: DEFS.shotgun.mag };
    this.reserve = { rifle: DEFS.rifle.reserve, shotgun: DEFS.shotgun.reserve };
    this.current = 'rifle'; this.pending = null;
    this.cooldown = 0; this.reloadT = 0; this.reloading = false; this.reloadDur = 0;
    this.switchT = 0; this.heat = 0; this.fireWasHeld = false;
    this.recPitch = 0; this.recYaw = 0;
    this.kick = 0; this.kickVel = 0; this.bobPhase = 0; this.sprintBlend = 0; this.pumpT = 0;
    this.moveSm = 0;
    this.models.rifle.group.visible = true; this.models.shotgun.group.visible = false;
    for (const t of this.tracers) { t.line.visible = false; t.t = 0; }
    for (const s of this.sparks) { s.mesh.visible = false; s.t = 0; }
    for (const d of this.decals) d.visible = false;
  }

  select(w) {
    if (!DEFS[w] || (w === this.current && !this.pending) || this.pending === w) return;
    this.pending = w; this.switchT = 0; this.reloading = false;
    if (this.ctx.audio) this.ctx.audio.play('switch');
  }
  next() { this.select((this.pending || this.current) === 'rifle' ? 'shotgun' : 'rifle'); }

  reload() {
    const w = this.current, d = DEFS[w];
    if (this.reloading || this.pending || this.ammo[w] >= d.mag || this.reserve[w] <= 0) return false;
    this.reloading = true; this.reloadT = 0;
    this.reloadDur = w === 'rifle' ? d.reload : d.reload;
    if (this.ctx.audio) this.ctx.audio.play('reload');
    return true;
  }

  getState() {
    const s = this.state;
    const sel = this.pending || this.current;
    s.weapon = sel; s.ammo = this.ammo[sel]; s.reserve = this.reserve[sel]; s.reloading = this.reloading;
    return s;
  }

  consumeRecoil() {
    this.recoilOut.pitch = this.recPitch; this.recoilOut.yaw = this.recYaw;
    this.recPitch = 0; this.recYaw = 0;
    return this.recoilOut;
  }

  update(dt, fireHeld, moveAmount = 0, sprinting = false) {
    const w = this.current, d = DEFS[w], audio = this.ctx.audio;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.heat = Math.max(0, this.heat - dt * (fireHeld && w === 'rifle' ? 0.6 : 2.5));
    this.moveSm += (moveAmount - this.moveSm) * Math.min(1, dt * 8);
    this.sprintBlend += ((sprinting && moveAmount > 0.1 ? 1 : 0) - this.sprintBlend) * Math.min(1, dt * 8);

    // switching
    if (this.pending) {
      this.switchT += dt;
      if (this.switchT >= 0.25 && this.current !== this.pending) {
        this.models[this.current].group.visible = false;
        this.current = this.pending;
        this.models[this.current].group.visible = true;
      }
      if (this.switchT >= 0.5) { this.pending = null; this.switchT = 0; }
    }

    // reloading
    if (this.reloading) {
      this.reloadT += dt;
      if (w === 'shotgun') {
        if (fireHeld && this.ammo.shotgun > 0 && !this.fireWasHeld) this.reloading = false;
        else if (this.reloadT >= this.reloadDur) {
          this.ammo.shotgun++; this.reserve.shotgun--; this.reloadT = 0;
          if (audio) audio.play('reload');
          if (this.ammo.shotgun >= d.mag || this.reserve.shotgun <= 0) { this.reloading = false; this.pumpT = 0.001; if (audio) audio.play('pump'); this.cooldown = 0.35; }
        }
      } else if (this.reloadT >= this.reloadDur) {
        const need = d.mag - this.ammo[w], take = Math.min(need, this.reserve[w]);
        this.ammo[w] += take; this.reserve[w] -= take; this.reloading = false;
        if (audio) audio.play('reload');
      }
    }

    // firing
    const canFire = !this.pending && !this.reloading && this.cooldown <= 0 && this.ctx.player.alive !== false;
    const trigger = fireHeld && (d.auto || !this.fireWasHeld);
    if (fireHeld && !this.pending && this.cooldown <= 0 && !this.reloading && this.ammo[w] <= 0) {
      if (!this.fireWasHeld) { if (audio) audio.play('empty'); this.reload(); }
    } else if (trigger && canFire && this.ammo[w] > 0) {
      this.fire(w, d);
    }
    this.fireWasHeld = fireHeld;

    this.animate(dt);
    this.updateFx(dt);
  }

  fire(w, d) {
    const ctx = this.ctx;
    this.ammo[w]--; this.cooldown = d.rate;
    if (ctx.audio) ctx.audio.play(w);
    if (w === 'shotgun') { this.pumpT = 0.001; if (ctx.audio) ctx.audio.play('pump', { delay: 0.3 }); }

    // spread (radians)
    let spread;
    if (w === 'rifle') { spread = 0.004 + this.heat * 0.03 + this.moveSm * 0.02 + this.sprintBlend * 0.02; this.heat = Math.min(1, this.heat + 0.12); }
    else spread = 0.075;

    // targets list
    const tg = this.targets; tg.length = 0;
    const em = ctx.enemies && ctx.enemies.getHitMeshes ? ctx.enemies.getHitMeshes() : null;
    if (em) for (let i = 0; i < em.length; i++) tg.push(em[i]);
    const wm = ctx.worldMeshes || [];
    for (let i = 0; i < wm.length; i++) tg.push(wm[i]);

    this.cam.updateMatrixWorld();
    const o = this._o.setFromMatrixPosition(this.cam.matrixWorld);
    const e = this.cam.matrixWorld.elements;
    this._r.set(e[0], e[1], e[2]).normalize();
    this._u.set(e[4], e[5], e[6]).normalize();
    this._f.set(-e[8], -e[9], -e[10]).normalize();
    this.models[w].muzzle.getWorldPosition(this._m);

    let anyHit = false, anyKill = false;
    for (let p = 0; p < d.pellets; p++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
      const dir = this._d.copy(this._f).addScaledVector(this._r, Math.cos(a) * r).addScaledVector(this._u, Math.sin(a) * r).normalize();
      this.ray.set(o, dir); this.ray.far = d.range; this.ray.near = 0.05;
      this.hits.length = 0;
      this.ray.intersectObjects(tg, true, this.hits);
      let end = this._p;
      if (this.hits.length) {
        const h = this.hits[0];
        end.copy(h.point);
        let obj = h.object, id;
        while (obj) { if (obj.userData && obj.userData.enemyId !== undefined) { id = obj.userData.enemyId; break; } obj = obj.parent; }
        if (id !== undefined) {
          const killed = ctx.enemies.damage(id, d.dmg, h.point, dir);
          anyHit = true; if (killed) anyKill = true;
          this.spawnSparks(h.point, null, 3, 0xff5040);
        } else {
          let n = null;
          if (h.face) { n = this._n.copy(h.face.normal).transformDirection(h.object.matrixWorld); }
          this.spawnSparks(h.point, n, 4, 0xffc070);
          if (n) this.spawnDecal(h.point, n);
        }
      } else end.copy(o).addScaledVector(dir, d.range);
      if (w === 'rifle' || p % 2 === 0) this.spawnTracer(this._m, end);
    }
    if (anyHit) {
      if (ctx.hud && ctx.hud.hitMarker) ctx.hud.hitMarker(anyKill);
      if (ctx.audio) ctx.audio.play(anyKill ? 'kill' : 'hit');
    }

    // recoil
    if (w === 'rifle') { this.recPitch += 0.012 + Math.random() * 0.006; this.recYaw += (Math.random() - 0.5) * 0.01; this.kickVel += 1.6; }
    else { this.recPitch += 0.05; this.recYaw += (Math.random() - 0.5) * 0.02; this.kickVel += 5; }

    // flash
    this.flash.visible = true; this.flashTime = 0.05;
    this.models[w].muzzle.add(this.flash);
    this.flash.rotation.z = Math.random() * Math.PI;
    const s = w === 'shotgun' ? 1.6 : 1; this.flash.scale.set(s, s, s);
    this.flashLight.intensity = w === 'shotgun' ? 30 : 15;
  }

  spawnTracer(a, b) {
    const t = this.tracers[this.tracerIdx]; this.tracerIdx = (this.tracerIdx + 1) % N_TRACERS;
    const arr = t.line.geometry.attributes.position.array;
    // start slightly ahead of muzzle toward target
    arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.visible = true; t.t = 0.06; t.line.material.opacity = 0.9;
  }

  spawnSparks(p, n, count, color) {
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkIdx]; this.sparkIdx = (this.sparkIdx + 1) % N_SPARKS;
      s.mesh.position.copy(p); s.mesh.visible = true; s.t = 0.25 + Math.random() * 0.15;
      s.mesh.material.color.setHex(color);
      s.vel.set(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).multiplyScalar(4);
      if (n) s.vel.addScaledVector(n, 3);
      s.mesh.scale.setScalar(1);
    }
  }

  spawnDecal(p, n) {
    const d = this.decals[this.decalIdx]; this.decalIdx = (this.decalIdx + 1) % N_DECALS;
    d.position.copy(p).addScaledVector(n, 0.01);
    this._p.copy(d.position).add(n);
    d.lookAt(this._p);
    d.rotation.z = Math.random() * 6.28;
    const sc = 0.6 + Math.random() * 0.6; d.scale.set(sc, sc, sc);
    d.visible = true;
  }

  animate(dt) {
    const w = this.current, m = this.models[w], g = m.group;
    // recoil spring
    const k = 180, damp = 18;
    this.kickVel += (-k * this.kick - damp * this.kickVel) * dt;
    this.kick += this.kickVel * dt;
    // bob
    const speed = 7 + this.sprintBlend * 4;
    this.bobPhase += dt * speed * (0.2 + this.moveSm);
    const amp = this.moveSm * (0.012 + this.sprintBlend * 0.02);
    const bx = Math.sin(this.bobPhase) * amp, by = -Math.abs(Math.cos(this.bobPhase)) * amp * 1.2;
    const idle = Math.sin(performance.now() * 0.0015) * 0.002;

    // reload / switch
    let dip = 0, roll = 0, pitchR = 0;
    if (this.reloading) {
      const t = w === 'rifle' ? this.reloadT / this.reloadDur : 1;
      const e = w === 'rifle' ? Math.sin(Math.min(1, t) * Math.PI) : 1;
      dip = 0.06 * e; roll = 0.5 * e; pitchR = 0.25 * e;
      if (w === 'rifle') {
        // magazine drops out then returns
        const mt = t < 0.25 ? t / 0.25 : t < 0.55 ? 1 : 1 - (t - 0.55) / 0.3;
        m.mag.position.y = -0.05 - Math.max(0, mt) * 0.25;
        m.mag.visible = !(t > 0.35 && t < 0.5);
      } else {
        const st = this.reloadT / this.reloadDur;
        m.mag.visible = true;
        m.mag.position.set(0.0, -0.08 + st * 0.05, -0.1 - st * 0.08);
      }
    } else {
      if (w === 'rifle') { m.mag.position.y = -0.05; m.mag.visible = true; }
      else m.mag.visible = false;
    }
    if (this.pending) { const s = this.switchT / 0.25; const e = s < 1 ? s : 2 - s; dip += 0.25 * e; pitchR -= 0.6 * e; }
    // pump
    if (m.pump) {
      let off = 0;
      if (this.pumpT > 0) {
        this.pumpT += dt;
        const t = (this.pumpT - 0.25) / 0.4;
        if (t > 0 && t < 1) off = Math.sin(t * Math.PI) * 0.09;
        if (this.pumpT > 0.7) this.pumpT = 0;
      }
      m.pump.position.z = -0.38 + off;
    }

    const sb = this.sprintBlend;
    g.position.set(bx - sb * 0.06, by + idle - dip - sb * 0.05, this.kick * 0.05);
    g.rotation.set(this.kick * 0.12 + pitchR - sb * 0.3, bx * 2 + sb * 0.5, roll + bx * 1.5 + sb * 0.2);
  }

  updateFx(dt) {
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) { this.flash.visible = false; this.flashLight.intensity = 0; }
      else this.flashLight.intensity *= 0.7;
    }
    for (let i = 0; i < N_TRACERS; i++) {
      const t = this.tracers[i]; if (!t.line.visible) continue;
      t.t -= dt; t.line.material.opacity = Math.max(0, t.t / 0.06) * 0.9;
      if (t.t <= 0) t.line.visible = false;
    }
    for (let i = 0; i < N_SPARKS; i++) {
      const s = this.sparks[i]; if (!s.mesh.visible) continue;
      s.t -= dt;
      if (s.t <= 0) { s.mesh.visible = false; continue; }
      s.vel.y -= 12 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.quaternion.copy(this.cam.quaternion);
      s.mesh.scale.setScalar(Math.min(1, s.t * 4));
    }
  }
}
