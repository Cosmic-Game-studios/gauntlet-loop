# Craft: the defaults that make a game look and feel good

Critics find gaps; craft knowledge closes them faster. These are the studio's defaults - every builder in the named department gets its section in the dispatch brief, and every critic may cite them. They are starting points that a style bible can override with a reason, not rules to tick off.

The first Arena benchmark showed what happens without them: flat greybox lighting, enemies camouflaged in the level's palette, HUDs that were bare floating text, recoil that never recovered, and muzzle flashes that lasted less than one rendered frame.

## Art direction (Art Director, all art departments)

- **Value structure first.** Decide three value bands (dark, mid, light) and assign them: environment mostly mid, sky/background one band away, threats and interactables in their own band. Check it by desaturating a capture - if you cannot find the enemies in greyscale, readability fails.
- **Palette with a job for every colour.** Roughly 60 % environment base, 30 % secondary, 10 % accent. Threats get a hue family the environment does not use (complementary if possible), plus emissive or rim light so they read in shadow. Player-friendly things (pickups, UI highlights) get a third, distinct family.
- **Silhouettes.** Every enemy type has a distinct silhouette at game camera distance (size, posture, one exaggerated feature). Check black-fill silhouettes.
- **Landmarks and composition.** Every play space has at least one landmark visible from most places, lanes or sightlines that lead the eye, and height variation. Avoid symmetric empty boxes.
- **Materials.** At least three surface types that differ in roughness and pattern (floor, walls, props, trim). Procedural detail beats flat colour: noise, panel lines, edge wear, decals, emissive trim. No untextured default grey.
- **Lighting.** Key light with shadows, soft fill (hemisphere or environment), and accent lights placed to lead the eye. Fog or atmospheric falloff for depth. One colour temperature contrast (warm key vs cool fill, or the reverse).
- **Style that fits how the assets are made.** When every asset is built in code (primitives, procedural geometry), pick a style where that looks intended: flat or faceted low-poly, bevelled edges, strong silhouettes, emissive trim, clean colour blocking - not a realistic style that makes primitives look unfinished. Characters built from primitives still get a clear head, a readable pose and at least one exaggerated feature.
- **Look-dev scene.** The Art Director builds a small in-engine scene (one corner of the level, one of each enemy, the weapon) with the final renderer settings. It becomes the internal bar that every art ticket is compared with, and it exists before production starts.

## Tech art defaults (Tech Art)

General: correct colour management, a filmic tone mapper, image-based ambient light, a small post chain, tight shadows, and a quality setting so it scales.

**Web / three.js** (all of this ships inside the `three` package, so it is not an extra dependency; `templates/web/lookdev.js`, copied into the game at kickoff, implements the renderer, post chain, toon ramp, ink outlines, merge-by-material and canvas textures as a tested starting point):
- `renderer.outputColorSpace = THREE.SRGBColorSpace`; `renderer.toneMapping = THREE.ACESFilmicToneMapping` (or `AgXToneMapping`), exposure tuned on the look-dev scene.
- Image-based light without assets: `scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture` (`three/examples/jsm/environments/RoomEnvironment.js`). This alone lifts standard materials out of the "flat" look.
- Post: `EffectComposer` -> `RenderPass` -> `UnrealBloomPass` at half resolution (threshold high enough that only emissives and flashes bloom) -> `OutputPass`; FXAA (cheaper) or SMAA for edges; optional vignette / colour correction. Post costs little on a GPU but a lot under software rendering - keep the chain short and offer a quality setting rather than silently downgrading.
- Shadows: `PCFSoftShadowMap`, one shadow-casting directional light with a tight shadow camera around the play space, sensible `shadow.bias`/`normalBias`.
- Fog: `THREE.Fog` or `FogExp2` matched to the sky colour.
- First-person viewmodel: its own scene and camera (narrower FOV than the world camera), rendered after the world with a depth clear, with its own lights so it never renders unlit.
- Performance: merge static level geometry (`BufferGeometryUtils.mergeGeometries`) or use `InstancedMesh`; share materials; pool particles, tracers, decals; no allocations in the frame loop. **Characters too:** a creature built from 20 primitives costs 20 draw calls (and 20 more for shadows) - merge each character's static parts per material, or instance per enemy type, so draw calls do not grow with enemy count.
- **Budgets, measured every review** with `tools/perf.mjs` (draw calls and triangles per frame, frame rate, heap growth) under a fixed load, recorded in `BUDGETS.md`. In the first benchmark the three games ranged from 17 to 630 draw calls for the same content; the difference was entirely in merging and instancing.

**Godot / Unity / Unreal**: the same intent with the engine's tools - Environment + WorldEnvironment tonemap/glow (Godot), URP/HDRP volume with tonemapping and bloom (Unity), post-process volume with Lumen (Unreal).

**Effects must be visible at the capture frame rate.** Flashes, hit sparks and hit markers last a minimum number of *rendered* frames (e.g. 2-3), not a fixed number of milliseconds, or they vanish at low frame rates and in captures.

## 3D models built in code (Character Art, Environment Art)

When assets are authored in code or through a DCC tool driven by script, the difference between "greybox" and "finished" is craft, not polycount:

- **Shape language first.** Block the silhouette from a few big forms, then add medium forms, then small details - never start with details. Each character has one exaggerated feature (oversized shoulder, visor, claw, backpack) that reads at game distance.
- **Real geometry, not boxes.** Bevelled edges (`RoundedBoxGeometry`, chamfered custom geometry), extrusions of 2D profiles (`ExtrudeGeometry` with bevel), lathed profiles (`LatheGeometry`) for barrels, helmets and limbs, tubes along curves for cables and pipes, smooth normals where surfaces should read as soft. Panel lines, bolts, vents and trims as small geometry or normal detail.
- **Detail without cost.** Build a model from many parts, then merge static parts per material (`BufferGeometryUtils.mergeGeometries`) - one draw call per material per model - and instance repeated models. Keep a per-type triangle budget in `BUDGETS.md` (e.g. hero character 5-15k, standard enemy 2-6k, prop < 1k on the web).
- **Surfaces that look painted, not flat.** Procedural textures in canvas or shaders: base colour with large-scale variation, edge highlights, cavity/grime darkening, wear on edges, a few decals (stencils, numbers, warning stripes). Vertex colours for cheap gradients and ambient occlusion baked per vertex.
- **Check the turntable.** Every hero model is rendered from 8 angles at game distance and close up, plus a black silhouette, before it is merged into the game.

## Animation (Animation department)

- **Rigs, not wobbling boxes.** A bone hierarchy (`THREE.Bone`/`Skeleton` with a `SkinnedMesh`, or a clean hierarchy of pivoted parts for mechanical characters), with pivots at real joints.
- **Clips and a state machine.** Keyframed clips (`AnimationClip` + `AnimationMixer`) for idle, locomotion, attack windup/strike/recover, hit reaction, death; cross-fades between states driven by gameplay; root motion or speed-matched locomotion so feet do not slide.
- **Principles you can see in stills.** Clear key poses, anticipation before big actions, follow-through and overlap after them, arcs instead of straight lines, ease-in/out spacing, weight shifts. Telegraph every enemy attack with a readable windup pose.
- **Secondary motion.** Springs and damped oscillators for antennae, cables, cloth strips, weapon sway; procedural additive layers (breathing, head look-at, recoil).
- **First-person weapons.** Idle sway, movement bob, a recoil spring (kick + recovery), reload with a readable sequence (mag out, mag in, charge), switch animation - timed to the gameplay numbers.

## Visual effects (VFX department)

- **Layered effects.** A muzzle flash is a short core, a few sparks, a brief light and smoke; an impact is a flash, sparks, a decal and dust; an explosion adds a shockwave and debris. Particles via instanced meshes or `Points` with custom shaders, additive or premultiplied blending, texture atlases drawn in canvas.
- **Effects serve readability, never hide it.** No effect may cover the crosshair region or wash out the target: cap flash size and brightness, keep bloom thresholds above gameplay colours, cap post-exposure. The first benchmark round's weakest visual score came from a muzzle flash plus bloom that blanked the screen centre on every shot.
- **Feedback effects.** Hit sparks in the target's colour, floating damage numbers (style-matched, critical hits bigger), hit markers, dissolve or break-apart deaths, shield hit ripples.
- **Visible at every frame rate.** Minimum lifetime in rendered frames, and every effect advances on the simulation clock (the hook's `step`), never on wall-clock timers - so a paused game freezes effects and a capture of "fire, step 1, shot" shows the flash, the tracer and the impact exactly as a player sees them in that frame. Effects that run on `setTimeout` or `performance.now()` vanish from captures and cannot be reviewed.

## Stylised and comic rendering (Art Director, Tech Art)

- **Cel shading** with a 2-4 band ramp (`MeshToonMaterial` with a gradient map, or a custom lighting ramp), consistent across characters and world.
- **Ink outlines**: inverted-hull outlines per mesh (cheap, controllable thickness) or a screen-space edge pass on depth/normals; thicker outlines on characters than on the world, so they pop.
- **Comic surface detail**: hand-drawn-looking hatching or halftone in shadows, bold flat colour areas, strong rim light, painted gradients on the sky.
- **Stylised is not simple.** A comic style still needs value structure, readable silhouettes, material separation and lighting mood - it only draws them with fewer, bolder strokes.

## Visual QA checklist (Visual QA inspector, every visual builder before returning)

What makes a 3D game look unfinished, in the order players notice it:
- **Characters:** T-pose or bind pose visible at any moment; feet sliding or floating; limbs intersecting the body; rigid parts that should bend; no windup before an attack; death that pops out instead of playing; outline hull cracked at seams or missing on some parts.
- **Weapons and effects:** flash or bloom covering the crosshair or the target; tracers from the wrong point; impacts missing on some surfaces; effects that never clean up or freeze; damage numbers unreadable against the background; viewmodel clipping into the camera or walls.
- **World:** props floating or sunk into the floor; seams and holes; z-fighting; stretched or blurry textures; repeating tiles visible at a glance; empty or flat sky; flat, shadowless or over-dark lighting; everything in one value band.
- **Readability:** enemies that share hue and value with the level; pickups invisible from mid range; the player's eye pulled to decoration instead of threats.
- **UI:** text overflowing or overlapping; HUD elements covering the action; screens in a different style than the game; unreadable at the target resolution.

Every visual builder runs its own piece through this list with `tools/play.mjs` or its evidence set before returning; the inspector checks the whole build.

## Game feel (Design Director, Gameplay Engineering)

Numbers live in tuning tables; the Design Director sets them from the bar where possible.

- **Response.** Input acts on the next simulation step; no dead frames at the start of moves or shots.
- **Correct at any frame rate.** A fixed-step simulation catches up with enough substeps (cap only against spirals, e.g. 0.25 s per frame), input edges (press, release, click) are queued and consumed by the fixed step so none is dropped, and automatic fire can emit several shots in one frame to keep its rate. In the second Arena benchmark the best-looking game lost on playability because at low frame rates its movement lagged and trigger pulls were swallowed; the simplest-looking game won controls because it caught up correctly. Make it an acceptance check at a throttled frame rate.
- **Budget the look against the frame rate.** Post-processing and heavy shading are paid for in responsiveness on weak machines: measure `perf` with the full look, keep a quality setting, and default to the setting that holds the target frame rate on the reference machine.
- **Movement.** Acceleration and deceleration curves rather than instant velocity; air control; coyote time and jump buffering in platformers; head bob and FOV kick on sprint kept subtle.
- **Shooting.** Recoil that kicks and **recovers**; spread that blooms and settles; a trigger latch for semi-automatic weapons; a muzzle flash, tracer or impact, and a hit marker on every hit; a distinct kill confirmation; weapon switch and reload animations with readable timing.
- **Impact.** Enemies react on hit (flinch, knockback, hit flash), die visibly, and the player feels damage (directional indicator, screen edge, sound).
- **Juice, in moderation.** Small screen shake on big events, a few frames of hit-stop on kills, particles on impacts. Never enough to hurt readability.
- **Hitboxes match what the player sees.** Enemies are hittable where the crosshair naturally rests: a level shot from standing eye height must hit a standing enemy at mid range. Make this an acceptance check - the first benchmark's enemies were shorter than the eye line, so level shots flew over them.

## UI and UX (UI/UX department, UX critic)

- **A design system, not ad-hoc elements.** One set of CSS variables or theme tokens: two fonts at most (a display face for titles, a clean face for numbers), a spacing scale, one panel style, one accent colour tied to the palette. Every screen (menu, HUD, pause, settings, game over, victory) uses it.
- **HUD hierarchy.** The crosshair and threats first, health and ammo second, everything else quiet. Numbers big and tabular; labels small. Safe margins from screen edges. Readable at 720p.
- **Menus.** Clear primary action, keyboard and mouse navigation with visible focus and hover states, short transitions (about 120-200 ms), key hints on the main menu, settings that apply live and persist.
- **Flow.** Start playing within two clicks; pause on focus loss; restart from game over in one click; state texts always true (the wave number, "get ready" only between waves).
- **Onboarding.** The first 30 seconds teach the controls through the level or short prompts, not a wall of text.
- **Icons without asset files:** inline SVG.

## Audio (Audio department)

Clear hierarchy in the mix: the player's weapon and hits loudest, threats audible and directional, ambience low. Every player action has a sound; repeated sounds get small random pitch and volume variation. A voice limit with priority so important cues are never dropped. Master volume applies live. (No Claude model can hear the result; the mix is checked with loudness numbers and left to the human playtest for taste - `claude-code.md`.)

## Genre checklists

Used by the completeness pass (`director.md`). Extend per project.

- **First-person shooter:** recoil recovery, semi-auto latch, ADS or zoom if the genre expects it, crosshair that reflects spread, hit and kill markers, reload cancel, directional damage, enemy telegraphs before attacks, sensitivity and FOV settings.
- **Platformer:** coyote time, jump buffer, variable jump height, clear ledge readability, checkpoints, camera look-ahead.
- **Action / melee:** anticipation frames, hit-stop, invulnerability windows, readable enemy tells, animation cancel rules.
- **Strategy / management:** readable state at a glance, undo or confirm on costly actions, tooltips, time controls.
