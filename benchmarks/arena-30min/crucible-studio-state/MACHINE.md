# MACHINE (probe HB-001, 2026-09-29 11:01 UTC)
- CPU 4 cores, 15 GB RAM, 30 GB free disk. No GPU: WebGL via headless Chromium + SwiftShader (CPU) - fps is relative only.
- Chromium: /opt/pw-browsers/chromium-1194/chrome-linux/chrome, args --use-angle=swiftshader --enable-unsafe-swiftshader; Playwright 1.56 (node_modules symlink).
- Node 22, python3. No Blender, Godot, Unity, Unreal, ffmpeg. No image/audio/3D generation tools.
- Network: GitHub + npm only. No external assets allowed anyway (SPEC).
- Engine: web, three.js 0.186.1 (fixed by bench). Capture: Playwright screenshots (PNG) + state traces via window.__game.
- Bars on disk: /home/user/bench/shared/bars/dive (Dive, Mugen87), /home/user/bench/shared/bars/threejs-games-fps; bar screenshots /home/user/bench/shared/dive_1.png, dive_2.png.
