import * as THREE from '../vendor/three.module.js';
import { createArena } from './arena.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { Weapons } from './weapons.js';
import { createAudio } from './audio.js';
import { EnemyManager } from './enemies.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 300);
camera.rotation.order = 'YXZ';
scene.add(camera);

const arena = createArena(scene);
const settings = { sensitivity: 1, volume: 0.7 };
try { const s = JSON.parse(localStorage.getItem('arena-settings') || 'null'); if (s) Object.assign(settings, s); } catch (e) { }

const hud = new HUD();
const audio = createAudio();
audio.setVolume(settings.volume);

const ctx = {
  THREE, scene, camera, renderer,
  colliders: arena.colliders, worldMeshes: arena.worldMeshes, nav: arena.nav,
  player: null, audio, hud, enemies: null,
  onEnemyKilled: null, settings, paused: false,
};
const player = new Player(ctx, arena);
ctx.player = player;
const enemies = new EnemyManager(ctx);
ctx.enemies = enemies;
const weapons = new Weapons(ctx);

const WAVES = 5, BREAK = 5;
const game = {
  mode: 'menu', wave: 0, score: 0, waveSpawning: true, testPaused: false,
  breakT: 0, toSpawn: [], spawnT: 0, inBreak: false,
};

ctx.onEnemyKilled = (type) => { game.score += type === 'shooter' ? 150 : 100; };
player.onDamage = (amount, from) => { hud.damage(from); audio.play('playerHurt'); };
player.onJump = () => audio.play('jump');
player.onLand = () => audio.play('land');

// ---------- screens ----------
const screens = ['menu', 'pause', 'settings', 'gameover', 'victory'].reduce((o, id) => (o[id] = document.getElementById(id), o), {});
let settingsReturn = 'menu';
function showScreen(id) { for (const k in screens) screens[k].classList.toggle('on', k === id); }

function setMode(m) {
  game.mode = m;
  hud.show(m === 'playing' || m === 'paused');
  if (m === 'menu') showScreen('menu');
  else if (m === 'paused') showScreen('pause');
  else if (m === 'gameover') { document.getElementById('go-info').textContent = `WAVE ${game.wave} · SCORE ${game.score}`; showScreen('gameover'); unlock(); }
  else if (m === 'victory') { document.getElementById('vi-info').textContent = `ALL WAVES CLEARED · SCORE ${game.score}`; showScreen('victory'); unlock(); }
  else showScreen(null);
}
function lock() { try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

function resetRun() {
  enemies.clear(); weapons.reset(); player.reset();
  for (const k in player.input) player.input[k] = false;
  game.wave = 0; game.score = 0; game.toSpawn.length = 0; game.inBreak = false;
  beginBreak(2);
}
function beginBreak(t) { game.inBreak = true; game.breakT = t; }
function startWave(n) {
  game.wave = n; game.inBreak = false;
  enemies.setDifficulty(n);
  const count = 3 + 2 * n;
  const shooters = Math.min(count - 1, Math.floor(count * (0.15 + 0.1 * n)));
  game.toSpawn.length = 0;
  for (let i = 0; i < count; i++) game.toSpawn.push(i < shooters ? 'shooter' : 'rusher');
  for (let i = game.toSpawn.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [game.toSpawn[i], game.toSpawn[j]] = [game.toSpawn[j], game.toSpawn[i]]; }
  game.spawnT = 0;
  hud.banner('WAVE ' + n);
  audio.play('waveStart');
}
function startGame() {
  audio.resume();
  resetRun();
  setMode('playing');
}

function pickSpawn() {
  const sp = arena.nav.spawnPoints;
  let best = sp[0], bd = -1;
  for (let k = 0; k < 3; k++) {
    const p = sp[(Math.random() * sp.length) | 0];
    const d = (p[0] - player.pos.x) ** 2 + (p[1] - player.pos.z) ** 2;
    if (d > bd) { bd = d; best = p; }
  }
  return best;
}

function updateWaves(dt) {
  if (!game.waveSpawning) return;
  if (game.inBreak) {
    game.breakT -= dt;
    if (game.breakT <= 0) startWave(game.wave + 1);
    return;
  }
  if (game.toSpawn.length) {
    game.spawnT -= dt;
    if (game.spawnT <= 0) {
      const type = game.toSpawn.pop(); const p = pickSpawn();
      enemies.spawn(type, p[0] + (Math.random() - 0.5), 0, p[1] + (Math.random() - 0.5));
      game.spawnT = Math.max(0.4, 1.4 - game.wave * 0.2);
    }
  } else if (game.wave > 0 && enemies.aliveCount() === 0) {
    if (game.wave >= WAVES) { setMode('victory'); return; }
    hud.banner('WAVE ' + game.wave + ' CLEARED', 2);
    beginBreak(BREAK);
  }
}

// ---------- input ----------
const keyMap = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump' };
document.addEventListener('keydown', e => {
  if (keyMap[e.code]) { player.input[keyMap[e.code]] = true; if (e.code === 'Space') e.preventDefault(); return; }
  if (e.repeat) return;
  if (e.code === 'Escape') { /* browser releases pointer lock; handled via pointerlockchange */ if (!document.pointerLockElement) pressKey('Escape'); return; }
  if (e.code === 'KeyR') pressKey('r');
  else if (e.code === 'Digit1') pressKey('1');
  else if (e.code === 'Digit2') pressKey('2');
});
document.addEventListener('keyup', e => { if (keyMap[e.code]) player.input[keyMap[e.code]] = false; });
document.addEventListener('mousemove', e => {
  if (game.mode !== 'playing' || !document.pointerLockElement) return;
  player.look(e.movementX, e.movementY, settings.sensitivity);
});
renderer.domElement.addEventListener('mousedown', e => {
  if (game.mode !== 'playing') return;
  if (!document.pointerLockElement) { lock(); return; }
  if (e.button === 0) player.input.fire = true;
});
document.addEventListener('mouseup', e => { if (e.button === 0) player.input.fire = false; });
document.addEventListener('wheel', e => { if (game.mode === 'playing') { weapons.next(); audio.play('switch'); } }, { passive: true });
let hadLock = false;
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) hadLock = true;
  else if (hadLock && game.mode === 'playing') { hadLock = false; setMode('paused'); }
});
window.addEventListener('blur', () => { for (const k in player.input) player.input[k] = false; });

function pressKey(k) {
  if (k === 'Escape') {
    if (game.mode === 'playing') { setMode('paused'); unlock(); }
    else if (game.mode === 'paused') resume();
    return;
  }
  if (game.mode !== 'playing') return;
  if (k === 'r' || k === 'R') weapons.reload();
  else if (k === '1') { weapons.select('rifle'); audio.play('switch'); }
  else if (k === '2') { weapons.select('shotgun'); audio.play('switch'); }
}
function resume() { setMode('playing'); lock(); }

document.getElementById('b-play').onclick = () => { startGame(); lock(); };
document.getElementById('b-resume').onclick = resume;
document.getElementById('b-quit').onclick = () => { enemies.clear(); setMode('menu'); };
document.querySelectorAll('[data-restart]').forEach(b => b.onclick = () => { startGame(); lock(); });
document.querySelectorAll('[data-settings]').forEach(b => b.onclick = () => { settingsReturn = game.mode === 'paused' ? 'pause' : 'menu'; showScreen('settings'); });
document.getElementById('b-back').onclick = () => showScreen(settingsReturn);
const sSens = document.getElementById('s-sens'), sVol = document.getElementById('s-vol');
sSens.value = settings.sensitivity; sVol.value = settings.volume;
function syncSettings() {
  settings.sensitivity = parseFloat(sSens.value); settings.volume = parseFloat(sVol.value);
  document.getElementById('s-sens-v').textContent = settings.sensitivity.toFixed(2);
  document.getElementById('s-vol-v').textContent = Math.round(settings.volume * 100);
  audio.setVolume(settings.volume);
  try { localStorage.setItem('arena-settings', JSON.stringify(settings)); } catch (e) { }
}
sSens.oninput = syncSettings; sVol.oninput = syncSettings; syncSettings();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- loop ----------
const hudState = { wave: 0, score: 0, enemiesAlive: 0, health: 100, weapon: 'rifle', ammo: 0, reserve: 0, reloading: false, spread: 0, px: 0, pz: 0, yaw: 0, breakText: '' };
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  const sim = game.mode === 'playing' && !game.testPaused;
  ctx.paused = !sim;
  if (sim) {
    player.update(dt);
    updateWaves(dt);
    if (game.mode === 'playing') {
      enemies.update(dt);
      weapons.update(dt, player.input.fire && player.alive, player.moveAmount, player.sprinting);
      const r = weapons.consumeRecoil();
      if (r) { player.pitch += r.pitch || 0; player.yaw += r.yaw || 0; player.clampPitch(); }
      if (!player.alive) setMode('gameover');
    }
  }
  camera.position.copy(player.pos);
  camera.rotation.set(player.pitch, player.yaw, 0);
  if (game.mode === 'playing' || game.mode === 'paused') {
    const ws = weapons.getState();
    hudState.wave = game.wave; hudState.score = game.score; hudState.enemiesAlive = enemies.aliveCount() + game.toSpawn.length;
    hudState.health = player.health; hudState.weapon = ws.weapon; hudState.ammo = ws.ammo; hudState.reserve = ws.reserve;
    hudState.reloading = ws.reloading; hudState.spread = ws.spread != null ? ws.spread : Math.min(1, player.moveAmount * 0.6 + (player.input.fire ? 0.4 : 0));
    hudState.px = player.pos.x; hudState.pz = player.pos.z; hudState.yaw = player.yaw;
    hudState.breakText = game.inBreak && game.waveSpawning ? 'NEXT WAVE IN ' + Math.ceil(game.breakT) : '';
    hud.update(sim ? dt : 0, hudState);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ---------- test hook ----------
window.__game = {
  start() { startGame(); },
  getState() {
    const ws = weapons.getState();
    return {
      mode: game.mode, wave: game.wave, health: player.health, weapon: ws.weapon, ammo: ws.ammo, reserve: ws.reserve,
      score: game.score, enemiesAlive: enemies.aliveCount(), playerPos: [player.pos.x, player.pos.y, player.pos.z],
      yaw: player.yaw, pitch: player.pitch,
    };
  },
  setInput(o) { for (const k in o) if (k in player.input) player.input[k] = !!o[k]; },
  look(dx, dy) { player.look(dx, dy, settings.sensitivity); },
  pressKey(k) { pressKey(k); },
  setPlayerPose(x, y, z, yaw, pitch) {
    player.pos.set(x, y, z); player.vel.set(0, 0, 0);
    if (yaw != null) player.yaw = yaw; if (pitch != null) { player.pitch = pitch; player.clampPitch(); }
  },
  spawnEnemy(type, x, y, z) { return enemies.spawn(type, x, y || 0, z); },
  getEnemies() { return enemies.list(); },
  setPaused(b) { game.testPaused = !!b; },
  setGodMode(b) { player.god = !!b; },
  setWaveSpawning(b) { game.waveSpawning = !!b; },
};
