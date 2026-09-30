export const meta = {
  name: 'gauntlet-loop',
  description: 'Run a gauntlet loop: capture the bar first, then builder, capture and blind critic per piece until ours wins, with a regression gate and a final whole-thing comparison',
  whenToUse: 'When the user asks to run a gauntlet loop prompt or the gauntlet-loop workflow. Pass {brief: "<the gauntlet loop prompt>"}, optionally plan (link or path to a Wayfinder map or spec) and dir (working folder, default "gauntlet").',
  phases: [
    { title: 'Prepare', detail: 'read the brief and plan, split into pieces, build the capture and regression tools, capture the bar' },
    { title: 'Gauntlet', detail: 'per piece: builder, capture, blind critic, until ours wins' },
    { title: 'Whole', detail: 'the whole thing against the bar' },
  ],
}

// ---------- input ----------

const input = typeof args === 'string' ? { brief: args } : (args || {})
if (!input.brief) {
  throw new Error('gauntlet-loop needs args.brief: the gauntlet loop prompt, or the goal and the bar in plain words')
}
const DIR = input.dir || 'gauntlet'
const PROGRESS = `${DIR}/PROGRESS.md`
const STUCK_ROUNDS = 3        // same gap this many rounds running -> change approach
const APPROACH_CHANGES = 2    // still stuck after this many changes -> hand the piece to the user
const BUDGET_RESERVE = 150000 // with a token budget set, stop starting rounds below this

const PLAN_LINE = input.plan
  ? `The plan is ${input.plan}. Its decisions are settled; do not reopen them. If the work shows one is wrong, say so in your reply instead of designing around it. Nothing the plan puts out of scope gets built.`
  : ''

// ---------- schemas ----------

const PREP_SCHEMA = {
  type: 'object',
  properties: {
    goal: { type: 'string', description: 'the goal in one or two sentences, with audience and purpose' },
    bar: { type: 'string', description: 'the bar as a concrete, fetchable thing' },
    captureHowTo: { type: 'string', description: 'exact commands or steps that capture OUR output for a named piece into a given folder, the same way the bar was captured' },
    regressionHowTo: { type: 'string', description: 'exact command(s) that check everything that already worked still works, including any budget such as frame time; say "none yet" if nothing exists' },
    wholeBarCaptures: { type: 'string', description: 'folder with captures of the bar as a whole, for the final comparison' },
    pieces: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          what: { type: 'string', description: 'what this piece is and what winning it means' },
          files: { type: 'array', items: { type: 'string' }, description: 'files or folders this piece owns; no two pieces share one' },
          dependsOn: { type: 'array', items: { type: 'string' }, description: 'names of pieces that must win first' },
          barCaptures: { type: 'string', description: 'folder holding the bar captures for this piece' },
          judgedBy: { type: 'string', enum: ['captures', 'measurements', 'human'] },
          measurement: { type: 'string', description: 'what is measured on both sides, if judged by measurements; else empty' },
        },
        required: ['name', 'what', 'files', 'dependsOn', 'barCaptures', 'judgedBy', 'measurement'],
      },
    },
  },
  required: ['goal', 'bar', 'captureHowTo', 'regressionHowTo', 'wholeBarCaptures', 'pieces'],
}

const CAPTURE_SCHEMA = {
  type: 'object',
  properties: {
    aFiles: { type: 'array', items: { type: 'string' } },
    bFiles: { type: 'array', items: { type: 'string' } },
    numbersA: { type: 'string', description: 'measurements for side A, or empty' },
    numbersB: { type: 'string', description: 'measurements for side B, or empty' },
    regressionsPass: { type: 'boolean' },
    regressionNotes: { type: 'string', description: 'what failed, or "all pass"' },
  },
  required: ['aFiles', 'bFiles', 'numbersA', 'numbersB', 'regressionsPass', 'regressionNotes'],
}

function verdictSchema(pieceNames) {
  const props = {
    pick: { type: 'string', enum: ['A', 'B'] },
    evidence: { type: 'string', description: 'what in the captures or numbers decided it, specifically' },
    gap: { type: 'string', description: 'the single biggest thing the losing side must change to beat the winner, stated neutrally' },
    repeatsEarlierGap: { type: 'boolean', description: 'true if this gap is essentially one already listed as named before' },
  }
  const required = ['pick', 'evidence', 'gap', 'repeatsEarlierGap']
  if (pieceNames) {
    props.piece = { type: 'string', enum: pieceNames, description: 'the piece the gap belongs to' }
    required.push('piece')
  }
  return { type: 'object', properties: props, required }
}

// ---------- helpers ----------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece'
}

// Deterministic A/B assignment the critic cannot know: no Math.random in workflows.
function oursIsA(name, round) {
  let h = 7
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 9973
  return (h + round * 5) % 2 === 0
}

function outOfBudget() {
  return budget.total && budget.remaining() < BUDGET_RESERVE
}

async function record(line) {
  await agent(
    `Append this line to ${PROGRESS} (create the file with a "# Gauntlet progress" heading if it does not exist). Change nothing else.\n\n${line}`,
    { label: 'progress', phase: 'Gauntlet', effort: 'low' },
  )
}

// ---------- prepare ----------

phase('Prepare')

const prep = await agent(
  `You are preparing a gauntlet loop. You do not build the work itself.

The brief:
<brief>
${input.brief}
</brief>
${PLAN_LINE}

Do this, in ${DIR}/:
1. Split the work into the smallest pieces that can be improved and judged on their own. If there is a plan, take the pieces, their order and each piece's bar from it. Give every piece its own files so parallel builders never edit the same thing.
2. Build the capture tooling: one way to capture any piece of OUR output into a folder, and the bar the same way - same views, sizes, cameras, seeds and conditions. Pieces a capture cannot show (feel, timing, sound, logic) get measurements taken the same way on both sides. For a real-time game, first build a debug hook that steps the game a fixed number of frames with given inputs, and use it for every capture.
3. Get the real bar and capture it now, for every piece, into ${DIR}/bars/<piece-slug>/, and for the whole thing into ${DIR}/bars/_whole/. Captures only - never a description of the bar.
4. Set up the regression check: the command(s) that prove everything that already works still works, including any budget the brief names.
5. Create ${PROGRESS} with the goal, the bar, the pieces and their bars, so a person can watch the run.

If the bar cannot be obtained, say so in the goal field and return an empty pieces list rather than inventing captures. Mark a piece judgedBy "human" only when neither captures nor measurements can judge it.`,
  { label: 'prepare', phase: 'Prepare', schema: PREP_SCHEMA },
)

if (!prep || !prep.pieces || !prep.pieces.length) {
  return { status: 'not-started', reason: prep ? prep.goal : 'the prepare agent failed' }
}

const byName = new Map(prep.pieces.map(p => [p.name, p]))
const pieceNames = prep.pieces.map(p => p.name)
log(`${prep.pieces.length} pieces: ${pieceNames.join(', ')}`)

// Drop dependencies on unknown pieces and break cycles, so scheduling cannot deadlock.
for (const p of prep.pieces) p.dependsOn = (p.dependsOn || []).filter(d => byName.has(d) && d !== p.name)
const state = new Map()
function hasCycle(name, path) {
  if (path.includes(name)) return true
  return byName.get(name).dependsOn.some(d => hasCycle(d, path.concat(name)))
}
for (const p of prep.pieces) {
  if (hasCycle(p.name, [])) {
    log(`dependency cycle through "${p.name}" - running it without dependencies`)
    p.dependsOn = []
  }
}

// ---------- one piece ----------

function builderPrompt(p, gaps, changeApproach) {
  const history = gaps.length
    ? `Gaps the critic has named so far, oldest first:\n${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}\n\nClose the most recent one: ${gaps[gaps.length - 1]}`
    : 'This is the first round: build the piece so it can beat the bar.'
  const approach = changeApproach
    ? '\n\nThe same gap has come back three rounds running. Change the approach for this piece instead of polishing the current one.'
    : ''
  return `You are the builder for one piece of a gauntlet loop.

Goal: ${prep.goal}
Bar: ${prep.bar}
${PLAN_LINE}

Your piece: ${p.name} - ${p.what}
Files you own: ${p.files.join(', ')}. Edit only these; other builders own the rest.
The bar's captures for this piece are in ${p.barCaptures}. Study them.

${history}${approach}

Do not capture, compare or judge your own work - a separate critic does that blind. Keep everything that already works working. Reply with a short summary of what you changed.`
}

async function runPiece(p, startGap) {
  const id = slug(p.name)
  const gaps = startGap ? [startGap] : []
  let streak = 0
  let changes = 0

  if (p.judgedBy === 'human') {
    await agent(builderPrompt(p, gaps, false), { label: `build:${p.name}`, phase: 'Gauntlet' })
    await record(`- **${p.name}**: built; judged by you (the loop cannot judge it). Please review.`)
    return { piece: p.name, status: 'needs-human', rounds: 1, gaps }
  }

  for (let round = 1; ; round++) {
    if (outOfBudget()) {
      await record(`- **${p.name}**: stopped at the token budget after ${round - 1} rounds. Open gap: ${gaps[gaps.length - 1] || 'none yet'}`)
      return { piece: p.name, status: 'stopped-budget', rounds: round - 1, gaps }
    }

    let changeApproach = false
    if (streak >= STUCK_ROUNDS) {
      changes++
      streak = 0
      if (changes > APPROACH_CHANGES) {
        await record(`- **${p.name}**: still stuck after ${APPROACH_CHANGES} changes of approach. Needs you. Gap: ${gaps[gaps.length - 1]}`)
        return { piece: p.name, status: 'stuck-needs-human', rounds: round - 1, gaps }
      }
      changeApproach = true
    }

    const built = await agent(builderPrompt(p, gaps, changeApproach), {
      label: `build:${p.name}#${round}`, phase: 'Gauntlet',
    })

    const ours = oursIsA(p.name, round) ? 'A' : 'B'
    const bar = ours === 'A' ? 'B' : 'A'
    const roundDir = `${DIR}/rounds/${id}/${round}`

    const cap = await agent(
      `Capture one round of a gauntlet loop. You make the blind pair; you do not judge it.

How to capture ours: ${prep.captureHowTo}
${p.judgedBy === 'measurements' ? `Measure on both sides, the same way: ${p.measurement}` : ''}

1. Capture OUR current output for the piece "${p.name}" into ${roundDir}/${ours}/.
2. Copy the bar's captures for this piece from ${p.barCaptures} into ${roundDir}/${bar}/.
3. Make the two sides indistinguishable except by content: same file count where possible, neutral names (1.png, 2.png, ...), no labels, watermarks, paths or metadata that say which is which.
4. Run the regression check: ${prep.regressionHowTo}

Return the file lists for A and B, the numbers for each side (empty if none), and whether the regression check passed.`,
      { label: `capture:${p.name}#${round}`, phase: 'Gauntlet', schema: CAPTURE_SCHEMA },
    )
    if (!cap) {
      gaps.push('The capture step failed; make the piece capturable.')
      streak = 0
      continue
    }

    const verdict = await agent(
      `Judge one blind pair.

A: ${cap.aFiles.join(', ')}
B: ${cap.bFiles.join(', ')}
${cap.numbersA || cap.numbersB ? `Numbers for A: ${cap.numbersA || '-'}\nNumbers for B: ${cap.numbersB || '-'}` : ''}
What is being judged: ${p.what}${p.measurement ? `, measured as ${p.measurement}` : ''}.

Gaps already named in earlier rounds:
${gaps.length ? gaps.map((g, i) => `${i + 1}. ${g}`).join('\n') : '(none)'}`,
      { label: `critic:${p.name}#${round}`, phase: 'Gauntlet', schema: verdictSchema(), agentType: 'gauntlet-critic', effort: 'high' },
    )
    if (!verdict) {
      streak = 0
      continue
    }

    const oursWon = verdict.pick === ours
    const won = oursWon && cap.regressionsPass
    const gap = !cap.regressionsPass
      ? `Regression: ${cap.regressionNotes}`
      : (oursWon ? '' : verdict.gap)

    await record(
      `- **${p.name}** round ${round}: ${oursWon ? 'ours picked' : 'bar picked'}${cap.regressionsPass ? '' : ', regression failed'}. ` +
      `${won ? 'Won.' : `Gap: ${gap}`} Changed: ${(built || '').replace(/\s+/g, ' ').slice(0, 300)}`,
    )

    if (won) return { piece: p.name, status: 'won', rounds: round, gaps }

    streak = verdict.repeatsEarlierGap && cap.regressionsPass ? streak + 1 : 1
    gaps.push(gap)
  }
}

// ---------- schedule pieces by dependency ----------

phase('Gauntlet')

const running = new Map()
function start(p, startGap) {
  if (!startGap && running.has(p.name)) return running.get(p.name)
  const run = (async () => {
    const deps = await Promise.all(p.dependsOn.map(d => start(byName.get(d))))
    const blocker = deps.find(r => !r || r.status !== 'won')
    if (blocker) return { piece: p.name, status: 'blocked', by: blocker ? blocker.piece : 'a failed piece', rounds: 0, gaps: [] }
    return runPiece(p, startGap)
  })()
  running.set(p.name, run)
  return run
}

const results = await Promise.all(prep.pieces.map(p => start(p)))
for (const r of results) if (r) state.set(r.piece, r)

const notWon = results.filter(r => !r || r.status !== 'won')
if (notWon.length) {
  log(`not every piece won: ${notWon.map(r => r ? `${r.piece} (${r.status})` : 'unknown').join(', ')}`)
  return { status: 'pieces-open', progress: PROGRESS, pieces: [...state.values()] }
}

// ---------- the whole thing ----------

phase('Whole')

const wholeGaps = []
let wholeStreak = 0
for (let round = 1; ; round++) {
  if (outOfBudget()) {
    return { status: 'stopped-budget', stage: 'whole', progress: PROGRESS, pieces: [...state.values()], wholeGaps }
  }
  if (wholeStreak >= STUCK_ROUNDS) {
    await record(`- **Whole**: the same gap came back ${STUCK_ROUNDS} times. Needs you. Gap: ${wholeGaps[wholeGaps.length - 1]}`)
    return { status: 'whole-stuck-needs-human', progress: PROGRESS, pieces: [...state.values()], wholeGaps }
  }

  const ours = oursIsA('_whole', round) ? 'A' : 'B'
  const bar = ours === 'A' ? 'B' : 'A'
  const roundDir = `${DIR}/rounds/_whole/${round}`

  const cap = await agent(
    `Capture the whole thing for a gauntlet loop's final comparison. You make the blind pair; you do not judge it.

How to capture ours: ${prep.captureHowTo}
1. Capture OUR complete output as a whole (a full run, page or document) into ${roundDir}/${ours}/.
2. Copy the bar's whole-thing captures from ${prep.wholeBarCaptures} into ${roundDir}/${bar}/.
3. Make the sides indistinguishable except by content: neutral names, no labels or metadata.
4. Run the regression check: ${prep.regressionHowTo}`,
    { label: `capture:whole#${round}`, phase: 'Whole', schema: CAPTURE_SCHEMA },
  )
  if (!cap) continue

  const verdict = await agent(
    `Judge one blind pair: two complete versions of the same kind of thing.

A: ${cap.aFiles.join(', ')}
B: ${cap.bFiles.join(', ')}
${cap.numbersA || cap.numbersB ? `Numbers for A: ${cap.numbersA || '-'}\nNumbers for B: ${cap.numbersB || '-'}` : ''}
The goal they serve: ${prep.goal}
The parts, for naming where a gap lives: ${pieceNames.join(', ')}.

Gaps already named in earlier rounds:
${wholeGaps.length ? wholeGaps.map((g, i) => `${i + 1}. ${g}`).join('\n') : '(none)'}`,
    { label: `critic:whole#${round}`, phase: 'Whole', schema: verdictSchema(pieceNames), agentType: 'gauntlet-critic', effort: 'high' },
  )
  if (!verdict) continue

  const oursWon = verdict.pick === ours
  if (oursWon && cap.regressionsPass) {
    await record(`- **Whole** round ${round}: ours picked blind, regressions pass. Done.`)
    return { status: 'won', progress: PROGRESS, pieces: [...state.values()], wholeRounds: round }
  }

  const gap = cap.regressionsPass ? verdict.gap : `Regression: ${cap.regressionNotes}`
  await record(`- **Whole** round ${round}: ${oursWon ? 'ours picked, regression failed' : 'bar picked'}. Gap in ${verdict.piece}: ${gap}`)
  wholeStreak = verdict.repeatsEarlierGap ? wholeStreak + 1 : 1
  wholeGaps.push(gap)

  const target = byName.get(verdict.piece) || prep.pieces[0]
  const again = await runPiece(target, `Found in the whole-thing comparison: ${gap}`)
  if (again) state.set(again.piece, again)
  if (!again || again.status !== 'won') {
    return { status: 'pieces-open', stage: 'whole', progress: PROGRESS, pieces: [...state.values()], wholeGaps }
  }
}
