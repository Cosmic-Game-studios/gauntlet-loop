# Departments

Each department is a builder role plus what it is judged on. Builders are spawned per ticket with fresh context; a department is a role, not a long-lived agent. Every department inherits the brief's pillars, the style bible and the gauntlet in `gauntlet.md`.

For each: **Builds** - what it produces. **Evidence** - what the critic sees. **Bar** - what it is compared to. **Verify** - machine checks before the critic.

## Design

- **Builds:** feature specs (one page), tuning tables (data files, never hard-coded), progression curves, economy.
- **Evidence:** the spec plus a playtest trace after Code implements it. A spec is APPROVED (unblocks its chain) when complete and testable; the Design ticket is only WON once the implemented version wins (`director.md` - chains).
- **Bar:** the same system in the named reference game (e.g. "Celeste's coyote time and jump buffer values").
- **Verify:** every number lives in a data file; every rule is testable.

## Code

- **Builds:** gameplay systems, AI, physics, save/load, input, camera, tools that make other departments faster.
- **Evidence:** tests passing, a scripted scenario video, frame timing.
- **Bar:** the reference game's behaviour in the same scenario, plus the numbers bar.
- **Verify:** compiles headless, unit and functional tests, smoke test, no new warnings, perf budget.
- **Code bar:** a named reference implementation per system, from `ARCHITECTURE.md` (e.g. Lyra for Unreal abilities/input, Unity's Boss Room, Godot demo projects). Every Code ticket also needs a Code critic `PASS` (see `gauntlet.md`).
- **Rule:** Code builds tools first when a department is blocked on manual work (importers, validators, capture scripts, level generators).

## Art (2D)

- **Builds:** style bible, colour script, concept sheets, style frames, 2D textures, icons, UI art. Uses image generation where available, then paint-over and clean-up.
- **Evidence:** the image at final use size, plus in-engine screenshot once integrated.
- **Bar:** the reference game's concept art or press-kit images.
- **First visual ticket of the project** (runs in parallel with Tech Spike; it needs no build): the **style bible** - palette, value range, shape language, material rules, 6 reference frames. Every visual ticket afterwards is judged against it by the Coherence critic.

## Asset sourcing (all visual and audio departments)

Build less, choose more. Source in this order, per the brief's `Assets` line:

1. **CC0 / licensed kits** (e.g. Kenney, Quaternius, Poly Haven, licensed marketplace packs) for props, environment pieces, textures, SFX - restyled to the style bible (materials, palette, shaders).
2. **Retargeted animation** from licensed libraries onto our skeletons.
3. **Generated** (image, audio, image-to-3D) as a starting point, always cleaned up and validated.
4. **Custom Blender work** for the hero assets that define the game's identity: the player character, key enemies, signature props and landmarks.

Every sourced asset has its licence recorded in `studio/ASSETS.md`. No asset of unknown licence ships.

## 3D (Blender)

- **Builds:** blockouts, hero meshes, props, environment kits, UVs, bakes, PBR textures. Works through Blender Python in background mode (`engines.md`).
- **Pipeline per asset:** reference sheet -> blockout -> silhouette check -> high/low poly -> UV -> bake -> texture -> LODs -> export -> engine import.
- **Evidence:** an automated turntable (8 angles, fixed studio lighting), silhouette at game distance, wireframe, and an in-engine shot under game lighting.
- **Bar:** the reference game's equivalent asset, same angle, same distance.
- **Verify:** scale in metres, pivot, applied transforms, naming convention, polycount and texel density budget, clean export and import.
- **Rule:** get the silhouette critic's WON on the blockout before spending on detail.

## Animation

- **Builds:** rigs, skinning, locomotion sets, attacks, reactions, retargeting, blend trees / state machines with Code.
- **Evidence:** clip on the in-engine character, side view and game camera view, plus a slowed 0.25x version.
- **Bar:** the reference game's equivalent move, frame-stepped.
- **Verify:** loops, root motion, foot sliding threshold, correct skeleton, event markers (footsteps, hit frames) present.

## Tech Art

- **Builds:** shaders, materials, VFX, lighting, post-processing, LODs, import presets, perf fixes.
- **Evidence:** before/after in-engine shots from fixed cameras, profiler capture.
- **Bar:** reference game's look at the matching scene, plus the frame-time budget.
- **Verify:** compiles on target, within draw-call and frame-time budget, no shader errors.
- **Owns** the asset pipeline: every automated import, validator and capture rig.

## Audio

- **Builds:** SFX, music, ambience, mix, adaptive layers. Uses audio generation or synthesis tools where available, plus procedural sound where useful.
- **Evidence:** the sound in context - gameplay video with audio - plus the isolated file.
- **Bar:** the reference game's equivalent sound or track.
- **Verify:** loudness target, no clipping, loop points, correct format, triggers wired.

## Level Design

- **Builds:** blockouts, layouts, encounter placement, pacing graphs, then dressing once the kit exists.
- **Evidence:** top-down map, playtest bot route and death heatmap, walkthrough video.
- **Bar:** a named level from the reference game (its layout, pacing and teaching beats).
- **Verify:** navmesh, every objective reachable, pacing within the target time.
- **Rule:** grey-box first. Art only after the blockout wins the Playtest critic.

## UI/UX

- **Builds:** HUD, menus, onboarding, settings, accessibility (remapping, subtitles, colour-blind modes, text scale).
- **Evidence:** screenshots at every supported resolution, a navigation video with gamepad and keyboard.
- **Bar:** the reference game's equivalent screen.
- **Verify:** every screen reachable, focus order, text fits, localisation-ready strings.

## QA

- **Builds:** test plans, automated playtest bots, fuzzers (random input, random state), regression suites, bug tickets.
- **Evidence:** reproducible bug reports: steps, build, video, log.
- **Runs:** after every integration, the playtest bot on the current slice; nightly-equivalent (every N heartbeats), the full game.
- **Rule:** every bug becomes a ticket routed to the owning department. Blockers jump the board.

## Build

- **Builds:** one-command build, headless CI, packaging for the target platform, crash capture, versioning.
- **Evidence:** a clean-checkout build log and a packaged build that launches.
- **Rule:** the Tech Spike milestone is mostly Build and Tech Art. No content ticket that goes into the engine starts before a clean one-command build exists. Pre-production documents (style bible, architecture, completeness list, bars) run in parallel.
