// Performance probe for web games (copy to tools/perf.mjs). node tools/perf.mjs <gameDir> <out.json>
// Instruments WebGL draw calls and triangles before the game loads, then measures menu, idle and a fixed
// combat load through the game's debug hook (edit the hook calls below to match ARCHITECTURE.md).
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [,, gameDir, outFile] = process.argv;
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { let p = path.join(gameDir, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(0);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.addInitScript(() => {
  const P = window.__perf = { calls: 0, tris: 0, frames: 0, heap: [] };
  const wrap = (proto, name, triFn) => { const o = proto[name]; if (!o) return; proto[name] = function (...a) { P.calls++; P.tris += triFn(a); return o.apply(this, a); }; };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue; const pr = C.prototype;
    const tri = (mode, count, inst = 1) => (mode === 4 ? count / 3 : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0) * inst;
    wrap(pr, 'drawArrays', a => tri(a[0], a[2])); wrap(pr, 'drawElements', a => tri(a[0], a[1]));
    wrap(pr, 'drawArraysInstanced', a => tri(a[0], a[2], a[3])); wrap(pr, 'drawElementsInstanced', a => tri(a[0], a[1], a[4])); }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(t => { P.frames++; cb(t); });
  window.__perfT0 = performance.now();
});
const t0 = Date.now(); await p.goto(`http://localhost:${srv.address().port}/index.html`);
await p.waitForFunction(() => window.__game && document.readyState === 'complete', null, { timeout: 30000 }).catch(() => {});
const loadMs = Date.now() - t0; await p.waitForTimeout(3000);
const window_ = async ms => {
  await p.evaluate(() => { const P = window.__perf; P.calls = 0; P.tris = 0; P.frames = 0; P.heap = []; P.iv = setInterval(() => performance.memory && P.heap.push(performance.memory.usedJSHeapSize), 250); });
  await p.waitForTimeout(ms);
  return p.evaluate(ms => { const P = window.__perf; clearInterval(P.iv); const h = P.heap;
    return { fps: +(P.frames / (ms / 1000)).toFixed(1), drawCallsPerFrame: Math.round(P.calls / Math.max(1, P.frames)), trianglesPerFrame: Math.round(P.tris / Math.max(1, P.frames)),
      heapMB: h.length ? +(h[h.length - 1] / 1048576).toFixed(1) : null, heapSawtoothMB: h.length ? +((Math.max(...h) - Math.min(...h)) / 1048576).toFixed(1) : null }; }, ms);
};
const G = (fn, ...a) => p.evaluate(([fn, a]) => window.__game?.[fn]?.(...a), [fn, a]);
const R = { loadMs };
R.menu = await window_(5000);
await G('start'); await G('setGodMode', true); await G('setWaveSpawning', false); await p.waitForTimeout(1500);
R.idle = await window_(6000);
const s = await p.evaluate(() => window.__game?.getState?.()); const [x, y, z] = s?.playerPos || [0, 0, 0];
for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 9 + (i % 3) * 3; await G('spawnEnemy', i % 2 ? 'shooter' : 'rusher', x + Math.cos(a) * r, y, z + Math.sin(a) * r); }
await p.waitForTimeout(800); await G('setInput', { fire: true });
R.combat12 = await window_(8000); await G('setInput', { fire: false });
fs.writeFileSync(outFile, JSON.stringify(R, null, 2)); console.log(JSON.stringify(R));
await b.close(); srv.close(); process.exit(0);
