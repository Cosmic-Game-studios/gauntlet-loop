// Step-play daemon for blind playtest judges: node playd.mjs <gameDir> <port> <shotDir>
// Commands (POST JSON to http://localhost:<port>/): every command returns { state, shot } after a short settle.
//   {"do":"look"}                         just screenshot + state
//   {"do":"click","x":640,"y":400}         real mouse click (menus)
//   {"do":"key","key":"Escape"}            real key press (Escape, KeyR, Digit1, Digit2 ...)
//   {"do":"hold","keys":["KeyW"],"ms":800} hold real keys for ms (WASD, ShiftLeft, Space)
//   {"do":"move","input":{"forward":true},"ms":800,"fire":false}  hold via test hook (if real keys do nothing)
//   {"do":"turn","dx":200,"dy":0}          rotate view via test hook look(dx,dy)
//   {"do":"fire","ms":600}                 hold mouse button (real) for ms; also sets hook fire
//   {"do":"start"}                         hook start() - only if the menu cannot be operated
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [,, gameDir, port, shotDir] = process.argv; fs.mkdirSync(shotDir, { recursive: true });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const gsrv = http.createServer((q, s) => { let p = path.join(gameDir, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(+port + 1000);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://localhost:${+port + 1000}/index.html`); await p.waitForTimeout(5000);
let n = 0;
const state = () => p.evaluate(() => { try { return window.__game?.getState?.() ?? null; } catch (e) { return 'error: ' + e.message; } });
async function run(c) {
  const g = (fn, ...a) => p.evaluate(([fn, a]) => window.__game?.[fn]?.(...a), [fn, a]);
  if (c.do === 'click') await p.mouse.click(c.x, c.y);
  else if (c.do === 'key') await p.keyboard.press(c.key);
  else if (c.do === 'hold') { for (const k of c.keys) await p.keyboard.down(k); await p.waitForTimeout(c.ms || 600); for (const k of c.keys) await p.keyboard.up(k); }
  else if (c.do === 'move') { await g('setInput', { ...c.input, fire: !!c.fire }); await p.waitForTimeout(c.ms || 600); await g('setInput', { forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false }); }
  else if (c.do === 'turn') await g('look', c.dx || 0, c.dy || 0);
  else if (c.do === 'fire') { await p.mouse.down(); await g('setInput', { fire: true }); await p.waitForTimeout(c.ms || 500); await p.mouse.up(); await g('setInput', { fire: false }); }
  else if (c.do === 'start') await g('start');
  await p.waitForTimeout(350);
  const shot = path.join(shotDir, `step_${String(++n).padStart(3, '0')}.png`); await p.screenshot({ path: shot });
  return { step: n, state: await state(), shot, newErrors: errors.splice(0) };
}
http.createServer(async (q, s) => { let body = ''; q.on('data', d => body += d); q.on('end', async () => {
  try { const r = await run(JSON.parse(body || '{"do":"look"}')); s.setHeader('Content-Type', 'application/json'); s.end(JSON.stringify(r)); }
  catch (e) { s.statusCode = 500; s.end(JSON.stringify({ error: e.message })); } }); }).listen(+port);
console.log('ready', port);
