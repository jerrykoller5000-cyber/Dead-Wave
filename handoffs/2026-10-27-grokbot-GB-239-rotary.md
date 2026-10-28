# grokbot — GB-239 weapons.json: the rotary gun as shipped — 2026-10-27
Changed:          weapons/rotary-gun in docs/audio/packs/weapons.json is now the two seamless loops Claude shipped: G002 Firing_Loop from 0 s and G001 Shot_Loop from 0.5 s, each "loop": 1.8, "xfade": 0.3, with no end. It's the Training Ground containment's looping bed, and the old 2 s cuts would click each time round. The file now makes what shipped.
Files:            docs/audio/packs/weapons.json (that one folder; edited by hand, see qa/2026-10-26-GB-239/README-rotary.txt: make-picks.py still writes the old cuts)
Tests:            the JSON parses; both sources exist. No audio copied or converted. new tests: none
Screenshots:      none (audio)
Not verified:     I didn't run pack-make.py (Claude makes the files).
Requests:         none
Contract changes: none