// Shared render tool for web games (copy to tools/shot.mjs at kickoff).
// node tools/shot.mjs <gameDir> <actions.json> <outDir> [--size 960x540] [--sheet sheet.png]
// actions.json: a list of steps, run in order in one page:
//   {"eval": "window.__studio.start()"}     run JS in the page (use the game's debug/step hook)
//   {"step": 30}                            advance the simulation 30 fixed steps via the hook named in ARCHITECTURE.md
//   {"wait": 500}                           wall-clock wait (avoid; prefer "step")
//   {"key": "KeyW", "ms": 400}              hold a real key      {"click": [640, 400]}   real click
//   {"shot": "name"}                        screenshot -> <outDir>/<name>.png
//   {"strip": "name", "frames": 8, "step": 3, "js": "..."}   filmstrip in one image: frames `step` ticks apart (animation, recoil,
//                                           effects); `js` runs before each frame with ${i} replaced (turntables: rotate the model by i)
// Run it under one of two locks so at most two renders share the CPU, and skip the render if the wait times out:
//   flock -w 60 /tmp/render.$((RANDOM%2)).lock node tools/shot.mjs ...
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const args = process.argv.slice(2); const [gameDir, actionsFile, outDir] = args;
const opt = (k, d) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : d; };
const [W, H] = opt('--size', '960x540').split('x').map(Number); const sheet = opt('--sheet', null);
const stepHook = opt('--step-hook', '(window.__studio && window.__studio.step) || (window.__game && window.__game.step)');
fs.mkdirSync(outDir, { recursive: true });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ROOT = path.resolve(gameDir);
const resolveSafe = url => { const p = path.resolve(ROOT, '.' + path.posix.normalize('/' + decodeURIComponent(url.split('?')[0]))); return p === ROOT || p.startsWith(ROOT + path.sep) ? p : null; };
const srv = http.createServer((q, s) => { let p = resolveSafe(q.url); if (!p) { s.statusCode = 403; return s.end(); } if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H } }); const errors = [];
p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(1500);
const shots = [];
for (const a of JSON.parse(fs.readFileSync(actionsFile, 'utf8'))) {
  if (a.strip) {
    const imgs = [], k = a.step || 3, nf = Math.min(a.frames || 8, 12);
    for (let i = 0; i < nf; i++) {
      if (a.js) await p.evaluate(a.js.replaceAll('${i}', String(i)));
      await p.evaluate(([h, n]) => { const f = eval(h); if (typeof f !== 'function') throw new Error('step hook missing: ' + h); f(n); }, [stepHook, k]);
      imgs.push((await p.screenshot({ type: 'jpeg', quality: 80 })).toString('base64'));
    }
    const sp = await b.newPage({ viewport: { width: 1600, height: 100 } });
    await sp.setContent(`<body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(${Math.min(4, nf)},1fr);gap:3px;padding:3px">${imgs.map((d, i) => `<figure style="margin:0;position:relative"><img src="data:image/jpeg;base64,${d}" style="width:100%;display:block"><figcaption style="position:absolute;left:4px;top:4px;background:#000b;color:#fff;font:13px sans-serif;padding:1px 5px">${i + 1} (+${k * i}t)</figcaption></figure>`).join('')}</div></body>`);
    const f = path.join(outDir, a.strip + '.png'); await sp.screenshot({ path: f, fullPage: true }); await sp.close(); shots.push([f, a.strip]);
  }
  else if (a.eval) await p.evaluate(a.eval);
  else if (a.step) await p.evaluate(([h, n]) => { const f = eval(h); if (typeof f !== 'function') throw new Error('step hook missing: ' + h); f(n); }, [stepHook, a.step]);
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
