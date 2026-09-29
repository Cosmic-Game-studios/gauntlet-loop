# BENCH_LOG — solo arm

- Start (UTC): 2026-09-29 11:01:18
- End (UTC): 2026-09-29 ~11:15 (per `date -u`; the in-container clock seemed to advance slowly relative to how long test runs felt, so treat the total as approximate)
- Total: ~14 minutes by `date -u`

## Method
Worked alone, no subagents. No Workflow tool.
- Read the rules and SPEC, planned the architecture in my head, and wrote `game/index.html` (HUD + menus, CSS) and `game/main.js` (~1,100 lines, all game code) in one pass each.
- Tested with Playwright + headless SwiftShader Chromium through three scripts in the scratchpad:
  1. A deterministic stepped sim. I added `window.__dbg.step(n)` so the simulation can advance without depending on the ~1–4 fps SwiftShader frame rate. It checks stair climbing onto the platform (y=1.6), pillar blocking, jump and land, rifle and shotgun hits, reload counts, rusher pathing around a pillar, shooter projectile damage, and a full 5-wave run to `victory` using a debug kill-all.
  2. Screenshots (menu, enemies close-up, rifle firing, pause, game over), which I inspected visually.
  3. Real input: clicking Settings, the volume slider, Back and Play; holding W; pressing 2 and Esc; Resume; dying to rushers; clicking Restart.

## Subagents
None.

## Review rounds
- One round of self-review from screenshots, which led to these fixes: the gun viewmodel rendered almost black (metalness with no env map, so I lowered metalness), the scene was too dark (raised hemisphere light and sky), and the shotgun's top accent strip was oversized.
- Bugs found by testing and fixed:
  - At low fps the simulation slowed down because of the dt clamp. I added fixed substeps, and automatic fire can now shoot several times in one frame.
  - Hitscan used the camera matrix, which is only updated on render, so shots fired during substeps used a stale camera. Aim is now computed from yaw and pitch.
  - Broken stair-height formulas.
  - The HUD was not refreshed on the game-over screen.

## Context
My context was never compacted and stayed easy to manage: one large file written in one go, then small targeted Python and sed patches.

## What went wrong / what I'd do differently
- My first copy of the three.js files failed because of the node_modules symlink into shared/, so I copied them from the shared path directly.
- SwiftShader fps is very low here (about 1–4 fps, and noisy, possibly because other arms share the CPU), so wall-clock tests were unreliable. The stepped debug hook fixed that, and I should have added it from the start.
- Things I would do with more time:
  - Merge each enemy's static parts into fewer meshes to cut draw calls and shadow draws at wave 5.
  - Give the shotgun shell-by-shell reloading.
  - Improve rusher silhouettes.
  - Add a simple minimap or spawn telegraphs.

## Self-assessment against SPEC
1. **Menus: done.**
   - Main menu (Play, Settings) over a slowly orbiting arena view.
   - Pause on Esc, which also triggers on pointer-lock loss. It offers Resume, Settings, Restart and Main Menu.
   - Settings: sensitivity and master volume, applied live and saved to localStorage.
   - Game-over and victory screens, each with Restart and Main Menu.
2. **First-person controller: done.**
   - Pointer lock, WASD, sprint, jump and gravity.
   - Collision is AABB per axis with automatic step-up of up to 0.45 m (stairs onto the platform and ledges), so you can't pass through walls or cover, and the floor is clamped.
3. **Weapons: done.**
   - Rifle: automatic hitscan with bloom spread, recoil (pitch kick plus viewmodel kick), 30/90 ammo and a 1.7 s reload.
   - Shotgun: 8 pellets, 0.85 s pump delay with an animated pump, 6/24 ammo, a 2.1 s reload and damage falloff.
   - Viewmodels have bob, sprint pose, recoil, a reload animation (tilt, and the rifle magazine drops; the shotgun shows shell loading) and a switch animation.
   - Muzzle flash with a point light, tracers, impact decals and sparks, and a hit marker (red on kills). Headshots deal double damage.
   - Viewmodel geometry is simple boxes and cylinders: functional, not beautiful.
4. **Enemies: done, visually modest.**
   - The Rusher is a hunched red brute with spikes, claws and animated legs and arms. It runs at you and swings a melee attack.
   - The Shooter is a blue biped robot with an arm cannon and visor. It keeps an 8–17 m distance, strafes, and fires slow glowing orange bolts you can dodge.
   - Both follow a BFS flow field on a 1 m grid, so they go around cover, and are pushed out of solids. They separate from each other, flash and stagger when hit, get knocked back, show health bars, and have a tip-over death with particle bursts.
5. **Waves: done.** Five waves grow from 5 to 19 enemies with hp/speed/damage/fire-rate scaling. There is a 5 s break between waves (with some health and ammo refill) and victory after wave 5. Verified in the sim.
6. **HUD: done.**
   - Health bar, ammo (mag/reserve), weapon name with slot indicator, wave x/5 with hostiles remaining or the countdown, and score.
   - Dynamic crosshair, hit marker, directional damage wedges that track the source as you turn, a red vignette, and wave banners.
7. **Audio: done, all WebAudio-synthesised.** Rifle, shotgun plus pump, reload, empty click, weapon switch, hit tick (brighter on headshots), enemy shot, melee, rusher growl, enemy death, player hurt and wave start. Enemy sounds are attenuated by distance, and master volume applies live. I have not heard it myself because the tests ran headless.
8. **Arena: done.**
   - 60×60 floor with perimeter walls and emissive cyan/orange trim.
   - A central 1.6 m platform with stairs, two side ledges with stairs, pillars, crates and low walls.
   - Procedural canvas textures, a directional sun with shadows, a hemisphere fill and fog. Readable, though stylistically simple.
9. **Performance: reasonable.**
   - Particles and decals are InstancedMeshes, tracers are a single LineSegments, projectiles are pooled, geometry and materials are shared, and the HUD only writes to the DOM when a value changes.
   - Enemies are about 20 meshes each and not merged, so draw calls grow with enemy count.
   - Shadow map is 1024 PCF.
10. **Test hook: all methods are implemented as specified.**
    - `setPaused` freezes the simulation while rendering continues. It leaves `mode` unchanged so the HUD stays visible in screenshots.
    - `playerPos` is the feet position.
    - An extra `window.__dbg` exposes a stepper and kill-all for testing.
