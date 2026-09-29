# Departments

Each department is a builder role plus what it is judged on. Builders are spawned per ticket with fresh context (and resumed for their own revision rounds); a department is a role, not a long-lived agent. Every department inherits the pillars, the style bible, the architecture contract and the gauntlet in `gauntlet.md`. How departments fit into the studio, and which model each uses, is in `studio.md`; the craft defaults each department starts from are in `craft.md`.

For each: **Model** - default routing. **Builds** - what it produces. **Evidence** - what the critic sees. **Bar** - what it is compared to. **Verify** - machine checks before the critic.

## Design

- **Model:** Opus (Design Director: feel numbers, tuning, UX flow). Tuning-table edits with a known target: Sonnet.

- **Builds:** feature specs (one page), tuning tables (data files, never hard-coded), progression curves, economy.
- **Evidence:** the spec plus a playtest trace after Code implements it. A spec is APPROVED (unblocks its chain) when complete and testable; the Design ticket is only WON once the implemented version wins (`director.md` - chains).
- **Bar:** the same system in the named reference game (e.g. "Celeste's coyote time and jump buffer values").
- **Verify:** every number lives in a data file; every rule is testable.

## Code

- **Model:** Sonnet for systems, AI logic, tools and fixes with a known cause; Opus for player controller, weapon feel and the gameplay core of the first wave.

- **Builds:** gameplay systems, AI, physics, save/load, input, camera, tools that make other departments faster.
- **Evidence:** tests passing, a scripted scenario video, frame timing.
- **Bar:** the reference game's behaviour in the same scenario, plus the numbers bar.
- **Verify:** compiles headless, unit and functional tests, smoke test, no new warnings, perf budget.
- **Code bar:** a named reference implementation per system, from `ARCHITECTURE.md` (e.g. Lyra for Unreal abilities/input, Unity's Boss Room, Godot demo projects). Every Code ticket also needs a Code critic `PASS` (see `gauntlet.md`).
- **Rule:** Code builds tools first when a department is blocked on manual work (importers, validators, capture scripts, level generators).

## Art (2D)

- **Model:** Opus (the Art Director owns the style bible - `agents/art-director.md`).

- **Builds:** style bible, colour script, style frames, 2D textures, icons, UI art. Any tool that gives the best result (`engines.md` - making content): an image generator or MCP server if connected; otherwise SVG, procedural textures, style frames rendered from blocked-out scenes, and fetched reference images from the bar games as mood boards.
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

## 3D modelling (shared by Character Art, Weapon & Prop Art, World Design)

- **Model:** Opus.

- **Tools:** whatever gives the best result (`engines.md` - making content): a Blender MCP server or Blender Python, the engine's modelling tools, generators as a starting point, or - on the web without a DCC tool - modelling in code with `src/shapes.js` (bevelled profiles, lathes, tubes, mirrored halves, baked occlusion, instanced scatter) and `src/materials.js`.
- **Pipeline per asset:** design sheet -> blockout -> silhouette and turntable check -> detail pass -> materials -> optimise (merge, LOD, budget) -> in-game check under game lighting -> Visual QA.
- **Design sheet first** (5-10 lines in the builder notes, before any geometry): function and fantasy, shape language, proportions, primary/secondary/tertiary forms, colour zones (60/30/10), focal points where the detail goes, the one exaggerated feature, the bar asset it answers.
- **Evidence:** turntable strip (8 angles at game distance, fixed studio lighting), black silhouette, close-up, wireframe or triangle count, and an in-game shot under game lighting.
- **Bar:** the reference game's equivalent asset, same angle, same distance.
- **Verify:** scale in metres, pivot at the feet/grip, applied transforms, naming, triangle and draw-call budget per asset (`BUDGETS.md`), clean import.
- **Rule:** get the silhouette right on the blockout before spending on detail - detail never rescues a weak silhouette.
- **Kits and sourced assets** follow the same gates (Asset sourcing above). A kit asset that passes beats a custom one that does not.
- **Character quality gates (DCC-built characters, scripted):** quad-dominant topology with edge loops at every deforming joint; no non-manifold geometry; triangle budget per LOD; UV texel density within 10% across the body; normals and smoothing correct; **deformation test** in 8 stress poses (arms up, arms forward, deep crouch, full twist, knee raise, lunge, head turn, fist) - checked for collapsing volume, candy-wrapper twists and interpenetration.

## Character Art

- **Model:** Opus.
- **Builds:** player character, enemies, NPCs, creatures - design sheet, model, materials, outline/rim setup, LODs - handed to Animation with named pivots or a skeleton.
- **Craft:** `craft.md` - "Character design", "3D models built in code", "The AAA look". Tools (web): `src/sculpt.js` for organic bodies, `src/shapes.js` for hard gear, `src/rig.js` for the skeleton handed to Animation.
- **Evidence:** lineup of all characters side by side at the same scale and at game distance, turntable strips, silhouettes, close-up of the face/mask and hands, in-game shot in the level's lighting.
- **Bar:** the reference game's characters in the same framing.
- **Verify:** every type readable and distinct as a black silhouette at game distance; enemy hue family not used by the level; triangle and draw-call budget; pivots at joints; nothing floats or intersects in the bind pose.

## Weapon & Prop Art

- **Model:** Opus.
- **Builds:** first-person viewmodels and their world models, hard-surface props (crates, barrels, terminals, machines, pickups) - design sheet, model, materials, moving parts kept separate for animation (bolt, pump, magazine, trigger).
- **Craft:** `craft.md` - "Weapon design", "3D models built in code", "The AAA look".
- **Evidence:** the viewmodel in first-person framing at the game's viewmodel FOV (idle, firing, reloading frames), a turntable strip, a close-up of the receiver; props as a lineup and in the level.
- **Bar:** the reference game's weapon in the same first-person framing.
- **Verify:** reads in the bottom-right quarter without covering the crosshair; every edge bevelled; at least three materials; moving parts pivot correctly; triangle budget; one draw call per material.
- **Other engines:** Unreal - hard-surface in Blender (MCP or bpy) or Unreal's modelling tools, weighted normals or bevels baked to normal maps, sockets for muzzle, eject port and magazine, a separate first-person mesh with its own FOV.

## World Design & Environment Art

- **Model:** Opus.
- **Builds:** the world around the play space: landmarks, skyline and backdrop layers, terrain shaping, architecture and environment kits (modular pieces with variation), set dressing at three scales, environmental storytelling, zone colour and lighting identity. Works on the level layout Level Design owns - it never moves cover or lanes.
- **Craft:** `craft.md` - "World design", "The AAA look", "3D models built in code".
- **Pipeline:** (after the level blockout passes) kit and landmark blockout -> composition check from the player's eye at 4 fixed poses -> art pass (kits, trims, decals, variation) -> set dressing pass (macro, meso, micro) -> lighting and atmosphere pass with Shaders & Rendering -> Visual QA.
- **Evidence:** gameplay frames at eye height from 4 fixed poses, one elevated overview, a skyline strip (turn 360 degrees in 8 frames), and a greyscale version of one frame for value structure.
- **Bar:** the reference game's environment in the same framing.
- **Verify:** a landmark visible from most of the play space; no empty horizon; no untextured or single-colour surface larger than a door; props sit on the ground (no floating, no sinking); within the environment's draw-call and triangle budget (merged, instanced).
- **Other engines:** Unreal - modular kits as static meshes with Nanite where it pays, PCG graphs and the foliage tool for scatter, Landscape with layered materials, HISM/ISM for repeats, World Partition and HLODs for large worlds, decals and vertex paint for variation; Godot - GridMap/MultiMesh; Unity - prefabs, GPU instancing, terrain tools.

## Shaders & Rendering

- **Model:** Opus.
- **Builds:** the material library every art department uses (`src/materials.js` on the web: stylised surface with rim light, world-space variation and ground grime; micro-detail normal maps; dissolve; hit flash; sky), special shaders (water, foliage wind, energy shields, holograms, outlines, halftone, heat haze), the post chain and its quality levels (`src/lookdev.js`: grade, bloom, AO, anti-aliasing), and render settings (tone mapping, exposure, shadows, fog).
- **Craft:** `craft.md` - "Shaders", "Tech art defaults", "The AAA look", "Optimization".
- **Evidence:** a material ball sheet (every library material on a sphere and a bevelled cube under game lighting), before/after gameplay frames from fixed poses, the perf probe before and after.
- **Bar:** the reference game's surfaces and image in the same framing, plus the frame-time budget.
- **Verify:** no shader errors or warnings; programs compiled before the first frame (`precompile`); shader program count, frame time and draw calls within `BUDGETS.md`; every quality level renders correctly; effects and grade never wash out the target.
- **In blitz and sprint runs** this builder also covers Tech Art: lighting and keeping `BUDGETS.md` (which the Director drafts at kickoff from `craft.md`) true.
- **Rule:** one library, used by everyone. A department that needs a new surface asks for it in its return line instead of writing its own shader, so the game keeps one look and a small number of programs.
- **Other engines:** Unreal - master materials with material instances and material functions, a material parameter collection for global values (time, wetness, hit flash), post-process volumes and the Lumen/Nanite/shadow settings, custom stencil for outlines; Godot - `ShaderMaterial` with shared includes and `global uniforms`, `WorldEnvironment`; Unity - Shader Graph subgraphs on URP/HDRP, volume profiles.

## Animation

- **Model:** Opus.

- **Builds:** rigs, skinning, locomotion sets, attacks, reactions, retargeting, blend trees / state machines with Code; animation events that the VFX, audio and gameplay code hang on. Tools (web): `src/rig.js`.
- **Craft:** `craft.md` - "Animation".
- **Evidence:** clip on the in-engine character, side view and game camera view, plus a slowed 0.25x version.
- **Bar:** the reference game's equivalent move, frame-stepped.
- **Verify:** loops, root motion, foot sliding threshold, correct skeleton, event markers (footsteps, hit frames) present, no joint beyond its rotation limits, no mesh interpenetration in any frame (scripted collision check on sampled frames).
- **Animation quality evidence:** frame strips at game fps from side and game camera, plus **motion-arc overlays** (the path of hands, feet, head and weapon traced across frames onto one image) and **spacing charts** (per-frame distance of key bones). The critic judges the principles it can see in stills: clear key poses and silhouettes, arcs instead of straight lines, ease-in/out in the spacing, anticipation before and follow-through after big moves, weight shift and contact frames. It compares against the bar move frame-stepped at the same fps.
- **Rule:** block the key poses first and get them judged as a pose strip before splining and polishing - a bad pose cannot be fixed by smoothing.

## VFX

- **Model:** Opus.
- **Builds:** muzzle flashes, impacts, tracers, explosions, shield hits, deaths, damage numbers, ambient effects - layered, pooled, style-matched (`craft.md` - visual effects).
- **Evidence:** frame strips of each effect at the capture frame rate with effect timers frozen, plus a gameplay frame showing the effect in context.
- **Bar:** the reference game's equivalent effect, frame-stepped.
- **Verify:** every effect visible for at least 2 rendered frames; nothing covers the crosshair region or washes out the target; particle counts and overdraw within budget.

## Tech Art

- **Model:** Opus for lighting and the look of a scene; Sonnet for pure performance work with a profiler target.

- **Builds:** lighting (key, fill, accents, light placement that leads the eye), baked or faked occlusion, LODs, import presets, performance fixes, the asset pipeline. Shaders, materials and post belong to Shaders & Rendering; VFX to VFX.
- **Owns the frame budget.** Runs the perf probe after every integration and keeps `BUDGETS.md` (frame time, draw calls, triangles, shader programs, memory) true for the whole game. A change that breaks a budget goes back to its owner with the numbers, or Tech Art optimises it before anything else is merged.
- **Evidence:** before/after in-engine shots from fixed cameras, profiler capture.
- **Bar:** reference game's look at the matching scene, plus the frame-time budget.
- **Verify:** within draw-call and frame-time budget, no shader errors.
- **Owns** the asset pipeline: every automated import, validator and capture rig.

## Audio

- **Model:** Sonnet (synthesis code against the audio direction).

- **Builds:** SFX, music, ambience, mix, adaptive layers. The model can neither generate nor hear audio, so use an audio generator or library if one is available, otherwise synthesis scripts (oscillators, noise, envelopes, filters, layering) and licensed/CC0 sounds processed by script; music from a generator or composed as MIDI and rendered; mixing by measured loudness targets. Whatever the source, audio is judged as data by critics. Audio is always flagged for the human playtest in `PLAY.md`.
- **Evidence:** spectrogram and waveform images, LUFS / peak / onset timing, and which gameplay event (frame) it plays on - never "listen to it".
- **Bar:** the reference game's equivalent sound or track.
- **Verify:** loudness target, no clipping, loop points, correct format, triggers wired.

## Level Design

- **Model:** Opus.

- **Builds:** the playable layout: blockouts, lanes and loops, sightlines, cover placement and heights, verticality, spawn and pickup placement, encounter placement, pacing graphs. World Design dresses it afterwards; Level Design keeps owning what the player can walk on and hide behind.
- **Craft:** `craft.md` - "Level design".
- **Evidence:** top-down map with lanes, sightlines and spawns drawn on it, eye-height frames from each spawn and each major position, playtest bot route and death heatmap.
- **Bar:** a named level from the reference game (its layout, pacing and teaching beats).
- **Verify:** navmesh or bot route reaches everything; no dead ends without a reason; every spawn out of the player's direct view; cover at consistent heights; pacing within the target time.
- **Rule:** grey-box first. Art only after the blockout passes the `playtester` against the ticket's pass criteria (target time to objective, max stuck points, max dead time - taken from the bar level's pacing).
- **Level judging:** the `playtester` report with `CRITERIA: PASS` is the floor; the Experience judge compares top-down map and frame strips of the walkthrough against the bar level for WON.

## UI/UX

- **Model:** Opus.

- **Builds:** HUD, menus, onboarding, settings, accessibility (remapping, subtitles, colour-blind modes, text scale).
- **Evidence:** screenshots at every supported resolution, a navigation video with gamepad and keyboard.
- **Bar:** the reference game's equivalent screen.
- **Verify:** every screen reachable, focus order, text fits, localisation-ready strings.

## QA

- **Model:** Sonnet for tools and playtests; Haiku for running suites and summarising.

- **Builds:** test plans, automated playtest bots, fuzzers (random input, random state), regression suites, bug tickets.
- **Evidence:** reproducible bug reports: steps, build, video, log.
- **Runs:** after every integration, the playtest bot on the current slice; nightly-equivalent (every N heartbeats), the full game.
- **Rule:** every bug becomes a ticket routed to the owning department. Blockers jump the board.

## Build

- **Model:** Sonnet.

- **Builds:** one-command build, headless CI, packaging for the target platform, crash capture, versioning.
- **Evidence:** a clean-checkout build log and a packaged build that launches.
- **Rule:** the Tech Spike milestone is mostly Build and Tech Art. No content ticket that goes into the engine starts before a clean one-command build exists. Pre-production documents (style bible, architecture, completeness list, bars) run in parallel.
