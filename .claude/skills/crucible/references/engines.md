# Engines and tools

Agents cannot click through an editor, so everything is driven headlessly by command line and scripts. The Tech Spike milestone exists to prove every line below works on this machine before any content is made. If a tool is missing, the Director logs it and picks the closest working path; it does not fake the evidence.

## The evidence rule

Critics judge captures, never descriptions. Every pipeline must produce, with one command and no human:

- **Screenshots** from fixed, named cameras (same cameras every heartbeat, so progress is comparable).
- **Video** of a scripted run (input sequence file -> engine -> mp4), with an input trace and frame-time log.
- **Turntables** for assets.
- **Logs** for build, tests and runtime errors.
- **Critic-ready conversions** (`gauntlet.md` - What critics can perceive): frame strips / contact sheets from every video (ffmpeg, fixed fps), spectrogram + waveform images and LUFS/peak/onset data from every audio file, and the same conversion applied to the bar material in `studio/bars/`.

No GPU is not an automatic blocker: Blender renders with Cycles on CPU, Godot and web can render through software Vulkan/OpenGL (lavapipe/llvmpipe) under Xvfb, slowly. `godot --headless` alone uses a dummy renderer and **cannot** capture images. The probe in `MACHINE.md` records which path works.

Captures are written to `studio/evidence/<ticket-id>/round-<n>/`.

## Blender (one good option for 3D assets)

- Interactive through a Blender MCP server if one is connected (serialize through the `blender` lock), or headless: `blender -b [file.blend] -P script.py -- [args]` (Python API `bpy`).
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

## Making content: use the best tool available

Nothing here is a whitelist. Builders pick whatever gives the best result on this machine - the engine's own editor and scripting, MCP servers connected to the session (an Unreal Editor MCP server for placing, configuring and lighting; a Blender MCP server for modelling, sculpting, rigging and animation), DCC tools, libraries, asset kits, generation tools, or tools they install where the machine allows it. The only fixed points are the engine the brief names, evidence captured through the adapter, and what the model itself cannot do: generate or hear audio, generate images or video, or watch video (`claude-code.md`) - where a tool can do those things, use the tool.

Known-good options when nothing better is available:

- **Images and textures:** SVG rasterised by script, procedural textures (Pillow/numpy, shader or material nodes), Blender or in-engine renders; an image generator if one is connected.
- **Audio:** synthesis scripts, processing with `sox`/`ffmpeg`, MIDI rendered with a soundfont; an audio generator if one is connected.
- **3D and animation:** Blender (MCP server or `bpy`), the engine's modelling and animation tools, kit assets restyled to the style bible, image-to-3D generation as a starting point where available.

Whatever the tool, the output goes through the same validation, capture and critics.

## First tool of every project: deterministic stepping

Build this in the first heartbeat, before any capture or test: a debug hook that advances the simulation by N fixed steps with given inputs, independent of the real frame rate. Headless and software rendering run at a few frames per second; anything time-based (tests, captures, flashes that last one frame, auto-fire) is unreliable without it. Every test, capture script and playtester uses the stepped simulation.

## Shared tools for the web (from `templates/web/`)

- `tools/shot.mjs` - renders a scripted sequence (debug-hook calls, stepped simulation, real key presses and clicks) to PNGs plus one labelled contact sheet; run it under `flock` so renders do not starve the machine.
- `tools/accept.mjs` - runs `studio/acceptance.json` and updates each check's `passes`.
- `tools/blind.sh pair|reveal` - copies ours and the reference into an isolated neutral A/B pair in random order; the key stays behind the settings deny rule and only the Director reveals it.
- `tools/perf.mjs` - instruments WebGL and reports draw calls, triangles, frame rate and heap growth for menu, idle and a fixed combat load; run it in every review and keep the numbers within `BUDGETS.md`.

## Capture scripts (owned by Tech Art, built in Tech Spike)

Evidence is produced by scripts, never by the builder, so nobody can cherry-pick a flattering angle:

- `tools/capture.sh <ticket> <round>` - builds, runs the fixed cameras and scripted run, writes screenshots, frame strips and numbers to `studio/evidence/<ticket>/round-<n>/`.
- `tools/capture.sh <ticket> heldout` - the same with the held-out camera set, seeds and moments for the judge (`gauntlet.md`). Builders never see this set.
- `tools/audio_report.py <wav>` - spectrogram + waveform PNGs and a JSON of LUFS, peak, onsets, duration.
- `tools/strip.sh <video> <fps> <from> <to>` - frame strip / contact sheet PNG via ffmpeg.

## Step-play harness (for playtesters)

LLM agents cannot play in real time. The studio builds a turn-based harness during Tech Spike:

- Web: `tools/play.mjs` (from `templates/web/`) runs a step-play session in headless Chromium - real clicks and keys, the debug hook, filmstrips and zooms. Other engines: `tools/play_step --session <id> --input "<keys>" --frames <n>` advances the game deterministically by N frames with the given inputs, then writes a screenshot and a JSON state (position, health, objective, events).
- In Godot and web this is a debug mode in the game itself (paused tree / fixed timestep driven by the harness); in Unreal and Unity an automation/test hook that steps the world.
- The same harness drives the QA bot and the scripted runs for captures.

## Determinism

- Fixed random seeds for captures and playtest bots, so a critic compares like with like between rounds.
- Fixed cameras, fixed lighting rig, fixed resolution for all evidence.
- Every capture tagged with build hash and ticket round.
