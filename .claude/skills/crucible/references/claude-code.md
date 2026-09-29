# Running the studio in Claude Code

The studio is designed around what Claude Code actually provides. This file maps each part of the loop to a concrete mechanism, and states the model's real limits so the loop never depends on something that cannot happen.

## Setup (first heartbeat after the brief is locked)

The Director installs the studio into the game project before any ticket:

| Copy from the skill | To the game project | Why |
|---|---|---|
| the whole skill folder | `.claude/skills/crucible/` (if it is not already there) | `drive.sh` starts every heartbeat with "use the crucible skill"; a headless session only finds project or user skills. |
| `agents/*.md` | `.claude/agents/` | Subagent roles with their own model, tool allowlist and prompt. Skills cannot register subagents; they must live in `.claude/agents/`. |
| `templates/CLAUDE.md` | `CLAUDE.md` (append if one exists) | Every subagent inherits `CLAUDE.md`, so the studio's core rules reach all of them without repeating them in every prompt. |
| `templates/settings.json` | `.claude/settings.json` (merge the `hooks` key) | Hooks below. |
| `templates/hooks/*.sh` | `.claude/hooks/` | |
| `templates/drive.sh` | `tools/drive.sh` | Optional outer driver for multi-day unattended runs. |
| `templates/web/shot.mjs`, `accept.mjs`, `blind.sh` (web projects; write the equivalent for other engines) | `tools/` | Shared render tool with contact sheets, acceptance runner, blind A/B pair preparation. |
| role prompt bodies | `studio/prompts/<role>.md` | `mkdir -p studio/prompts && for f in .claude/skills/crucible/agents/*.md; do awk 'c>=2; /^---$/{c++}' "$f" > studio/prompts/$(basename "$f"); done` - dispatch briefs point to these files instead of pasting the role text. |

New subagent files are picked up when a session starts. If the current session does not list them, the Director continues in a fresh session (the hooks restore its state), or - as a fallback - uses the built-in general-purpose agent with the role file's body (everything below the `---` frontmatter) pasted as the start of the prompt.

**Worktrees are for conflicts, not ceremony.** `isolation: worktree` protects parallel builders that could touch the same files. When `ARCHITECTURE.md` gives every module a single owner and the wave's tickets touch disjoint files, builders may work in the main checkout and the Director commits after integration; when files overlap, use worktrees (or sequence the tickets).

## Roles as subagents

| Role | Subagent | Model | Tools | Notes |
|---|---|---|---|---|
| Game Director | the main session | Opus | all | Plans, routes, merges, decides. Never builds. |
| Art Director (lead) | `art-director` | `opus` | all except spawning agents | Style bible, look-dev scene, palette constants; later art-coherence reviews of whole builds. |
| Tech Director / Design Director (leads) | `studio-builder` with the lead's department brief | `opus` | all except spawning agents | Architecture contract; design numbers, tuning tables, UX flow. |
| Builder | `studio-builder` | `inherit`; the Director passes `model` per ticket from the routing table in `studio.md` (Opus for visual, spatial and feel work; Sonnet for implementation) | all except spawning agents | Works on the files its ticket owns. Worktree isolation only when files could overlap. |
| Art / UX / coach / judge / coherence critic | `experience-critic` | `opus` | `Read, Glob` | Read-only. `Read` opens images, which is how it sees evidence. |
| Code / architecture / audit critic | `code-critic` | `opus` | `Read, Grep, Glob, Bash`; `Edit, Write` disallowed | Can run tests and the profiler, cannot change code. |
| Playtester / first-time player | `playtester` | `sonnet` (opus at a release gate) | `Read, Glob, Bash`; `Edit, Write` disallowed | Plays through the step-play harness. |
| QA runs, clerk work | general-purpose | `haiku` | all | Running the acceptance suite and summarising, renaming evidence, dashboard. |

**Check that you can spawn agents - before the first ticket.** Blindness and fresh context depend on real, separate agents. The first real dispatch is the check (no separate trivial agent needed): if the `Agent` tool is present and the first builders return, spawning works. If the `Agent` tool is missing (for example because the Director itself runs as a subagent, and subagents may not be able to spawn further agents in some environments), **do not role-play builder and critics yourself** - that silently removes the fresh context and blindness the whole loop depends on. Use headless processes instead: run each builder or critic as `claude -p "<role file body + ticket prompt>" --model <model> --allowedTools <the role's tools> --output-format json` from Bash. Each is a real, separate Claude Code session with a fresh context; the JSON result reports tokens and cost for `STATUS.md`. If neither works, stop and tell the human - do not continue in a degraded mode.

**Who spawns whom.** Only the Director spawns builders and critics. A builder never spawns its own critic - that would let the builder choose its judge and see its reasoning. Nesting stays one level deep, well within Claude Code's subagent depth limit.

**Parallelism.** Independent tickets are dispatched as several `Agent` calls in a single message so they run concurrently; the Director is notified as each finishes. **In headless heartbeats (`drive.sh`, `claude -p`) dispatch them in the foreground** (`run_in_background: false`, still several calls in one message): the calls run in parallel and the heartbeat blocks until all return, so no subagent is killed when the session ends and no polling loop is needed. If the user has opted into multi-agent orchestration (the Workflow tool / `ultracode`), a whole milestone's ticket batch can run as one workflow; otherwise parallel `Agent` calls are the default.

## Context engineering with hooks

Compaction and restarts are the biggest threat to a week-long run. Two hooks make them harmless:

- **`SessionStart`** (matchers `startup|resume|clear|compact`) runs `studio-session-start.sh`, which prints `STATUS.md` and the open part of `TRACKER.md`. Claude Code injects that output into the context - so right after every compaction, the Director sees the true state from the files instead of a lossy summary of its own memory.
- **`PreCompact`** runs `studio-pre-compact.sh`, which commits `studio/` before compaction, so everything written so far is safe.

No `Stop` hook is used to keep the agent running: Claude Code caps consecutive Stop-hook blocks, and a blocked stop in a bad state loops. The heartbeat driver is the right tool for that.

## The heartbeat driver

Pick the first one that fits where the run lives:

1. **Unattended for days on your machine or a server: `tools/drive.sh`.** It runs `claude -p` once per heartbeat, each time as a **fresh session**. Files are the memory, so every heartbeat starts with a clean context - the best possible context engineering. On a failure (usage limit, network) it waits and retries. It stops by itself when `STATUS.md` says `WAITING FOR HUMAN` or `DONE`. Adjust `--permission-mode` to what you are comfortable with for unattended work.
2. **Claude Code on the web / cloud sessions:** a scheduled Routine (`/schedule`, or the scheduling tools available in the session) that fires "run the next heartbeat" into the session, or starts a fresh session per firing.
3. **Interactive CLI session:** `/loop` without an interval (self-paced). Note: a self-paced `/loop` is not restored on `--resume`; the `SessionStart` hook reminds the Director to restart it when `STATUS.md` says `RUNNING`.

At handoff the Director sets `WAITING FOR HUMAN`, which stops `drive.sh`, and cancels any Routine or loop it created.

**Getting back in after a handoff or question.** The human answers in any Claude Code session in the project (interactive, or `claude -p "<feedback>"`). Claude Code loads the skill; the `SessionStart` hook shows `WAITING FOR HUMAN` or `BLOCKED ON HUMAN`; the Director records the answer (`feedback/RC-<n>.md` or `DECISIONS.md`), sets `state: RUNNING`, and restarts the driver it was using - for `drive.sh`, it tells the human the one command to run (`bash tools/drive.sh`), or starts it in the background itself where the session allows long-running processes.

## Model limits the loop is built around

Claude models read text and images. They do **not**:

- **generate images, audio or video,**
- **hear audio** or **watch video** (only individual frames, as images).

So the studio never depends on those abilities:

| Need | How the studio does it |
|---|---|
| 3D models | Blender Python (`bpy`): procedural modelling, modifiers, geometry nodes; kit assets restyled; hero assets hand-built in script |
| Textures and materials | Blender shader nodes baked to images, procedural textures in code (noise, gradients, masks), kit textures recoloured to the palette |
| 2D art, UI, icons, logos | SVG written directly (a strength of the model), rasterised by script; pixel art via code |
| Concept and style frames | Blocked-out 3D scenes rendered in Blender with the target lighting and palette, plus reference images fetched from the bar games |
| Animation | Kit/retargeted animation, procedural animation (IK, springs, noise), keyframes set by script |
| Sound effects | Synthesis in code (e.g. Python with numpy/scipy, sfxr-style generators, layered noise and oscillators), CC0 libraries, processed by script |
| Music | Composition as MIDI (the model writes the notes), rendered with a soundfont or synth (e.g. fluidsynth); CC0 music as fallback |
| Voice | Only if a TTS tool is available; otherwise text and UI sounds, noted in `KNOWN_GAPS.md` |
| Seeing results | Renders, screenshots, frame strips (ffmpeg), spectrograms - all images the model can read |

If the machine probe finds an external generation tool (an MCP server or CLI for image, audio or 3D generation, with its key provided by the user at intake), departments may use it as a starting point. Its output still goes through the pipeline, validation and critics like everything else.

The weakest link is **audio taste**: no Claude model can hear the result. The studio controls what it can measure (loudness, timing, frequency balance, layering) and flags audio explicitly in `PLAY.md` so the human playtest covers it.
