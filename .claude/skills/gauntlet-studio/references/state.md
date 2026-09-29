# Studio state

All memory lives in `studio/` at the project root, committed every heartbeat. A fresh agent with only this folder must be able to continue the run. If it is not written here, it does not exist.

```
studio/
├── BRIEF.md          # locked Game Brief. Only the user changes it.
├── PILLARS.md        # pillars + "not this", with examples of each deciding a call
├── BARS.md           # every bar: name, source URL/file, exact clip/frame, what it judges
├── STYLE_BIBLE.md    # palette, shapes, materials, audio direction, reference frames
├── BUDGETS.md        # fps, frame ms, memory, polycount, texel density, draw calls, LUFS
├── MILESTONE.md      # current milestone, its gate, gate status
├── BOARD.md          # all tickets of the current milestone
├── DECISIONS.md      # append-only decision log (D-001 ...)
├── PARKING.md        # ideas outside scope, never on the board without a cut
├── HEARTBEAT.md      # append-only: one entry per heartbeat
├── BUGS.md           # open bugs, severity, owner ticket
├── bars/             # fetched reference material (clips, screenshots, audio)
├── evidence/         # <ticket-id>/round-<n>/ captures + critic verdicts
└── dashboard.html    # regenerated every heartbeat for the user
```

## Ticket format (BOARD.md)

```
### T-042  Player dash                      [Code]  status: IN GAUNTLET  round: 3
feature:     Core movement
goal:        8 m dash, 0.15 s, cancels into attack, i-frames first 0.1 s
bar:         Hades - Zagreus dash, gameplay capture 00:40-01:10 (bars/hades_dash.mp4)
question:    Which dash feels more responsive and readable?
acceptance:  unit tests for distance/timing; input-to-motion < 50 ms; WON x2 blind
depends:     T-031 (input system) WON
budget:      0.2 ms CPU/frame
last gap:    "Startup has 3 dead frames before motion; the bar moves on frame 1."
```

Status flow: `BACKLOG -> READY -> BUILDING -> VERIFY -> IN GAUNTLET -> WON -> MERGED`, or `STALLED -> (swap / split / kill review) ` or `CUT`.

## Heartbeat entry (HEARTBEAT.md)

```
## HB-023  milestone: Vertical Slice  gate: 2/4
merged:   T-042, T-047
won:      T-051 (awaiting merge)
stalled:  T-039 (round 8, same gap) -> split into T-060, T-061
cut:      -
top gap:  Coherence critic: "Enemy VFX are saturated neon, rest of the world is muted - breaks pillar 1."
next:     T-062 VFX palette pass [Tech Art], T-060, T-061, T-055..T-058
numbers:  58 fps (target 60), load 4.1 s, 0 crashes / 12 min bot play
```

## Resuming

On any new session or context reset, the Director reads in this order: `BRIEF.md`, `MILESTONE.md`, the last 3 `HEARTBEAT.md` entries, `BOARD.md`, the last 10 `DECISIONS.md` lines. Then it runs the next heartbeat. Tickets that were BUILDING or IN GAUNTLET with no evidence for their current round are reset to READY.
