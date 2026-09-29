// Runs Dive (Mugen87) locally in headless Chromium, switches to its first-person player view,
// and writes gameplay screenshots: node run_dive_fps.mjs <outprefix> [count=6] [intervalMs=2500]
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const root = '/home/user/bench/shared/bars/dive', port = 8800 + Math.floor(Math.random() * 150);
const out = process.argv[2] || 'dive_fps', count = +(process.argv[3] || 6), every = +(process.argv[4] || 2500);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, 'app', u); if (u === '/' || u === '') p = path.join(root, 'app/index.html'); if (!fs.existsSync(p)) p = path.join(root, u); if (!fs.existsSync(p)) { s.statusCode = 404; return s.end(); } if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); s.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p)); }).listen(port);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(12000);
await p.mouse.click(640, 447); await p.waitForTimeout(10000);                 // Start
await p.getByText('enable FPS controls').click().catch(() => {}); await p.waitForTimeout(1500);
await p.getByText('Close Controls').click().catch(() => {}); await p.waitForTimeout(1500);
for (let i = 0; i < count; i++) {
  await p.mouse.move(640 + (i % 2 ? 120 : -120), 360); await p.keyboard.down('KeyW'); await p.waitForTimeout(600); await p.keyboard.up('KeyW');
  await p.waitForTimeout(every); await p.screenshot({ path: `${out}_${i}.png` });
}
await b.close(); srv.close();
