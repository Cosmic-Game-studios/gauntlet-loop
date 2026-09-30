export const meta = {
  name: 'gauntlet-loop',
  description: 'Run a gauntlet loop: capture the bar first, then builder, blind capture and read-only critic per piece until ours wins, with a regression gate and a final whole-thing comparison',
  whenToUse: 'When the user asks to run a gauntlet loop prompt or the gauntlet-loop workflow. Pass {brief: "<the gauntlet loop prompt>"}, optionally plan (link or path to a Wayfinder map or spec) and dir (working folder, default "gauntlet").',
  phases: [
    { title: 'Prepare', detail: 'read the brief and plan, split into pieces, build the capture and regression tools, capture the bar' },
    { title: 'Gauntlet', detail: 'per piece: builder, blind capture, read-only critic, until ours wins' },
    { title: 'Whole', detail: 'the whole thing against the bar' },
  ],
}

// ---------- input and limits ----------

const input = typeof args === 'string' ? { brief: args } : (args || {})
if (!input.brief) {
  throw new Error('gauntlet-loop needs args.brief: the gauntlet loop prompt, or the goal and the bar in plain words')
}
const DIR = input.dir || 'gauntlet'
const STUCK_ROUNDS = 3        // the same gap this many rounds running -> change approach
const APPROACH_CHANGES = 2    // still stuck after this many changes -> hand the piece to the user
const FAIL_LIMIT = 2          // this many failed steps in a row (capture, critic, builder) -> hand to the user
const BUDGET_RESERVE = 150000 // per running piece, with a token budget set

const PLAN_LINE = input.plan
  ? `The plan is ${input.plan}. Its decisions are settled; do not reopen them. If the work shows one is wrong, say so in your reply instead of designing around it. Nothing the plan puts out of scope gets built.`
  : ''

// ---------- guarded agent calls ----------

// agent() throws once the token budget or the agent cap is spent. Catch it once,
// stop starting new work everywhere, and still return a summary.
let halted = ''
async function run(prompt, opts) {
  if (halted) return null
  try {
    return await agent(prompt, opts)
  } catch (e) {
    halted = `stopped: ${e && e.message ? e.message : String(e)}`
    log(halted)
    return null
  }
}

let active = 0
function lowBudget() {
  if (!budget.total) return false
  const reserve = Math.min(BUDGET_RESERVE, budget.total * 0.1)
  return budget.remaining() < reserve * Math.max(1, active)
}

// Builders of different pieces edit one working tree. A capture must not see a
// half-built tree, so captures run alone: builders share the gate, a capture holds
// it exclusively, and the queue is first-come so neither side starves.
const gate = { builders: 0, capturing: false, queue: [] }
function pump() {
  while (gate.queue.length) {
    const next = gate.queue[0]
    if (next.kind === 'build' && !gate.capturing) {
      gate.queue.shift(); gate.builders++; next.resolve()
    } else if (next.kind === 'capture' && !gate.capturing && gate.builders === 0) {
      gate.queue.shift(); gate.capturing = true; next.resolve()
    } else break
  }
}
async function gated(kind, fn) {
  await new Promise(resolve => { gate.queue.push({ kind, resolve }); pump() })
  try { return await fn() } finally {
    if (kind === 'build') gate.builders--; else gate.capturing = false
    pump()
  }
}

// ---------- helpers ----------

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece'
}

// FNV-1a. Deterministic (workflows have no Math.random) but not guessable from the round number.
function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function pairFor(key) {
  const h = hash(key)
  return { dir: `${DIR}/pairs/p${h.toString(36)}`, ours: ((h >>> 7) & 1) ? 'A' : 'B' }
}

const NEUTRAL = /^\d+\.[A-Za-z0-9]+$/
function pairProblem(cap, dir, numbersOnly) {
  if (!cap) return 'the capture step returned nothing'
  const a = cap.aFiles || [], b = cap.bFiles || []
  if (numbersOnly && !a.length && !b.length) {
    return cap.numbersA && cap.numbersB ? '' : 'measurements are missing for one side'
  }
  if (!a.length || !b.length) return 'one side of the pair is empty'
  for (const [side, files] of [['A', a], ['B', b]]) {
    for (const f of files) {
      const prefix = `${dir}/${side}/`
      if (!f.startsWith(prefix) || !NEUTRAL.test(f.slice(prefix.length))) {
        return `file "${f}" is not a neutral name inside ${prefix}`
      }
    }
  }
  return ''
}

function list(items) {
  return items.length ? items.map((g, i) => `${i + 1}. ${g}`).join('\n') : '(none)'
}

// ---------- schemas ----------

const PREP_SCHEMA = {
  type: 'object',
  properties: {
    goal: { type: 'string', description: 'the goal in one or two sentences, with audience and purpose' },
    bar: { type: 'string', description: 'the bar as a concrete, fetchable thing' },
    captureHowTo: { type: 'string', description: 'exact commands or steps that capture OUR output - for a named piece, or for the whole thing - into a given folder, the same way the bar was captured' },
    regressionHowTo: { type: 'string', description: 'exact command(s) that check everything that already worked still works, including any budget such as frame time; "none" if nothing exists' },
    wholeBarCaptures: { type: 'string', description: 'folder with captures of the bar as a whole, for the final comparison' },
    pieces: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          what: { type: 'string', description: 'for the builder: what this piece is and what winning it means' },
          criterion: { type: 'string', description: 'for the blind critic: what is compared, in neutral words that describe neither side' },
          files: { type: 'array', items: { type: 'string' }, description: 'files or folders this piece owns; no two pieces share one' },
          dependsOn: { type: 'array', items: { type: 'string' }, description: 'names of pieces that must win first' },
          barCaptures: { type: 'string', description: 'folder holding the bar captures for this piece' },
          judgedBy: { type: 'string', enum: ['captures', 'measurements', 'human'] },
          measurement: { type: 'string', description: 'what is measured on both sides, the same way; empty if nothing' },
        },
        required: ['name', 'what', 'criterion', 'files', 'dependsOn', 'barCaptures', 'judgedBy', 'measurement'],
      },
    },
  },
  required: ['goal', 'bar', 'captureHowTo', 'regressionHowTo', 'wholeBarCaptures', 'pieces'],
}

function captureSchema(pieceNames) {
  const props = {
    aFiles: { type: 'array', items: { type: 'string' } },
    bFiles: { type: 'array', items: { type: 'string' } },
    numbersA: { type: 'string', description: 'measurements for side A, or empty' },
    numbersB: { type: 'string', description: 'measurements for side B, or empty' },
    regressionsPass: { type: 'boolean' },
    regressionNotes: { type: 'string', description: 'what failed, or "all pass"' },
  }
  const required = ['aFiles', 'bFiles', 'numbersA', 'numbersB', 'regressionsPass', 'regressionNotes']
  if (pieceNames) {
    props.regressionPiece = { type: 'string', enum: [...new Set(pieceNames.concat(['none']))], description: 'the piece a failing regression belongs to, or none' }
    required.push('regressionPiece')
  }
  return { type: 'object', properties: props, required }
}

function verdictSchema(pieceNames) {
  const props = {
    comparable: { type: 'boolean', description: 'false if either side could not be opened or the two cannot be compared' },
    pick: { type: 'string', enum: ['A', 'B'] },
    evidence: { type: 'string', description: 'what in the captures or numbers decided it, specifically; or what was missing' },
    gap: { type: 'string', description: 'the single biggest thing the losing side must change to beat the winner, stated neutrally' },
    sameAsLastGap: { type: 'boolean', description: 'true if this gap is essentially the most recent gap named' },
  }
  const required = ['comparable', 'pick', 'evidence', 'gap', 'sameAsLastGap']
  if (pieceNames) {
    props.piece = { type: 'string', enum: pieceNames, description: 'the part the gap belongs to' }
    required.push('piece')
  }
  return { type: 'object', properties: props, required }
}

// ---------- prepare ----------

phase('Prepare')

const prep = await run(
  `You are preparing a gauntlet loop. You do not build the work itself.

The brief:
<brief>
${input.brief}
</brief>
${PLAN_LINE}

Deliver these, in ${DIR}/:
1. The pieces: the smallest parts of the work that can be improved and judged on their own. If there is a plan, take the pieces, their order and each piece's bar from it. Give every piece its own files so parallel builders never edit the same thing. For each piece write "what" for the builder and a neutral "criterion" for a blind critic that describes neither side.
2. The capture tooling: one way to capture any piece of OUR output, or the whole thing, into a folder, and the bar the same way - same views, sizes, cameras, seeds and conditions. What a capture cannot show (feel, timing, sound, logic) gets measurements taken the same way on both sides. For a real-time game, first build a debug hook that steps the game a fixed number of frames with given inputs, and use it for every capture.
3. The bar, captured now: for every piece into ${DIR}/bars/<piece-slug>/, and for the whole thing into ${DIR}/bars/_whole/. Captures only - never a description of the bar.
4. The regression check: the command(s) that prove everything that already works still works, including any budget the brief names. Say "none" if nothing can be checked yet.
5. ${DIR}/PROGRESS.md for a person watching the run: the goal, the bar, each piece with its bar, and a link to ${DIR}/progress/<piece-slug>.md where that piece's rounds will be logged.

If the bar cannot be obtained, say so in the goal field and return an empty pieces list rather than inventing captures. Mark a piece judgedBy "human" only when neither captures nor measurements can judge it.`,
  { label: 'prepare', phase: 'Prepare', schema: PREP_SCHEMA },
)

if (!prep || !prep.pieces || !prep.pieces.length) {
  return { status: 'not-started', reason: halted || (prep ? prep.goal : 'the prepare agent failed') }
}

// Unique names, unique ids, no dangling or cyclic dependencies.
const pieces = []
const seen = new Set()
for (const p of prep.pieces) {
  if (!p || !p.name || seen.has(p.name)) { log(`dropped a duplicate or unnamed piece: ${p && p.name}`); continue }
  seen.add(p.name)
  pieces.push(p)
}
pieces.forEach((p, i) => { p.id = `${i + 1}-${slug(p.name)}` })
const byName = new Map(pieces.map(p => [p.name, p]))
const pieceNames = pieces.map(p => p.name)
for (const p of pieces) p.dependsOn = (p.dependsOn || []).filter(d => byName.has(d) && d !== p.name)
function reaches(from, target, visited) {
  for (const d of byName.get(from).dependsOn) {
    if (d === target) return true
    if (!visited.has(d)) { visited.add(d); if (reaches(d, target, visited)) return true }
  }
  return false
}
for (const p of pieces) {
  if (reaches(p.name, p.name, new Set())) {
    log(`dependency cycle through "${p.name}" - running it without dependencies`)
    p.dependsOn = []
  }
}

const HAS_REGRESSION = !!prep.regressionHowTo && !/^\s*none\b/i.test(prep.regressionHowTo)
const regressionStep = HAS_REGRESSION
  ? `Then run the regression check on the current tree: ${prep.regressionHowTo}`
  : 'There is no regression check yet: report regressionsPass true and regressionNotes "none set up".'

log(`${pieces.length} pieces: ${pieceNames.join(', ')}`)
if (!budget.total) log('no token budget set: the run ends when it wins, hands a piece to you, or reaches the workflow agent cap')

// ---------- one piece ----------

const roundsDone = new Map()

function builderPrompt(p, gaps, changeApproach, progressLine) {
  const history = gaps.length
    ? `Gaps a blind critic has named so far, oldest first. Each names what the losing side - ours - must change:\n${list(gaps)}\n\nClose the most recent one: ${gaps[gaps.length - 1]}`
    : 'This is the first round: build the piece so it can beat the bar.'
  const approach = changeApproach
    ? `\n\nThe same gap has come back ${STUCK_ROUNDS} rounds running. Change the approach for this piece instead of polishing the current one.`
    : ''
  const progress = progressLine
    ? `\n\nBefore you start, append this line to ${DIR}/progress/${p.id}.md (create it if missing) and change nothing else in that file:\n${progressLine}`
    : ''
  return `You are the builder for one piece of a gauntlet loop.

Goal: ${prep.goal}
Bar: ${prep.bar}
${PLAN_LINE}

Your piece: ${p.name} - ${p.what}
Files you own: ${p.files.join(', ')}. Edit only these; other builders own the rest.
The bar's captures for this piece are in ${p.barCaptures}. Study them.

${history}${approach}${progress}

Do not capture, compare or judge your own work - a separate critic does that blind. Keep everything that already works working. Reply with a short summary of what you changed.`
}

async function flush(p, line, phaseName) {
  await run(
    `Append this line to ${DIR}/progress/${p.id}.md (create it if missing). Change nothing else.\n\n${line}`,
    { label: `progress:${p.name}`, phase: phaseName, effort: 'low' },
  )
}

async function runPiece(p, startGap, phaseName) {
  active++
  try {
    return await pieceLoop(p, startGap, phaseName)
  } finally {
    active--
  }
}

async function pieceLoop(p, startGap, phaseName) {
  const gaps = startGap ? [startGap] : []
  let streak = 0
  let changes = 0
  let failures = 0
  let lastWasRegression = false
  let pending = ''
  const end = async (status, line) => {
    await flush(p, [pending, `- ${line}`].filter(Boolean).join('\n'), phaseName)
    return { piece: p.name, status, rounds: roundsDone.get(p.id) || 0, gaps }
  }

  if (p.judgedBy === 'human') {
    await gated('build', () => run(builderPrompt(p, gaps, false, ''), { label: `build:${p.name}`, phase: phaseName }))
    return end('needs-human', `**${p.name}**: built; the loop cannot judge it, so it is yours to review.`)
  }

  for (;;) {
    if (halted) return end('halted', `**${p.name}**: ${halted}`)
    if (lowBudget()) return end('stopped-budget', `**${p.name}**: stopped at the token budget. Open gap: ${gaps[gaps.length - 1] || 'none yet'}`)
    if (failures >= FAIL_LIMIT) return end('failed-needs-human', `**${p.name}**: ${FAIL_LIMIT} steps in a row failed (builder, capture or critic; see the rounds above). Needs you.`)

    let changeApproach = false
    if (streak >= STUCK_ROUNDS) {
      changes++
      streak = 0
      if (changes > APPROACH_CHANGES) {
        return end('stuck-needs-human', `**${p.name}**: still stuck after ${APPROACH_CHANGES} changes of approach. Needs you. Gap: ${gaps[gaps.length - 1]}`)
      }
      changeApproach = true
    }

    const round = (roundsDone.get(p.id) || 0) + 1
    roundsDone.set(p.id, round)

    const built = await gated('build', () => run(builderPrompt(p, gaps, changeApproach, pending), {
      label: `build:${p.name}#${round}`, phase: phaseName,
    }))
    pending = ''
    if (!built) { if (halted) continue; failures++; pending = `- **${p.name}** round ${round}: the builder failed.`; continue }

    const pair = pairFor(`${p.id}:${round}`)
    const bar = pair.ours === 'A' ? 'B' : 'A'
    const numbersOnly = p.judgedBy === 'measurements'
    const cap = await gated('capture', () => run(
      `Capture one round of a gauntlet loop. You make the blind pair; you do not judge it.

How to capture ours: ${prep.captureHowTo}
${p.measurement ? `Measure on both sides, the same way: ${p.measurement}` : ''}

1. Empty ${pair.dir}/ if it exists.
2. Capture OUR current output for the piece "${p.name}" into ${pair.dir}/${pair.ours}/.
3. Copy the bar's captures for this piece from ${p.barCaptures} into ${pair.dir}/${bar}/.
4. Name the files 1, 2, 3 ... keeping each extension, in the same order on both sides so the same view has the same number. Strip anything that says which side is which: labels, watermarks, paths, metadata.${numbersOnly ? ' If this piece is judged on measurements alone, the file lists may be empty.' : ''}
${regressionStep}

Return the file paths for A and B, the numbers for each side (empty if none), and the regression result.`,
      { label: `capture:${p.name}#${round}`, phase: phaseName, schema: captureSchema() },
    ))
    const problem = pairProblem(cap, pair.dir, numbersOnly)
    if (problem) {
      if (halted) continue
      failures++
      log(`${p.name} round ${round}: capture unusable - ${problem}`)
      pending = `- **${p.name}** round ${round}: capture unusable (${problem}).`
      continue
    }

    const lastGap = !lastWasRegression && gaps.length ? gaps[gaps.length - 1] : ''
    const verdict = await run(
      `Judge one blind pair.

A: ${(cap.aFiles || []).join(', ') || '(no files - judge the numbers)'}
B: ${(cap.bFiles || []).join(', ') || '(no files - judge the numbers)'}
${cap.numbersA || cap.numbersB ? `Numbers for A: ${cap.numbersA || '-'}\nNumbers for B: ${cap.numbersB || '-'}` : ''}
What is compared: ${p.criterion}${p.measurement ? ` Measured as: ${p.measurement}.` : ''}

Gaps named in earlier rounds:
${list(gaps.filter(g => !g.startsWith('Regression:')))}
Most recent gap, for sameAsLastGap: ${lastGap || '(none)'}`,
      { label: `critic:${p.name}#${round}`, phase: phaseName, schema: verdictSchema(), agentType: 'gauntlet-critic', effort: 'high' },
    )
    if (!verdict || !verdict.comparable) {
      if (halted) continue
      failures++
      pending = `- **${p.name}** round ${round}: the critic could not judge the pair (${verdict ? verdict.evidence : 'no verdict'}).`
      continue
    }
    failures = 0

    const oursWon = verdict.pick === pair.ours
    const regressed = !cap.regressionsPass
    if (oursWon && !regressed) {
      pending = `- **${p.name}** round ${round}: ours picked blind, regressions pass. Won. Evidence: ${verdict.evidence}`
      return end('won', `**${p.name}**: won in round ${round}.`)
    }

    const gap = regressed ? `Regression: ${cap.regressionNotes}` : verdict.gap
    const same = regressed ? lastWasRegression : (verdict.sameAsLastGap && !lastWasRegression)
    streak = same ? streak + 1 : 1
    lastWasRegression = regressed
    gaps.push(gap)
    pending = `- **${p.name}** round ${round}: ${oursWon ? 'ours picked, but a regression failed' : 'bar picked'}. Gap: ${gap} Changed: ${String(built).replace(/\s+/g, ' ').slice(0, 300)}`
  }
}

// ---------- schedule pieces by dependency ----------

phase('Gauntlet')

const DONE = new Set(['won', 'needs-human'])
const running = new Map()
function start(p) {
  if (running.has(p.name)) return running.get(p.name)
  const job = (async () => {
    const deps = await Promise.all(p.dependsOn.map(d => start(byName.get(d))))
    const bad = deps.findIndex(r => !r || !DONE.has(r.status))
    if (bad >= 0) {
      return { piece: p.name, status: 'blocked', by: p.dependsOn[bad], rounds: 0, gaps: [] }
    }
    return runPiece(p, '', 'Gauntlet')
  })()
  running.set(p.name, job)
  return job
}

const state = new Map()
const results = await Promise.all(pieces.map(p => start(p)))
results.forEach((r, i) => state.set(pieces[i].name, r || { piece: pieces[i].name, status: 'failed' }))

const open = [...state.values()].filter(r => !DONE.has(r.status))
if (open.length) {
  log(`not every piece is done: ${open.map(r => `${r.piece} (${r.status})`).join(', ')}`)
  return { status: halted ? 'halted' : 'pieces-open', reason: halted || undefined, progress: `${DIR}/PROGRESS.md`, pieces: [...state.values()] }
}

// ---------- the whole thing ----------

phase('Whole')

const WHOLE = { id: '_whole', name: 'Whole' }
const wholeGaps = []
const measured = pieces.filter(p => p.measurement).map(p => `${p.name}: ${p.measurement}`)
let wholeStreak = 0
let wholeFailures = 0
let wholeRound = 0
let lastWasRegression = false

for (;;) {
  const stop = halted ? 'halted'
    : lowBudget() ? 'stopped-budget'
    : wholeFailures >= FAIL_LIMIT ? 'failed-needs-human'
    : wholeStreak >= STUCK_ROUNDS ? 'whole-stuck-needs-human'
    : ''
  if (stop) {
    await flush(WHOLE, `- **Whole**: ${stop}${wholeGaps.length ? `. Last gap: ${wholeGaps[wholeGaps.length - 1]}` : ''}`, 'Whole')
    return { status: stop, reason: halted || undefined, progress: `${DIR}/PROGRESS.md`, pieces: [...state.values()], wholeGaps }
  }

  wholeRound++
  const pair = pairFor(`_whole:${wholeRound}`)
  const bar = pair.ours === 'A' ? 'B' : 'A'

  const cap = await gated('capture', () => run(
    `Capture the whole thing for a gauntlet loop's final comparison. You make the blind pair; you do not judge it.

How to capture ours: ${prep.captureHowTo}
${measured.length ? `Measure on both sides, the same way:\n${measured.join('\n')}` : ''}

1. Empty ${pair.dir}/ if it exists.
2. Capture OUR complete output as a whole (a full run, page or document) into ${pair.dir}/${pair.ours}/.
3. Copy the bar's whole-thing captures from ${prep.wholeBarCaptures} into ${pair.dir}/${bar}/.
4. Name the files 1, 2, 3 ... keeping each extension, in the same order on both sides. Strip anything that says which side is which.
${regressionStep} If it fails, name the piece the failure belongs to.`,
    { label: `capture:whole#${wholeRound}`, phase: 'Whole', schema: captureSchema(pieceNames) },
  ))
  const problem = pairProblem(cap, pair.dir, false)
  if (problem) {
    if (!halted) { wholeFailures++; log(`whole round ${wholeRound}: capture unusable - ${problem}`) }
    continue
  }

  const lastGap = !lastWasRegression && wholeGaps.length ? wholeGaps[wholeGaps.length - 1] : ''
  const verdict = await run(
    `Judge one blind pair: two complete versions of the same kind of thing.

A: ${cap.aFiles.join(', ')}
B: ${cap.bFiles.join(', ')}
${cap.numbersA || cap.numbersB ? `Numbers for A: ${cap.numbersA || '-'}\nNumbers for B: ${cap.numbersB || '-'}` : ''}
What is compared, part by part: ${pieces.map(p => `${p.name}: ${p.criterion}`).join('; ')}.

Gaps named in earlier rounds:
${list(wholeGaps.filter(g => !g.startsWith('Regression:')))}
Most recent gap, for sameAsLastGap: ${lastGap || '(none)'}`,
    { label: `critic:whole#${wholeRound}`, phase: 'Whole', schema: verdictSchema(pieceNames), agentType: 'gauntlet-critic', effort: 'high' },
  )
  if (!verdict || !verdict.comparable) {
    if (!halted) wholeFailures++
    continue
  }
  wholeFailures = 0

  const oursWon = verdict.pick === pair.ours
  const regressed = !cap.regressionsPass
  if (oursWon && !regressed) {
    await flush(WHOLE, `- **Whole** round ${wholeRound}: ours picked blind, regressions pass. Done. Evidence: ${verdict.evidence}`, 'Whole')
    return { status: 'won', progress: `${DIR}/PROGRESS.md`, pieces: [...state.values()], wholeRounds: wholeRound }
  }

  const gap = regressed ? `Regression: ${cap.regressionNotes}` : verdict.gap
  const targetName = regressed
    ? (byName.has(cap.regressionPiece) ? cap.regressionPiece : verdict.piece)
    : verdict.piece
  const same = regressed ? lastWasRegression : (verdict.sameAsLastGap && !lastWasRegression)
  wholeStreak = same ? wholeStreak + 1 : 1
  lastWasRegression = regressed
  wholeGaps.push(gap)
  await flush(WHOLE, `- **Whole** round ${wholeRound}: ${oursWon ? 'ours picked, but a regression failed' : 'bar picked'}. Gap in ${targetName}: ${gap}`, 'Whole')

  const target = byName.get(targetName) || pieces[0]
  const again = await runPiece(target, `Found in the whole-thing comparison: ${gap}`, 'Whole')
  if (again) state.set(again.piece, again)
  if (!again || !DONE.has(again.status)) {
    return { status: halted ? 'halted' : 'pieces-open', stage: 'whole', reason: halted || undefined, progress: `${DIR}/PROGRESS.md`, pieces: [...state.values()], wholeGaps }
  }
}
