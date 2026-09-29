# Playbooks: how to spend the time you have

The rituals are the same at every scale; what changes is how many cycles fit. Pick the playbook from the brief's wall-clock cap (or budget) in the first minute and write it into `MILESTONE.md`. Two rules hold in all of them:

- **A playable build is committed at all times** after the first production sprint. Every later sprint must leave it playable.
- **Use all of the time.** Hand off at the cap (minus the time the handoff itself needs), not when a gate is first met. Remaining time goes to the next review-fix cycle on the most visible gap.

## Under 1 hour (sprint mode)

The Director runs as **one session** for the whole cap - reloading state every few minutes would waste the time it saves. It still writes through to `STATUS.md` and `TRACKER.md`, so a crash can resume. Dispatch every wave as parallel foreground `Agent` calls in one message, so the Director waits for all of them without polling.

Percentages of the cap (for 30 minutes: 1 % = 18 s):

| Phase | Share | What happens |
|---|---|---|
| **Kickoff** | 0-8 % | Director: probe (one command), brief, pillars, `ARCHITECTURE.md` contract (module files, one owner each, interfaces, shared constants file), `TRACKER.md`, `acceptance.json` from the spec. Keep each file short; they are working documents. |
| **Foundation wave** | 8-35 % | In parallel: **Lead engineer** (Opus) - runnable skeleton that imports every module file of the contract (stubs allowed) plus the deterministic step hook; **Art Director** (Opus) - `STYLE_BIBLE.md` plus the look-dev module (renderer, lights, environment, post, palette constants; `craft.md`); **Design Director** (Opus) - feel numbers and tuning tables as a data module; **QA/Tools** (Sonnet) - acceptance runner, capture script (same framing as the bar), bar captures into `studio/bars/`; **Audio** (Sonnet) - the audio module against its interface. |
| **Production wave** | 35-60 % | One builder per department module, all in parallel, against the style bible and contract: level/arena, player controller and feel, weapons/viewmodel/VFX, enemy models and animation, enemy AI, HUD/menus/UX, audio polish. Opus/Sonnet per `studio.md`. The Director integrates and runs the acceptance suite as they return. |
| **Review** | 60-68 % | In parallel on the integrated build: art critic (coach, per visible piece, vs bar and look-dev target), UX critic, code critic, playtester, acceptance suite. Director writes one gap per department. |
| **Fix wave** | 68-85 % | Resume the same builders with their one gap each (parallel). |
| **Review + fix, round 2** | 85-95 % | A short second cycle on the pieces the player sees most: weapons feel, enemy readability, HUD, the first view of the level. Code blockers first. |
| **Handoff** | 95-100 % | Final acceptance run, commit, `KNOWN_GAPS.md`, `PLAY.md`, `STATUS.md` = `WAITING FOR HUMAN`. |

In sprint mode the held-out judge runs only if a review cycle ends with time to spare; otherwise the latest coach verdicts decide, and the gaps are listed in `KNOWN_GAPS.md`. Hero pieces get as many review-fix rounds as fit, up to the round budget.

## 1-8 hours (vertical slice mode)

Kickoff and foundation as above, then repeated **production sprint -> review -> fix sprint** cycles: Tech Spike -> Vertical Slice -> Release Candidate. Held-out judges on every hero piece before it is WON. One polish pass on `DEBT.md` before the RC. Director may keep one session up to about two hours; after that, one fresh session per heartbeat (`context.md`).

## A day or more (full studio)

The full milestone ladder (`director.md`): Tech Spike -> Vertical Slice -> Content Alpha -> Beta -> Release Candidate -> human playtest, with a completeness pass at Tech Spike and Alpha, polish passes at Alpha and Beta, a fresh Director session per heartbeat and the heartbeat driver (`claude-code.md`).

## Keeping the machine healthy

Headless rendering is CPU-heavy. Builders render and look at their own work, but the capture runs for reviews are done once by QA per review and shared, not by every critic. On a small machine, cap simultaneous headless browsers at about the number of CPU cores; builders queue their captures if needed.

## Completion goal

Where Claude Code's `/goal` command is available in an interactive session, the Director can set the release condition as the goal ("acceptance.json all pass, handoff written, STATUS is WAITING FOR HUMAN"), so the session keeps working until it is met. In headless runs the driver plays that role.
