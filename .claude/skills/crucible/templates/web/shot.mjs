// Shared render tool for web games (copy to tools/shot.mjs at kickoff).
// node tools/shot.mjs <gameDir> <actions.json> <outDir> [--size 960x540] [--sheet sheet.png]
// actions.json: a list of steps, run in order in one page:
//   {"eval": "window.__studio.start()"}     run JS in the page (use the game's debug/step hook)
//   {"step": 30}                            advance the simulation 30 fixed steps via the hook named in ARCHITECTURE.md
//   {"wait": 500}                           wall-clock wait (avoid; prefer "step")
//   {"key": "KeyW", "ms": 400}              hold a real key      {"click": [640, 400]}   real click
//   {"shot": "name"}                        screenshot -> <outDir>/<name>.png
// Run it under a lock so at most two renders share the CPU:  flock -w 300 /tmp/render.lock node tools/shot.mjs ...
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const args = process.argv.slice(2); const [gameDir, actionsFile, outDir] = args;
const opt = (k, d) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : d; };
const [W, H] = opt('--size', '960x540').split('x').map(Number); const sheet = opt('--sheet', null);
const stepHook = opt('--step-hook', 'window.__studio && window.__studio.step');
fs.mkdirSync(outDir, { recursive: true });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { let p = path.join(gameDir, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H } }); const errors = [];
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
const shots = [];
for (const a of JSON.parse(fs.readFileSync(actionsFile, 'utf8'))) {
  if (a.eval) await p.evaluate(a.eval);
  else if (a.step) await p.evaluate(([h, n]) => { const f = eval(h); if (typeof f === 'function') f(n); }, [stepHook, a.step]);
  else if (a.wait) await p.waitForTimeout(a.wait);
  else if (a.key) { await p.keyboard.down(a.key); await p.waitForTimeout(a.ms || 300); await p.keyboard.up(a.key); }
  else if (a.click) await p.mouse.click(a.click[0], a.click[1]);
  else if (a.shot) { await p.waitForTimeout(80); const f = path.join(outDir, a.shot + '.png'); await p.screenshot({ path: f }); shots.push([f, a.shot]); }
}
if (sheet && shots.length) {  // contact sheet: all shots of this run in one labelled image
  const cells = shots.map(([f, n]) => `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000a;color:#fff;font:14px sans-serif;padding:2px 6px">${n}</figcaption></figure>`).join('');
  await p.setViewportSize({ width: 1600, height: 100 });
  await p.setContent(`<body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(${Math.min(3, shots.length)},1fr);gap:4px;padding:4px">${cells}</div></body>`);
  await p.screenshot({ path: path.join(outDir, sheet), fullPage: true });
}
fs.writeFileSync(path.join(outDir, 'errors.json'), JSON.stringify(errors, null, 2));
console.log(JSON.stringify({ shots: shots.map(s => s[0]), sheet: sheet ? path.join(outDir, sheet) : null, errors: errors.length }));
await b.close(); srv.close();
