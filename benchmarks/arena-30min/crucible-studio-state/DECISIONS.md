# DECISIONS (append-only)
D-001 [HB-001] Brief written by Director from SPEC (bench: no human intake). Treated as approved.
D-002 [HB-001] Milestones compressed to Tech Spike -> Vertical Slice -> RC for the 30-min cap; COMPLETENESS = SPEC feature list (SPEC already lists menus/settings/hit markers/damage indicator).
D-003 [HB-001] Tech Spike merged with first build: 3 parallel builders on disjoint files (core main.js, enemies.js, audio.js) behind interfaces in ARCHITECTURE.md, to have a playable build committed by HB-001 end.
D-004 [HB-001] Builders work directly in main tree on disjoint files (no worktrees) - saves merge time; one owner per file.
D-005 [HB-001] Gauntlet critics deferred to HB-002 (experience critic vs Dive screenshots + code critic) - setup HB spends its time on the first playable.
