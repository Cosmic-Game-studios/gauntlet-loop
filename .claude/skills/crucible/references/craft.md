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
- **Look-dev scene.** The Art Director builds a small in-engine scene (one corner of the level, one of each enemy, the weapon) with the final renderer settings. It becomes the internal bar that every art ticket is compared with, and it exists before production starts.

## Tech art defaults (Tech Art)

General: correct colour management, a filmic tone mapper, image-based ambient light, a small post chain, tight shadows, and a quality setting so it scales.

**Web / three.js** (all of this ships inside the `three` package, so it is not an extra dependency):
- `renderer.outputColorSpace = THREE.SRGBColorSpace`; `renderer.toneMapping = THREE.ACESFilmicToneMapping` (or `AgXToneMapping`), exposure tuned on the look-dev scene.
- Image-based light without assets: `scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture` (`three/examples/jsm/environments/RoomEnvironment.js`). This alone lifts standard materials out of the "flat" look.
- Post: `EffectComposer` -> `RenderPass` -> `UnrealBloomPass` (threshold high enough that only emissives and flashes bloom) -> `OutputPass`; add `SMAAPass` or FXAA for edges. Optional `VignetteShader` / colour correction. Keep a low-quality path without post for weak machines.
- Shadows: `PCFSoftShadowMap`, one shadow-casting directional light with a tight shadow camera around the play space, sensible `shadow.bias`/`normalBias`.
- Fog: `THREE.Fog` or `FogExp2` matched to the sky colour.
- First-person viewmodel: its own scene and camera (narrower FOV than the world camera), rendered after the world with a depth clear, with its own lights so it never renders unlit.
- Performance: merge static level geometry (`BufferGeometryUtils.mergeGeometries`) or use `InstancedMesh`; share materials; pool particles, tracers, decals; no allocations in the frame loop.

**Godot / Unity / Unreal**: the same intent with the engine's tools - Environment + WorldEnvironment tonemap/glow (Godot), URP/HDRP volume with tonemapping and bloom (Unity), post-process volume with Lumen (Unreal).

**Effects must be visible at the capture frame rate.** Flashes, hit sparks and hit markers last a minimum number of *rendered* frames (e.g. 2-3), not a fixed number of milliseconds, or they vanish at low frame rates and in captures.

## Game feel (Design Director, Gameplay Engineering)

Numbers live in tuning tables; the Design Director sets them from the bar where possible.

- **Response.** Input acts on the next simulation step; no dead frames at the start of moves or shots.
- **Movement.** Acceleration and deceleration curves rather than instant velocity; air control; coyote time and jump buffering in platformers; head bob and FOV kick on sprint kept subtle.
- **Shooting.** Recoil that kicks and **recovers**; spread that blooms and settles; a trigger latch for semi-automatic weapons; a muzzle flash, tracer or impact, and a hit marker on every hit; a distinct kill confirmation; weapon switch and reload animations with readable timing.
- **Impact.** Enemies react on hit (flinch, knockback, hit flash), die visibly, and the player feels damage (directional indicator, screen edge, sound).
- **Juice, in moderation.** Small screen shake on big events, a few frames of hit-stop on kills, particles on impacts. Never enough to hurt readability.
- **Hitboxes match what the player sees.** Enemies are hittable where the crosshair naturally rests; check that enemy height and the player's eye height make a level shot hit.

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
