# TRACKER - Tech Spike (+ first playable)

## Core game
- [x] T-001  Core: arena, controller, weapons, HUD, menus, waves, hook   [Code]  hero  MERGED r1 (critics pending -> T-004) smoke 15/15, 0 errors
## Enemies
- [x] T-002  Enemies: rusher + shooter models/anim/AI/nav/projectiles   [Code/3D/Anim]  hero  MERGED r1 (critics pending; untested: shooter LOS repath, orb-vs-player in browser)
## Audio
- [x] T-003  Audio: synthesised SFX set + master volume                 [Audio]  core  MERGED r1 (critics pending; builder returned 11:04, 20 names no errors)
## Integration
- [x] T-004  Integration smoke + gauntlet (exp critic vs Dive, code critic)  [QA]  core  DONE HB-002: exp NONE (bad bar evidence), code BLOCK (6, see E-006..E-011)
- [x] T-005  main.js fixes E-001 E-003 E-004 E-005 (viewmodel lighting, platform, restart)  [Code/TechArt]  hero  MERGED r1 HB-002 (smoke ok, 0 errors; gun now shaded)
- [x] T-006  enemies.js E-002 readability + shooter LOS repath + orb hit  [Code/3D]  hero  MERGED r1 HB-002 (shooter readable; rusher still dark at range -> E-002 partly open)
- [x] T-007  Fix code-critic blockers E-006..E-011 (main.js: E-007 E-008 E-011; enemies.js: E-006; audio.js: E-010)  [Code]  hero  MERGED r1 HB-003 (smoke ok, 0 errors; no critic re-review - time cap)
- [x] T-008  RC-1 handoff: PLAY.md, KNOWN_GAPS.md, STATUS WAITING FOR HUMAN RC-1, final BENCH_LOG  [Director]  DONE HB-003

## Errors
- [x] E-001  Viewmodel renders flat white/black, unlit (viewmodel scene lacks proper lights/materials) - evidence/T-001/round-1/wave1.png   sev: major
- [ ] E-002  Enemies nearly black silhouettes in arena lighting (dark albedo, emissive only on accents) - firing.png   sev: major (pillar 1) - PARTLY FIXED T-006: shooter readable, rusher still dark silhouette at 15 m (T-005 firing.png); HB-003 T-007B: rusher albedo tan 0xd9a288, glow 4.0 - not critic-verified
- [x] E-003  Raised platform top reads as blown-out cyan/white slab - wave1.png   sev: minor
- [x] E-004  start() does not reset setWaveSpawning; decals not cleared on restart   sev: minor
- [x] E-005  Viewmodel scale 0.7 change not re-verified   sev: minor

- [ ] E-006  PARTLY FIXED HB-003: dais lowered to 0.35 (walkable); side platforms still nav-blocked (nearestFree fallback + 1.8 m melee vertical tolerance). enemies.js:155/218 nav blocks every box max.y>0.4 incl. 0.5 m dais/platforms -> player on dais immune to rushers. Cheapest fix: dais height <=0.35 in main.js arena OR walkable-top cells   sev: major
- [x] E-007  main.js beginWave doesn't reset G.shootersSpawned -> later waves starve shooters   sev: major (1-line)
- [x] E-008  main.js:656 fixed-step loop keeps simulating after endGame -> score differs from gameover screen   sev: major (1-line)
- [ ] E-009  player walks through enemies (no player-enemy collision)   sev: minor (defer)
- [x] E-010  audio.js:185 12-voice cap drops playerHurt/enemyMelee/wave cues silently; add priority   sev: minor
- [x] E-011  restart leaves W.autoReload, W.firedHeld, acc (partly addressed by T-005; recheck)   sev: minor
- [ ] E-012  Dive bar recapture still overhead view: run_dive_example needs 'enable FPS controls' + close GUI for combat frames (studio/bars/dive_combat_*.png)   sev: minor (process)
### T-001  bar: games_fps movement + Dive HUD/arena look. acceptance: SPEC features 1,2,3,5,6,8,9 + hook; smoke passes; 0 console errors.
### T-002  bar: Dive enemy behaviour. acceptance: SPEC feature 4 via ARCHITECTURE interface; not plain boxes; navigate around cover.
### T-003  bar: Dive SFX set. acceptance: SPEC feature 7 names per ARCHITECTURE interface; master volume live.
### T-004 exp critic (coach, HB-002): PICK NONE - bar evidence invalid (Dive shots = debug overhead + menu). On our side it confirmed: viewmodel flat unshaded (E-001), enemy black silhouette same value as wall bands (E-002); HUD legible. Counted as loss. Action: recapture Dive combat frames -> studio/bars/, rerun coach in HB-003.
