// Acceptance runner (copy to tools/accept.mjs). Only the Director (or QA) runs it.
//   node tools/accept.mjs [area-or-id ...] [--suite visible|heldout] [--tag HB-004]
// Manifests list registered check ids - never shell commands:
//   visible:  studio/acceptance.json            (builders see it; it is the definition of done)
//   heldout:  studio/.qa-heldout/acceptance.json (written by QA; not in any builder's pack; hidden from
//             Read/Glob/Grep by the settings deny rule; its hash is recorded so edits are detected)
// Each id runs as `node tools/check.mjs <id> --suite <suite>` (fixed program, validated id, 30 s limit).
import fs from 'fs'; import crypto from 'crypto'; import { execFileSync } from 'child_process';
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const suite = opt('--suite') || 'visible', tag = opt('--tag') || new Date().toISOString().slice(11, 16);
const skip = new Set(['--suite', '--tag'].flatMap(k => { const i = args.indexOf(k); return i >= 0 ? [i, i + 1] : []; }));
const filters = args.filter((a, i) => !skip.has(i));
const file = suite === 'heldout' ? 'studio/.qa-heldout/acceptance.json' : 'studio/acceptance.json';
const raw = fs.readFileSync(file, 'utf8'); const checks = JSON.parse(raw);
if (suite === 'heldout') console.log('heldout manifest sha256 ' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16));
for (const c of checks) {
  if (filters.length && !filters.includes(c.area) && !filters.includes(c.id)) continue;
  if (!/^[A-Za-z]{1,4}-\d{1,4}$/.test(c.id)) { c.passes = false; c.failure = 'invalid id'; continue; }
  try { execFileSync('node', ['tools/check.mjs', c.id, '--suite', suite], { stdio: 'pipe', timeout: 30000 }); c.passes = true; delete c.failure; }
  catch (e) { c.passes = false; c.failure = String(e.stdout || e.message).slice(-300); }
  c.last_run = tag;
}
fs.writeFileSync(file, JSON.stringify(checks, null, 2));
const run = checks.filter(c => !filters.length || filters.includes(c.area) || filters.includes(c.id));
const fail = run.filter(c => !c.passes);
console.log(`${suite}: ${run.length - fail.length}/${run.length} pass` + (fail.length ? `; failing: ${fail.map(c => c.id).join(', ')}` : ''));
process.exit(fail.length ? 1 : 0);
