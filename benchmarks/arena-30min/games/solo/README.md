# Arena

A 3D first-person arena shooter built with three.js (0.186, vendored in `vendor/`). All geometry, textures and sounds are procedural.

Run: serve this folder statically (e.g. `python3 -m http.server` inside `game/`) and open `index.html` in Chromium.

## Controls
| Key | Action |
| --- | --- |
| Mouse | Look (click the view to capture the pointer) |
| Left mouse | Fire (rifle is automatic, shotgun pumps between shots) |
| W A S D / arrows | Move |
| Shift | Sprint |
| Space | Jump |
| 1 / 2 / mouse wheel | Rifle / Shotgun |
| R | Reload |
| Esc | Pause menu (Resume, Settings, Restart, Main menu) |

Survive 5 waves of Rushers (red melee brutes) and Shooters (blue gunners whose orange plasma bolts can be dodged).
Headshots deal double damage. You regain 25 health and some ammo after each wave.

Settings (mouse sensitivity, master volume) apply live and persist in localStorage.

## Test hook
`window.__game` exposes `start, getState, setInput, look, pressKey, setPlayerPose, spawnEnemy, getEnemies, setPaused, setGodMode, setWaveSpawning` as described in SPEC.md.
