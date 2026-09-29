# BENCH_LOG: solo arm

- **Start:** 2026-09-29 12:35:23 UTC
- **End:** 2026-09-29 ~12:51 UTC (the final commit follows this log)
- **Total:** about 16 minutes

## Method
I worked alone and spawned no subagents. I wrote `game/index.html` (menus, HUD, CSS) and `game/main.js` (about 1,100 lines, one module) in a single pass. After that I iterated with headless Playwright scripts kept in my scratchpad:
1. A smoke test: start, walk, collide with a pillar, shoot and kill an enemy, reload, switch to the shotgun, enemy AI movement, Esc to pause, fps, console errors.
2. A performance probe: shadows on or off, render resolution.
3. A full-run aimbot using the test hook. It auto-aims at the nearest enemy and fires. God mode was on for this run, which reached **victory** after all 5 waves.
4. A game-over test with god mode off and a swarm of rushers, plus a combat screenshot.

## Subagents
None.

## Review/critique rounds
There was no formal review. I did three rounds of self-checking from screenshots and test output:
- **Round 1.** The glow strips were solid slabs that covered the platform tops, so I changed them to rims. The viewmodel was too large and too close.
- **Round 2.** Performance on SwiftShader was about 1.3 fps. The cause was fill rate: shadows cost about 2× and resolution about 3×. I made three fixes:
  - Switched to PCF shadows.
  - Added dynamic resolution scaling.
  - Made the simulation run in fixed substeps so it stays correct at low fps. Before this, a 50 ms dt clamp made the game run in slow motion.
  - Result: about 6.7 fps in SwiftShader.
- **Round 3.**
  - The aimbot run soft-locked in wave 3 with all ammo gone. I added ammo salvage per kill and a reserve refill between waves.
  - A rusher got stuck between a bunker and its step. I made steps walkable for enemies (step-up) and left low steps out of the nav blocking, and enemies now chase directly when no path exists.
  - Enemies could stand inside the player's body. They are now kept at a distance.

## Context
My context was not compacted and stayed easy to manage. I used Python search-and-replace edits instead of re-reading the large file.

## What went wrong / what I'd do differently
- I wrote the glow strips as solid slabs by mistake. A first screenshot taken earlier would have caught it sooner.
- I set a dt clamp without thinking about the SwiftShader evaluator. Fixed-step simulation should have been the default from the start.
- Given more time I would add:
  - A real per-shell shotgun reload.
  - Enemy pathing onto the raised platforms. Rushers can reach a player on the central platform only by melee range from its edge; the nav grid is ground-level only, though enemies can step onto low steps.
  - Distance-based panning for sounds.
  - More playtesting of balance with a human.

## Self-assessment against SPEC.md
1. **Menus:** done. Main menu (Play, Settings), pause on Esc or when pointer lock is lost, and a settings screen that changes sensitivity and volume live. Settings are saved to localStorage. Game-over and victory screens both have Restart and Main Menu. Verified game-over and victory via the hook.
2. **Controller:** done. Pointer lock look, WASD, sprint, jump, gravity, collision against the box walls and cover (verified stopping at a pillar), step-up on stairs, and a floor clamp.
3. **Weapons:** done.
   - Rifle: auto hitscan, bloom spread, recoil, 30/90, 2 s reload.
   - Shotgun: 8 pellets, pump delay with a pump animation, 6/24, reload.
   - Both viewmodels are procedural and have bob, kick and a reload tilt; the rifle's magazine drops during reload.
   - Muzzle flash sprite and a muzzle point light, tracers, spark and dust impacts, and a hit marker (red on a kill).
   - Weakness: the shotgun reload is a single timed animation, not shell by shell.
4. **Enemies:** done.
   - Rusher: horned red brute with animated legs and claws and a telegraphed melee swing.
   - Shooter: bipedal robot with an aiming cannon that glows while charging and fires slow orange orbs you can dodge.
   - Both use a BFS flow field around cover, flash and stagger when hit, have health, and die with a topple, a sink and a particle burst.
   - Weakness: the navigation grid covers the ground only.
5. **Waves:** done. 5 waves with rising counts, enemy HP, speed, damage and fire rate. A 5 s break between waves, and victory after wave 5 (verified).
6. **HUD:** done. Health bar, mag/reserve, active weapon, wave, score, remaining enemies, crosshair, directional damage arcs and a low-health vignette.
7. **Audio:** done. All WebAudio-synthesised: rifle, shotgun plus pump, reload, empty click, hit and kill ticks, melee, enemy shot, enemy death, player hurt, wave start. Everything goes through a master gain, so the volume setting applies live. I checked this only for runtime errors; I could not listen to it headlessly.
8. **Arena:** reasonably good. 60×60 enclosed arena with:
   - A central raised platform with stairs, four raised corner bunkers, pillars, low walls and crates.
   - Canvas textures, emissive cyan and orange rims, and a shadow-casting sun with fog.
   - The overall look is coherent but plain.
9. **Performance:** mostly done.
   - Shared geometries and materials, instanced particles, pooled tracers, projectiles and enemies, and scratch vectors in the hot paths.
   - The HUD writes to the DOM only when values change, and resolution adapts to the frame rate.
   - Remaining weakness: each enemy is about 15 separate meshes, so about 15 draw calls per enemy.
