#!/usr/bin/env bash
# Web sprint kickoff (run from the project root). Saves the Director the mechanical first minutes.
#   bash .claude/skills/crucible/templates/web/kickoff.sh <game-dir> <module> [<module> ...]
# e.g. kickoff.sh game main world player weapons enemies vfx ui audio
# - vendors three.js (module, core, addons) into <game-dir>/vendor/ and writes index.html with an import map
#   for 'three' and 'three/addons/' (only the Director edits index.html afterwards)
# - writes one stub per module in <game-dir>/src/, so half-built modules never break another builder's render
# - copies src/lookdev.js (renderer, post, toon ramp, ink outlines, merge-by-material, canvas textures) as a starting point
# - copies the shared tools (incl. pack.mjs for context packs) into tools/, generates studio/prompts/ from the role files, creates the studio/ files
set -eu
SKILL="$(cd "$(dirname "$0")/../.." && pwd)"; GAME="$1"; shift
THREE="$(node -e "console.log(require('path').dirname(require.resolve('three/package.json')))" 2>/dev/null || echo node_modules/three)"
mkdir -p "$GAME/vendor/addons" "$GAME/src" tools studio/prompts studio/evidence studio/bars studio/tickets studio/packs
cp "$THREE/build/three.module.js" "$THREE/build/three.core.js" "$GAME/vendor/"
cp -r "$THREE/examples/jsm/." "$GAME/vendor/addons/"
[ -f "$GAME/index.html" ] || cat > "$GAME/index.html" <<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Game</title>
<script type="importmap">{ "imports": { "three": "./vendor/three.module.js", "three/addons/": "./vendor/addons/" } }</script>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}</style>
</head><body><div id="ui"></div><script type="module" src="./src/main.js"></script></body></html>
HTML
for m in "$@"; do
  f="$GAME/src/$m.js"; [ -f "$f" ] && continue
  if [ "$m" = main ]; then
    printf '%s\n' "// Owner: see ARCHITECTURE.md. Stub - replaced by its owner in wave 1." "import * as THREE from 'three';" "export {};" > "$f"
  else
    printf '%s\n' "// Owner: see ARCHITECTURE.md. Stub - replaced by its owner in wave 1; keep the exported interface." "export function create() { return { update() {} }; }" > "$f"
  fi
done
[ -f "$GAME/src/lookdev.js" ] || cp "$SKILL/templates/web/lookdev.js" "$GAME/src/lookdev.js"
for t in shot.mjs play.mjs perf.mjs accept.mjs check.mjs blind.sh; do [ -f "tools/$t" ] || cp "$SKILL/templates/web/$t" tools/; done
[ -f tools/pack.mjs ] || cp "$SKILL/templates/pack.mjs" tools/
[ -f tools/checks.mjs ] || printf '%s\n' "// Check registry - QA owns this file. export default { 'A-01': async ({ page, hook, step }) => { ... } }" "export default {};" > tools/checks.mjs
for f in "$SKILL"/agents/*.md; do awk 'c>=2; /^---$/{c++}' "$f" > "studio/prompts/$(basename "$f")"; done
for f in STATUS.md TRACKER.md DECISIONS.md LESSONS.md DEBT.md; do [ -f "studio/$f" ] || echo "# ${f%.md}" > "studio/$f"; done
[ -f studio/acceptance.json ] || echo "[]" > studio/acceptance.json
echo "kickoff ok: $GAME (vendor, index.html, $# module stubs), tools/, studio/"
