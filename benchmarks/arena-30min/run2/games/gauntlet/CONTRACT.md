# Module contract (all builders MUST follow exactly)

Files (ES modules, import THREE via `import * as THREE from '../vendor/three.module.js'`):
- game/index.html — loads `js/main.js` as module. Owned by CORE builder.
- js/main.js, js/arena.js, js/player.js, js/hud.js — CORE builder.
- js/weapons.js, js/audio.js — WEAPONS builder.
- js/enemies.js — ENEMIES builder.

Shared `ctx` object (created in main.js, passed to constructors):
```
ctx = {
  THREE, scene, camera,            // camera is added to scene; viewmodels are children of camera
  renderer,
  colliders: THREE.Box3[],         // all solid world boxes (walls, cover, platforms)
  worldMeshes: THREE.Object3D[],   // arena meshes for raycasts (bullet impacts)
  nav: { minX, minZ, cell, w, h, blocked: Uint8Array /* w*h, 1=blocked for ground enemies */,
         spawnPoints: [[x,z],...] },
  player: { pos: THREE.Vector3 /* eye position */, vel: THREE.Vector3, health, alive,
            damage(amount, fromPos /*Vector3*/) },
  audio,                           // from audio.js
  hud: { hitMarker(kill:boolean) },
  enemies,                         // EnemyManager instance
  onEnemyKilled(type, pos),        // main adds score
  settings: { sensitivity, volume },
  paused: false,
}
```
Arena: floor at y=0, arena spans roughly x,z in [-30,30]. Player eye height 1.7, radius 0.4.

audio.js: `export function createAudio()` → `{ resume(), setVolume(v0to1), play(name, opts) }`
names: 'rifle','shotgun','reload','pump','empty','hit','kill','enemyShoot','enemyMelee','enemyDeath','playerHurt','waveStart','switch','jump','land'.

weapons.js: `export class Weapons { constructor(ctx); update(dt, fireHeld, moveAmount /*0..1*/, sprinting); select('rifle'|'shotgun'); next(); reload(); reset(); getState() → {weapon, ammo, reserve, reloading}; consumeRecoil() → {pitch, yaw} }`
 - Builds viewmodels attached to ctx.camera, bob/recoil/reload anim, muzzle flash, tracers + impact sparks/decals (pooled, no per-frame allocation).
 - Hitscan: raycast vs `ctx.enemies.getHitMeshes()` + `ctx.worldMeshes`; enemy hit → `ctx.enemies.damage(mesh.userData.enemyId, dmg, point, dir)` which returns true if killed; then `ctx.hud.hitMarker(killed)`.
 - Recoil: `consumeRecoil()` returns radians {pitch,yaw} to add to the view this frame (main calls it each frame).
 - Rifle: auto, ~10 rps, dmg 22, mag 30 / reserve 90, reload 1.6s, spread grows with sustained fire & movement. Shotgun: 8 pellets, dmg 12 each, pump delay 0.85s, mag 6 / reserve 24, reload 0.5s per shell or 2.2s full.

enemies.js: `export class EnemyManager { constructor(ctx); spawn(type,x,y,z) → id; update(dt); getHitMeshes() → Mesh[] (userData.enemyId set); damage(id, amount, point, dir) → killed bool; list() → [{id,type,health,pos:[x,y,z],alive}]; aliveCount(); clear(); setDifficulty(waveNumber) }`
 - Rusher melee: calls ctx.player.damage(n, enemyPos). Shooter projectiles: visible glowing, dodgeable (~14 m/s), collide with ctx.colliders and player (player body = capsule from pos.y-1.7 to pos.y, radius 0.4) → ctx.player.damage(n, projectileOrigin).
 - A* pathfinding on ctx.nav grid, avoid cover. Hit reaction (flash/stagger), death animation, then removal. On death call ctx.onEnemyKilled(type, pos).
 - main won't call update when paused.

Visual style (match Dive by Mugen87): clean sci-fi arena, white/pale-lavender panelled walls with deep red inset panels and black trim bands, grey floor with dark green border bands, octagonal white/red spawn pads, soft bright sky-ish ambient + strong directional light with soft shadows. Enemies: stylised humanoid/robotic figures, readable silhouettes, accent emissive color.
