# Studio state

All memory lives in `studio/` at the project root, written the moment something happens and committed every heartbeat. A fresh agent with only this folder must be able to continue the run. If it is not written here, it does not exist. The rules for what goes where and who reads what are in `context.md`.

```
studio/
├── MACHINE.md        # probe result: GPU/rendering, engines, disk, licences, capture paths, tools
├── ASSETS.md         # every sourced asset + licence
├── KNOWN_GAPS.md     # only at an early handoff: what did not reach its bar and why
├── acceptance.json   # every requirement as a runnable check with a passes flag - the definition of done
├── STATUS.md         # ONE SCREEN. Where we are, what runs, what blocks, next 5 actions. Read first, always.
├── TRACKER.md        # the Director's checklist: every ticket as a checkbox + errors section
├── BRIEF.md          # locked Game Brief. Changed only by the user, or by human feedback (## Amendments)
├── PILLARS.md        # pillars + "not this", with examples of each deciding a call
├── BARS.md           # every bar: name, source, exact clip/frame, what it judges, bar ladder rungs
├── STYLE_BIBLE.md    # palette, shapes, materials, audio direction, reference frames
├── BUDGETS.md        # fps, frame ms, memory, polycount, texel density, draw calls, LUFS
├── ARCHITECTURE.md   # modules, core systems, data flow, conventions, code bars per system
├── COMPLETENESS.md   # genre expectations + shipping basics + juice, each added / covered / rejected
├── LESSONS.md        # repeated gaps as rules, one line each, tagged: "- [enemies, art] Pivot at the feet." - pack.mjs injects them by tag
├── MILESTONE.md      # current milestone, its gate, gate status
├── DECISIONS.md      # append-only decision log (D-001 ...)
├── PARKING.md        # ideas outside scope, never on the tracker without a cut
├── HEARTBEAT.md      # last 20 heartbeat entries (older ones in archive/)
├── DEBT.md           # PASSED tickets: judge's WHY, tier, pillar, evidence - input for polish passes
├── KEEP.md           # what the human liked or did not complain about -> regression bars
├── feedback/         # RC-<n>.md: human feedback, interpretation, new bars, tickets, status
├── handoff/          # RC-<n>/: build, PLAY.md, CHANGES.md, highlight video, screenshots
├── bars/             # fetched reference material (clips, screenshots, audio, reference repos)
├── features/         # <feature>.md: feature sheet for a pod - numbers, silhouette, animation beats, events, VFX and sound cues
├── tickets/          # <ticket-id>.md: header (sections, owns, uses, lesson tags, evidence) + ticket body - written by the Director
├── packs/            # <ticket-id>.md: context pack built by tools/pack.mjs - the only studio file a builder reads
├── evidence/         # <ticket-id>/round-<n>/ captures + critic verdicts + logs
├── archive/          # closed milestones' tickets, old heartbeats
└── dashboard.html    # regenerated every heartbeat for the user
```

## acceptance.json (definition of done)

```json
[
  { "id": "A-01", "area": "weapons", "check": "rifle fires automatically while fire is held; ammo decreases", "passes": true,  "last_run": "HB-004" },
  { "id": "A-02", "area": "weapons", "check": "recoil recovers to within 1 degree of the aim point 0.5 s after a burst", "passes": false, "last_run": "HB-004" },
  { "id": "A-17", "area": "ux", "check": "from page load to playing in at most two clicks", "passes": true, "last_run": "HB-004" }
]
```

The manifest holds registered check ids and plain-language descriptions - never commands. Each id is implemented in the check registry (`tools/checks.mjs` on the web; the engine adapter's test runner elsewhere) and run by `tools/accept.mjs`. Checks are added, never weakened; `passes` is only set by the runner.

**Held-out QA suite** - `studio/.qa-heldout/acceptance.json` plus its own registry: 5-15 extra checks written by QA from the brief (edge cases, the same requirement from another angle), never listed in a builder's pack, hidden from Read/Glob/Grep by the settings deny rule, run only by the Director (`accept.mjs --suite heldout`), with its hash recorded in `STATUS.md` so an edit is noticed. It is hidden, not tamper-proof against an agent with Bash - its value is that nobody builds *to* it.

## STATUS.md (overwritten every heartbeat, max ~40 lines)

```
# STATUS  -  HB-087  2026-10-04 14:10  -  state: RUNNING
#   states: RUNNING | paused: limit until <time> | BLOCKED ON HUMAN - <question> | WAITING FOR HUMAN RC-<n> | DONE

Milestone:  Content Alpha   gate 3/5   [x] all features exist  [x] levels 1-4 playable  [x] no blockers
                                        [ ] bot finishes game   [ ] level 5 playable
Progress:   212/301 tickets WON (70%)   today: 31 WON   avg rounds: hero 2.4, core 1.6, bulk 1.0   WON/PASSED: 160/52
In flight:  9  (Code 3, 3D 2, Audio 1, Level 2, QA 1)
Blocked:    T-244 boss arena navmesh (waits T-240)     T-251 FAILED -> re-scope (split) next HB
Debt:       14 PASSED tickets in DEBT.md (5 hero, 9 core) - polish pass at Beta
Errors:     2 open (E-019 crash on level 4 load - T-260 on it; E-021 audio pops on pause)
Top risk:   Level 5 pacing - playtester: 3 min of dead corridor
Numbers:    61 fps avg / 48 1%-low (target 60/50), load 3.2 s, 0 crashes in last 40 min bot play
Progress:   since last review (HB-082): acceptance 71->78 %, playable levels 3->4, open majors 6->3, perf within budget,
            2 new champions (enemies, HUD), process share 31 % -> continue
Budget:     n/a (no user budget)
Next:       1. split T-251   2. merge T-238, T-241   3. dispatch level 5 blockout   4. fix E-019   5. lessons review 3D
```

## TRACKER.md (the checklist)

Checkbox list first, grouped by feature. One line per ticket. Details live in the ticket block below, not in the list.

```
# TRACKER  -  Content Alpha

## Core movement
- [x] T-031  Input system                       [Code]    hero  WON r2   merged HB-012
- [x] T-042  Player dash                        [Code]    hero  WON r3   merged HB-019
- [ ] T-043  Wall run                           [Code]    hero  IN GAUNTLET r3   gap: loses momentum at corner
- [ ] T-044  Wall run animation                 [Anim]    core  BLOCKED by T-043

## Weapons
- [x] T-101  Rifle model                        [3D]      hero  PASSED r3  debt D-12   merged HB-024
- [ ] T-102  Rifle recoil pattern               [Code]    hero  BUILDING r1
- [~] T-109  Crafting bench                     [Design]  CUT  (D-031)

## Errors
- [ ] E-019  Crash on level 4 load - null nav data after streaming    sev: blocker   -> T-260   log: evidence/E-019/
- [x] E-017  Footstep SFX double-trigger on stairs                    sev: minor     fixed by T-233
```

Legend: `[ ]` open (any status up to WON), `[x]` MERGED, `[~]` cut. Status words: `BACKLOG, READY, BUILDING, VERIFY, IN GAUNTLET, JUDGING, WON, PASSED, FAILED, MERGED, BLOCKED, CUT`. `PASSED` tickets are merged too; they carry a `debt` marker until a polish pass lifts them to WON.

## Ticket block (below the checklist in TRACKER.md)

```
### T-042  Player dash                      [Code]  tier: hero  status: IN GAUNTLET  round: 2/6  champion: r1
feature:     Core movement
goal:        8 m dash, 0.15 s, cancels into attack, i-frames first 0.1 s
bar:         Hades - Zagreus dash, gameplay capture 00:40-01:10 (bars/hades_dash.mp4)
question:    In the frame strips, which dash reads more clearly from start to end?
numbers:     startup <= 1 frame (bar: 1 frame, frame-stepped at 60 fps), input-to-motion < 50 ms (genre norm, not measurable from bar clip)
code bar:    Lyra - dash ability (bars/lyra/)
pack:        ARCHITECTURE.md#movement, LESSONS.md#code, bars/hades_dash.mp4
acceptance:  unit tests for distance/timing; numbers met; Code critic PASS; judge picks ours (2 judges, both orders)
depends:     T-031 WON
budget:      0.2 ms CPU/frame
last gap:    Experience: "Startup has 3 dead frames before motion; the bar moves on frame 1."
             Code: BLOCK - DashComponent.cpp:88 uses unscaled delta time; dash distance changes with frame rate.
```

## Heartbeat entry (HEARTBEAT.md)

```
## HB-023  milestone: Vertical Slice  gate: 2/4
merged:   T-042, T-047
won:      T-051 (awaiting merge)
failed:   T-039 (4/6 rounds, plateau, floor missed: open robustness blocker) -> re-scoped: split into T-060, T-061
cut:      -
lessons:  L-007 [3D] pivot at feet, +Y forward on export
top gap:  Coherence critic: "Enemy VFX are saturated neon, rest of the world is muted - breaks pillar 1."
next:     T-062 VFX palette pass [Tech Art], T-060, T-061, T-055..T-058
numbers:  58 fps (target 60), load 4.1 s, 0 crashes / 12 min bot play
```

## Resuming

On any new session, context reset or compaction, the Director reads, in this order: `STATUS.md`, `TRACKER.md` (open section), `MILESTONE.md`, the last 10 `DECISIONS.md` lines, the latest `feedback/RC-<n>.md` if in a patch cycle. `BRIEF.md` pillars when planning. Nothing else. Then it runs the next heartbeat.

Tickets marked BUILDING or IN GAUNTLET with no evidence for their current round are reset to READY. `paused: limit` in `STATUS.md` means continue normally. `WAITING FOR HUMAN` and `BLOCKED ON HUMAN` mean do nothing until the human writes. `DONE` is set only when the human says the game is finished.
