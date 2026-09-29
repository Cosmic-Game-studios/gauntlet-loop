# Engine adapters

The studio talks to every engine through the same eight verbs, so the Director, QA and the critics never improvise engine commands mid-run. The adapter is built (or copied from a template) and **proven in the Tech Spike**: every verb runs once, green, on the real project on the real machine, before any content ticket starts. If a verb fails there, fixing the adapter is the first ticket - everything downstream depends on it.

## The interface

Every verb is one command, prints one JSON object on stdout, exits non-zero on failure, and writes artifacts under `studio/adapter/<verb>/<timestamp>/`.

| Verb | Does | Returns (JSON) |
|---|---|---|
| `probe` | Detects engine, version, tools, rendering (GPU / software / none), what can be captured headlessly, available MCP servers the session lists | `{engine, version, gpu, can_render, can_capture, tools[], mcp[], notes[]}` |
| `build [target]` | Compiles the editor, game or server target | `{ok, target, errors, warnings, log}` |
| `test [filter]` | Runs automated tests (unit, functional, acceptance ids) | `{ok, passed[], failed[{id, reason}], report}` |
| `capture <scenario>` | Renders a scripted scenario deterministically: named cameras, stepped simulation, screens | `{ok, images[], sheet, errors}` |
| `perf <scenario>` | Measures a fixed load: frame time avg/p95, game/render/GPU thread, draw calls, memory, hitches | `{ok, frame_ms_avg, frame_ms_p95, draw_calls, memory_mb, hitches, raw}` |
| `step` | Not a command but a contract: the game's debug hook advances the simulation N fixed ticks, sets poses, spawns, shows any screen - used by capture, test and playtests | - |
| `package [config]` | Builds a shippable (and server, if multiplayer) package | `{ok, path, size_mb, log}` |
| `logs [since]` | Summarises errors, warnings, ensures, crashes since a point in time | `{errors[], warnings, ensures[], crashes[]}` |

Engine-wide operations (build, cook, package, anything that holds the editor or a shared cache) take a **named lock** (`studio/.locks/<name>`), so parallel builders queue instead of corrupting each other's state.

## Tools are not prescribed

The adapter fixes *what* the studio can ask of the engine, not *how* the agents make the game. Builders use whatever produces the best result and is available: the engine's own editor scripting, MCP servers connected to the session (for example an Unreal Editor or Blender MCP server), DCC tools, libraries, generators found by `probe`, or tools they install where the machine allows it. The templates and commands in this file are known-good starting points, not a whitelist. What is fixed: the engine the brief names, evidence captured through the adapter, and the model's real limits (`claude-code.md`).

**MCP servers** that control a running application (an Unreal Editor MCP server, a Blender MCP server) are powerful for authoring - placing and configuring actors, building materials, sculpting and rigging - and they are single shared resources: one editor, many builders. Their calls go through a lock per application (`editor`, `blender`), each builder's MCP session does one coherent change and saves, and the adapter's headless verbs (build, test, capture, perf, package) stay the source of truth for whether the result works.

## Unreal Engine

Template: `templates/unreal/crucible_ue.py` (Python 3, Windows/Linux/macOS), configured by `studio/adapter.json`:

```json
{ "ue_root": "C:/Program Files/Epic Games/UE_5.6", "uproject": "C:/Dev/MyGame/MyGame.uproject",
  "target": "MyGame", "platform": "Win64", "server_target": "MyGameServer",
  "capture_tests": "Project.Functional Tests.Capture", "test_filter": "Project",
  "perf_map": "/Game/Maps/PerfArena", "perf_frames": 900 }
```

What each verb uses:

- **probe** - `Engine/Build/Build.version`, the presence of `UnrealEditor-Cmd`, `RunUAT`, `Build.bat/.sh`, a GPU (`nvidia-smi` or the OS), Python in the editor, and whether rendering is possible (a GPU-less machine can build, cook and run `-NullRHI` tests, but not capture).
- **build** - `Engine/Build/BatchFiles/Build.bat|Build.sh <Target>Editor <Platform> Development -Project=<uproject> -WaitMutex`; errors and warnings are parsed from the output.
- **test** - `UnrealEditor-Cmd <uproject> -ExecCmds="Automation RunTests <filter>; Quit" -unattended -nopause -nosplash -NullRHI -ReportExportPath=<dir> -log`. Unit tests (Automation Spec / `IMPLEMENT_SIMPLE_AUTOMATION_TEST`) and **Functional Tests** (`AFunctionalTest` actors placed in test maps, found under `Project.Functional Tests.<Map>`) both run this way; results come from `<dir>/index.json`. Acceptance ids map to test names (`Project.Acceptance.A_01`).
- **capture** - **Screenshot functional tests** (`AScreenshotFunctionalTest` from the Functional Testing plugin) placed in capture maps at named camera positions, run with rendering on (no `-NullRHI`), fixed resolution and fixed frame rate (`-benchmark -fps=30` for fixed steps, plus the game's debug hook for poses and screens). Images are collected from `Saved/Automation/` and tiled into a contact sheet. Quick fallback: `HighResShot` via `-ExecCmds` on a capture map.
- **perf** - the game on `perf_map` with `-benchmark -fps=60 -csvCaptureFrames=<n>` (CSV profiler; output in `Saved/Profiling/CSV/`), parsed for frame, game-thread, render-thread and GPU times, draw calls and memory; for deeper dives `-trace=default -tracefile=<file>` for **Unreal Insights**. Budgets live in `BUDGETS.md`.
- **step** - a project-side contract the Tech Director defines in `ARCHITECTURE.md`: console commands or a `UCheatManager` extension such as `Crucible.Step N`, `Crucible.Pose <camera>`, `Crucible.Spawn <type> <x y z>`, `Crucible.Show <screen>`, `Crucible.PerfScenario <n>` (sets up the fixed perf load the `perf` verb measures), usable from `-ExecCmds`, functional tests and playtests. **Replays** (`DemoRec` / `DemoPlay`) record a playtest or bot session once and replay it for captures and bug reports.
- **package** - `RunUAT BuildCookRun -project=<uproject> -noP4 -platform=<Platform> -clientconfig=Shipping -build -cook -stage -pak -archive -archivedirectory=<dir> -unattended -utf8output`; for multiplayer also the server target (`-server -serverconfig=Development`, or a separate `-noclient` server build).
- **Dedicated-server tests** - start the packaged server on a test map, connect one or more `-game` clients to `127.0.0.1`, run a functional test or bot script, and check both logs for join, replication and disconnect errors; for larger multiplayer suites Epic's **Gauntlet** framework (`RunUAT RunUnreal -test=<Test> -build=<archive>`) runs and supervises multi-process tests.
- **logs** - `Saved/Logs/<Project>.log` and crash folders, parsed for `Error:`, `Warning:`, `Ensure condition failed`, `Fatal error`.

### Unreal needs isolation, not a shared checkout

Parallel builders editing different files in one checkout works for a small web game. In Unreal it does not: `.uasset`/`.umap` files are binary and cannot be merged, the Asset Registry and redirectors span packages, and `Intermediate/`, `Saved/` and the Derived Data Cache are shared state that a running editor holds open. So in Unreal:

- **Every builder works in its own isolated checkout** (a git worktree with Git LFS, or its own workspace in Perforce) with its own editor instance, if the machine can afford it; otherwise builders that need the editor are serialized through the `editor` lock.
- **Binary assets are locked before editing** (`git lfs lock` or Perforce checkout), and the file-owner table in `ARCHITECTURE.md` includes asset folders, not only code files.
- **Integration queue**: the Director merges one builder's branch at a time - merge, fix up redirectors, build, fast test subset, commit - then the next. A merge that breaks the build is reverted and returned to its builder with the log.
- **Shared engine operations take locks**: `build`, `cook`, `package`, `ddc` (a shared DDC path speeds up every checkout), `editor`, and any MCP server that controls an application.
- `Intermediate/`, `Saved/`, `DerivedDataCache/` and `Binaries/` stay out of version control.

## Godot 4 and Unity 6

Same verbs, written as a small script at Tech Spike:

- **Godot**: `godot --headless --path . --script` for tools; `--export-release` for package; GUT or gdUnit4 for test; capture with a real renderer (`--rendering-driver`, or Xvfb with software Vulkan/OpenGL) and `--write-movie` or viewport `save_png`; `--headless` alone uses a dummy renderer and cannot capture.
- **Unity**: `-batchmode -projectPath . -executeMethod` for build and tools; `-runTests -testPlatform PlayMode|EditMode` for test; capture via `ScreenCapture` or the Recorder package from a PlayMode test (without `-nographics` when rendering is needed); `-batchmode -nographics` only for non-rendering work; Profiler / `ProfilerRecorder` for perf.

## Web

`templates/web/`: `shot.mjs` (capture), `perf.mjs` (perf), `accept.mjs` + `check.mjs` (test), `blind.sh` (blind pairs), `lookdev.js` (renderer and style starter), `kickoff.sh` (all of it in one command); build and package are the project's bundler or a static copy; step is the game's debug hook.
