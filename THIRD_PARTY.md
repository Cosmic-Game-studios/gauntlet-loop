# Third-party skills

These skills are bundled unmodified from [mattpocock/skills](https://github.com/mattpocock/skills) by Matt Pocock, under the MIT License (a copy sits in each skill's folder as `LICENSE`).

Source commit: `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`

| Skill | Why it is here |
|---|---|
| `wayfinder` | Plans work too big for one session as a map of decision tickets; its cleared map is what the gauntlet loop builds |
| `to-spec` | Collapses a cleared Wayfinder map into one spec the gauntlet loop reads |
| `grilling` | Wayfinder resolves its default ticket type with it |
| `domain-modeling` | Wayfinder calls it alongside grilling |
| `research` | Wayfinder resolves research tickets with it, as subagents |
| `prototype` | Wayfinder resolves prototype tickets with it |
| `setup-matt-pocock-skills` | Wires the issue tracker these skills read; run it once per repo |

To update them, copy the same folders from a newer commit of mattpocock/skills and change the commit above. Do not edit them in place: fixes belong upstream, so updates stay a straight copy.
