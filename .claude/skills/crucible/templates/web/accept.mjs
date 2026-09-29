// Acceptance runner (copy to tools/accept.mjs at kickoff). Runs the "how" command of every check in
// studio/acceptance.json (exit code 0 = pass), updates "passes" and "last_run", prints a summary.
// node tools/accept.mjs [area-or-id ...] [--tag HB-004]
// Each check's "how" runs a check script (e.g. node tools/check.mjs A-01, at most ~20 s), never accept.mjs itself.
// Only the Director (or QA) runs this file; builders run their own check ids through tools/check.mjs.
import fs from 'fs'; import { execSync } from 'child_process';
const file = 'studio/acceptance.json'; const args = process.argv.slice(2);
const tagI = args.indexOf('--tag'); const tag = tagI >= 0 ? args[tagI + 1] : new Date().toISOString().slice(11, 16);
const filters = args.filter((a, i) => !a.startsWith('--') && (tagI < 0 || i !== tagI + 1));
const checks = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const c of checks) {
  if (filters.length && !filters.includes(c.area) && !filters.includes(c.id)) continue;
  try { execSync(c.how, { stdio: 'pipe', timeout: 30000 }); c.passes = true; }
  catch (e) { c.passes = false; c.failure = String(e.stdout || e.message).slice(-300); }
  c.last_run = tag;
}
fs.writeFileSync(file, JSON.stringify(checks, null, 2));
const run = checks.filter(c => !filters.length || filters.includes(c.area) || filters.includes(c.id));
const fail = run.filter(c => !c.passes);
console.log(`${run.length - fail.length}/${run.length} pass` + (fail.length ? `; failing: ${fail.map(c => c.id).join(', ')}` : ''));
process.exit(fail.length ? 1 : 0);
