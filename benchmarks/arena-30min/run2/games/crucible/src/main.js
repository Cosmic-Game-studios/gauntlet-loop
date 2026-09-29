import * as THREE from 'three';
import { TICK, WAVES, WAVE_BREAK, PLAYER } from './config.js';
import { createWorld } from './world.js';
import { createAudio } from './audio.js';
import { createEnemies } from './enemies.js';
import { createUI } from './ui.js';
import { createPlayer } from './player.js';
import { createWeapons } from './weapons.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.03, 250);
camera.rotation.order = 'YXZ'; scene.add(camera);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const world = createWorld(scene, renderer);
const audio = createAudio();
const player = createPlayer(world, camera);
let godMode = false;
const _v = new THREE.Vector3();
const playerCtx = {
  position: player.position, eye: player.eye,
  damage(amount, fromPos) {
    if (godMode || mode !== 'playing' || player.health <= 0) return;
    player.health = Math.max(0, player.health - amount);
    audio.play('player_hurt'); ui.flash?.();
    if (fromPos) { _v.subVectors(fromPos, player.position); const a = Math.atan2(_v.x, _v.z); // world angle, forward is (-sin yaw, -cos yaw)
      let rel = Math.atan2(-_v.x * Math.cos(player.yaw) + _v.z * Math.sin(player.yaw), -_v.x * Math.sin(player.yaw) - _v.z * Math.cos(player.yaw)); void a;
      rel = -rel; ui.damageIndicator?.(rel); }
    if (player.health <= 0) endRun('gameover');
  },
};
const enemies = createEnemies({ scene, world, audio, player: playerCtx });

// settings
const settings = { sensitivity: 1, volume: 0.8 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('arena.settings') || '{}')); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem('arena.settings', JSON.stringify(settings)); } catch (e) {} };
audio.setVolume(settings.volume);

let mode = 'menu', prevScreen = 'menu';
const ui = createUI({
  play() { audio.unlock(); audio.play('ui_click'); requestLock(); startRun(); },
  resume() { audio.play('ui_click'); requestLock(); setMode('playing'); },
  restart() { audio.unlock(); audio.play('ui_click'); requestLock(); startRun(); },
  toMenu() { audio.play('ui_click'); enemies.clear(); setMode('menu'); },
  setSensitivity(v) { settings.sensitivity = +v; saveSettings(); },
  setVolume(v) { settings.volume = +v; audio.setVolume(settings.volume); saveSettings(); },
  getSettings() { return { ...settings }; },
});
const weapons = createWeapons({ scene, camera, world, enemies, ui, audio, player });

// run state
const input = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
const keys = { forward: false, back: false, left: false, right: false, sprint: false, jump: false }; let mouseFire = false;
const hookInput = { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false };
let spawnIdx = 0, wave = 0, score = 0, breakTime = 0, waveActive = false, waveSpawning = true, pendingSpawns = [], spawnTimer = 0, simPaused = false;
const scored = new Set();

function setMode(m) {
  mode = m;
  ui.show(m === 'playing' ? null : m === 'paused' ? 'pause' : m);
}
function startRun() {
  enemies.clear(); scored.clear(); player.reset(world.playerSpawn); player.yaw = 0; player.pitch = 0;
  if (world.playerSpawn) { // face arena centre
    player.yaw = Math.atan2(world.playerSpawn.x, world.playerSpawn.z);
  }
  weapons.reset(); wave = 0; score = 0; breakTime = 1.5; waveActive = false; pendingSpawns.length = 0;
  spawnIdx = 0; spawnTimer = 0; simPaused = false; waveSpawning = true; acc = 0;
  setMode('playing'); startWave();
}
function endRun(m) { setMode(m); audio.play(m === 'victory' ? 'victory' : 'gameover'); if (document.pointerLockElement) document.exitPointerLock(); }
function startWave() {
  const W = WAVES[wave]; wave++; waveActive = true;
  const types = []; for (let i = 0; i < W.rushers; i++) types.push('rusher'); for (let i = 0; i < W.shooters; i++) types.push('shooter');
  types.sort(() => Math.random() - 0.5);
  pendingSpawns = types.map(t => ({ t, opts: { hpMul: W.hpMul, speedMul: W.speedMul, dmgMul: W.dmgMul } })); spawnTimer = 0;
  ui.banner?.(`WAVE ${wave}`, `${types.length} hostiles`); audio.play('wave_start');
}
function tickWaves(dt) {
  if (!waveSpawning) return;
  if (pendingSpawns.length) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { const s = pendingSpawns.shift(); const sp = world.enemySpawns; const p = sp[(spawnIdx++) % sp.length]; enemies.spawn(s.t, p.x, p.y, p.z, s.opts); spawnTimer = 0.6; }
    return;
  }
  if (waveActive) {
    if (enemies.aliveCount() === 0) {
      waveActive = false;
      if (wave >= WAVES.length) { endRun('victory'); return; }
      breakTime = WAVE_BREAK; weapons.reset(); /* resupply between waves: 57 enemies cannot be killed on 120 rifle rounds */ audio.play('wave_clear'); ui.banner?.(`WAVE ${wave} CLEARED`, `Next wave in ${WAVE_BREAK}s`);
    }
  } else { breakTime -= dt; if (breakTime <= 0) { breakTime = 0; startWave(); } }
}
function tickScore() {
  const arr = enemies._debug.enemies;
  for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (!e.alive && !scored.has(e.id)) { scored.add(e.id); score += e.type === 'shooter' ? 150 : 100; } }
}
function tick(dt) {
  if (mode !== 'playing') return;
  for (const k in keys) input[k] = keys[k] || hookInput[k];
  input.fire = mouseFire || hookInput.fire;
  const ev = player.update(dt, input);
  if (ev.jumped) audio.play('jump'); if (ev.landed) audio.play('land'); if (ev.footstep) audio.play('footstep', { volume: 0.5 });
  weapons.update(dt, input.fire, player.bob, player.bobAmt);
  enemies.update(dt);
  tickScore(); tickWaves(dt);
}
const hudState = { health: 0, maxHealth: 0, weapon: '', ammo: 0, reserve: 0, reloading: false, wave: 0, totalWaves: WAVES.length, score: 0, enemiesAlive: 0, breakTime: 0 };
function hud() {
  const h = hudState;
  h.health = player.health; h.maxHealth = player.maxHealth; h.weapon = weapons.current; h.ammo = weapons.ammo; h.reserve = weapons.reserve; h.reloading = weapons.reloading;
  h.wave = wave; h.score = score; h.enemiesAlive = enemies.aliveCount(); h.breakTime = (waveActive || pendingSpawns.length) ? 0 : breakTime;
  ui.updateHUD(h);
}
function renderFrame(dt) { player.applyCamera(); world.update?.(dt, camera); hud(); world.render(camera); }

// input
function requestLock() { try { const r = renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
function doLook(dx, dy) {
  const s = 0.0022 * settings.sensitivity;
  player.yaw -= dx * s; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - dy * s)); weapons.look(dx, dy);
}
function doKey(k, real) {
  if (k === 'r' || k === 'R') weapons.reload();
  else if (k === '1') weapons.select('rifle'); else if (k === '2') weapons.select('shotgun');
  else if (k === 'Escape') { if (mode === 'playing') setMode('paused'); else if (mode === 'paused') { if (real) requestLock(); setMode('playing'); } }
}
const keyMap = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump' };
addEventListener('keydown', e => {
  if (keyMap[e.code]) { keys[keyMap[e.code]] = true; if (e.code === 'Space') e.preventDefault(); }
  if (mode === 'playing') { if (e.code === 'KeyR') doKey('r'); if (e.code === 'Digit1') doKey('1'); if (e.code === 'Digit2') doKey('2'); }
  if (e.code === 'Escape' || e.code === 'KeyP') doKey('Escape', true);
});
addEventListener('keyup', e => { if (keyMap[e.code]) keys[keyMap[e.code]] = false; });
addEventListener('mousemove', e => { if (mode === 'playing' && document.pointerLockElement) doLook(e.movementX, e.movementY); });
addEventListener('mousedown', e => { if (e.button === 0 && mode === 'playing') { if (!document.pointerLockElement) requestLock(); else mouseFire = true; } });
addEventListener('mouseup', e => { if (e.button === 0) mouseFire = false; });
addEventListener('wheel', e => { if (mode === 'playing') weapons.next(); }, { passive: true });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseFire = false; });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) { mouseFire = false; if (mode === 'playing' && !hookDriven) setMode('paused'); } });
let hookDriven = false;

// loop
let acc = 0, last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(); let dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!simPaused) { acc += dt; let n = 0; while (acc >= TICK && n < 5) { tick(TICK); acc -= TICK; n++; } if (n === 5) acc = 0; } else acc = 0;
  renderFrame(dt);
});

window.__game = {
  renderer,
  start() { hookDriven = true; audio.unlock(); startRun(); },
  getState() { return { mode, wave, health: player.health, weapon: weapons.current, ammo: weapons.ammo, reserve: weapons.reserve, score, enemiesAlive: enemies.aliveCount(),
    playerPos: [player.position.x, player.position.y, player.position.z], yaw: player.yaw, pitch: player.pitch }; },
  setInput(o) { for (const k in o) if (k in hookInput) hookInput[k] = !!o[k]; },
  look(dx, dy) { doLook(dx, dy); },
  pressKey(k) { doKey(k); },
  setPlayerPose(x, y, z, yaw, pitch) { player.position.set(x, y, z); player.vel.set(0, 0, 0); if (yaw !== undefined) player.yaw = yaw; if (pitch !== undefined) player.pitch = pitch; player.eye.set(x, y + PLAYER.height - 0.1, z); },
  spawnEnemy(type, x, y, z) { return enemies.spawn(type, x, y, z); },
  getEnemies() { return enemies.list(); },
  setPaused(b) { simPaused = !!b; },
  setGodMode(b) { godMode = !!b; },
  setWaveSpawning(b) { waveSpawning = !!b; },
  step(n = 1) { for (let i = 0; i < n; i++) tick(TICK); renderFrame(TICK); },
  showScreen(name) { ui.show(name); },
};
setMode('menu');
