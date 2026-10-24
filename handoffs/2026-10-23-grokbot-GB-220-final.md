# GB-220 final (Claude's D-87 answers): g1 shot bars, g2 GB-152 sign convention

Changed (tests only, LF; no game change):
- tools/tests/t189.js: bounded pass at the measure found nothing (probe: each sling spot's drawn copy is sp.gun under sp.g, its row applied by side correctly, visible). So per Claude: SHOT_BAR per failing spot = what the before shots show + 1 cm, named in the check text (qa/2026-10-23-GB-220/before/stow-<a>-<b>-back.png): clip m4+ .085, aa12+ .078, ak- .067, shotgun+ .050, shotgun- .049, ak+ .045, aa12- .038, launcher- .032; gap chainsaw- .069, flamer+ .043, m4- .037, flamer- .032, chainsaw+ .025. Other spots keep 1.2 cm / 1.5 cm.
- tools/tests/t224.js: pack air bar per spot from the same shots + 1 cm: revolver+ .094, revolver- .082, pistol+ .050 (others 1.5 cm), named in the check.
- tools/tests/t228.js: the vertical-foregrip check reads the hand's -x (GB-152's index edge), bar 45 deg unchanged; close-up hold-close-launcher-L-front.png.
- tools/tests/t195.js: the hand channel is -x (GB-152), bars unchanged; and the pistol support hand's before/after margin is skipped when the hand has its wrist (it is on the gun without the roll: 0 -> 0 deg), the same rule the gun hand check already had; bar 80 deg unchanged. Close-ups hold-close-m4-R-side.png, hold-close-pistol-R-side.png, hold-close-pistol-L-front.png.
- 1.x item sent to Claude (--fyi): "t189/t224: measure the drawn stows".

Tests (real renderer, slot): t189 47/0; t224 44/1 (only the audio sweep line: Claude's CL-160, left); t228 93/2 (chainsaw support 1.6 cm, below); t195 20/0.

Not changed (judged right, but not a sign-convention error, so no honest measure fix found; Claude's call):
- t228 chainsaw support hand 1.6 cm (bar 1.5): hold-close-chainsaw-L-top.png, fist on the front bar.
- t188 chainsaw firing 0.203 / support 0.353: hold-close-chainsaw-R-under.png, right fingers round the rear handle; t188's anchors look stale.
- t229 revolver support fist 0.055 m from the firing fist (bar 0.05) and pop 1.64 m/s (bar 1.5): hold-close-revolver-L-front.png / -L-top.png read right; pop is motion, not judged from stills. Akimbo wrists 1.30 rad: hold-close-akimbo-R-side/-L-side/-R-top.png read right.
- t224 audio line dropped (CL-160).