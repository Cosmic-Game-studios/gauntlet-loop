# This project is built by a gauntlet-studio run

State lives in `studio/`, not in any conversation. Before doing anything, read `studio/STATUS.md`.

- `studio/STATUS.md` - one screen: milestone, what runs, what blocks, next actions. Read first, always.
- `studio/TRACKER.md` - every ticket as a checkbox, plus open errors.
- `studio/BRIEF.md` - the locked Game Brief (with amendments from human feedback).

Rules for every agent in this project:

- Write-through: when you finish, fail, decide or find an error, write it to the right `studio/` file immediately. Anything only in your context is lost at the next compaction.
- Return at most 5 lines to whoever spawned you. Details go to files.
- Stay inside your ticket's files. Never edit `studio/BRIEF.md`.
- Builders never judge their own work; critics never edit files.
- Evidence for critics comes from the capture scripts in `tools/`, never hand-picked.
