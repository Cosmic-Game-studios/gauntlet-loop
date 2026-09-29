# BENCH_LOG — gauntlet arm

- Start (UTC): Tue Sep 29 11:01:16 UTC 2026
- End (UTC): Tue Sep 29 11:21:36 UTC 2026
- Total: 20 minutes

## Timeline
- 11:01–11:05: the lead read the rules and spec and captured the Dive bar screenshots in the background. The lead wrote the whole first-pass game alone (index.html, style.css, main.js, about 700 lines), because one author is the fastest way to get a playable, committed base in a 30-minute budget.
- 11:05: first playable build committed, with every SPEC feature at first-pass quality.
- 11:06–11:23: builder/critic loops ran in parallel on 4 pieces. Every builder change was committed after a smoke test with no page errors.
- The lead also ran hook-based tests: collision, pause, weapon switching, reload, damage, and whether every spawn can reach the player. These found and fixed 3 real bugs (below).

## Subagents spawned (all general-purpose)
| # | Role | What it did |
|---|---|---|
| 1 | Critic A r1 (viewmodel) | Picked ours only because games_fps has no gun. Gap: black slab gun, bad framing |
| 2 | Critic B r1 (arena) | Picked the bar. Gap: an empty box with no rooms or routes |
| 3 | Critic C r1 (enemies) | Picked the bar. Gap: stiff hit and death reactions. Confirmed nav goes around cover |
| 4 | Builder A (viewmodel), resumed for r2, r3 | Lit and detailed rifle, framing, hands and sleeves, distinct twin-barrel shotgun, star flash |
| 5 | Builder B (arena), resumed for r2, r3 | Dive-like white/lavender and red palette, ring walls, 4 corner rooms plus hub, quadrant accents, light rebalance |
| 6 | Builder C (enemies), resumed for r2, r3 | Shared-geometry models with glow, knockback and flinch, limp deaths and debris, knees and elbows, dodge, zig-zag; r3: lunge, hit tint, dissolve |
| 7 | Critic A r2 | Picked the bar: blocky model, overlaps the HUD |
| 8 | Builder D (HUD/menus) | Compact ammo panel with SVG icons, damage arcs, low-HP pulse, animated menu with key hints |
| 9 | Critic D r1 (HUD) | **Picked ours blind.** Its contrast nit was applied by the lead |
| 10 | Critic B r2 | Picked the bar: still no rooms, washed-out lighting |
| 11 | Critic C r2 | Picked the bar: single-joint animation |
| 12 | Critic A r3 | Picked the bar: no hands, weapons look alike, no flash visible |
| 13 | Critic B r3 | Picked the bar: open field, distracting salmon decal |
| 14 | Critic C r3 | Picked the bar: rigid puppets, slow rushers |
| 15 | Critic A r4 | Picked the bar: flash never visible (root cause: at headless FPS the flash expired before the next rendered frame; the lead fixed it) |
| 16 | Critic B r4 | Picked the bar: the overview still reads as an open square, wants lanes and corridors; accent colours arbitrary |
| 17 | Critic A r5 | Picked the bar: box-built guns; flash floating off the muzzle (the lead fixed the flash placement) |
| 18 | Critic C r4 | Picked the bar: primitive robots vs rigged soldiers; saturated hit tint too strong up close |

## Rounds per piece
- Viewmodel/shooting feedback: 3 build rounds, 5 critic rounds. Result: the bar still won in the last critique.
- Arena: 3 build rounds, 4 critic rounds. Result: the bar still won in the last critique.
- Enemies: 3 build rounds, 4 critic rounds. Result: the bar still won.
- HUD/menus: 1 build round, 1 critic round. Ours won blind.
- Movement/collision was checked by the lead with hook scripts; no subagent critic was used.

## Bugs found by lead testing
1. The semi-auto latch swallowed shotgun trigger pulls made during weapon switch or cooldown, so the shotgun could never fire. Fixed: `shoot()` returns false and the latch is only set on a real shot.
2. A spawn point moved by the arena builder was sealed in a pocket, so enemies there never reached the player. Moved it; all 10 spawns verified reaching the player.
3. The muzzle flash and tracers expired inside one simulation step at low FPS, so they never showed. The timers now tick at most 25ms per frame, and the flash is now parented to the muzzle tip.
4. Recoil never recovered, so a sustained burst pitched the view straight up (pitch 1.5 after one magazine). Added recoil recovery.

## Context
My context was not compacted and stayed manageable. Critics were told to return 100–150 words, and I never read subagent transcripts. Builder agents were resumed with SendMessage, so each kept its own context of its piece across rounds.

## What went wrong / what I'd do differently
- **Concurrent edits to one file.** Builders edited disjoint sections of one main.js at the same time. It worked, but Builder C once rewrote the whole file from a script, which was risky. Splitting the game into modules first (arena.js, enemies.js, viewmodel.js, hud) would have made the parallel builders safe.
- **Bars.** Dive runs only in its overview/debug camera in the provided runner, and games_fps has no gun. So for the viewmodel and HUD there was no like-for-like bar image. Critics had to judge against source code or memory, which makes a "blind" comparison partly fake.
- **Low FPS.** Headless SwiftShader FPS is very low (single-digit), which confused several critic captures ("shot never happened", "flash not visible"). A deterministic capture tool (step the sim N frames, then screenshot) should have been built on minute 1 and shared with all critics.
- **Loop condition.** "Loop until the critic picks ours" is not reachable in 30 minutes for pieces where the bar is a professional asset pipeline (skinned, animated soldier models versus procedural primitives). The time limit ended the loop, not the win condition.

## Honest assessment vs SPEC
1. **Menus:** main menu (Play, Settings), Esc pause, settings for sensitivity and volume (applied live, saved), game-over and victory screens with Restart. Complete.
2. **Controller:** pointer lock, WASD, sprint, jump, gravity, AABB collision with step-up (0.65m) onto stairs and platforms, floor clamp. Verified by hook tests. Solid, though simpler than games_fps's capsule-vs-octree.
3. **Weapons:** rifle (auto, bloom spread, recoil, 30/90, 1.8s reload) and shotgun (8 pellets, pump delay, 6/24). Switching with 1/2/wheel. Viewmodels with bob, recoil kick, and reload animation (mag drop / pump). Muzzle flash plus light, tracers, impacts, hit and kill markers. Complete; the viewmodel art is still boxy.
4. **Enemies:** rusher (melee) and shooter (keeps distance, strafes, fires dodgeable glowing projectiles with lead). Flow-field navigation around cover, verified from all spawns. Hit reaction, health, visible death. Complete; models and animation are procedural primitives and clearly below Dive's skinned soldiers.
5. **Waves:** 5 waves of increasing size and damage, 5s breaks with heal and ammo top-up, victory after wave 5. Implemented; a full 5-wave playthrough was NOT run end-to-end headless (too slow at SwiftShader FPS).
6. **HUD:** health, ammo mag/reserve, weapon, wave, score, hostiles, crosshair with dynamic spread, directional damage arcs, low-HP pulse, reload bar. Complete; the HUD critic picked ours over Dive blind.
7. **Audio:** WebAudio synth for rifle, shotgun, pump, reload, empty, hit, kill, melee, enemy shot, enemy death, player hurt, wave start, jump; the master gain follows the settings slider live. Complete; not listened to (headless).
8. **Arena:** coherent Dive-like palette, 4 corner rooms with raised platforms and stairs, central raised hub, ring walls, crates and cover, sun shadows plus accent point lights. Improved a lot over 3 rounds, but the blind critic still preferred Dive's level design.
9. **Performance:** shared geometries for enemies, pooled tracers, impacts, projectiles and debris, HUD text updates only on change. Some per-frame allocations remain (`enemies.filter` in the HUD, `cellOf` returning arrays). Box meshes are not instanced or merged, so draw calls could be reduced.

## Method friction (gauntlet loop)
- **Helped:** a fresh-context harsh critic with a single "biggest gap" was very effective at focusing builders. Each round produced one concrete, actionable fix, and the rooms/lighting/hands feedback materially improved the game. Resuming the same builder with SendMessage kept continuity cheaply.
- **Helped:** requiring critics to look at real headless output exposed real bugs: the flash never rendered at low FPS, and the shotgun "never fired".
- **Unclear:** "put our screenshot next to the bar's … blind with labels stripped". A subagent that took both screenshots itself knows which is which, so it is not truly blind. A real blind test would need a third agent that receives anonymised images from the lead. There was no time for that.
- **Unclear:** the bars don't have comparable views for several pieces (games_fps has no gun; the Dive runner shows an overview/debug camera). Critics judged against source or memory.
- **Got in the way:** "keep looping until the critic picks ours blind, do not stop before that" conflicts directly with the 30-minute hard limit. For enemies and level art against a professionally modelled game, that bar is not reachable procedurally in minutes. The rules' time limit won.
- **Got in the way:** "smallest pieces improved and judged on their own" plus parallel builders means concurrent edits to shared files. The prompt says nothing about structuring code for that, so it has to be designed up front.
- **Cost:** 18 subagent launches (plus resumes) for about 20 minutes of work; critics were a large share of the tokens.
