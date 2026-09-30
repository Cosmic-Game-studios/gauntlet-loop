# Gauntlet loops for games

Read this when the goal is a game, a game system, or anything built in a game engine. The template in `SKILL.md` stays the same; this file changes how you pick the bar, the one question you ask, and what you add to the prompt.

## The question to ask with the bars

How good a game can look depends on what it may be built from. If the user has not said, ask it in the same message as the bar options, one line: which assets may be used - the engine's starter content, free libraries such as the free content on Fab for Unreal, their own art, or only what the agent makes itself. The answer goes into the prompt, and it decides how high the visual bar can reach.

The engine, its version and the platform come from the user. If they are missing, ask in that same line.

## What is different about games

A game is played, not looked at. A screenshot shows the look but not the feel, and the agent running the loop has limits a human critic does not:

- **It cannot watch video or hear sound.** Video becomes frame strips or contact sheets (ffmpeg at a fixed frame rate). Sound becomes a waveform, a spectrogram and numbers (loudness, peak, onset times). If the agent has no way to judge a piece, the prompt says a human judges it.
- **It cannot play in real time.** Headless and software rendering often run at a few frames per second. Anything time-based - movement, combat, captures of fast effects - needs a way to step the game by a fixed number of frames with given inputs, independent of the real frame rate.
- **Engine builds are slow.** Pieces are judged on a small test map or scene, not a full packaged build every round.

So every piece needs a **capture method** that shows what matters about it, and the same method runs on the bar.

## Complete means playable end to end

A game is complete when a player can launch it, understand what to do, play the whole loop from start to finish, win or lose, and start again - without help, and without hitting anything broken, missing or placeholder. The checklist holds everything the user described. The **playthrough** holds it together: a fresh agent plays from launch to the end through the stepping hook with scripted input, and every blocker it meets goes on the checklist.

A game also needs things players expect even when the user did not list them: a start screen, pause, a clear win and lose state, restart, readable feedback for every action, and sound for the important ones. These are the "more" the template allows. They never displace a described item, and they come after the described items work.

## Visual quality

Most of a game's look comes from a few decisions made early and held everywhere, so STYLE.md comes from the bar before anything is built:

- **Style:** palette, lighting mood, time of day, material vocabulary, silhouette rules, camera, UI style, and the visual language of effects.
- **Light and atmosphere:** these carry most of the visual lift. Key light direction, fog and atmosphere, colour grading and exposure do more than extra detail. Bloom and flashes stay restrained; a muzzle flash that whites out the centre of the screen on every shot has lost blind comparisons before.
- **Readability beats detail:** the player, enemies, pickups and hazards separate from the background by shape, value and colour at a glance.
- **Feedback:** a hit flash, particles, a small camera shake and a sound per important action - tuned to the bar's footage, not maxed out.
- **No default engine look in the final build:** default grey materials, the engine's default sky, unlit flat colours and the default font all read as unfinished to a player and to a blind critic. They are fine in the breadth-first rough version and gone by the end.

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

Performance is almost always the measurable half for a game. Name the target frame rate and hardware in the prompt; the regression line then covers the budget too.

Bars have to be reachable with what the agent may use. A hand-authored, rigged, textured character from a shipped game is not reachable with procedural primitives. If the assets answer rules out real art, pick a bar for style and readability, not asset fidelity, and say so in the prompt.

## What to add to the prompt

Keep the template. Add these, in plain sentences:

- **The engine, version and platform**, and the test map or scene the loop works in.
- **What may be used**, from the assets answer.
- **How each kind of piece is captured**, in one sentence: "Capture stills with HighResShot from fixed cameras, movement as frame strips of the same scripted input on both, and feel as numbers."
- **A stepping hook first**, when the game is real-time: "Before the first round, build a debug hook that steps the game a fixed number of frames with given inputs, and use it for every capture, test and playthrough."
- **The frame budget**, as the measurable half.
- **STYLE.md** from the bar, and the playthrough in the definition of done.
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

This is illustrative. Match its shape, not its wording.

User: "Top-down twin-stick shooter in Unreal Engine 5.4 for PC. Neon cyberpunk city at night, rain, wet reflections. The player has a dash and two weapons, a pistol and a shotgun. Three enemy types: a chaser, a shooter and an exploder. Waves with a score, and a boss after wave five. Main menu and a game over screen. It should look like Ruiner."

The user named the bar, so the skill only asks what may be used. Answer: "Unreal starter content and free Fab assets are fine."

```
Build a complete top-down twin-stick shooter in our Unreal Engine 5.4 project, for PC. Players who loved Ruiner should pick it up and feel at home within a minute: fast, brutal, readable, and beautiful in the rain.

Here is what I described, word for word. All of it is in scope and it is the minimum; add more wherever it makes the result better, never at the expense of something on this list.

"""
Top-down twin-stick shooter in Unreal Engine 5.4 for PC. Neon cyberpunk city at night, rain, wet reflections. The player has a dash and two weapons, a pistol and a shotgun. Three enemy types: a chaser, a shooter and an exploder. Waves with a score, and a boss after wave five. Main menu and a game over screen. It should look like Ruiner.
"""

Before building, turn my description into CHECKLIST.md: one numbered line for every single thing I asked for, each with how you will show it works - a capture, a test, a measurement or a scripted playthrough. Nothing is left off, merged away or quietly reinterpreted. Before anything else, build a debug hook that steps the game a fixed number of frames with given inputs, and use it for every capture, test and playthrough. Then build breadth first: a rough, working version of every checklist item, end to end, before any piece gets polished. The round budget below limits polish, never completeness. You may use Unreal starter content and free Fab assets; keep systems in C++ and tuning values in DataAssets.

The bar is Ruiner. Before the first round, pull frames from its official gameplay footage for each piece - the city at night, the player's movement and dash, each weapon firing and hitting, enemies, the HUD, a boss fight - and measure dash distance and duration, time to top speed and hit-stop length from those frames. Capture ours the same way from fixed cameras with HighResShot, movement and combat as frame strips of the same scripted input via Movie Render Queue and ffmpeg, and take the same numbers. Compare against those captures, never against a description of Ruiner. It also has to hold 60 fps on this machine in the heaviest wave, measured with stat unit. Write STYLE.md from the bar first - palette, neon and rain lighting, wet materials, silhouettes, camera, HUD, effects - and hold every builder to it. No default grey materials, default sky or default font survive into the final build.

Then break the work into the smallest pieces that can be improved and judged on their own, and give each builder its own files. For each piece, run a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. Every critic gets the same budget: one look at the pair, the numbers, and the gaps already named for that piece, and a reply of its pick, one or two sentences of evidence pointing at the frames or numbers that decided it, and at most three gaps, biggest first. The builder closes the biggest gap first and the others where it can without risk. Feel and timing are judged on the measurements against Ruiner's.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If the same gap comes back twice running, change the approach instead of polishing the old one.

Each piece gets up to six rounds, and up to ten while rounds still pay off: after round six, go on only if the last round made a visible or measurable gain. Commit after every round and undo any round that made things worse. A round only counts if every checklist item that passed before still passes and the game still holds 60 fps. When a piece wins blind or its rounds are spent, keep its best version and log what is still open. Then capture a full run - menu, waves one to five, the boss, game over - and judge it against Ruiner's footage the same way, for up to three rounds, sending each gap back to its piece.

Done means every checklist item passes with evidence you have seen yourself by running the game, not by reading the code; nothing in it is a placeholder, stub or TODO; a fresh agent has played from the main menu through the boss to game over and back with the stepping hook and met no blocker; and a fresh agent that has not seen the work has read my description line by line against the game and found nothing missing. If something cannot be done, say which and why instead of dropping it. Finish with DONE.md: the checklist with its evidence, what beat the bar, what is still open, and how to build and run it.

/loop on each piece until the critic picks ours blind or its rounds are spent.

Keep a live progress page updating as the work evolves so I can watch it: the checklist status, each round's pick, the gaps named, the numbers, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```
