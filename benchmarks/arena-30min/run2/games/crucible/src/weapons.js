import * as THREE from 'three';
import { WEAPONS, PALETTE } from './config.js';
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
function box(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
function cyl(g, r, l, mat, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 8), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
export function createWeapons({ scene, camera, world, enemies, ui, audio, player }) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.55, metalness: 0.25, flatShading: true });
  const body = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.6, metalness: 0.3, flatShading: true });
  const trim = new THREE.MeshStandardMaterial({ color: PALETTE.trim, roughness: 0.5, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: PALETTE.accent });
  const root = new THREE.Group(); camera.add(root);
  const mk = (name) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };
  const gm = new THREE.MeshStandardMaterial({ color: 0x8a93a0, roughness: 0.45, metalness: 0.2, flatShading: true });
  const amber = new THREE.MeshStandardMaterial({ color: 0xd98c3a, roughness: 0.5, metalness: 0.3, flatShading: true });
  const teal = new THREE.MeshBasicMaterial({ color: 0x7ffff2 });
  const rifleM = mk('rifle');
  box(rifleM, 0.075, 0.1, 0.34, gm, 0, 0, -0.12); box(rifleM, 0.078, 0.03, 0.12, amber, 0, -0.02, -0.2);
  box(rifleM, 0.03, 0.03, 0.3, dark, 0, 0.065, -0.12); box(rifleM, 0.02, 0.03, 0.03, dark, 0, 0.09, -0.02); box(rifleM, 0.02, 0.03, 0.03, dark, 0, 0.09, -0.24);
  box(rifleM, 0.065, 0.07, 0.14, dark, 0, 0, -0.35); cyl(rifleM, 0.02, 0.12, dark, 0, 0.01, -0.46); cyl(rifleM, 0.03, 0.06, gm, 0, 0.01, -0.54);
  box(rifleM, 0.05, 0.15, 0.06, amber, 0, -0.11, -0.16).rotation.x = -0.25; box(rifleM, 0.045, 0.12, 0.05, dark, 0, -0.1, 0.0).rotation.x = 0.35;
  box(rifleM, 0.06, 0.08, 0.16, gm, 0, -0.01, 0.12); box(rifleM, 0.062, 0.02, 0.1, amber, 0, -0.045, 0.14);
  box(rifleM, 0.08, 0.014, 0.18, teal, 0, 0.035, -0.1); box(rifleM, 0.068, 0.012, 0.1, teal, 0, 0.02, -0.35);
  const shotM = mk('shotgun');
  box(shotM, 0.1, 0.11, 0.26, gm, 0, 0, -0.05); box(shotM, 0.102, 0.03, 0.1, amber, 0, -0.03, -0.02);
  cyl(shotM, 0.03, 0.38, dark, -0.02, 0.03, -0.37); cyl(shotM, 0.03, 0.38, dark, 0.02, 0.03, -0.37); cyl(shotM, 0.026, 0.3, gm, 0, -0.03, -0.33);
  const pumpMesh = box(shotM, 0.085, 0.07, 0.13, amber, 0, -0.03, -0.3); box(shotM, 0.02, 0.02, 0.02, teal, 0, 0.065, -0.55);
  box(shotM, 0.05, 0.11, 0.05, dark, 0, -0.1, 0.07).rotation.x = 0.35; box(shotM, 0.07, 0.1, 0.18, gm, 0, -0.03, 0.18);
  box(shotM, 0.104, 0.014, 0.2, teal, 0, 0.058, -0.05);
  root.position.set(0.082, -0.07, -0.3); root.scale.setScalar(0.44); const _muz = new THREE.Vector3();
  // muzzle flash
  const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(0.25, 'rgba(255,240,170,1)'); gr.addColorStop(0.45, 'rgba(255,140,30,0.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
  flash.renderOrder = 999; flash.visible = false; root.add(flash);
  const flashLight = new THREE.PointLight(0xffd890, 0, 6, 2); root.add(flashLight);
  // pools
  const tracerMat = new THREE.LineBasicMaterial({ color: PALETTE.playerFx, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const tracers = []; for (let i = 0; i < 24; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, tracerMat.clone()); l.visible = false; l.frustumCulled = false; l.userData.t = 0; scene.add(l); tracers.push(l); }
  const sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04); const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd070 });
  const sparks = []; for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(sparkGeo, sparkMat); m.visible = false; m.userData.v = new THREE.Vector3(); m.userData.t = 0; scene.add(m); sparks.push(m); }
  const decalGeo = new THREE.CircleGeometry(0.06, 6); const decalMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const decals = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(decalGeo, decalMat); m.visible = false; scene.add(m); decals.push(m); }
  let ti = 0, si = 0, di = 0;
  const ray = new THREE.Raycaster();
  const st = { current: 'rifle', ammo: { rifle: WEAPONS.rifle.mag, shotgun: WEAPONS.shotgun.mag }, reserve: { rifle: WEAPONS.rifle.reserve, shotgun: WEAPONS.shotgun.reserve },
    cooldown: 0, reloading: 0, reloadTotal: 1, switching: 0, kick: 0, recoilPitch: 0, flashT: 0, swayX: 0, swayY: 0, pumpT: 0, bloom: 0, triggerHeld: false };
  function spawnTracer(from, to) { const l = tracers[ti++ % tracers.length]; const a = l.geometry.attributes.position.array; a[0] = from.x; a[1] = from.y; a[2] = from.z; a[3] = to.x; a[4] = to.y; a[5] = to.z; l.geometry.attributes.position.needsUpdate = true; l.visible = true; l.userData.t = 0.06; l.material.opacity = 1; }
  function spawnImpact(p, n, enemyHit) {
    for (let k = 0; k < 5; k++) { const s = sparks[si++ % sparks.length]; s.position.copy(p); s.userData.v.set((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4); if (n) s.userData.v.addScaledVector(n, 3); s.userData.t = 0.25; s.visible = true; }
    if (!enemyHit && n) { const d = decals[di++ % decals.length]; d.position.copy(p).addScaledVector(n, 0.01); _q.copy(p).add(n); d.lookAt(_q); d.visible = true; }
  }
  function fireRay(origin, dir, dmg, muzzle) {
    const maxD = 120; let eh = null;
    try { eh = enemies.raycast(origin, dir, maxD); } catch (e) { eh = null; }
    ray.set(origin, dir); ray.far = eh ? eh.distance : maxD;
    const wh = world.staticMeshes && world.staticMeshes.length ? ray.intersectObjects(world.staticMeshes, true)[0] : null;
    let end;
    if (eh && (!wh || eh.distance <= wh.distance)) {
      end = eh.point; const res = enemies.damage(eh.id, dmg, eh.point, dir) || {};
      spawnImpact(eh.point, null, true); return { hit: true, killed: !!res.killed, end };
    }
    if (wh) { end = wh.point; _u.copy(wh.face ? wh.face.normal : _r.set(0, 1, 0)).transformDirection(wh.object.matrixWorld); spawnImpact(wh.point, _u, false); }
    else end = _q.copy(origin).addScaledVector(dir, maxD);
    spawnTracer(muzzle, end); return { hit: false, killed: false, end };
  }
  function shoot() {
    const w = WEAPONS[st.current];
    if (st.ammo[st.current] <= 0) { audio.play('dry_fire'); st.cooldown = 0.25; if (st.reserve[st.current] > 0) reload(); return; }
    st.ammo[st.current]--;
    // flash first so a throw in hit/audio code below can never swallow it
    st.kick = 1; st.flashT = 0.055; flash.material.rotation = Math.random() * 6.28; flash.scale.setScalar((st.current === 'rifle' ? 2.1 : 3.0) * (0.85 + Math.random() * 0.3));
    flash.position.set(0, 0.02, st.current === 'rifle' ? -0.6 : -0.6); flashLight.position.copy(flash.position);
    camera.updateMatrixWorld(); camera.getWorldPosition(_o);
    const muzzle = _muz.set(0, 0.02, st.current === 'rifle' ? -0.58 : -0.58); root.localToWorld(muzzle);
    const pellets = st.current === 'shotgun' ? w.pellets : 1;
    let anyHit = false, anyKill = false;
    for (let i = 0; i < pellets; i++) {
      const spread = w.spread + (st.current === 'rifle' ? st.bloom : 0);
      _d.set((Math.random() - 0.5) * 2 * spread, (Math.random() - 0.5) * 2 * spread, -1).normalize().transformDirection(camera.matrixWorld);
      const r = fireRay(_o, _d, w.damage, muzzle); anyHit ||= r.hit; anyKill ||= r.killed;
      if (st.current === 'shotgun' && i === 0) spawnTracer(muzzle, r.end);
      if (st.current === 'rifle' && r.hit) spawnTracer(muzzle, r.end);
    }
    if (anyHit) { ui.hitMarker?.(anyKill); audio.play(anyKill ? 'kill' : 'hit'); }
    audio.play(st.current === 'rifle' ? 'rifle_fire' : 'shotgun_fire');
    st.recoilPitch += w.recoil * (st.current === 'rifle' ? 1 : 1.5); player.yaw += (Math.random() - 0.5) * w.recoil * 0.4;
    st.bloom = Math.min(0.04, st.bloom + 0.004);
    if (st.current === 'rifle') st.cooldown = 60 / w.rpm; else { st.cooldown = w.pump; st.pumpT = w.pump; setTimeout(() => audio.play('shotgun_pump'), 250); }
  }
  function reload() {
    const w = WEAPONS[st.current];
    if (st.reloading > 0 || st.ammo[st.current] >= w.mag || st.reserve[st.current] <= 0) return;
    st.reloading = st.reloadTotal = w.reload; audio.play('reload_start');
  }
  function finishReload() { const w = WEAPONS[st.current]; const n = Math.min(w.mag - st.ammo[st.current], st.reserve[st.current]); st.ammo[st.current] += n; st.reserve[st.current] -= n; audio.play('reload_end'); }
  function select(name) { if (name === st.current || !WEAPONS[name]) return; st.current = name; st.reloading = 0; st.switching = 0.3; st.cooldown = Math.max(st.cooldown, 0.25); audio.play('weapon_switch'); }
  const api = {
    get current() { return st.current; },
    get ammo() { return st.ammo[st.current]; }, get reserve() { return st.reserve[st.current]; }, get reloading() { return st.reloading > 0; },
    reset() { st.current = 'rifle'; st.ammo.rifle = WEAPONS.rifle.mag; st.ammo.shotgun = WEAPONS.shotgun.mag; st.reserve.rifle = WEAPONS.rifle.reserve; st.reserve.shotgun = WEAPONS.shotgun.reserve; st.reloading = 0; st.cooldown = 0; st.recoilPitch = 0; },
    reload, select, next() { select(st.current === 'rifle' ? 'shotgun' : 'rifle'); },
    look(dx, dy) { st.swayX += dx * 0.00015; st.swayY += dy * 0.00015; },
    update(dt, fire, bobPhase, bobAmt) {
      st.cooldown -= dt;
      if (st.reloading > 0) { st.reloading -= dt; if (st.reloading <= 0) { st.reloading = 0; finishReload(); } }
      if (st.switching > 0) st.switching -= dt;
      const auto = st.current === 'rifle';
      if (fire && st.cooldown <= 0 && st.reloading <= 0 && st.switching <= 0 && (auto || !st.triggerHeld || true)) shoot();
      st.triggerHeld = fire;
      if (!fire) st.bloom = Math.max(0, st.bloom - dt * 0.08);
      // recoil recovery: apply accumulated pitch kick then recover smoothly
      const rec = st.recoilPitch * Math.min(1, dt * 18); player.pitch += rec; st.recoilPitch -= rec;
      player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
      st.kick *= Math.exp(-dt * 14); st.swayX *= Math.exp(-dt * 8); st.swayY *= Math.exp(-dt * 8);
      st.swayX = Math.max(-0.05, Math.min(0.05, st.swayX)); st.swayY = Math.max(-0.05, Math.min(0.05, st.swayY));
      flash.visible = st.flashT > 0; flashLight.intensity = st.flashT > 0 ? 140 : 0; st.flashT -= dt; // show at least one frame after firing, even when dt > flash duration
      rifleM.visible = st.current === 'rifle'; shotM.visible = st.current === 'shotgun';
      const kickMul = st.current === 'rifle' ? 0.6 : 1.2;
      let dip = 0, rotZ = 0;
      if (st.reloading > 0) { const t = 1 - st.reloading / st.reloadTotal; const s = Math.sin(Math.PI * t); dip = s * 0.18; rotZ = s * 0.8; }
      if (st.switching > 0) dip += st.switching / 0.3 * 0.25;
      root.position.set(0.082 - st.swayX + Math.cos(bobPhase) * 0.012 * bobAmt, -0.07 + st.swayY - dip - Math.abs(Math.sin(bobPhase)) * 0.015 * bobAmt, -0.3 + st.kick * 0.07 * kickMul);
      root.rotation.set(st.kick * 0.12 * kickMul - dip * 1.2, st.swayX * 2, rotZ);
      if (st.pumpT > 0) { st.pumpT -= dt; const t = 1 - st.pumpT / WEAPONS.shotgun.pump; pumpMesh.position.z = -0.3 + (t > 0.3 && t < 0.8 ? Math.sin((t - 0.3) / 0.5 * Math.PI) * 0.1 : 0); }
      for (const l of tracers) if (l.visible) { l.userData.t -= dt; l.material.opacity = Math.max(0, l.userData.t / 0.06); if (l.userData.t <= 0) l.visible = false; }
      for (const s of sparks) if (s.visible) { s.userData.t -= dt; s.userData.v.y -= 15 * dt; s.position.addScaledVector(s.userData.v, dt); if (s.userData.t <= 0) s.visible = false; }
    },
  };
  return api;
}
