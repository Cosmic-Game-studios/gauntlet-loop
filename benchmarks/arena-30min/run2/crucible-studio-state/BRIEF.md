# Game Brief - ARENA (approved by Director per bench adaptation; no human at intake)
- Pitch: a complete, polished 3D first-person arena shooter in the browser (SPEC.md is the source of truth).
- Engine/platform: web, three.js 0.186.1, static game/ folder, Chromium. No external assets - everything procedural.
- Scope: one 5-wave run, ~5-8 minutes. Cap: 30 minutes wall-clock of studio time.
- Feel like: Dive (Mugen87, three.js+Yuka deathmatch) for level/enemies/HUD/look; three.js games_fps example for movement+collision; DOOM (2016) arena rhythm for waves.
- Art direction: stylised low-poly "industrial sci-fi arena at dusk" - warm sodium key light vs cool teal fill, flat-shaded materials with procedural canvas textures, strong silhouettes, enemies in hot emissive accent colours readable at 20 m.
- Pillars: 1) Every shot feels punchy (flash, kick, sound, hit marker). 2) Every threat is readable at a glance. 3) Movement is fluid and never snags.
- Non-negotiable: SPEC.md features 1-9 and the window.__game test hook, exactly.
- Bars: see SPEC; Dive frames at /home/user/bench/shared/bars/dive (run_dive_fps.mjs), games_fps at /home/user/bench/shared/bars/threejs-games-fps.
