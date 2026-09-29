# Playbooks: how to spend the time you have

The rituals are the same at every scale; what changes is how many cycles fit. Pick the playbook from the brief's wall-clock cap (or budget) in the first minute and write it into `MILESTONE.md`. Two rules hold in all of them:

- **A playable build is committed at all times** after the first production sprint. Every later sprint must leave it playable.
- **Use all of the time.** Hand off at the cap (minus the time the handoff itself needs), not when a gate is first met. Remaining time goes to the next review-fix cycle on the most visible gap.

## Under 20 minutes (blitz mode)

Everything from sprint mode applies, compressed, and **pipelined**: each piece goes to review the moment its builder returns, instead of waiting for a wave. Dispatch builders so their notifications reach you while you keep working (background with notifications, or foreground calls in one message if notifications are unavailable - check at minute 0).

| Minutes (15-min cap) | What happens |
|---|---|
| 0-1.5 | Web: `templates/web/kickoff.sh` (vendor, import map, module stubs, the look-dev, material and modelling starters, tools, prompts, studio files). Director writes brief, pillars, a short `ARCHITECTURE.md` (owners, hook, cross-module signatures), `BUDGETS.md` (the optimization budgets from `craft.md`) and `acceptance.json` ids including the craft and perf checks. |
| 1.5-7 | 7 builders at once, deadline dispatch + 5 min: gameplay core + controller + hook (Opus); Weapon & Prop Art + weapon feel + viewmodel animation (Opus); Character Art + Animation: enemy models, rigs and clips (Opus); Level Design + World Design: layout, landmarks, backdrop, set dressing (Opus, Art Director role - writes the style bible's look words first); Shaders & Rendering: material library, sky, lighting, post and quality levels, budgets (Opus); VFX (Opus); UI + audio + QA checks (Sonnet). Everyone builds on the starters from kickoff (`lookdev.js`, `materials.js`, `shapes.js`) from minute one; the Shaders builder owns and tunes them. |
| as each returns | Director integrates it, runs its acceptance ids, the perf probe, and its evidence set from `tools/review.json` (turntable, filmstrips, gameplay frames); for a visible piece, dispatch its coach immediately. Once most pieces are in (about minute 7-8), one **Visual QA inspector** (Opus) plays the integrated build for 3 minutes and returns ranked defects. |
| 7-12 | Fix builders launched per piece as each coach verdict or inspector defect list arrives (deadline + 3 min); code blockers and inspector defects first, then the coach's gap. Visual pieces get a second coach+fix if they return before minute 11. |
| 11-13.5 | Round 3 on the most visible piece (usually world or characters), re-check fix diffs against their blockers (Sonnet), final acceptance and perf run. |
| 13.5-15 | Commit, `KNOWN_GAPS.md`, `PLAY.md`, last contact sheet, `state: WAITING FOR HUMAN RC-1`. |

About 18-24 dispatches. Builders in blitz mode render at most twice per round.

Blitz rules that decide the result:
- **Dispatch at minute 1.5, not minute 4.** The Director writes only what builders cannot invent consistently: the owner table, the hook, the cross-module signatures, the palette and the three look words. Everything else goes into tickets.
- **Absolute paths and absolute deadlines** in every brief (`deadline 12:07 UTC`, `/abs/path/game/src/enemies.js`); builders check `date -u` before each render.
- **Visual pieces are Opus and get their craft sections through the pack** (`craft.md`: "The AAA look" plus the department's own sections - "World design", "Level design", "Character design", "Weapon design", "Shaders", "Animation", "Visual effects", "Stylised and comic rendering", "Optimization"), plus the one bar frame that matters for them.
- **An early return raises the ambition, it does not end the run.** Builders often return in 2-3 minutes: each one gets its coach and its next round at once. The handoff starts no earlier than the cap minus 2 minutes; if everything is green before that, the next action is another Visual QA pass and a fix round on the most visible piece.
- **The perf probe runs at every integration.** A piece that breaks `BUDGETS.md` goes back to its owner with the numbers before its next visual round - a beautiful frame at a third of the frame rate is a regression.
- **Size test steps to the machine**: measure the milliseconds per simulation step once at kickoff and keep every check under about 20 seconds; slow software rendering otherwise times the checks out.
- **The bar recipe is per question**: one capture command per question the coaches will ask (gameplay framing, enemy close-up, weapon in hand, HUD), written once by QA or the Director in minute 0-1.5 and reused by every coach, so no coach spends minutes getting the bar running.
- **Background notifications**: if the Agent tool can run builders in the background and notify on return, use it and integrate each return at once; otherwise dispatch each wave as parallel foreground calls in one message and plan one fewer fix round.

## Under 1 hour (sprint mode)

The Director runs as **one session** for the whole cap - reloading state every few minutes would cost more than it saves - and still writes through to `STATUS.md` and `TRACKER.md`, so a crash can resume. Leads are folded into builders (the look+arena builder *is* the Art Director for this run; the Director writes the contract itself). Every dispatch carries a **deadline** (`studio.md`), because a wave that waits for its slowest builder loses a whole review round.

Timeline for a 30-minute cap (scale proportionally):

| Minutes | Who | What |
|---|---|---|
| 0-4 | Director | Probe (one command); brief and pillars; `ARCHITECTURE.md` (below); engine vendored into the game (web: `three.module.js`, `three.core.js` and `examples/jsm` into `game/vendor/`, `game/index.html` with an import map for `three` and `three/addons/` - only the Director edits it); a no-op stub per module that exports its interface, so half-built modules never break another builder's render; shared constants/palette file; `acceptance.json` (ids and descriptions, owned by QA); role prompt files and `tools/` from the templates (`claude-code.md`). Commit. |
| 4-11.5 | 8 builders, parallel, deadline = dispatch time + 7.5 min | **Wave 1 ships the whole game at first-pass quality**, each builder replacing its own stubs. Opus: gameplay core + weapon feel (also owns the debug/test hook); Weapon & Prop Art (viewmodels, props); Character Art + Animation (enemies: models, rigs, clips; AI stays with gameplay); Level Design + World Design (Art Director role - give it `studio-builder.md` plus the kickoff items of `art-director.md`: style bible, layout, landmarks, backdrop); Shaders & Rendering (material library, sky, lighting, post, quality levels, budgets); VFX; HUD + all screens (UI is a hero ticket). Sonnet: audio, then QA tools - the check registry `tools/checks.mjs` for every acceptance id and a held-out suite in `studio/.qa-heldout/`, `tools/review.json` (the review capture script: gameplay frames in the bar's framing, an enemy lineup, every screen) and bar captures in comparable framing (at most 3 minutes on bars). Builders report errors in other owners' files instead of fixing them. |
| 11.5-13 | Director | Integrate, `tools/accept.mjs`, perf probe, `tools/shot.mjs` with `tools/review.json` and contact sheets, commit - the first playable build. |
| 13-15.5 | Review board, parallel, deadline in every prompt | Opus coaches for the look, the enemies, the HUD/screens (ux mode), each with its evidence set (turntables, filmstrips, gameplay frames); the Visual QA inspector playing the build (Opus, 25 commands); the Code critic (reads code and the acceptance results; launches no browser in sprint mode). |
| 15.5-20 | Fix builders, deadline = dispatch + 4 min | One gap each, plus the inspector defects in the builder's files (code blockers first, then defects, then the gap). In headless runs these are fresh foreground Agent calls with the ticket, the one gap and the file list - resumed agents may run in the background and cannot be awaited. |
| 19.5-26.5 | Review + fix, round 2 | Same shape, shorter: coaches on the three most visible pieces, the inspector again on the integrated build, resumed builders with deadline 26:00. If time allows, round 3 on the single weakest piece. |
| 26.5-28.5 | Sonnet re-check | Fix diffs of the last round re-checked against their blockers and the acceptance list; revert a fix that breaks a check. |
| 28.5-30 | Director | Final acceptance run, commit, `KNOWN_GAPS.md`, `PLAY.md`, the last contact sheet as the handoff preview, `STATUS.md` state line `state: WAITING FOR HUMAN RC-1`. |

**`ARCHITECTURE.md` in sprint mode** is short but complete: the file-owner table; the debug/test hook and its owner (if the brief or spec names a test hook, extend that one) with `step(n)` - fixed 1/60 s ticks that work while paused and render once - plus whatever the capture script needs (start, pose, spawn, show a given screen); and the signature of every cross-module call (rendering entry point, colliders and nav data, enemy raycast, player damage, audio event names). Input rules for web FPS games: pause only on pointer-lock loss or Escape; starting a run never requires pointer lock; test hooks never open menus.

About 20-24 dispatches, most of them Opus (visual work is where the game is judged). No judges, champions or playtesters in sprint mode - the coaches' verdicts and the acceptance list decide, and open gaps go to `KNOWN_GAPS.md`. If background-agent notifications work in the environment, a **pipeline per piece** (each piece goes to its next review as soon as its builder returns, instead of waiting for the wave) fits one or two more rounds; check that once at kickoff.

## 1-8 hours (vertical slice mode)

**Default: a pipeline per ticket, not waves.** Each ticket runs BUILD -> VERIFY -> REVIEW -> FIX on its own while other tickets are still building; the Director works as a scheduler - it dispatches builders and critics in the background, reacts to each return as it arrives, and keeps the number of agents in flight at the machine's limit. Nobody waits for the slowest builder. (Waves remain for headless sprint runs, where background agents cannot be awaited.) Milestone reviews still look at the integrated build as a whole.

Kickoff and foundation as above, then the pipelines run until the milestone gate: Tech Spike -> Vertical Slice -> Release Candidate. Held-out judges on every hero piece before it is WON. One polish pass on `DEBT.md` before the RC. Director may keep one session up to about two hours; after that, one fresh session per heartbeat (`context.md`).

## A day or more (full studio)

The full milestone ladder (`director.md`): Tech Spike -> Vertical Slice -> Content Alpha -> Beta -> Release Candidate -> human playtest, with a completeness pass at Tech Spike and Alpha, polish passes at Alpha and Beta, a fresh Director session per heartbeat and the heartbeat driver (`claude-code.md`).

## Keeping the machine healthy

Headless rendering is CPU-heavy, and a starved machine makes every builder slower. All renders go through the shared tool (`tools/shot.mjs` on the web): stepped simulation, a modest resolution (e.g. 960x540), and a lock so at most two renders run at once (`flock`). Builders take at most two or three renders per round (skip a render when the lock wait times out); review captures are taken once by the Director or QA and shared as contact sheets. Builders spend most of their time waiting for the model, not the CPU, so the number of parallel builders is not bound to the core count - the render lock is what protects the machine. Seven or eight builders work on a 4-core machine; add more only when renders are not queuing.

## Completion goal

Where Claude Code's `/goal` command is available in an interactive session, the Director can set the release condition as the goal ("acceptance.json all pass, handoff written, STATUS is WAITING FOR HUMAN"), so the session keeps working until it is met. In headless runs the driver plays that role.
