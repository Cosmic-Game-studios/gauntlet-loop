# KNOWN GAPS (RC-1)
- The muzzle flash showed in the W1/R1 captures but not in the R2/RC1 firing captures, even after two fix attempts (weapons.js). The cause is unconfirmed: either capture timing or the flash setup in shoot(). A human playtest should confirm whether it shows when firing.
- The rifle viewmodel's barrel angles steeply into the view. It reads as a gun but not a polished one (critic: "boxy"). The shotgun viewmodel was never seen in a capture.
- Mouse-wheel weapon switching is implemented but A-05 reports "wheel not verified" in the headless run.
- Design change made during the run: ammo refills when a wave is cleared (otherwise 120+24 rounds vs 57 enemies could make wave 4-5 unwinnable). There are no ammo pickups.
- A-09 (full 5-wave run) passes alone in 16 s but timed out once under parallel CPU load (tooling margin, not a game bug).
- Enemy detail was reduced for draw calls (386 -> 161 with 10 enemies). A critic judged the silhouettes still readable at 8 m; they were not checked at 20 m.
- No held-out judge or playtester ran (sprint mode). Audio was never heard by anyone and needs a human ear.
