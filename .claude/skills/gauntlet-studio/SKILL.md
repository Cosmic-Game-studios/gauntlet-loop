---
name: gauntlet-studio
description: Turns a game idea into a fully autonomous, multi-agent game studio run. Interviews the user briefly, writes a Game Brief they approve or edit, then launches a Game Director that breaks the concept into tickets, routes them to departments (design, code, 3D/Blender, tech art, animation, audio, level, UI, QA), runs every ticket through a builder / verifier / blind-critic gauntlet against real shipped games, and drives milestones from tech spike to a shippable build in Unreal, Unity, Godot or web. Triggers on "/gauntlet-studio", "build a game", "make me a game", "game studio loop", "autonomous game dev".
---

# Gauntlet Studio

The gauntlet loop, scaled up to a whole game studio.

One user pitch goes in. A locked Game Brief comes out, then a Game Director runs a studio of agent departments until the game ships. Every piece of work - a mechanic, a mesh, a sound, a level - has to beat a real shipped game in a blind comparison before it is merged.

You have two jobs, in order:

1. **Intake** - turn the pitch into a Game Brief the user approves.
2. **Run** - become the Game Director and run the studio loop until Gold.

Do not skip intake. Do not ask for approval after intake. The brief is the only human gate.

## Phase 0 - Intake (the only time you talk to the user)

1. **Read the pitch.** Extract what is already there: genre, fantasy, engine, platform, art style, camera, scope, references.
2. **Ask only what is missing, max 5 questions, in one message.** Priority order:
   - Engine and target platform (Unreal 5 / Unity / Godot / web). Default if unanswered: Godot 4 for 2D and small 3D, Unreal 5 for high-fidelity 3D.
   - Scope: how long is one session, how long is the whole game (a 10-minute slice, a 1-hour game, a 10-hour game).
   - 2 or 3 games it should feel like. These become the bars.
   - Art direction in one line (stylised low-poly, realistic, pixel, cel-shaded...).
   - Anything non-negotiable (a mechanic, a platform, a deadline, a budget in tokens or money).
   If the pitch already answers everything, ask nothing.
3. **Write the Game Brief** using `references/brief-template.md`. One screen. Fill every field. Propose the bars yourself using the bar rules below; the user can swap them.
4. **Show it and stop.** End with exactly: `Say OK to start the studio, or tell me what to change.`
5. **Edit loop.** On any change request, rewrite the brief and show it again. On OK, lock it: write it to `studio/BRIEF.md` and never edit it again without the user.

## Phase 1+ - The studio run

On OK, read and follow, in this order:

- `references/director.md` - the Game Director's loop, the board, milestones, scope control.
- `references/departments.md` - every department's builder, its bar, its verifier, its critic.
- `references/gauntlet.md` - the per-ticket builder / verifier / critic protocol. This is the quality engine.
- `references/engines.md` - how agents drive Unreal, Unity, Godot, Blender and the web headlessly, and how they capture evidence for critics.
- `references/state.md` - the `studio/` folder that holds all memory, so the run survives context resets.

Start with `/loop` (self-paced) on the Director heartbeat, and use multi-agent orchestration (Workflow / ultracode or parallel subagents) for department fan-out. On agents without those features: "Keep looping the Director heartbeat until Gold. Run department builders and critics as parallel subagents with fresh context."

## Bar rules for games

A bar is a **named shipped game**, narrowed to the exact thing being judged, that the critic can actually **fetch** (official trailer, gameplay capture at a timestamp, store screenshots, a press-kit render, a GDC talk, a public repo) and **compare** blind.

- "Hades' dash feel, gameplay capture 0:40-1:10" works. "Good combat feel" does not.
- "A character from Hi-Fi Rush, press-kit render, front 3/4 view" works. "Stylised character" does not.
- Every department gets its own bar from the brief's reference games. Pick the hardest bar the agent can genuinely reach. Pair taste with a number wherever one exists (frame time, input latency, polycount, load time, time-to-first-fun).

## What breaks an autonomous studio

- **The Director building.** The Director plans, routes, merges and cuts. It never writes a ticket's output itself.
- **Critics judging descriptions.** Critics judge captured evidence - screenshots, turntables, video, logs, playtest traces - never the builder's summary.
- **Pieces that pass alone and fail together.** Integration is judged separately, every heartbeat, on a real build.
- **Scope creep.** Everything outside the brief goes to `studio/PARKING.md`. The Director cuts before it adds.
- **Lost memory.** Anything not written to `studio/` does not exist after a context reset.
- **Asking the user mid-run.** After OK, decide, log the decision in `studio/DECISIONS.md`, and keep going. The user watches the dashboard; they are not a dependency.
