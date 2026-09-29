# ARCHITECTURE (sprint contract) - three.js 0.186.1, ES modules, no build

Import map (game/index.html, Director-owned): `three` -> ./vendor/three.module.js, `three/addons/` -> ./vendor/addons/.
Entry: game/index.html loads game/src/main.js. Coordinates: metres, Y up. Arena roughly 60x60 centred at origin, floor y=0.

## File owners (edit ONLY your own files; report problems in others' files in your return)
| File | Owner (ticket) |
|---|---|
| game/index.html, game/src/config.js | Director |
| game/src/main.js (loop, state machine, waves, score, test hook), game/src/player.js (controller+collision), game/src/weapons.js (weapons, viewmodels, muzzle flash, tracers/impacts) | T1 core+weapons (Opus) |
| game/src/world.js (renderer settings, lights, shadows, sky/fog, post, arena geometry, colliders) | T2 look+arena (Opus, Art Director) |
| game/src/enemies.js (models, animation, AI, nav, projectiles) | T3 enemies (Opus) |
| game/src/ui.js + game/src/ui.css (HUD, all screens) | T4 HUD+screens (Opus) |
| game/src/audio.js | T5 audio (Sonnet) |
| tools/check.mjs, tools/review.json, studio/acceptance.json checks' "how" | T5 QA tools (Sonnet) |

## Cross-module interfaces (exact signatures; stubs already export these)
### world.js
`export function createWorld(scene, renderer)` -> `world` object:
- `colliders: THREE.Box3[]` - world-space AABBs of every solid thing (walls, cover, platforms, ramps approximated as steps/boxes). Floor is y=0 (not in list). Player and enemies collide against these.
- `staticMeshes: THREE.Object3D[]` - meshes for bullet raycasts (impacts on walls/cover).
- `playerSpawn: THREE.Vector3`, `enemySpawns: THREE.Vector3[]` (>=6, spread around the edge).
- `bounds: {minX, maxX, minZ, maxZ}` walkable area.
- `isBlocked(x, z, radius) -> bool` true if a ground-level agent of that radius at (x,z) overlaps a collider whose top is > 0.6 m (used for nav grids).
- `groundHeight(x, z) -> number` top of the highest walkable surface under (x,z) (0 for floor).
- `update(dt, camera)` per-frame ambient animation (may be no-op).
- `render(camera)` does the final render (so post-processing lives in world.js). main.js calls world.render(camera) once per frame.

### audio.js
`export function createAudio()` -> `{ unlock(), setVolume(v0to1), play(name, opts = {}) }` - opts.pos (THREE.Vector3, optional for panning), opts.listener (camera). Names: `rifle_fire, shotgun_fire, shotgun_pump, reload_start, reload_end, dry_fire, hit, kill, rusher_attack, rusher_alert, shooter_fire, projectile_impact, enemy_death, enemy_hurt, player_hurt, jump, land, footstep, wave_start, wave_clear, victory, gameover, ui_click, weapon_switch`. Unknown names are ignored. Must never throw before unlock().

### enemies.js
`export function createEnemies(ctx)`; ctx = `{ scene, world, audio, player }` where `player` = `{ position: THREE.Vector3 (feet), eye: THREE.Vector3, damage(amount, fromPos: THREE.Vector3) }`.
Returns:
- `spawn(type 'rusher'|'shooter', x, y, z, opts={hpMul, speedMul, dmgMul}) -> id (number)`
- `update(dt)` (AI, animation, projectiles; projectiles hit the player via ctx.player.damage and die on colliders)
- `raycast(origin: Vector3, dir: Vector3 (normalized), maxDist) -> null | { id, point: Vector3, distance }`
- `damage(id, amount, hitPoint: Vector3, dir: Vector3) -> { killed: bool }` (hit reaction + death animation; plays audio)
- `list() -> [{ id, type, health, pos: [x,y,z], alive }]`
- `aliveCount() -> number` (dying/dead not counted)
- `clear()` remove all enemies and projectiles.
Rusher: melee ~10-15 dmg, fast. Shooter: keeps 10-18 m, fires visible slow glowing projectiles (~14 m/s) dodgeable. Both navigate around cover (grid A* over world.isBlocked or steering), react to hits (flinch/knockback/flash), die visibly (ragdoll-ish collapse/dissolve, ~1 s), then removed.

### ui.js
`export function createUI(actions)`; actions = `{ play(), resume(), restart(), toMenu(), setSensitivity(v), setVolume(v), getSettings() -> {sensitivity, volume} }`.
Returns `{ show(screen), updateHUD(s), hitMarker(kill), damageIndicator(angleRad), banner(text, sub), flash() }`
- screen: 'menu'|'settings'|'pause'|'gameover'|'victory'|null (null = in-game HUD only). Settings reachable from menu and pause; has Back. gameover/victory show score + wave and a Restart button.
- `updateHUD({ health, maxHealth, weapon, ammo, reserve, reloading, wave, totalWaves, score, enemiesAlive, breakTime })` called every frame; must not allocate DOM or rebuild strings when values unchanged.
- `damageIndicator(angleRad)`: angle of the attacker relative to view direction (0 = in front, +PI/2 = to the right).
- UI is DOM over the canvas, styles in ui.css (index.html links it).

### main.js / player.js / weapons.js (T1)
main.js owns the loop, mode state machine, waves (5, increasing difficulty, ~5 s break), score, settings (localStorage), pointer lock, and `window.__game` exactly as SPEC.md plus:
- `step(n)` advances n fixed 1/60 s ticks even while paused (ignores the pause flag) and renders once.
- `showScreen(name)` for captures (does not require pointer lock).
Input rules: pause only on pointer-lock loss or Escape; `start()` never requires pointer lock; hook calls never open menus. Uses fixed-timestep simulation (accumulate real dt, 1/60 ticks, max 5 per frame).
Bullet raycast order: enemies.raycast vs raycast on world.staticMeshes; nearest wins. Hit -> ui.hitMarker, audio 'hit'.

## Perf rules
No per-frame allocations in hot paths (reuse Vector3s), share geometries/materials, merge static arena geometry where easy, shadow map 1024-2048 on one directional light. Target < 150 draw calls.
