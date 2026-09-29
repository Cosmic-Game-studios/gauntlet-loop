# Arena

A browser first-person arena shooter built with three.js (0.186, vendored in `vendor/`). Everything you see and hear is generated in code: geometry, canvas textures, and WebAudio sounds. There are no asset files.

## Run
Serve this folder statically and open `index.html`, for example:

```
npx http-server game   # or: python3 -m http.server -d game
```

## Controls
| Input | Action |
|---|---|
| Mouse | Look (click the game to capture the pointer) |
| Left mouse | Fire (rifle is automatic; shotgun pumps between shots) |
| W A S D | Move |
| Shift | Sprint (while moving forward) |
| Space | Jump |
| 1 / 2 / mouse wheel | Rifle / Shotgun |
| R | Reload |
| Esc | Pause menu |

## Game
- Survive 5 waves. You get a short break between waves, and clearing a wave restores 25 health. Health also regenerates slowly after 5 s without taking damage.
- **Rushers** (red, horned) sprint at you and claw you in melee.
- **Shooters** (blue walkers) keep their distance and strafe. Their cannon glows while charging, then fires an orange orb you can dodge.
- Headshots deal 1.8× damage and earn bonus score.
- Settings (mouse sensitivity, master volume) apply immediately and are saved in localStorage.

## Test hook
`window.__game` exposes `start, getState, setInput, look, pressKey, setPlayerPose, spawnEnemy, getEnemies, setPaused, setGodMode, setWaveSpawning`, as specified in SPEC.md. `setPaused(true)` freezes the simulation without opening the pause menu. The Esc key (or `pressKey('Escape')`) opens the pause menu and sets the mode to `'paused'`.
