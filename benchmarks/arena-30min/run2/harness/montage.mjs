// node montage.mjs <outPng> <title> <img1> <label1> <img2> <label2> ...   -> 3x2 grid, 1920 wide
import { chromium } from 'playwright'; import fs from 'fs';
const [,, out, title, ...rest] = process.argv; const cells = [];
for (let i = 0; i < rest.length; i += 2) cells.push({ src: 'data:image/png;base64,' + fs.readFileSync(rest[i]).toString('base64'), label: rest[i + 1] });
const html = `<html><body style="margin:0;background:#111;font-family:system-ui,sans-serif;color:#eee">
<div style="padding:14px 18px;font-size:28px;font-weight:700">${title}</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 8px 8px">
${cells.map(c => `<figure style="margin:0;position:relative"><img src="${c.src}" style="width:100%;display:block;border-radius:4px">
<figcaption style="padding:6px 4px 2px;font-size:16px;color:#cfc6bc">${c.label}</figcaption></figure>`).join('')}
</div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 800 } }); await p.setContent(html); await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true }); await b.close();
