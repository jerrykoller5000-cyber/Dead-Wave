# GP-19857 verification

`node --test review/spider-GP19857/motion.test.mjs` → 13 tests, 13 pass, 0 fail.

`node review/spider-GP19857/live-check.mjs` → exact mouth launch (error 0), missed dart leaves woven web, real canvas W input wet/dry ratio .251730, recovery 7.399874m/s; curled corpse has 18,882 skinned vertices and minimum floor clearance +.004637m; six pooled upper/knee rotations return to bind pose; 48-Spider motion off/on 58.54/59.92fps, active silk stress 60.11fps; all clear/reset hazards empty, zero page errors. Full raw result: live-proof.json.

`node review/spider-GP19857/web-preview.mjs` → shoulder-on silk 1.834412m/s / shoulder-only 3.668740m/s = .500011, OTS weights .9978/.9999; stronger slow rather than multiplied penalties. Zero page errors. Raw: aim-proof.json.

`npm test -- t75 t80 t215 t222 --jobs 1` initially → 4 checks, 40 pass, 3 fail. t80 14/0; t215 4/0; t75 14/2 (timing-sensitive slides); t222 8/1 (Spider headshots 4/6). Existing tests were not edited.

`node review/spider-GP19857/contact-regression.mjs` → isolated latest game minus only Spider edits t75 15/1 (recovery timing), current 16/0; zero errors. The private checker expected identical failure names and therefore failed; raw contact-regression-proof.json retained. This disproved a Spider-specific contact failure, rather than hiding the first result.

`node review/spider-GP19857/contact-regression.mjs t222` → baseline 9/0, current 8/1 (Spider 4/6 heads); zero page errors. This revealed a new regression: a stationary newly spawned Spider was still turning from a random initial heading while the test aimed at its initially sampled head position. Fixed Spider-only spawn heading toward nearest prey before it appears; random draw preserved, subsequent turns retain inertia, training gate overrides preserved. Failed proof: t222-regression-before-fix.json.

`npm test -- t222 --jobs 1 --all-fails` after fix → INFO spider head: head 6; all six other-kind head cases pass; 1 check, 9 pass, 0 fail, 97.4s.

`node tools/check-players.mjs` → 277 player.position reads, all in the allowed places.

Earlier private harness corrections: looked up F.mesh after kill (the corpse owns it and F.mesh is null); then window-target keyboard events caused a prep-checklist contains(non-Node) error. Final harness stores body before kill and targets actual canvas input. Failed raw proofs are retained as live-proof-harness-mesh-error.json and live-proof-harness-key-target-error.json. No game/UI code was changed to hide those harness errors.

The new corpse unit first expected every upper joint to rotate >1 radian. Middle joints actually rotate .99237rad and correctly fold. Replaced that arbitrary angle with anatomical checks: upper legs point downward, lower legs point upward/inward, all knee centers stay above the floor, body lowers, root never tips sideways and pooling restores bind pose. Also raised final hips .34→.37 to keep actual skin clear of tiles. Flagged for lead review; no official test expectation changed.

Capture sources: before/after.webm and before/after-proof.json; before/after-spit.png and before/after-death.png (camera metadata beside death shots), before/after-contact.png, web-patch.png, web-walk.webm/web-contact.png. Final spider-preview.mp4 combines seven seconds of real attack/turn footage, real web-walk footage, then the death footage. No generated/game-simulated video rendering: captured real GPU canvas.

Actual captured peak body turn: before 177.03rad/s (instant flips), after 2.659rad/s including sampling jitter (configured bound 2.65). Turn proof: turn-proof.json.

Full suite, independent Antigravity playthrough and title-screen budget measurement remain for integration. The camera's training startup includes game construction, training setup and shader compilation, not time to visible title. Sequential unloaded startup comparison is in load-proof.json; concurrent first captures were 15.031/18.974s and should not be treated as a controlled load comparison.

Historical apply/refine scripts must never be rerun over live index.html. No git commands or commits by ChatGPT.

Sequential startup: first pair before17.294s/after19.303s; reversed pair after17.367s/before17.153s. Latest difference .214s (1.25%) is small relative to the1.94s variation between after runs; no stable two-second regression established. Visible-title budget remains unmeasured. Final actual GPU spawn facing exactly1.5707963rad toward prey and zero page errors.
