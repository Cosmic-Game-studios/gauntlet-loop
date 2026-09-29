// Independent evaluator for the Arena benchmark. Usage: node eval.mjs <gameDir> <outDir>
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [,, gameDir, outDir] = process.argv; fs.mkdirSync(outDir, { recursive: true });
const types = { '.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm' };
const port = 9000 + Math.floor(Math.random() * 900);
const srv = http.createServer((q, s) => { let p = path.join(gameDir, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(port);
const R = { checks: {}, notes: [], errors: [] };
const ok = (k, v, note) => { R.checks[k] = !!v; if (note !== undefined) R.notes.push(`${k}: ${note}`); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW||1280), height: +(process.env.VH||720) } });
p.on('pageerror', e => R.errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') R.errors.push('console: ' + m.text()); });
const G = (fn, ...a) => p.evaluate(([fn, a]) => { const g = window.__game; return g && g[fn] ? g[fn](...a) : '__missing__'; }, [fn, a]);
const st = () => p.evaluate(() => window.__game?.getState?.());
const shot = async n => p.screenshot({ path: path.join(outDir, n + '.png') });
const wait = ms => p.waitForTimeout(ms);
const frames = async ms => { const f0 = await p.evaluate(() => { window.__fc = 0; const t = () => { window.__fc++; requestAnimationFrame(t); }; requestAnimationFrame(t); return 0; }); await wait(ms); return (await p.evaluate(() => window.__fc)) / (ms / 1000); };
const dist = (a, c) => Math.hypot(a[0] - c[0], a[2] - c[2]);
try {
  await p.goto(`http://localhost:${port}/index.html`); await wait(6000); await shot('01_menu');
  const hook = await p.evaluate(() => window.__game ? Object.keys(window.__game) : null);
  const need = ['start','getState','setInput','look','pressKey','setPlayerPose','spawnEnemy','getEnemies','setPaused','setGodMode','setWaveSpawning'];
  ok('hook_complete', hook && need.every(k => hook.includes(k)), hook ? 'missing: ' + need.filter(k => !hook.includes(k)).join(',') : 'no __game');
  if (!hook) throw new Error('no hook');
  await G('start'); await G('setGodMode', true); await G('setWaveSpawning', false); await wait(1500);
  let s = await st(); ok('start_playing', s?.mode === 'playing', JSON.stringify(s));
  // clear any pre-spawned enemies from view by pausing waves; idle fps
  R.fps_idle = await frames(5000); await shot('02_start_view');
  // Movement + gravity
  const p0 = (await st()).playerPos; await G('setInput', { forward: true }); await wait(1500); await G('setInput', { forward: false }); await wait(300);
  const p1 = (await st()).playerPos; ok('moves', dist(p0, p1) > 1, `moved ${dist(p0, p1).toFixed(2)}m`);
  await G('setInput', { sprint: true, forward: true }); await wait(1000); await G('setInput', { sprint: false, forward: false }); const p2 = (await st()).playerPos;
  ok('sprint_faster', dist(p1, p2) > dist(p0, p1) * 0.66 * 1.2, `1.5s walk ${dist(p0,p1).toFixed(2)} vs 1s sprint ${dist(p1,p2).toFixed(2)}`);
  const yb = (await st()).playerPos[1]; await G('setInput', { jump: true }); await wait(250); const ym = (await st()).playerPos[1]; await G('setInput', { jump: false }); await wait(1500); const ya = (await st()).playerPos[1];
  ok('jump_and_land', ym > yb + 0.3 && Math.abs(ya - yb) < 0.3, `y ${yb.toFixed(2)} -> ${ym.toFixed(2)} -> ${ya.toFixed(2)}`);
  // Collision: run 12 s in each of 4 directions from start, must stay in a bounded arena and above floor
  let bounded = true, minY = 1e9, maxR = 0;
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { await G('setPlayerPose', p0[0], p0[1], p0[2], yaw, 0); await wait(200); await G('setInput', { forward: true, sprint: true }); for (let i = 0; i < 12; i++) { await wait(1000); const q = (await st()).playerPos; minY = Math.min(minY, q[1]); maxR = Math.max(maxR, Math.hypot(q[0], q[2])); } await G('setInput', { forward: false, sprint: false }); }
  ok('collision_bounded', maxR < 150 && minY > p0[1] - 3, `max radius ${maxR.toFixed(1)}m, min y ${minY.toFixed(2)} (start y ${p0[1].toFixed(2)})`);
  // Shooting: find the forward direction convention by trying spawn positions
  await G('setPlayerPose', p0[0], p0[1], p0[2], 0, 0); await wait(300);
  const s0 = await st(); const ammo0 = s0.ammo;
  let hit = false, hitInfo = '';
  for (const [dx, dz] of [[0, -8], [0, 8], [8, 0], [-8, 0]]) {
    for (const pitch of [0, -0.12]) {
      for (const e of (await G('getEnemies')) || []) {} // noop
      await G('setPlayerPose', p0[0], p0[1], p0[2], 0, pitch);
      const id = await G('spawnEnemy', 'rusher', p0[0] + dx, p0[1] - 1.6 < -50 ? 0 : Math.max(0, p0[1] - 1.7), p0[2] + dz); await wait(300);
      const before = ((await G('getEnemies')) || []).find(e => e.id === id);
      await G('setInput', { fire: true }); await wait(1200); await G('setInput', { fire: false }); await wait(200);
      const after = ((await G('getEnemies')) || []).find(e => e.id === id);
      if (before && (!after || !after.alive || after.health < before.health)) { hit = true; hitInfo = `dir ${dx},${dz} pitch ${pitch}`; break; }
      await G('pressKey', 'r'); await wait(2500);
    }
    if (hit) break;
  }
  ok('shoot_hits_enemy', hit, hitInfo || 'no enemy took damage in 8 attempts');
  await G('setInput', { fire: true }); await wait(400); await shot('03_firing'); await G('setInput', { fire: false });
  const s1 = await st(); ok('ammo_decreases', s1.ammo < ammo0 || s1.reserve < s0.reserve, `ammo ${ammo0} -> ${s1.ammo}, reserve ${s0.reserve} -> ${s1.reserve}`);
  const r0 = await st(); await G('pressKey', 'r'); await wait(3500); const r1 = await st();
  ok('reload', r1.ammo > r0.ammo || r0.ammo === 30, `mag ${r0.ammo}->${r1.ammo} reserve ${r0.reserve}->${r1.reserve}`);
  await G('pressKey', '2'); await wait(800); const w2 = (await st()).weapon; await shot('04_shotgun'); await G('pressKey', '1'); await wait(800); const w1 = (await st()).weapon;
  ok('weapon_switch', w2 === 'shotgun' && w1 === 'rifle', `${w2}, ${w1}`);
  // Enemies close up for the visual set (paused)
  for (const e of (await G('getEnemies')) || []) {}
  await G('setPlayerPose', p0[0], p0[1], p0[2], 0, 0);
  const shots = [];
  for (const [dx, dz] of [[0, -6], [0, 6], [6, 0], [-6, 0]]) { shots.push(await G('spawnEnemy', 'rusher', p0[0] + dx - 1.5, Math.max(0, p0[1] - 1.7), p0[2] + dz)); shots.push(await G('spawnEnemy', 'shooter', p0[0] + dx + 1.5, Math.max(0, p0[1] - 1.7), p0[2] + dz)); }
  await wait(800); R.fps_combat = await frames(5000);
  for (const [i, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) { await G('setPlayerPose', p0[0], p0[1], p0[2], yaw, -0.05); await G('setPaused', true); await wait(600); await shot(`05_view_${i}`); await G('setPaused', false); }
  // Enemy AI damage
  await G('setGodMode', false); const h0 = (await st()).health; await wait(8000); const h1 = (await st()).health;
  ok('enemies_damage_player', h1 < h0 || (await st()).mode === 'gameover', `health ${h0} -> ${h1}`);
  const en = (await G('getEnemies')) || []; ok('enemies_move', en.some(e => e.alive && dist(e.pos, [p0[0], 0, p0[2]]) < 5.5) || h1 < h0, 'some enemy closed in or dealt damage');
  await shot('06_under_attack');
  // Game over
  await wait(20000); let m = (await st()).mode; if (m !== 'gameover') { for (let i = 0; i < 8; i++) await G('spawnEnemy', 'rusher', p0[0] + 2, Math.max(0, p0[1] - 1.7), p0[2] + 2); await wait(20000); m = (await st()).mode; }
  ok('game_over', m === 'gameover', m); await shot('07_gameover');
  // Waves
  await G('start'); await G('setGodMode', true); await G('setWaveSpawning', true); await wait(12000); const ws = await st();
  ok('waves_spawn', ws.wave >= 1 && ws.enemiesAlive > 0, `wave ${ws.wave}, alive ${ws.enemiesAlive}`); await shot('08_wave');
  // Pause
  await G('pressKey', 'Escape'); await wait(800); ok('pause_menu', (await st()).mode === 'paused', (await st()).mode); await shot('09_pause');
} catch (e) { R.errors.push('eval: ' + e.message); }
R.score = Object.values(R.checks).filter(Boolean).length + '/' + Object.keys(R.checks).length;
fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(R, null, 2)); console.log(JSON.stringify({ score: R.score, fps_idle: R.fps_idle, fps_combat: R.fps_combat, errors: R.errors.length }));
await b.close(); srv.close(); process.exit(0);
