# The studio

Crucible is organised like a real game studio: a director, a small leadership team that owns taste and structure, departments that build, and a review board that judges. Every role is a subagent with its own model, tools and prompt; the Game Director is the main session.

Why this shape: in the first Arena benchmark, a studio with three generalist builders and one "core" ticket produced clean code but the weakest look and UX, because nobody owned art, level or UI and no visual review produced usable feedback. Ownership is what makes quality happen - every visible part of the game needs a department that owns it and a critic that judges it.

## Org chart

```
                          GAME DIRECTOR (main session, Opus)
          vision · brief · milestones · dispatch · merge · cuts · never builds
                                        |
        +------------------+------------+-------------+--------------------+
        |                  |                          |                    |
   ART DIRECTOR      TECH DIRECTOR              DESIGN DIRECTOR         PRODUCER / QA LEAD
   (Opus)            (Opus)                     (Opus)                  (Sonnet)
   style bible,      architecture contract,     mechanics, feel         acceptance suite,
   look-dev scene,   module owners, code        numbers, tuning,        capture + step tools,
   visual reviews    reviews, integration       UX flows, onboarding    playtests, tracker hygiene
        |                  |                          |                    |
   ----- DEPARTMENTS (builders, one ticket each, own files) -------------------------------
   Character & Creature Art · Environment Art · Level Design · Animation · VFX · Tech Art (lighting, post, perf)
   Gameplay Engineering · AI Engineering · UI/UX · Audio · Tools & Build
                                        |
   ----- REVIEW BOARD (always fresh, never builds) ----------------------------------------
   Art critic · UX critic · Visual QA inspector · Code critic · Playtester · Held-out judge
```

Leads are not permanent agents. A lead is a role the Director spawns for lead work: the Art Director writes the style bible and later reviews coherence; the Tech Director writes the architecture contract and later reviews code. Lead output lives in files (`STYLE_BIBLE.md`, `ARCHITECTURE.md`, `DESIGN.md`), which is how the leadership stays present in every later ticket without being in anyone's context.

## Model routing

Route by the kind of thinking the ticket needs, not by the department's name.

| Work | Model | Why |
|---|---|---|
| Game Director, all leads (art, tech, design direction) | **Opus** | Judgement, taste, planning across the whole game |
| Every critic and judge (art, UX, code, held-out) and the Visual QA inspector | **Opus** | A weak critic lets everything through; critic quality sets the ceiling |
| Visual and spatial building: 3D models, characters, environment art, level layout, lighting and post, VFX, animation, UI/HUD design, weapon feel and viewmodels - the look of a 3D world is where the studio is judged hardest, so these tickets get the strongest model and the most review rounds | **Opus** | Visual design, spatial reasoning and "feel" are where the stronger model makes the visible difference |
| Implementation against a clear spec: systems, AI/navigation logic, save/load, tools, audio synthesis code, build scripts, bug fixes with a known cause | **Sonnet** | Strong, fast and cheaper for well-scoped code |
| Playtesting (plays and reports) | **Sonnet** (Opus at a release gate) | Many steps, simple judgement per step |
| Re-checking a fix diff against the named blockers and the acceptance list | **Sonnet** | Verification against explicit criteria, not taste |
| Mechanical work: renaming evidence, file rotation, dashboard, running a test suite and summarising | **Haiku** | Cheapest; no taste involved |

When a Sonnet ticket fails its first review on quality (not on a bug), the next round goes to Opus. When an Opus ticket turns out to be pure implementation, the Director routes its follow-ups to Sonnet. Where the environment supports an `effort` setting, critics and leads run at high effort; builders at the default.

## Rituals

A studio has rhythms. Crucible has five, and the playbook (`playbooks.md`) sets how often each runs for the available time.

1. **Kickoff** - brief and pillars (Director), then in parallel: style bible and look-dev scene (Art Director), architecture contract with one owner per file (Tech Director), feel numbers, tuning tables and UX flow (Design Director), acceptance suite, capture and step tools, bar captures in comparable framing (Producer/QA). Nothing is built by departments until the contract exists; everything after is built against it.
2. **Production sprint** - every department builds its ticket in parallel, on its own files, against the style bible and contract. A sprint ends when all dispatched builders have returned.
3. **Review** - the review board runs in parallel on the integrated build: art critic, UX critic, code critic, playtester, acceptance suite. The Director turns their verdicts into **one top gap per department** (never a list) and a fix list for bugs.
4. **Fix sprint** - the same builders are resumed with their one gap (continuity is cheap; see `context.md`). Then review again. This review-fix cycle is the gauntlet (`gauntlet.md`), up to the round budget.
5. **Milestone review** - on a real build: acceptance suite green, held-out judges on hero pieces, the milestone gate in `director.md`. Then the next milestone's tickets are written.

## Writing a dispatch brief

Every subagent starts from nothing. The brief is the only thing it knows, so a vague brief produces duplicated, off-target or incompatible work - and an overloaded one buries the job under context it does not need (`context.md`, Rule 2). The Director writes the brief as a **ticket file** and lets `tools/pack.mjs` assemble the pack:

```
studio/tickets/T-07.md
role: studio-builder
craft: 3D models built in code; Animation; Stylised and comic rendering
department: Animation
style: Palette; Characters
arch: Hook; Signatures
owns: game/src/enemies.js
uses: game/src/world.js; game/src/lookdev.js
lessons: enemies; art
evidence: studio/bars/enemy_closeup.png

goal:         what the player will experience when this is done, in one or two sentences - and why
              ("rushers read at 20 m because the pillar is 'every threat is readable at a glance'")
deliverable:  exactly which files/assets change; which interface they implement
boundaries:   other owners' files, the brief and shared contracts stay untouched; do not commit - the
              Director commits after integration, so parallel builders never collide in git
bar:          what it is compared against and on which question
done when:    the acceptance ids and numbers that must pass, and the exact commands to run them
tools:        the render/capture tool and the acceptance runner, with the exact commands
deadline:     absolute UTC time; check `date -u` as you work and return by deadline minus 60 s
round:        n of budget; the one gap from the last review, if any
```

Then `node tools/pack.mjs build T-07` and a three-line dispatch, the same shape for every agent (stable text first, so the prompt cache holds across the whole run):

```
Read /abs/studio/prompts/studio-builder.md first - it is your role.
Then read /abs/studio/packs/T-07.md - it is your whole context; do not open other studio files or the skill.
Deadline 14:32:00 UTC. Return the 5-line format from your role.
```

Choose the sections by the question "what would a senior in this department look up for this job?" - not "what might be related". A three.js ticket does not need Blender turntable instructions; a UI ticket does not need the enemy architecture. If the pack comes out over its budget, the ticket is too big: split it.

## Size of the studio

Parallelism is the studio's main advantage over a single agent - use it, within two limits: the number of files that can have a single owner at the same time, and the machine (headless renders are CPU-heavy; about one builder per CPU core plus one - `playbooks.md`). Critics in a review run in parallel too. In sprint mode the leads are folded into builders; in longer runs they are separate lead tickets.
