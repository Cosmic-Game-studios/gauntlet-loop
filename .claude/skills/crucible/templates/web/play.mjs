// Step-play tool for web games (copied to tools/play.mjs at kickoff): an agent plays the running build turn by turn and sees what a player sees.
// Used by the Visual QA inspector and playtesters.
//
//   node tools/play.mjs serve <gameDir> <port> <shotDir> [--size 1280x720]   start a session (run in the background; one per agent)
//   node tools/play.mjs <port> '<command json>'                               send one command; prints {state, shot} - open the shot
//   node tools/play.mjs <port> '{"do":"quit"}'                                end the session
//
// Commands (each returns the game state from the test hook and one screenshot path):
//   {"do":"look"}                              screenshot + state only
//   {"do":"click","x":640,"y":400}             real mouse click (menus)
//   {"do":"key","key":"Escape"}                real key press (Escape, KeyR, Digit1 ...)
//   {"do":"hold","keys":["KeyW"],"ms":800}     hold real keys
//   {"do":"move","input":{"forward":true},"ms":800}   hold input through the hook's setInput (if the game has one)
//   {"do":"turn","dx":200,"dy":0}              rotate the view through the hook's look(dx, dy)
//   {"do":"fire","ms":500}                     hold the mouse button (and the hook's fire input)
//   {"do":"eval","js":"window.__game.spawnEnemy('rusher',0,0,-6)"}   call the debug hook (spawn, pose, show a screen)
//   {"do":"strip","frames":8,"step":3,"fire":true}   filmstrip: 8 frames, 3 simulation ticks apart, in one image (motion, animation, effects);
//                                              "fire":true holds fire during it; "js" with ${i} runs before each frame (turntables, poses)
//   {"do":"zoom","x":480,"y":200,"w":320,"h":180}   screenshot of a region, enlarged (inspect a model, an outline, a texture)
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';

const argv = process.argv.slice(2);
if (argv[0] !== 'serve') {  // client
  const [port, cmd] = argv;
  const r = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: cmd || '{"do":"look"}' }).catch(e => ({ text: async () => JSON.stringify({ error: 'no session on port ' + port + ': ' + e.message }) }));
  console.log(await r.text()); process.exit(0);
}
const [, gameDir, port, shotDir] = argv; const opt = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const [W, H] = opt('--size', '1280x720').split('x').map(Number);
fs.mkdirSync(shotDir, { recursive: true });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
const ROOT = path.resolve(gameDir);
const resolveSafe = url => { const p = path.resolve(ROOT, '.' + path.posix.normalize('/' + decodeURIComponent(url.split('?')[0]))); return p === ROOT || p.startsWith(ROOT + path.sep) ? p : null; };
const gsrv = http.createServer((q, s) => { let p = resolveSafe(q.url); if (!p) { s.statusCode = 403; return s.end(); } if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(0, '127.0.0.1');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H } }); const errors = [];
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`http://127.0.0.1:${gsrv.address().port}/index.html`);
await p.waitForFunction(() => !!(window.__studio || window.__game), null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(500);

let n = 0;
const hook = '(window.__studio || window.__game)';
const g = (fn, ...a) => p.evaluate(([h, fn, a]) => { const o = eval(h); return o && typeof o[fn] === 'function' ? o[fn](...a) : undefined; }, [hook, fn, a]);
const state = () => p.evaluate(h => { try { const o = eval(h); return o && o.getState ? o.getState() : null; } catch (e) { return 'error: ' + e.message; } }, hook);
const file = tag => path.join(shotDir, `${String(++n).padStart(3, '0')}-${tag}.png`);

async function strip(c) {
  const frames = Math.min(c.frames || 8, 12), stepN = c.step || 3, imgs = [];
  if (c.fire) { await g('setInput', { fire: true }); await p.mouse.down().catch(() => {}); }
  for (let i = 0; i < frames; i++) {
    if (c.js) await p.evaluate(c.js.replaceAll('${i}', String(i)));
    const stepped = await p.evaluate(([h, k]) => { const o = eval(h); if (o && typeof o.step === 'function') { o.step(k); return true; } return false; }, [hook, stepN]);
    if (!stepped) await p.waitForTimeout(stepN * 17);
    imgs.push((await p.screenshot({ type: 'jpeg', quality: 80 })).toString('base64'));
  }
  if (c.fire) { await g('setInput', { fire: false }); await p.mouse.up().catch(() => {}); }
  const cols = Math.min(4, frames), sheet = await b.newPage({ viewport: { width: 1600, height: 100 } });
  await sheet.setContent(`<body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:3px;padding:3px">${imgs.map((d, i) => `<figure style="margin:0;position:relative"><img src="data:image/jpeg;base64,${d}" style="width:100%;display:block"><figcaption style="position:absolute;left:4px;top:4px;background:#000b;color:#fff;font:13px sans-serif;padding:1px 5px">${i + 1} (+${stepN * i}t)</figcaption></figure>`).join('')}</div></body>`);
  const f = file('strip'); await sheet.screenshot({ path: f, fullPage: true }); await sheet.close(); return f;
}

async function run(c) {
  if (c.do === 'click') await p.mouse.click(c.x, c.y);
  else if (c.do === 'key') await p.keyboard.press(c.key);
  else if (c.do === 'hold') { for (const k of c.keys) await p.keyboard.down(k); await p.waitForTimeout(c.ms || 600); for (const k of c.keys) await p.keyboard.up(k); }
  else if (c.do === 'move') { await g('setInput', { ...c.input }); await p.waitForTimeout(c.ms || 600); await g('setInput', { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false }); }
  else if (c.do === 'turn') await g('look', c.dx || 0, c.dy || 0);
  else if (c.do === 'fire') { await p.mouse.down(); await g('setInput', { fire: true }); await p.waitForTimeout(c.ms || 500); await p.mouse.up(); await g('setInput', { fire: false }); }
  else if (c.do === 'eval') { const r = await p.evaluate(c.js).catch(e => 'error: ' + e.message); if (r !== undefined) c.result = r; }
  else if (c.do === 'strip') return { state: await state(), shot: await strip(c), errors: errors.splice(0) };
  if (c.do === 'zoom') {
    const f = file('zoom'); const s = Math.max(1, Math.min(4, Math.floor(Math.min(W / c.w, H / c.h))));
    const buf = await p.screenshot({ clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
    const z = await b.newPage({ viewport: { width: c.w * s, height: c.h * s } });
    await z.setContent(`<body style="margin:0"><img src="data:image/png;base64,${buf.toString('base64')}" style="width:${c.w * s}px;image-rendering:pixelated;display:block"></body>`);
    await z.screenshot({ path: f }); await z.close();
    return { state: await state(), shot: f, errors: errors.splice(0) };
  }
  await p.waitForTimeout(250);
  const f = file(c.do); await p.screenshot({ path: f });
  return { state: await state(), shot: f, ...(c.result !== undefined ? { result: c.result } : {}), errors: errors.splice(0) };
}

let busy = Promise.resolve();
const srv = http.createServer((q, s) => {
  let body = ''; q.on('data', d => (body += d));
  q.on('end', () => {
    busy = busy.then(async () => {
      let c; try { c = JSON.parse(body || '{"do":"look"}'); } catch { s.end(JSON.stringify({ error: 'bad json' })); return; }
      if (c.do === 'quit') { s.end('{"ok":true}'); await b.close(); gsrv.close(); srv.close(); process.exit(0); }
      try { s.end(JSON.stringify(await run(c))); } catch (e) { s.end(JSON.stringify({ error: e.message })); }
    });
  });
}).listen(+port, '127.0.0.1');
console.log(JSON.stringify({ session: +port, shots: shotDir }));
