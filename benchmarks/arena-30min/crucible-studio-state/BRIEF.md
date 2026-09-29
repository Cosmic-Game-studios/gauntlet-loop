# GAME BRIEF - ARENA  (locked HB-001; written by Director from SPEC.md, no human at intake - bench rule)

Pitch        A lone gunner holds a sunken concrete arena against 5 escalating waves of sprinting melee Rushers and orb-firing Shooters.
Fantasy      "I read the room in a glance, strafe their shots, and every trigger pull lands with a punch."
Genre        Arena FPS, first-person, single player, wave survival
Engine       web (three.js 0.186.1, no build step) - target desktop Chromium
Scope        8-12 min per run, 1 arena, 5 waves, 2 enemy types, 2 weapons
Core loop    move/scan -> aim/shoot -> dodge projectiles/reload -> clear wave -> short break -> next wave -> victory
Pillars      1. Readable at a glance: enemy type, threat and cover legible in < 0.3 s (silhouette + emissive colour code).
             2. Every shot has feedback: flash, kick, tracer/impact, sound, hit marker - no silent action.
             3. Solid, fair movement: never clip, never stuck, projectiles dodgeable by strafing.
Not this     No story/cutscenes; no extra weapons, enemies or levels beyond SPEC; no external assets or libraries.
Art          Stylised low-poly "brutalist dusk": warm concrete, teal/orange emissive accents - ref: Dive (Mugen87)
Audio        Punchy synthesised SFX, short and dry - ref: Dive's weapon/impact set; master volume live
Bars         Feel/gameplay  three.js games_fps example (movement/collision) + Dive gameplay (enemy pressure)
             Visual         Dive (bars/dive, dive_1.png / dive_2.png) - lit arena with shadows, readable HUD
             Audio          Dive's SFX set (timing/layering, measured not heard)
             UI/UX          Dive HUD + clean main/pause/settings menus
             Numbers        no per-frame allocations in hot loops, <150 draw calls, 0 console errors, 60 fps target on laptop
Milestones   Tech Spike -> Vertical Slice -> Release Candidate (compressed for 30-min cap; Alpha/Beta folded in)
Vertical slice  Waves 1-2 end to end: menu -> play -> both weapons -> both enemies -> wave break -> HUD/audio.
Assets       All procedural in code (geometry, canvas textures, WebAudio). Custom: everything.
Machine      three.js in headless Chromium/SwiftShader, Playwright screenshots via window.__game hook
Budget       Wall clock 30 min from 11:01:18 UTC (hard). Circuit breaker hands off best build at ~11:29.
