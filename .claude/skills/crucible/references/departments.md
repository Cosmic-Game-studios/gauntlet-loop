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

- **Builds:** style bible, colour script, style frames, 2D textures, icons, UI art. Claude cannot generate images, so art is made with code and tools: SVG (UI, icons, logos, 2D sprites), procedural textures (noise, gradients, masks, in Python or Blender nodes), style frames as blocked-out Blender scenes rendered with target lighting and palette, and fetched reference images from the bar games as mood boards. An external image generator is used only if the probe found one (`MACHINE.md`).
- **Evidence:** the image at final use size, plus in-engine screenshot once integrated.
- **Bar:** the reference game's concept art or press-kit images.
- **Readability is a style-bible rule, not a polish item.** The style bible defines value and hue separation: threats, pickups and interactive objects must contrast with the environment (different hue family *and* value band), checked by a scripted luminance/hue test on captures and by a Silhouette critic question: "Find every enemy in this frame within one second." A cohesive palette that camouflages the threats fails the floor.
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
- **Custom hero characters are allowed and expected** where the game's identity needs them - but only through the full quality gates below. A kit character that passes beats a custom one that does not.
- **Character quality gates (verify, scripted):** quad-dominant topology with edge loops at every deforming joint (shoulders, elbows, hips, knees, mouth/eyes if animated); no non-manifold geometry; triangle budget per LOD; UV texel density within 10% across the body; mirrored symmetry check; normals and smoothing correct.
- **Character evidence:** turntable, silhouette, wireframe close-ups of joints, and a **deformation test**: the rigged mesh rendered in 8 stress poses (arms up, arms forward, deep crouch, full twist, knee raise, lunge, head turn, fist) - the critic checks for collapsing volume, candy-wrapper twists and interpenetration.

## Animation

- **Builds:** rigs, skinning, locomotion sets, attacks, reactions, retargeting, blend trees / state machines with Code.
- **Evidence:** clip on the in-engine character, side view and game camera view, plus a slowed 0.25x version.
- **Bar:** the reference game's equivalent move, frame-stepped.
- **Verify:** loops, root motion, foot sliding threshold, correct skeleton, event markers (footsteps, hit frames) present, no joint beyond its rotation limits, no mesh interpenetration in any frame (scripted collision check on sampled frames).
- **Animation quality evidence:** frame strips at game fps from side and game camera, plus **motion-arc overlays** (the path of hands, feet, head and weapon traced across frames onto one image) and **spacing charts** (per-frame distance of key bones). The critic judges the principles it can see in stills: clear key poses and silhouettes, arcs instead of straight lines, ease-in/out in the spacing, anticipation before and follow-through after big moves, weight shift and contact frames. It compares against the bar move frame-stepped at the same fps.
- **Rule:** block the key poses first and get them judged as a pose strip before splining and polishing - a bad pose cannot be fixed by smoothing.

## Tech Art

- **Builds:** shaders, materials, VFX, lighting, post-processing, LODs, import presets, perf fixes.
- **Evidence:** before/after in-engine shots from fixed cameras, profiler capture.
- **Bar:** reference game's look at the matching scene, plus the frame-time budget.
- **Verify:** compiles on target, within draw-call and frame-time budget, no shader errors.
- **Owns** the asset pipeline: every automated import, validator and capture rig.

## Audio

- **Builds:** SFX, music, ambience, mix, adaptive layers. Claude can neither generate nor hear audio, so audio is made as code and judged as data: SFX by synthesis scripts (oscillators, noise, envelopes, filters, layering - sfxr-style for retro, physical-modelling-style layers for impacts) and CC0 libraries processed by script; music composed as MIDI and rendered with a soundfont or synth; mixing by measured loudness targets. An external audio generator is used only if the probe found one. Audio is always flagged for the human playtest in `PLAY.md`.
- **Evidence:** spectrogram and waveform images, LUFS / peak / onset timing, and which gameplay event (frame) it plays on - never "listen to it".
- **Bar:** the reference game's equivalent sound or track.
- **Verify:** loudness target, no clipping, loop points, correct format, triggers wired.

## Level Design

- **Builds:** blockouts, layouts, encounter placement, pacing graphs, then dressing once the kit exists.
- **Evidence:** top-down map, playtest bot route and death heatmap, walkthrough video.
- **Bar:** a named level from the reference game (its layout, pacing and teaching beats).
- **Verify:** navmesh, every objective reachable, pacing within the target time.
- **Rule:** grey-box first. Art only after the blockout passes the `playtester` against the ticket's pass criteria (target time to objective, max stuck points, max dead time - taken from the bar level's pacing).
- **Level judging:** the `playtester` report with `CRITERIA: PASS` is the floor; the Experience judge compares top-down map and frame strips of the walkthrough against the bar level for WON.

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
