# Game Brief template

One screen. Every field filled. This is the contract the whole studio works against, and the only thing the user approves.

```
GAME BRIEF - [working title]

Pitch        [one sentence: who you are, what you do, why it is fun]
Fantasy      [the feeling the player should have, in player words]
Genre        [genre + camera + perspective]
Engine       [Unreal 5.x / Unity 6 / Godot 4.x / web (three.js)] - target [PC / web / console / mobile]
Scope        [session length] per session, [total length] total, [N] levels / arenas / biomes
Core loop    [verb -> verb -> verb -> reward -> back to start]

Pillars      1. [pillar - a rule that can decide a design argument]
             2. [pillar]
             3. [pillar]
Not this     [3 things the game deliberately does NOT do]

Art          [one line direction] - reference: [named game]
Audio        [one line direction] - reference: [named game]

Bars         Feel/gameplay  [named game + exact moment/clip]
             Visual         [named game + exact screenshot/scene]
             Audio          [named game + exact track/SFX set]
             UI/UX          [named game + exact screen]
             Numbers        [60 fps on target, input latency < X ms, load < Y s, crash-free 30 min]

Milestones   Tech Spike -> Vertical Slice -> Content Alpha -> Beta -> Release Candidate -> Human Playtest
Vertical slice [the one 3-5 minute stretch that proves the game is fun]
Assets       [sourcing: CC0 kits (e.g. Kenney, Quaternius, Poly Haven) / licensed packs / generated / custom Blender - and which assets must be custom]
Machine      [engine + capture path verified by the probe, e.g. "Godot 4.4, software rendering via Xvfb, video via --write-movie"]
Budget       [user's budget if named; otherwise proposed wall-clock cap, default 7 days]
```

## Rules

- **Pillars must be decisive.** "Fun combat" is not a pillar. "Every enemy is readable in 0.3 s" is.
- **Not this is mandatory.** It is the Director's main tool for cutting scope.
- **Bars come from the user's reference games.** If the user named none, propose them and mark them as proposals.
- **Vertical slice is concrete.** A place, a sequence, an ending. Not "the first level".
- **Assets must be realistic.** Custom rigged and animated characters are the most expensive thing the studio makes. Default: kits and retargeted animation for everything except the hero assets that define the game's look.
- **Scope must fit the engine and the tools.** If the pitch is an open-world MMO, say so and propose the slice that proves the idea.
