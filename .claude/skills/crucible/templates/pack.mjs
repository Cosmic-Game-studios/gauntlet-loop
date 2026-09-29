// Context packs: every subagent gets exactly what its ticket needs, in one file (copied to tools/pack.mjs at kickoff).
//
//   node tools/pack.mjs build <ticket-id>            studio/tickets/<id>.md  ->  studio/packs/<id>.md, prints one JSON line
//   node tools/pack.mjs section <file> "<heading>"   prints one markdown section (the heading and everything under it)
//   node tools/pack.mjs sizes                        size of every pack, largest first (for the context audit)
//
// A ticket file is a short header of "key: value" lines, a blank line, then the ticket body (goal, deliverable, ...):
//   role: studio-builder                          role file, read by the agent from studio/prompts/<role>.md
//   craft: 3D models built in code; Stylised      craft.md sections by heading prefix (';'-separated)
//   department: Character Art                     departments.md section by heading prefix
//   style: Palette; Characters                    STYLE_BIBLE.md sections (if the file exists)
//   arch: Hook; Signatures                        ARCHITECTURE.md sections, plus every table row naming an owned/used file
//   owns: game/src/enemies.js                     files this ticket may change (';'-separated)
//   uses: game/src/world.js; game/src/player.js   files it calls into: only their public interface goes in the pack
//   lessons: art; enemies                         LESSONS.md lines tagged [art] or [enemies]
//   evidence: studio/evidence/T-07/round-1/sheet.png   files the agent should open itself (paths only)
// Missing sections are reported, never silently dropped.
import fs from 'fs'; import path from 'path';

const SKILL = process.env.CRUCIBLE_SKILL || '.claude/skills/crucible';
const LIMIT = Number(process.env.PACK_LIMIT || 24000);   // characters, roughly 6k tokens; above it the pack is flagged
const read = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const list = v => (v || '').split(';').map(s => s.trim()).filter(Boolean);

// One markdown section: the first heading whose text starts with `name` (case-insensitive), up to the next heading of the same or higher level.
export function section(text, name) {
  const lines = text.split('\n'); const want = name.toLowerCase();
  let start = -1, level = 0, fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) fence = !fence;
    const m = !fence && /^(#{1,6})\s+(.*)$/.exec(lines[i]);
    if (!m) continue;
    if (start < 0) { if (m[2].toLowerCase().startsWith(want)) { start = i; level = m[1].length; } }
    else if (m[1].length <= level) return lines.slice(start, i).join('\n').trim();
  }
  return start < 0 ? null : lines.slice(start).join('\n').trim();
}

// Public interface of a source file, so a builder can call into it without reading it.
function iface(file) {
  const src = read(file); if (src == null) return `(missing: ${file})`;
  const ext = path.extname(file); const L = src.split('\n');
  let keep;
  if (['.js', '.mjs', '.ts', '.tsx'].includes(ext)) keep = L.filter(l => /^export\s/.test(l) || /^\s*\/\*\*|^\s*\* @/.test(l));
  else if (['.h', '.hpp'].includes(ext)) keep = L.filter(l => /UFUNCTION|UPROPERTY|UCLASS|USTRUCT|^\s*(virtual\s+)?[\w:<>*&\s]+\s+\w+\(.*\)\s*(const)?\s*(override)?;/.test(l));
  else if (ext === '.gd') keep = L.filter(l => /^(func|signal|class_name|@export|const)\s/.test(l));
  else if (ext === '.cs') keep = L.filter(l => /^\s*public\s/.test(l));
  else if (ext === '.py') keep = L.filter(l => /^(def|class)\s/.test(l));
  else keep = L.slice(0, 40);
  return keep.map(l => l.replace(/\s*\{\s*$/, '').trimEnd()).join('\n') || '(no public interface found)';
}

function build(id) {
  const tf = `studio/tickets/${id}.md`; const t = read(tf);
  if (t == null) { console.error(`no ticket file ${tf}`); process.exit(1); }
  const [head, ...rest] = t.split(/\n\s*\n/); const body = rest.join('\n\n').trim();
  const h = Object.fromEntries(head.split('\n').map(l => /^(\w+):\s*(.*)$/.exec(l)).filter(Boolean).map(m => [m[1], m[2]]));
  const out = []; const missing = [];
  const add = (title, text) => { if (text) out.push(`## ${title}\n\n${text}`); };
  const pull = (file, names, label) => { const src = read(file); for (const n of list(names)) { const s = src && section(src, n); if (s) out.push(s.replace(/^#{1,6}\s+/, `## ${label}: `)); else missing.push(`${label}: ${n}`); } };

  out.push(`# Context pack ${id}\n\nThis file and your role file are your whole context. Read the files listed under "Open yourself" when you need them; do not open other studio files, other tickets or the skill.`);
  pull(`${SKILL}/references/craft.md`, h.craft, 'Craft');
  pull(`${SKILL}/references/departments.md`, h.department, 'Department');
  pull('studio/STYLE_BIBLE.md', h.style, 'Style');
  const arch = read('studio/ARCHITECTURE.md') || read('ARCHITECTURE.md');
  if (arch) {
    for (const n of list(h.arch)) { const s = section(arch, n); if (s) out.push(s.replace(/^#{1,6}\s+/, '## Architecture: ')); else missing.push(`Architecture: ${n}`); }
    const files = [...list(h.owns), ...list(h.uses)].map(f => path.basename(f));
    const rows = arch.split('\n').filter(l => l.startsWith('|') && files.some(f => l.includes(f)));
    if (rows.length) add('Owners of your files and the files you use', rows.join('\n'));
  }
  if (h.owns) add('You own (change only these)', list(h.owns).map(f => `- ${f}`).join('\n'));
  for (const f of list(h.uses)) add(`Interface of ${f} (do not edit, do not read the whole file unless a call fails)`, '```\n' + iface(f) + '\n```');
  const lessons = read('studio/LESSONS.md'); const tags = list(h.lessons).map(s => s.toLowerCase());
  if (lessons && tags.length) {
    const hits = lessons.split('\n').filter(l => { const m = /^\s*[-*]\s*\[([^\]]+)\]/.exec(l); return m && m[1].toLowerCase().split(/[,\s]+/).some(x => tags.includes(x)); });
    if (hits.length) add('Lessons this studio already paid for', hits.join('\n'));
  }
  if (h.evidence) add('Open yourself', list(h.evidence).map(f => `- ${f}`).join('\n'));
  add('Ticket', body);

  fs.mkdirSync('studio/packs', { recursive: true });
  const text = out.join('\n\n') + '\n'; const pf = `studio/packs/${id}.md`; fs.writeFileSync(pf, text);
  console.log(JSON.stringify({ pack: pf, role: h.role ? `studio/prompts/${h.role}.md` : null, chars: text.length, approx_tokens: Math.round(text.length / 4), over_limit: text.length > LIMIT, missing }));
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'build' && a) build(a);
else if (cmd === 'section' && a && b) { const s = read(a) && section(read(a), b); if (!s) { console.error(`no section "${b}" in ${a}`); process.exit(1); } console.log(s); }
else if (cmd === 'sizes') { const d = 'studio/packs'; const r = fs.existsSync(d) ? fs.readdirSync(d).map(f => [f, fs.statSync(path.join(d, f)).size]).sort((x, y) => y[1] - x[1]) : []; for (const [f, s] of r) console.log(`${String(Math.round(s / 4)).padStart(7)} tok  ${f}`); }
else { console.error('usage: pack.mjs build <ticket-id> | section <file> "<heading>" | sizes'); process.exit(2); }
