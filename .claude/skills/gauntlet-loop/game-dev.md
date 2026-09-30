# Gauntlet loops for games

Read this when the goal is a game, a game system, or anything built in a game engine. It changes how you pick the bar and what you add to the prompt. The template in `SKILL.md` stays the same.

## What is different about games

A game is played, not looked at. A screenshot shows the look but not the feel, and the agent running the loop has limits a human critic does not:

- **It cannot watch video or hear sound.** Video becomes frame strips or contact sheets (ffmpeg at a fixed frame rate). Sound becomes a waveform, a spectrogram and numbers (loudness, peak, onset times). If the agent has no way to judge a piece, the prompt says a human judges it.
- **It cannot play in real time.** Headless and software rendering often run at a few frames per second. Anything time-based - movement, combat, captures of fast effects - needs a way to step the game by a fixed number of frames with given inputs, independent of the real frame rate.
- **Engine builds are slow.** Pieces are judged on a small test map or scene, not a full packaged build every round.

So every piece needs a **capture method** that shows what matters about it, and the same method runs on the bar.

## Bars by piece

| Piece | Bar that works | How both sides are captured |
|---|---|---|
| Art direction, lighting, materials | A named shipped title, specific scenes | Screenshots at the same resolution, camera angle, time of day |
| Characters, props, weapons | A named title's asset, or its official art | Turntable renders at fixed angles and lighting, plus silhouettes |
| Movement, jumping, camera | Official gameplay footage of a named title | Frame strips of the same move; numbers measured from both: time to top speed, jump height and airtime, camera lag |
| Combat and hit feedback | Footage of a named title's combat | Frame-by-frame strips of one hit: anticipation, impact, hitstop, recovery frames |
| UI and HUD | Screenshots of a named title's HUD | Screenshots at the same resolution and game state |
| Level layout | A named level from a shipped title | Top-down captures or maps of both, same scale |
| Sound | A named title's sound for the same event | Waveform, spectrogram, loudness and timing - or a human listens |
| Performance | A frame budget, not a reference: 16.6 ms for 60 fps on named hardware | The engine's own frame-time and draw-call stats, same scene and load on every round |

Performance is almost always the measurable half for a game. Name the target frame rate and hardware in the prompt; the "a win only counts if everything that worked before still works" line then covers the budget too.

Bars have to be reachable with what the agent has. A hand-authored, rigged, textured character from a shipped game is not reachable with procedural primitives in an afternoon. If the user has no art pipeline or asset source, pick a bar for style and readability, not asset fidelity, or tell the user which pieces need assets.

## What to add to the prompt

Keep the template. Add only these, in plain sentences:

- **The engine and version**, if the user named them, and the test map or scene the loop works in.
- **How each kind of piece is captured**, in one sentence: "Capture stills with HighResShot from fixed cameras, movement as frame strips of the same scripted input on both, and feel as numbers."
- **The frame budget**, as the measurable half.
- **A stepping hook first**, when the game is real-time: "Before the first round, build a debug hook that steps the game N frames with given inputs, and use it for every capture and test."
- **Who judges what the agent cannot**, if a piece is sound-only or feel-only and no measurement fits: "I judge sound myself; list the sound pieces for me on the progress page."

## Engine notes

Check these against the engine version the project uses before relying on them.

**Unreal Engine 5**

- Run a map without the editor UI: `UnrealEditor <Project>.uproject <Map> -game -windowed -ResX=1920 -ResY=1080` (`UnrealEditor.exe` on Windows). Console commands at startup go in `-ExecCmds="..."`.
- Stills: the `HighResShot` console command, from fixed, named cameras; files land under `Saved/Screenshots/`.
- Footage: Movie Render Queue with a Level Sequence for a fixed camera path, then ffmpeg to frame strips.
- Performance: `stat unit` and `stat gpu`, or a trace opened in Unreal Insights.
- Headless editor scripting for imports, level setup and asset changes: `UnrealEditor-Cmd <Project>.uproject -run=pythonscript -script=<file>.py` with the Python Editor Script Plugin enabled.
- Tests: the Automation framework (`-ExecCmds="Automation RunTests <Filter>; Quit"`) and Functional Tests for gameplay.
- Agents edit C++, config `.ini` files and Python well, and binary Blueprint graphs poorly. Put systems the builder iterates on in C++ and tuning values in DataAssets or DataTables. If the project is Blueprint-heavy, say so in the prompt.
- Unreal's own test automation framework is also called Gauntlet. It is unrelated to this loop, though it can drive scripted play sessions for captures. If both appear in one prompt, say "Unreal's Gauntlet framework" for the engine one.

**Unity 6**

- Headless runs: `Unity -batchmode -projectPath . -executeMethod <Class.Method> -quit -logFile -`. Add `-nographics` only for runs that do not capture images.
- Stills: `ScreenCapture.CaptureScreenshot` from fixed cameras; footage with the Recorder package.
- Tests: Unity Test Framework, EditMode and PlayMode, via `-runTests`.

**Godot 4**

- `godot --headless` uses a dummy renderer and cannot capture images. Capture with rendering on (under Xvfb on a machine without a display).
- Stills: `get_viewport().get_texture().get_image().save_png(path)` from fixed cameras; footage with `--write-movie <file>` at a fixed frame rate.

**Web games (three.js, Babylon, Phaser)**

- Serve locally and drive with Playwright: scripted input, screenshots, video, and `performance` timings for frame time.

## Filled example

This is illustrative. Match its shape and length, not its wording.

User: "third-person movement for my Unreal 5 action game, it has to feel as good as the big ones."

Bars offered: A) Nathan Drake's traversal in Uncharted 4 B) Kratos' movement in God of War (2018) C) Aloy's movement in Horizon Forbidden West. User picks A.

```
Build third-person character movement in our Unreal Engine 5 project, on the TestMovement map. Players of big-budget action games should pick up the controller and feel no gap between them and the character: responsive starts and stops, weight on landings, a camera that never fights them.

The bar is Nathan Drake's traversal in Uncharted 4. Before the first round, pull frames from official gameplay footage for each move - start, stop, turn, sprint, jump, land, ledge grab - and measure time to top speed, stopping distance, jump height and airtime, and camera lag from those frames. Capture ours the same way: the same moves as frame strips from a fixed camera, using Movie Render Queue and ffmpeg, and the same numbers from the game. Compare against those captures and numbers, never against a description of how Uncharted feels. It also has to hold 60 fps on this machine in the TestMovement map, measured with stat unit.

Before the first round, build a debug hook that steps the game a fixed number of frames with given inputs, and use it for every capture and test. Keep movement code in C++ and tuning values in a DataAsset.

Break the work into the smallest pieces that can be improved and judged on their own, and give each builder its own files so parallel builders never edit the same thing. For each piece, fan out a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. The critic sees only the pair, the numbers, and the gaps already named for that piece. It picks A or B, points to the frames or numbers that decided it, and names the single biggest remaining gap.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If ours does not win, it goes back to the builder. If the same gap comes back three rounds running, change the approach instead of polishing the old one.

A win only counts if everything that worked before still works and the map still holds 60 fps. When every piece has won, capture a full traversal run of both and judge them the same way.

/loop on each piece until the critic picks ours blind.

Keep a live progress page updating as the work evolves so I can watch it: each round's pick, the gap named, the numbers, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```
