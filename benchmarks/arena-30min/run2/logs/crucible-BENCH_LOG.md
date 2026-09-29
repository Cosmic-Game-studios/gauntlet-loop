# BENCH_LOG (studio / crucible arm)

Start: 2026-09-29 12:35:24 UTC
End: 2026-09-29 13:01 UTC (about 25.5 minutes; handed off with state WAITING FOR HUMAN RC-1)

## Subagents
Wave 1 (dispatched 12:38 UTC, deadline 12:46):
- T1 core+player+weapons+test hook (opus) - main.js, player.js, weapons.js
- T2 look+arena / Art Director (opus) - world.js, STYLE_BIBLE.md
- T3 enemies: models, animation, AI/nav (opus) - enemies.js
- T4 HUD + all screens (opus) - ui.js, ui.css
- T5 audio + QA tools (sonnet) - audio.js, tools/check.mjs, tools/review.json

Review board, round 1 (12:48, all opus, foreground):
- Coach, look/arena (vs Dive frames): said ours beats the bar; top gap was the black sky and dark far walls hiding the enemies.
- Coach, enemies + viewmodel: enemies were dark blobs; the gun did not read as a gun and the flash was weak.
- Coach, HUD/screens (ux mode): screens pass; the ammo panel sat under the rifle; flagged the wave-0 bug.
- Code critic (audit, no browser): assigned each failing check to its owner, plus allocation, restart-softlock and collision-snap blockers.
Fix round 1 (12:49, deadline 12:54:30):
- Core bugs in main/player (sonnet): wave 1 at start, Esc toggle, restart resets, step-up snap, allocations, renderer exposed.
- Weapon viewmodel + flash (opus).
- Arena dusk sky, fog, fill, muted stripes (opus).
- Enemy readability and allocations (opus).
- HUD ammo panel, crosshair id, A-03 check fix (sonnet).
Round 2 (12:53, deadline 12:58:30):
- Enemy draw calls (sonnet): 386 -> 161 with 10 enemies.
- 5-wave flow verification (sonnet): rewrote A-09; found an ammo softlock and added an ammo refill on wave clear.
- Wave banner moved off the crosshair, viewmodel moved clear of the ammo panel (opus).
Round 3 (12:55-13:00):
- One coach (opus) picked the weakest piece: the weapon/muzzle flash.
- Two opus fix attempts on the flash: brighter gun done; the flash still does not show in captures (unresolved).
Totals: 20 subagents (13 opus, 7 sonnet); 5 of the 20 were critics/coaches.

## Review rounds per piece
- Arena/look: build + 1 critique + 1 fix.
- Enemies: build + 2 critiques (R1, R3 regression check) + 2 fixes.
- HUD/screens: build + 1 critique + 2 fixes.
- Weapons: build + 2 critiques + 4 fixes.
- Core/hook: build + code critic + 2 fixes.
- Audio: build only; nobody can hear it.

## Context
I was not compacted. I kept my own context small: I read only 5-line returns, one contact sheet per round and one full-size frame, and never read game code myself. The one cost was that notifications for background agents arrived in batches.

## What went wrong / would do differently
- Some Agent calls ran in the background despite run_in_background:false (the weapons builder and the wave verifier), so a wave did not always block. It worked because notifications arrive, but it is fragile.
- The Dive bar was not captured at kickoff (the builders skipped it for time); I captured it at 12:47. It should be a kickoff step.
- The muzzle-flash regression was not caught until round 3, because the review capture step timing was never validated against effect lifetimes. The capture tool should hold effects, or the hook should freeze the FX timers.
- A-09 at 26 s was too close to the 30 s accept timeout under parallel load.
- Next time: a playtester pass on a real 5-wave run in round 2, and a shotgun capture in review.json.

## Honest assessment vs SPEC
1. Menus: main, settings (live sensitivity/volume, saved), pause on Esc/lock loss, game-over and victory with Restart are all present and styled consistently. Good.
2. Controller: pointer lock, WASD, sprint, jump, gravity, AABB collision with step-up (checks A-03/A-04 pass). Climbing the platform stairs was not visually verified. Good.
3. Weapons:
   - Rifle and shotgun match the spec numbers; switching with 1/2/wheel is in (wheel unverified headless).
   - Recoil, spread, pump, reload with animation, tracers/impacts and hit marker are all in.
   - The viewmodels are box-built and read as guns but look boxy.
   - The muzzle flash is visible in early captures but missing in the late ones: a real risk.
4. Enemies:
   - Rusher (orange-red creature, melee lunge) and shooter (violet walker, telegraphed dodgeable orbs) are both procedural and animated.
   - Both use A* around cover (A-08 passes), react to hits with a flash and knockback, and have a death animation.
   - Detail was reduced for performance. Fairly good.
5. Waves: 5 waves with increasing counts/HP/speed/damage, a 5 s break with banner, victory after wave 5, verified end to end by A-09. Ammo refills between waves.
6. HUD: health, ammo mag/reserve, weapon plus icon, wave, hostiles, score, crosshair, directional damage arcs, red vignette. Polished. The damage arcs never appear in a capture.
7. Audio: 24 synthesised WebAudio events on a master gain with compressor, volume applied live. Never heard, so quality is unknown.
8. Arena: a dusk industrial arena with a gradient sky, fog, warm key and teal fill, shadows, procedural textures, a central platform and catwalks with stairs, crates and pillars. Coherent and readable; a critic judged it better than the Dive bar on mood.
9. Performance: world 12 draw calls, 161 total with 10 enemies, pooled FX, allocation fixes from the code critic. Not profiled for GC.

## Skill friction
- BENCH_ADAPTATIONS says dispatch waves as "parallel foreground Agent calls"; the Agent tool in this session launched them as background agents anyway (run_in_background not set). Notifications arrive, so I used them - but the skill/adaptation should say how to force foreground (`run_in_background: false`).
- SKILL.md "read in this order" + playbook + studio.md dispatch brief: fine for sprint mode, but the Director still has to write ~10 files by hand in minutes 0-4 (brief, architecture, stubs, acceptance, status, tracker, decisions, milestone, machine). A kickoff template/script for web sprint mode (stubs + index.html + import map + acceptance skeleton) would save 2-3 minutes.
- Relative path confusion: the arm directory is named `studio/` and the skill also puts its files in `studio/` (studio/studio/prompts). Three subagents first looked in the wrong place. The adaptation should give absolute paths.
- The sprint playbook's 7.5 min wave-1 deadline was generous: builders returned in 2-4 min. A pipeline per piece, with each piece going to review as soon as it returns, would have fit another round.
- The experience-critic role asks for blind A/B comparisons, but in sprint mode we used coach mode against a bar with no enemy or HUD equivalents (the Dive frames showed no enemies). A bar-capture recipe per question (enemies close up, HUD) is missing.
- templates/web/shot.mjs defaults to a `__studio` step hook in its header comments, while the SPEC hook is `__game`. One builder lost time on this.
- There is no guidance on capturing short-lived effects (muzzle flash) with stepped captures; it caused a false regression hunt.
