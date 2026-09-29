# ARENA

A 3D first-person arena shooter in three.js. Survive 5 waves of Rushers (melee) and Shooters (ranged, dodgeable orbs).

## Run
Serve the `game/` folder statically, for example `npx http-server game` or `python3 -m http.server -d game 8080`, then open it in Chromium. No build step is needed.

## Controls
| Input | Action |
|---|---|
| Mouse | Look (click Play to lock the pointer) |
| WASD | Move |
| Shift | Sprint |
| Space | Jump |
| Left mouse | Fire (the rifle is automatic) |
| R | Reload |
| 1 / 2 / mouse wheel | Rifle / shotgun |
| Esc | Pause / resume |

Settings (mouse sensitivity, master volume) are available from the main menu and the pause menu. They apply live and are saved.

## Test hook
`window.__game` is implemented as described in SPEC.md, plus `step(n)` (advances fixed 1/60 s ticks and renders once), `showScreen(name)` and `renderer`.
