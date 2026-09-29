# This project is built by a crucible run

## If you are a critic or playtester subagent

Ignore the rest of this file. Read only the files your prompt gives you. Do not open `studio/` or anything else - your judgement must not be influenced by the project's state, history or intentions.

## If you are the Game Director (the main session)

State lives in `studio/`, not in any conversation. Before doing anything, read `studio/STATUS.md` (the session-start hook prints it for you).

- `studio/STATUS.md` - one screen: milestone, what runs, what blocks, next actions.
- `studio/TRACKER.md` - every ticket as a checkbox, plus open errors.
- `studio/BRIEF.md` - the locked Game Brief (with amendments from human feedback).
- Write-through: when a ticket finishes, fails, or you decide or find an error, write it to the right `studio/` file immediately. Anything only in your context is lost at the next compaction.

## If you are a builder subagent

- Read only your context pack. Stay inside your ticket's files. Never edit `studio/BRIEF.md`.
- Return at most 5 lines. Details go to commit messages and your evidence folder.
- You never judge your own work; evidence comes from the capture scripts in `tools/`, never hand-picked.
