# Zombie fidelity pass (GP-162)

`baseline-source.js` is the exact GP-161 concept mesh module saved before the
second fidelity pass. Its SHA256 is
`B16520A292330EB198DB234AFDE622681B9E7C15247A116A39C6D90A354EDC98`.
It is only served by the comparison harness; production never imports it.

`before/` contains the first-pass geometry rendered by the real game and Three.js.
Each of the fourteen types has front, back, gameplay-height, and face views. The
after run reuses those recorded cameras and freezes the same poses. Both guardians
use their actual articulated cave rigs, and both are also exercised through 120
galloping poses. Pooled bodies are reused and their hidden legs must be restored.

The warm pooled spawn uses the standard legal body size (height 1, width 1 except
the Bomber's standard 1.15), then is seeded after geometry creation, separating
startup-pool variants and UUID randomness from stat comparisons. The after pass
reuses the baseline rest angles while keeping its own measured floor placement.
The after run compares health, speed, radius, damage, armor,
reward, scale, and tactics against the before run. No production stats are changed.

Run with the bundled runtime's `node_modules` in `NODE_PATH`:

```
node ui/zombie-fidelity.browser.mjs --before
node ui/zombie-fidelity.browser.mjs
node ui/zombie-fidelity.browser.mjs --contact-only
```

`--only=shambler,guardian` produces a partial preview in `preview-after/` without
overwriting final checks. `--perf-only` captures the 48-body horde separately in
`performance.json`. Every measured horde run asserts all 48 bodies are on screen.
The saved `preview-after/` images are intermediate iterations and are superseded
by `after/` and the contact/comparison sheets.

Timing values from a headless browser under concurrent test load are observational.
They are not a substitute for the independent normal-GPU 60-fps acceptance check.

Baseline result: all fourteen models and pooled restoration passed, guardian rigs
remained finite with four versus two eyes, and all 48 horde members were visible.
The horde contained 656 meshes and 291,168 triangles. Screenshots and full numeric
evidence are in `before/checks.json` and `before/`.

The completed after capture is in `after/`, with all 56 per-model views plus the
48-body horde. `after/checks.json` records source hashes and verifies the source
files remained unchanged during capture. All fourteen types matched the canonical
gameplay stats and restored pooled limbs. Both guardian rigs passed 120 poses and
kept four versus two eyes. No page, shader, WebGL, or concept-module loading errors
were recorded. The horde retained 656 meshes with 547,296 triangles; all 48 were
on screen. Full command output is in `final-render.log`.

The four `*-contact.png` sheets show the upgraded models; the four
`*-comparison.png` sheets show first-pass versus fidelity-pass pairs. All four
upgraded contact sheets were visually inspected. `contact.log` records successful
gallery generation.

`node tools/shoot.mjs --compare review/zombie-fidelity/before review/zombie-fidelity/after`
compared all 57 views. Pixel differences range from 0.46% to 8.97% (horde: 1.00%).
The tool exits 1 when a view changes by at least 3%; the large closeup differences
are the requested redesign and are not an unchanged-image regression pass.
Complete comparison output is in `compare.log`.

These artifacts validate the model render and rig checks. Functional regression
acceptance and normal-GPU performance acceptance are reported separately in the
GP-162 handoff; they are not implied by the screenshot checks.

The final capture includes the corrected forward-curling Screamer tongue, which
keeps its head bounds inside the existing headshot slice, and the Bomber's wet
textured pulse surface. The unchanged grounding/headshot test `t93` passes 11/0
after this correction. The final targeted set (`t93`, `t111`, `t124`, `t164`,
`t202`, `t209`, `t215`, `t222`) totals 79 passes and 0 failures; the crew test ledger
and GP-162 handoff contain the integration evidence. `unit-tests.log` records
25 passing model/atlas unit checks with 0 failures. No existing test expectations
or geometry complexity bounds were loosened.
