import { chromium } from 'playwright';
const sparks = Array.from({ length: 70 }, (_, i) => { const x = 330 + Math.sin(i * 12.9898) * 120 + (i % 7) * 6, y = 300 - ((i * 37) % 260), r = 1 + (i % 3) * 0.8, o = 0.25 + ((i * 17) % 60) / 100; return `<circle cx="${x.toFixed(1)}" cy="${y}" r="${r}" fill="#ffb347" opacity="${o.toFixed(2)}"/>`; }).join('');
const html = `<html><body style="margin:0">
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="400" viewBox="0 0 1280 400">
<defs>
 <radialGradient id="bg" cx="26%" cy="70%" r="80%"><stop offset="0" stop-color="#3a1206"/><stop offset=".45" stop-color="#140a08"/><stop offset="1" stop-color="#07080b"/></radialGradient>
 <radialGradient id="melt" cx="50%" cy="30%" r="60%"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#ffb13b"/><stop offset=".75" stop-color="#ff5a1f"/><stop offset="1" stop-color="#b3240b"/></radialGradient>
 <linearGradient id="iron" x1="0" x2="1"><stop offset="0" stop-color="#2b2e35"/><stop offset=".5" stop-color="#5b606b"/><stop offset="1" stop-color="#23262c"/></linearGradient>
 <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient>
 <linearGradient id="title" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6e0"/><stop offset="1" stop-color="#ffb35c"/></linearGradient>
 <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity=".035"/></pattern>
</defs>
<rect width="1280" height="400" fill="url(#bg)"/><rect width="1280" height="400" fill="url(#grid)"/>
<ellipse cx="330" cy="235" rx="230" ry="150" fill="url(#glow)"/>
${sparks}
<path d="M200 210 Q205 350 330 352 Q455 350 460 210 Z" fill="url(#iron)" stroke="#16181c" stroke-width="3"/>
<path d="M232 250 Q330 262 428 250" stroke="#ffffff" stroke-opacity=".08" stroke-width="3" fill="none"/>
<ellipse cx="330" cy="210" rx="130" ry="30" fill="#1b1d22" stroke="#6b707b" stroke-width="3"/>
<ellipse cx="330" cy="212" rx="116" ry="22" fill="url(#melt)"/>
<ellipse cx="310" cy="206" rx="40" ry="6" fill="#fffbe8" opacity=".7"/>
<path d="M190 206 L160 190 M470 206 L500 190" stroke="#6b707b" stroke-width="10" stroke-linecap="round"/>
<text x="600" y="190" font-family="DejaVu Sans" font-weight="bold" font-size="92" letter-spacing="9" fill="url(#title)">CRUCIBLE</text>
<text x="604" y="240" font-family="DejaVu Sans" font-size="27" fill="#f3d9bf">An autonomous game studio for Claude Code</text>
<g font-family="DejaVu Sans Mono" font-size="13.5" fill="#ffcf99" text-anchor="middle"><rect x="604" y="278" width="138" height="30" rx="15" fill="#ff7a2a" fill-opacity=".12" stroke="#ff9a4d" stroke-opacity=".5"/><text x="673.0" y="298">Game Director</text><rect x="752" y="278" width="128" height="30" rx="15" fill="#ff7a2a" fill-opacity=".12" stroke="#ff9a4d" stroke-opacity=".5"/><text x="816.0" y="298">blind critics</text><rect x="890" y="278" width="128" height="30" rx="15" fill="#ff7a2a" fill-opacity=".12" stroke="#ff9a4d" stroke-opacity=".5"/><text x="954.0" y="298">context files</text><rect x="1028" y="278" width="138" height="30" rx="15" fill="#ff7a2a" fill-opacity=".12" stroke="#ff9a4d" stroke-opacity=".5"/><text x="1097.0" y="298">human playtest</text></g>
<text x="604" y="350" font-family="DejaVu Sans" font-size="15" fill="#9a8f86">Pitch in. Game out. Every piece has to survive the fire.</text>
</svg></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 2 });
await p.setContent(html); await p.waitForTimeout(300);
await p.screenshot({ path: process.argv[2], clip: { x: 0, y: 0, width: 1280, height: 400 } }); await b.close();
