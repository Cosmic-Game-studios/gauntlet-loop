// Check registry for web games (copy to tools/check.mjs; QA fills in the checks).
//   node tools/check.mjs <id> [--suite visible|heldout]   exit 0 = pass
// Visible checks live in tools/checks.mjs, held-out checks in studio/.qa-heldout/checks.mjs; each module exports
//   export default { 'A-01': async ({ page, hook, step }) => { ... throw new Error('why') on failure ... } }
// `hook(fn, ...args)` calls the game's debug/test hook, `step(n)` advances the fixed-step simulation.
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const [id] = process.argv.slice(2); const si = process.argv.indexOf('--suite'); const suite = si > 0 ? process.argv[si + 1] : 'visible';
const HOOK = process.env.GAME_HOOK || '__game', GAME = path.resolve(process.env.GAME_DIR || 'game');
const registry = (await import(pathToFileURL(path.resolve(suite === 'heldout' ? 'studio/.qa-heldout/checks.mjs' : 'tools/checks.mjs')).href)).default;
if (!registry[id]) { console.log(`unknown check ${id}`); process.exit(2); }
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const safe = u => { const p = path.resolve(GAME, '.' + path.posix.normalize('/' + decodeURIComponent(u.split('?')[0]))); return p === GAME || p.startsWith(GAME + path.sep) ? p : null; };
const srv = http.createServer((q, s) => { let p = safe(q.url); if (!p) { s.statusCode = 403; return s.end(); } if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(0);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 960, height: 540 } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
let code = 0;
try {
  await page.goto(`http://localhost:${srv.address().port}/index.html`); await page.waitForFunction(h => !!window[h], HOOK, { timeout: 15000 });
  const hook = (fn, ...a) => page.evaluate(([h, fn, a]) => window[h][fn](...a), [HOOK, fn, a]);
  const step = n => hook('step', n);
  await registry[id]({ page, hook, step, errors });
  if (errors.length) throw new Error('page errors: ' + errors.slice(0, 3).join(' | '));
  console.log(`${id} pass`);
} catch (e) { console.log(`${id} FAIL: ${e.message}`); code = 1; }
await b.close(); srv.close(); process.exit(code);
