# Engines and tools

Agents cannot click through an editor, so everything is driven headlessly by command line and scripts. The Tech Spike milestone exists to prove every line below works on this machine before any content is made. If a tool is missing, the Director logs it and picks the closest working path; it does not fake the evidence.

## The evidence rule

Critics judge captures, never descriptions. Every pipeline must produce, with one command and no human:

- **Screenshots** from fixed, named cameras (same cameras every heartbeat, so progress is comparable).
- **Video** of a scripted run (input sequence file -> engine -> mp4), with an input trace and frame-time log.
- **Turntables** for assets.
- **Logs** for build, tests and runtime errors.

Captures are written to `studio/evidence/<ticket-id>/round-<n>/`.

## Blender (all 3D assets)

- Run: `blender -b [file.blend] -P script.py -- [args]` (background mode, Python API `bpy`).
- Assets are built **as scripts** where possible (procedural modelling, modifiers, geometry nodes), so a critic's GAP can be applied by editing code, and every asset is reproducible.
- Standard scripts the Tech Art department writes during Tech Spike:
  - `validate.py` - scale, transforms, normals, polycount, UVs, naming.
  - `turntable.py` - 8-angle render, fixed three-point light, neutral grey background, plus black-fill silhouette.
  - `export.py` - glTF 2.0 (Godot, web) or FBX (Unreal, Unity) with the engine's axis and scale presets, LODs included.
- Textures: bake in Blender, or generate and then correct to the style bible palette.

## Unreal Engine 5

- Headless editor: `UnrealEditor-Cmd <Project>.uproject -run=pythonscript -script=script.py` (Python Editor Script Plugin enabled) for imports, level building, asset setup.
- Build and package: `RunUAT BuildCookRun -project=... -platform=... -clientconfig=Shipping -build -cook -stage -pak -archive`.
- Tests: Automation framework (`-ExecCmds="Automation RunTests <Filter>; Quit"`), Functional Tests for gameplay, and Unreal's Gauntlet automation framework for scripted play sessions.
- Capture: `HighResShot` from named CineCamera actors, Movie Render Queue for video, `stat unit` / Unreal Insights for perf.
- Input bot: a test Blueprint/C++ component that replays an input sequence file.
- Gameplay code in C++ for systems, Blueprints only for designer-tunable glue; tuning values in DataTables/DataAssets.

## Unity 6

- Headless: `Unity -batchmode -nographics -projectPath . -executeMethod Build.Run -quit -logFile -`.
- Tests: Unity Test Framework (EditMode + PlayMode) via `-runTests -testPlatform PlayMode`.
- Imports and scene setup via editor scripts (`AssetPostprocessor`, `[MenuItem]` methods called by `-executeMethod`).
- Capture: `ScreenCapture.CaptureScreenshot` from named cameras, Recorder package for video, Profiler for perf.
- Tuning values in ScriptableObjects.

## Godot 4

- Headless: `godot --headless --path . --script res://tools/x.gd` for tools; `godot --headless --export-release <preset> build/game`.
- Tests: GUT or gdUnit4 from command line.
- Capture: `get_viewport().get_texture().get_image().save_png()` from named Camera3D nodes; `--write-movie out.avi` with a fixed FPS for deterministic video.
- Assets: glTF from Blender imported directly; import presets in `.import` files.
- Tuning values in Resources (`.tres`).

## Web (three.js / Babylon / Phaser)

- Build with the bundler, serve locally, drive with Playwright (Chromium preinstalled): scripted inputs, screenshots, video recording, `performance` timings.
- Assets as glTF from Blender.

## Generative tools

Use them where available, never as the final word:

- **Image generation** for concepts, style frames, texture bases, UI art - always corrected against the style bible and judged in-engine.
- **Audio / music generation or synthesis** for SFX and music - always judged in context over gameplay video.
- **3D generation** (image-to-mesh) only as a blockout starting point; the result still goes through the Blender pipeline, retopology and validation.

## Determinism

- Fixed random seeds for captures and playtest bots, so a critic compares like with like between rounds.
- Fixed cameras, fixed lighting rig, fixed resolution for all evidence.
- Every capture tagged with build hash and ticket round.
