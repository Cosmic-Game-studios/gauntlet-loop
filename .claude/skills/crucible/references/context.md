# Context engineering

A game takes days to weeks. No context window survives that, and compaction silently drops details. So the studio treats context as a cache and files as the truth:

> **If it matters, it is in a file. If it is only in context, it is already lost.**

Three rules follow from that, and every agent in the studio obeys them.

## Rule 1 - Files are the memory, context is a scratchpad

Everything important lives in `studio/` (see `state.md`), written the moment it happens, not at the end of a heartbeat:

| What | Where | Written when |
|---|---|---|
| Where are we, what is next | `STATUS.md` | End of every heartbeat (overwritten) |
| Every ticket, checkbox, owner, round, last gap, errors | `TRACKER.md` | Every state change |
| Every non-obvious decision | `DECISIONS.md` | Immediately |
| Every bug and build error | `TRACKER.md` → `## Errors` | Immediately, with log path |
| What the studio learned | `LESSONS.md` | When a gap repeats (see Rule 3) |
| Captures and logs | `evidence/<ticket>/round-<n>/` | By the capture scripts |
| Critic and playtester verdicts | `evidence/<ticket>/round-<n>/verdicts.md` | By the Director, from their returns (critics are read-only) |

`STATUS.md` and `TRACKER.md` belong to the **Director alone**. They are its overview of the whole studio; no builder, critic or playtester reads them, because the big picture would only distract them from their one job (and would break a critic's blindness). Everyone else gets a context pack (Rule 2).

`STATUS.md` is the first file the Director reads and it must fit on one screen (max ~40 lines). It answers: milestone, gate progress, what is running, what is blocked, top risk, next 5 actions, budget used.

`TRACKER.md` is the Director's checklist. Every ticket is one checkbox line, grouped by feature; details live under the ticket's heading, not in the list. See the format in `state.md`.

## Rule 2 - Every agent gets a context pack, not the project

Nobody reads "everything". Each agent gets the smallest set of files that lets it do one job, assembled by the Director into the ticket:

| Agent | Context pack | Never gets |
|---|---|---|
| **Director** | `STATUS.md`, `TRACKER.md` (open section), last 10 `DECISIONS.md`, `MILESTONE.md`, `BRIEF.md` pillars | Code, assets, full logs, critic transcripts |
| **Builder** | Ticket, pillars, the bar file, relevant `STYLE_BIBLE` / `ARCHITECTURE` section, relevant `LESSONS.md` entries, last GAP/BLOCKERS | Other tickets, the board, previous rounds' reasoning |
| **Experience critic** | Evidence A/B, the question, pillars | Code, builder notes, round number, history |
| **Code critic** | Diff, touched files, `ARCHITECTURE.md`, `BUDGETS.md`, test and profiler output, code bar | Visuals, builder notes, history |
| **Integration / Coherence critic** | Build captures, style bible, bars | Tickets, code |

Packs are lists of file paths plus line ranges, not pasted content. The agent reads them itself.

The skill files themselves are part of this budget. Builders and critics never read them - the ticket and their role's section (`gauntlet.md` 3a or 3b, or the department's entry) are copied into their prompt. The Director reads `context.md` and `director.md` once per session and opens the other references only for the step that needs them (`feedback.md` at handoff, `endurance.md` at a process review). Paperwork serves the game: if a heartbeat spends more effort on tracking than on dispatched work, cut the tracking back to STATUS + TRACKER.

## Rule 3 - Return contracts keep the Director small

Builders write their full output to files and return **at most 5 lines**; critics and playtesters return only their verdict block. Either way, nothing long reaches the Director:

```
T-042 round 3: JUDGE ours x2 (both orders) | CODE PASS
evidence: studio/evidence/T-042/round-4/
next: WON - ready to merge
```

The Director never reads a critic transcript or a build log unless a return line says it must. It works from return lines, `TRACKER.md` and `STATUS.md`. That is what lets it run hundreds of heartbeats without its own context filling with detail.

**Lessons, not repetition.** When the same GAP or BLOCKER appears on two different tickets (e.g. "unscaled delta time", "pivot not at feet", "UI text overflows in German"), the Director writes it to `LESSONS.md` as a rule with the fix. Every later builder in that department gets the matching lessons in its pack. The studio should make each mistake twice at most.

## Rule 4 - Order prompts for the cache

Every dispatch is built stable-first (`studio.md` - dispatch brief): role file, department brief and craft notes, then studio file paths, then the ticket and round. Identical prefixes across the many builders and critics of a run are cached and cost a fraction of fresh input; a changing timestamp or ticket id near the top breaks that for everything after it. Keep variable content at the end.

## Rule 5 - Continuity where it is cheap, freshness where it matters

- **Builders are resumed** for their own revision rounds where the runtime lets the Director wait for the resumed agent (for example `SendMessage` in an interactive session): the ticket's context is already loaded and cached, so a revision costs a fraction of a fresh builder. In headless sprint runs, where a resumed agent may run in the background and die with the session, a fix round is a fresh foreground builder with the ticket, the one gap and the list of files - still small, because it reads only those.
- **Critics and judges are always new agents**, so they never know how hard the builder tried or what the last critic said.
- A builder that has been resumed many times, or whose ticket changed shape, is replaced by a fresh one with a clean pack.

## Rule 6 - The acceptance list is the definition of done

`studio/acceptance.json` lists every requirement of the brief as a machine-checkable check with a `passes` flag (see `state.md`). It is written at kickoff from the brief and the completeness list, run by QA after every integration, and never edited to make a check pass - only to add checks. A ticket is not done while one of its checks fails, and the Release Candidate gate requires all of them. This keeps the studio from declaring victory early and gives every heartbeat an objective progress number.

## Fresh context by design

- **Every heartbeat starts from files.** The Director does not rely on remembering the previous heartbeat. The first thing it reads is `STATUS.md` and `TRACKER.md`; if the context was compacted or the session restarted, nothing changes.
- **Session length follows the playbook** (`playbooks.md`). Under about two hours the Director keeps one session - reloading state every few minutes costs more than it saves, and the context stays small because it only reads 5-line returns. For longer runs, the Director finishes the heartbeat, writes `STATUS.md`, commits, and continues in a fresh session (the heartbeat driver, a scheduled Routine, or the next heartbeat after a reset) whenever its context passes roughly half the window or after a set number of heartbeats.
- **Builders and critics are always scoped.** One ticket per builder, one question per critic; their contexts never accumulate project history.

## File hygiene

Files that grow forever become context problems of their own.

- `HEARTBEAT.md`: keep the last 20 entries; older ones move to `archive/heartbeats-<n>.md`.
- `TRACKER.md`: when a milestone closes, its merged tickets move to `archive/tracker-<milestone>.md`, leaving one summary line per feature.
- `DECISIONS.md` stays append-only, but agents only read the last 10 plus any it references.
- Logs and captures stay in `evidence/`; files point to them, never paste them.
- Every file in `studio/` except the archives should be readable in one go (target < 300 lines).
