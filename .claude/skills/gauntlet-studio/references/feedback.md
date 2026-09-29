# Human playtest and feedback loop

The human is **not** a dependency during development. They come in at the end, when the game is complete, and do one thing: **play it and say what they think.** Everything else - turning that into work, planning, building, judging - stays with the studio.

```
 autonomous run ... --> RELEASE CANDIDATE --> HANDOFF --> [ WAIT for human ] --> FEEDBACK
                                ^                                                    |
                                |                                                    v
                          patch gauntlet  <--  feedback plan  <--  translate into bars + tickets
```

## 1. Release Candidate (when the studio is done)

The Director only hands over when the Release Candidate gate is met (see `director.md`): every feature WON, completeness list closed, perf budget met, 30 min crash-free, packaged build launches from scratch. The one exception is the circuit breaker (wall-clock cap, budget, or no progress): then the best launching build goes out with `KNOWN_GAPS.md`, and the handoff message says so plainly. The human never receives a build that does not launch.

## 2. Handoff

The Director prepares, commits, and then **stops and waits**:

- `studio/handoff/RC-<n>/` with:
  - the packaged build and a one-line command or path to launch it,
  - `PLAY.md`: controls, what to try, how long a full playthrough takes, known issues (honest, short),
  - `CHANGES.md` (from RC-2 onward): what changed since the last round, mapped to each feedback item,
  - a 60-90 s highlight video and 6 screenshots, so the human sees the state even before playing.
- One message to the user:

```
RC-<n> is ready to play: [launch command / path]
Play it, then tell me what you think - in your own words, as rough as you like.
Screenshots, clips or timestamps help but are not needed.
```

Then the Director sets `STATUS.md` to `WAITING FOR HUMAN RC-<n>`, **disables the heartbeat driver** (cancels the Routine or stops `/loop`), and **waits**. No polish, no background work while the human plays. The build they test must not change under them. The human's next message restarts the driver.

## 3. Feedback intake

The human writes anything, in any language, as rough as they like:

> "The gunplay doesn't feel good. Make it more like CS2."
> "Improve the graphics - it should be more borderless comic art."
> "Optimise it, I want smooth frame rates."
> "Level 3 is boring." / "I didn't understand how to upgrade."

The Director does **not** ask follow-up questions unless an item is genuinely uninterpretable (it contradicts itself, or refers to something that does not exist in the game). Instead it interprets, writes its interpretation down, and starts. The human corrects in the next round if the interpretation was wrong - that is cheaper than a question.

## 4. Translate every item into a bar and tickets

Human feedback is usually a feeling plus, sometimes, a reference. The Director's job is to turn each item into something the gauntlet can judge. For each item it writes one entry to `studio/feedback/RC-<n>.md`:

```
F-3.1  "Gunplay doesn't feel good, more like CS2"
type:        feel / gunplay
diagnosis:   Feel critic + Code critic on current weapons: [what is actually wrong - e.g. hitscan delay 2 frames,
             no recoil pattern, random spread from shot 1, weak hit feedback, no tagging on hit]
new bar:     CS2 - AK-47 and M4A1-S: first-shot accuracy, learnable spray pattern, tap/burst/spray rhythm,
             hit feedback (sound + flinch + headshot sound). Source: official gameplay capture [URL + timestamps]
numbers:     input-to-shot < 1 frame after input sampling, first-shot deviation 0 when standing still
tickets:     T-201 recoil/spray pattern system [Code], T-202 weapon tuning tables [Design], T-203 hit feedback SFX [Audio],
             T-204 muzzle/tracer/impact VFX [Tech Art], T-205 viewmodel kick animation [Animation]
pillar:      supports P1 "every fight is decided by skill"; brief amended (A-2): "shooting feel reference = CS2"
done when:   Feel critic picks ours over the CS2 clip on "which gun would a skilled player rather shoot?", x2 blind
```

How the common kinds of feedback translate:

| Feedback kind | Diagnosis first | New bar | Typical departments |
|---|---|---|---|
| **Feel** ("gunplay/movement/combat feels off") | Feel critic + Code critic measure the current state (latency, frame data, curves) | Named game's exact mechanic, captured | Code, Design, Animation, Audio, Tech Art |
| **Look** ("more borderless comic art", "looks cheap") | Coherence critic lists what currently contradicts the new direction | Named game(s) with that style + new style frames | Art (new style bible), Tech Art (shaders, outlines, post), 3D, UI |
| **Performance** ("smooth frame rates") | Tech auditor profiles every level, finds the top 5 costs | The numbers bar: target fps on target hardware, 1% lows, no hitches > N ms | Tech Art, Code, 3D (LODs), Build |
| **Content / pacing** ("level 3 is boring") | Playtest critic replays it: dead time, repetition, difficulty curve | Named level from the reference game | Level, Design |
| **Clarity** ("didn't understand X") | First-time player critic reproduces the confusion | Named game's onboarding for a similar mechanic | UI/UX, Design, Level |
| **Bug** | QA reproduces it and adds a regression test | - | Owning department |

A big direction change (like a new art style) amends the brief and the style bible: the Director writes the amendment to `studio/BRIEF.md` under `## Amendments` (A-1, A-2, ...), quoting the human's words. Human feedback is the only thing that can change the brief besides the human directly.

## 5. Protect what already works

Feedback fixes one thing and must not break what the human did not complain about.

- `studio/KEEP.md` - everything the human praised, plus every feature the feedback did not criticise (the studio cannot see what the human played, so silence counts as "keep" by default; the feedback plan lists these so the human can correct it). These get **regression bars**: the current RC's capture becomes the bar the new build must not lose to.
- Every patch ticket is also judged by the Experience critic against the **previous RC** on the same evidence ("which is better?"), not only against the external bar. A patch that is worse than the RC it replaces is not WON.
- Code critic and Tech auditor re-run on the whole game at the end of every patch cycle: no new crashes, no perf regression.

## 6. Feedback plan, then run

The Director writes a short feedback plan to the user - what it understood and what it will do - and starts immediately without waiting for approval:

```
Understood from your RC-2 feedback:
1. Gunplay -> CS2-style: learnable spray patterns, first-shot accuracy, stronger hit feedback. 5 tickets.
2. Art -> borderless comic style (reference: Hi-Fi Rush, Borderlands 3). New style bible, outline + cel shader,
   all assets re-judged. 14 tickets. Biggest change this round.
3. Performance -> 60 fps locked on target, 1% lows > 50. Profiling first. ~6 tickets.
Keeping as is: movement, level 1-2 layout, music.
Starting now. If I got something wrong, just tell me - I'll correct it in the next round.
```

Then the normal studio loop runs a **patch cycle**: tickets, gauntlet, integration heartbeats, until every feedback item's "done when" is met and the Release Candidate gate passes again. Then RC-<n+1>, handoff, wait.

## 7. The cycle continues until the human says it is done

There is no round limit. The loop ends when the human says the game is finished (or stops giving feedback). Every round leaves a trace in `studio/feedback/`, so the whole history of human decisions stays with the project.
