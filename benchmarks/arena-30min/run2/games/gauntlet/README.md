# Arena

A browser first-person arena shooter built with three.js (vendored in `vendor/`). No build step.

## Run
Serve this folder statically and open `index.html`, e.g.:

    cd game && python3 -m http.server 8000   # then open http://localhost:8000

## Controls
| Action | Input |
|---|---|
| Look | Mouse (click the view to lock the pointer) |
| Move | W A S D |
| Sprint | Shift |
| Jump | Space |
| Fire | Left mouse (hold for rifle auto-fire) |
| Reload | R |
| Switch weapon | 1 (rifle), 2 (shotgun), mouse wheel |
| Pause | Esc |

Survive 5 waves of rushers (melee) and shooters (dodgeable projectiles). Rusher kill = 100 points, shooter kill = 150.
Settings (mouse sensitivity, master volume) are available from the main and pause menus and apply live.

## Files
- `js/main.js` – renderer, game loop, modes/menus, waves, score, input, `window.__game` test hook
- `js/arena.js` – procedural arena, lights, colliders, nav grid, ground heights
- `js/player.js` – first-person controller and collision
- `js/hud.js` – DOM HUD
- `js/weapons.js`, `js/audio.js`, `js/enemies.js` – weapons, synthesized audio, enemies
