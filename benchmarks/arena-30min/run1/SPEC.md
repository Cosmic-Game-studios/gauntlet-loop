# Benchmark game: "Arena" - a 3D browser first-person shooter

Build a complete, polished, playable 3D first-person arena shooter that runs in the browser.

## Hard constraints
- three.js (from npm, version 0.186.x) is the only third-party runtime dependency. No other libraries, no external asset files: all geometry, textures, materials and sounds are made procedurally in code (you cannot download models/sounds/images).
- Entry point: `game/index.html`, served statically from the `game/` folder (it may import `game/vendor/three.module.js` + `three.core.js`, copy them from node_modules). No build step required to run it.
- Must run in Chromium (headless Chromium with SwiftShader WebGL is available here for testing: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, launch args `--use-angle=swiftshader --enable-unsafe-swiftshader`; Playwright via npm works).

## Features (all required)
1. Menus: main menu (Play, Settings), pause menu on Esc, settings (mouse sensitivity, master volume, both applied live), game-over screen and victory screen, both with Restart.
2. First-person controller: pointer lock mouse look, WASD, sprint (Shift), jump (Space), gravity, solid collision with the arena (no walking through walls or cover, no falling through the floor).
3. Two weapons, switch with 1/2 and mouse wheel:
   - Rifle: hitscan, automatic fire, recoil and spread, magazine 30 / reserve 90, reload (R) with reload time.
   - Shotgun: 8 pellets with spread, pump delay, magazine 6 / reserve 24, reload.
   - First-person viewmodel for each weapon with bob, recoil kick and reload animation; muzzle flash; bullet impacts or tracers; hit marker on hit.
4. Enemies, two types, both procedurally modelled and animated (not plain boxes):
   - Rusher: runs at the player, melee damage.
   - Shooter: keeps distance, fires visible projectiles the player can dodge.
   - Both navigate around cover (not straight through), react to hits, have health, and a visible death.
5. Waves: 5 waves of increasing difficulty, short break between waves, victory after wave 5.
6. HUD: health, ammo (mag/reserve), current weapon, wave, score, crosshair, directional damage indicator.
7. Audio: WebAudio-synthesised sounds for both weapons, reload, hits, enemy attacks, enemy death, player damage; master volume applies.
8. Arena: a designed arena with cover, height variation, lighting and shadows, a coherent visual style; readable at a glance.
9. Performance: smooth on a normal laptop; avoid per-frame allocations and unnecessary draw calls.

## Test hook (required, used by the benchmark's evaluator)
Expose on `window.__game`:
```js
window.__game = {
  start(),                       // start a new run immediately (skips menus), mode becomes 'playing'
  getState(),                    // { mode: 'menu'|'playing'|'paused'|'gameover'|'victory', wave, health, weapon: 'rifle'|'shotgun',
                                 //   ammo, reserve, score, enemiesAlive, playerPos: [x,y,z], yaw, pitch }
  setInput({ forward, back, left, right, sprint, jump, fire }),   // booleans, held until changed
  look(dx, dy),                  // rotate view as if the mouse moved dx, dy pixels
  pressKey(key),                 // one-shot: 'r' reload, '1', '2', 'Escape'
  setPlayerPose(x, y, z, yaw, pitch),
  spawnEnemy(type, x, y, z),     // type 'rusher' | 'shooter', returns an id
  getEnemies(),                  // [{ id, type, health, pos: [x,y,z], alive }]
  setPaused(bool),               // freeze simulation (for screenshots), rendering continues
  setGodMode(bool),              // player takes no damage
  setWaveSpawning(bool),         // enable/disable automatic wave spawns
}
```
The game must also be fully playable by a human with keyboard and mouse; the hook must not replace real input handling.

## Deliverable
The `game/` folder, playable, plus `game/README.md` with controls.
