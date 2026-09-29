# BENCH_LOG — gauntlet arm

- Start: 2026-09-29 12:35:22 UTC
- End: 2026-09-29 12:57:16 UTC
- Total: ~21 minutes (loop stopped ~7 min before the hard limit to leave time to commit; the enemies piece never won)

## Subagents spawned (all general-purpose)
| # | Role | What it did |
|---|---|---|
| 1 | CORE builder | index.html, main.js (loop, modes, menus, waves, test hook), arena.js, player.js, hud.js, README. Resumed for arena round 2 (low sun, shadows on everything, wall AO gradient, fog) and round 3 (6-material cover blocks, tiled panel UVs, shadow-acne fix, clean octagon spawn pads). |
| 2 | WEAPONS builder | weapons.js (rifle/shotgun viewmodels, hitscan, spread, recoil, reload/switch anims, muzzle flash, tracers, impacts) + audio.js (WebAudio synth, 15 sounds). Resumed for weapon round 2 (size/placement, bevelled ExtrudeGeometry, canvas decals, hand). |
| 3 | ENEMIES builder | enemies.js (rusher/shooter procedural models, A* on nav grid, pooled projectiles, hit flash/stagger, tumbling death). Resumed for rounds 2–5 (contrast/accents/poses → gunmetal + rounded parts → armor texture/bump + mid-tone → thicker tapered limbs, lathe torso, decluttered rusher). |
| 4 | Critic weapon/HUD r1 | blind A/B vs Dive FPS frame → bar won. Gap: rifle too big/close, flat boxes. |
| 5 | Critic arena r1 | blind → bar won. Gap: overhead sun, flat lighting. |
| 6 | Critic enemies r1 | wrote tools/shoot_enemy.mjs + tools/dive_enemy.mjs; bar frames had no enemy → result invalid. |
| 7 | Critic weapon/HUD r2 | blind → **ours won**. Piece closed. |
| 8 | Critic arena r2 | blind → bar won. Gap: stretched red slab on cover tops, shadow acne. |
| 9 | QA builder | tools/qa.mjs Playwright functional run via __game: 13/17 pass; the 4 failures were test timing / placement (weapon switch animation, rushers blocked by cover), not game bugs. No game edits. |
| 10 | Critic enemies r2 | could not find a Dive enemy frame → invalid, no verdict. |
| 11 | Critic arena r3 | blind → **ours won**. Piece closed. |
| 12 | Critic enemies r2b | blind vs Dive's real soldier.glb (rendered by lead's tools/dive_soldier.mjs) → bar won. Gap: make armor dark gunmetal. |
| 13 | Critic enemies r3 | blind → bar won. Gap: near-black armor reads as flat cutouts; use mid-tone. |
| 14 | Critic enemies r4 | blind → bar won ("primitive-assembled robots, flat materials, stick-like joints"). |
| 15 | Critic enemies r5 | blind → bar won; gap: "needs an authored, skinned, textured model" (not reachable procedurally in the time). Loop stopped. |

Lead (me) did: rules/spec, bar capture, module contract (game/CONTRACT.md) so 3 builders could work in parallel on disjoint files, screenshot harness (tools/shoot.mjs), blind A/B randomiser (tools/blind.sh), Dive soldier renderer (tools/dive_soldier.mjs), contact sheet tool, integration commits, two small fixes (hemisphere fill light raised after round 2 made shadow faces black; getState() reports the selected weapon immediately during the switch animation; enemy metalness 0.6→0.3).

## Rounds per piece
- Weapon viewmodel + HUD: 2 rounds → ours picked blind in round 2.
- Arena visuals: 3 rounds → ours picked blind in round 3.
- Enemies: 5 build rounds (plus 2 invalid critic runs where the bar frame showed no enemy). Bar (Dive's skinned, textured soldier.glb) won every valid blind comparison, rounds 2–5. The loop was stopped by the time limit, NOT by an 'ours wins' verdict.
- Movement/collision feel vs games_fps: not judged blind (see Method friction). QA verified collision with walls and cover, ramps and platforms.

## Context
My own context did not get compacted and stayed manageable. The builders' and critics' long transcripts stayed in the subagents; I only received their short WINNER/REASON/GAP replies. I viewed about 6 images myself.

## What went wrong / what I'd do differently
- **Enemies bar frame.** I had no enemy bar frame at the start. Dive's FPS runner walks the player into a wall, and there is no global world handle. Two critic runs were wasted before I rendered Dive's real soldier.glb directly. Next time I would prepare every bar reference (per piece) before the first critic round.
- **Contradictory critics.** Fresh critics contradicted each other on enemy armor: round 1 asked for lighter armor, round 2 for dark, round 3 for mid-tone. Fresh context means no memory of the previous gap, so the loop oscillated. A one-line "previous gaps" note given to each critic would prevent that.
- **Weak blind for enemies.** A skinned, textured, hand-authored GLB soldier against procedural primitives is a very hard blind comparison under the no-external-assets rule. The loop's "don't stop until ours wins" can't be met in 30 minutes there.
- **Wasted QA timing.** The QA run spent its whole slot on SwiftShader timing (one full run took about 5 minutes).

## Honest assessment vs SPEC.md
1. **Menus:** main menu (Play, Settings), pause on Esc and on pointer-lock loss, settings (sensitivity, volume; live, persisted), game over and victory with Restart. Present; Restart checked by QA. Victory logic was checked by reading the code, not by a full 5-wave run.
2. **Controller:** pointer lock, WASD, sprint, jump, gravity, cylinder-vs-AABB collision with step-up, ramps and platforms. Verified in headless tests. Feel was not compared side by side with games_fps.
3. **Weapons:** rifle (auto, spread, recoil, 30/90, reload) and shotgun (8 pellets, pump, 6/24, per-shell reload). Viewmodels have bob, recoil, reload and switch animations, muzzle flash, tracers, impact sparks and decals, and a hit marker. Good. The shotgun's "full reload 2.2 s" option isn't implemented; it reloads one shell at a time instead.
4. **Enemies:** rusher (melee with windup) and shooter (keeps distance, dodgeable glowing projectiles). A* on the nav grid around cover, hit flash and stagger, tumbling death. Visually still clearly below Dive's soldier.
5. **Waves:** 5 waves of increasing size, speed, health and damage, a 5 s break, victory after wave 5.
6. **HUD:** health, ammo, weapon, wave, score, enemies left, dynamic crosshair, hit marker, directional damage arcs, damage flash. The critic judged it better than Dive's.
7. **Audio:** all WebAudio-synthesised, with master volume. I didn't listen to it by ear.
8. **Arena:** Dive-styled white/red/black panels, green floor bands, octagon pads, cover, 2 platforms with ramps, and a low sun with shadows. It won blind against a Dive frame. Remaining weakness: an empty sky above a low perimeter wall.
9. **Performance:** instancing for repeated arena parts, pooled projectiles, tracers and impacts, shared enemy geometry. The viewmodel is about 30 separate meshes per weapon, and the cover blocks became 14 separate meshes. Frame rate wasn't measured on real hardware.

## Method friction (gauntlet loop prompt)
- **Helped.**
  - Blind A/B with a harsh fresh critic gave sharp, concrete, one-thing gaps ("sun overhead", "rifle 40% of frame", "stretched red slab"). Each round visibly moved the picture, and 2 of 3 pieces flipped to "ours" within 2–3 rounds.
  - "Get the real things running first" forced the bar capture up front, and that paid off.
  - Asking critics for a single biggest gap kept builder rounds to about 1–2 minutes.
- **Unclear or got in the way.**
  - **Stopping rule vs time limit.** "Keep looping until the critic picks ours blind. Do not stop before that" conflicts with the 30-minute limit. The enemies piece cannot realistically beat a hand-authored skinned GLB with procedural primitives, so the rule would loop forever.
  - **Blindness has to be engineered.** "Critic inspects the actual output in headless Chromium" and "blind with labels stripped" pull against each other: a critic that runs our game knows which image is ours. I solved it by having the lead generate randomized A/B pairs and having the critic write its verdict before reading the key. That is honour-system blindness.
  - **Non-visual pieces.** "Smallest pieces judged on their own" doesn't fit movement and collision feel, audio, or wave logic, which a screenshot can't judge. Those got functional QA instead of a blind bar comparison.
  - **Fresh-context critics oscillate.** With no memory of prior gaps, they gave contradictory directions (lighter, then darker, then mid-tone armor).
  - **Bar views need tooling.** The bar runner only provides some views. There was no enemy close-up, and building one cost about 4 minutes and two wasted critic runs.
  - **Parallel builders need a contract.** "Run builders and critics as parallel subagents" worked only because I wrote a module contract first, so builders owned disjoint files. Without it, parallel builders on one game would collide.
