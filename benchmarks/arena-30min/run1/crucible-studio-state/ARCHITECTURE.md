# ARCHITECTURE - Arena (web, three.js 0.186.1, ES modules, no build step)

## Layout (one owner per file)
- game/index.html            importmap {"three": "./vendor/three.module.js"}; loads ./src/main.js; menu/HUD DOM + CSS inline.   owner: T-001
- game/vendor/three.module.js, three.core.js   copied from node_modules (done, HB-001)
- game/src/main.js (+ any game/src/core_*.js)  renderer, arena, player controller, weapons, viewmodels, tracers/impacts, HUD, menus, settings, waves, score, window.__game hook.   owner: T-001
- game/src/enemies.js        enemy models (procedural, animated), AI, nav around cover, enemy projectiles.   owner: T-002
- game/src/audio.js          WebAudio synthesised SFX + master volume.   owner: T-003
- game/README.md             controls.   owner: T-001
- tools/smoke.mjs            Playwright smoke test (headless Chromium, SwiftShader).   owner: T-001

## Coordinates / units
- 1 unit = 1 m, Y up. Arena floor at y=0, playable area x,z in [-30, 30]. Player eye height 1.6, radius 0.4.
- Static collision = array of THREE.Box3 (world AABBs) `colliders`, includes walls, cover, platforms. Everything solid is a Box3.

## Interface: enemies.js  (T-002 implements, T-001 consumes)
```js
export function createEnemySystem(ctx) -> sys
// ctx = { THREE, scene, colliders: Box3[], bounds:{minX,maxX,minZ,maxZ},
//         audio,                                // audio.play(name) per audio interface
//         onPlayerHit(damage, fromPos: Vector3), // enemy melee or projectile hit the player
//         onEnemyKilled(type, pos: Vector3),     // for score
//         onEnemyHurt(id) }                      // optional
sys.spawn(type /*'rusher'|'shooter'*/, x, y, z) -> id (int)
sys.update(dt, playerPos /*Vector3, eye pos*/, playerAlive /*bool*/)   // AI, anim, projectiles; no per-frame allocations
sys.raycast(origin: Vector3, dir: Vector3 /*normalized*/, maxDist) -> null | { id, point: Vector3, distance }   // nearest alive enemy hit (use hit capsules/boxes, not meshes)
sys.damage(id, amount, hitPoint: Vector3, dir: Vector3) -> bool killed    // hit reaction (flash + knockback/stagger), death anim then removal
sys.list() -> [{ id, type, health, pos:[x,y,z], alive }]
sys.aliveCount() -> int
sys.clear()                                        // remove all enemies + projectiles
sys.setDifficulty(level /*1..5*/)                  // speed/damage/fire-rate scaling
```
Rusher: 60 hp, speed ~6.5 m/s, melee 12 dmg / 0.8 s at <1.6 m. Shooter: 80 hp, keeps 12-20 m, fires glowing orb projectiles (speed 14 m/s, 10 dmg), 1.8 s cadence, needs line of sight. Enemy colour code: rusher = orange/red emissive, shooter = teal/cyan emissive.
Nav: 2D grid (1 m cells) over bounds, cells blocked by colliders whose max.y > 0.4 (inflated by enemy radius); A* re-path every ~0.5 s; steer along path; separation between enemies. Enemies stay at y=0 ground.

## Interface: audio.js  (T-003 implements)
```js
export function createAudio() -> audio
audio.resume()                 // call on user gesture
audio.setMasterVolume(v)       // 0..1, live
audio.play(name, opts?)        // opts {volume?:0..1, pitch?:mult}; unknown name = no-op
// names: rifle, shotgun, pump, reload, dryfire, hit, hitmarker, headshot, enemyMelee, enemyShoot, enemyDeath,
//        playerHurt, footstep, jump, land, waveStart, waveClear, uiClick, victory, gameover
```

## Test hook: window.__game exactly per SPEC.md (in main.js).
## Perf rules: reuse Vector3/Matrix temporaries (module-level scratch), pool tracers/impacts/projectiles, shared geometries/materials, no allocations in update loops.
## Code bar: three.js examples/games_fps.html (Octree/capsule style movement), Dive src/ (Yuka-style entity/AI separation).
