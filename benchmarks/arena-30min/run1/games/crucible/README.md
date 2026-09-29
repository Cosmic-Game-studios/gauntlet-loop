# Arena

Three.js browser arena FPS. Serve the `game/` folder statically (e.g. `npx http-server game` or `python3 -m http.server -d game`) and open `index.html` in Chromium.

## Controls
- Mouse: look (click the view to lock the pointer)
- W A S D: move, Shift: sprint, Space: jump
- Left mouse: fire (rifle is automatic, shotgun is pump action)
- R: reload
- 1 / 2 or mouse wheel: rifle / shotgun
- Esc: pause (Resume, Settings, Main Menu)

Settings: mouse sensitivity and master volume, applied live and remembered.

Survive 5 waves of Rushers (orange, melee) and Shooters (teal, orb projectiles you can dodge by strafing).

Test: `node tools/smoke.mjs` (headless Chromium, screenshots in studio/evidence/T-001/round-1).
