# Watchman MG — GP-174

Jerry requested six fixes: correct build ghost, Watchman labels, mounting motion, usable aim, sustained automatic fire, and shoulder carry.

The ghost now uses the deployed Watchman model with the placement material. The operator eases into a braced stance, grips the gun, shuffles around its planted tripod, and reaches the feed/charging handle during reload. Gun traverse is separate from the tripod; the camera stays on the original crew position and close-cursor aim holds the previous bearing. Bullets follow the actual barrel. RMB focuses the mounted view without activating a previously held sniper scope. Mounting exits placement mode.

The folded gun lifts onto the shoulder with support from both hands; the right hand holds its carry handle while walking. Set-down has a lowering transition and preserves condition, belt ammunition and Cash. Mounted/carry prompts and HUD identify the Watchman; mounted ammunition explicitly says AUTO.

## Proof

- `node --test game/watchman-mg.test.mjs ui/strings.test.mjs`: 21 pass, 0 fail.
- `node review/watchman-polish/accept.mjs`: actual match ghost identity, mount, six forward bearings/limits, close-cursor hold, automatic input, release, feed, carry contact and animated relocation. `accept-proof.json`.
- `node review/watchman-polish/comfort.mjs`: actual Training floor contact, upward/downward barrel direction and grips, focus zoom, FPS and final paired pictures. `comfort-proof.json`: maximum grip gap 7.2 mm across these elevated poses; soles within 8 mm of the floor; barrel-direction error below 3e-16; zoom 60 -> 38.13 -> 59.87; 59.87 FPS; load 12.352 s; zero runtime errors.
- Old 1.1-second held fire: 1 round. New: 11–12 rounds, with no further consumption after release. Carried grip gap about 0.5 mm. Relocation preserves 789 rounds on final rerun, 120 HP and 999999 Cash.
- `before-mounted.png` / `after-mounted.png` and `before-carry.png` / `after-carry.png` use the same Training player camera angles/distances. `final-ghost-detail.png` shows the actual transparent preview; `final-mounted.png` and `final-carry.png` show the normal match. Camera JSON files accompany images.
- `final-hooks.json` retains the reviewed, scoped index sections for checking concurrent saves. It is evidence, not a file to overwrite the whole index with.

## Limits and crew follow-ups

`npm test -- t18 t141 t211 t215 --jobs 2 --all-fails --no-retry` stops before browser checks at the existing sceneCull co-op guard (`player.position`, index line ~1872). Cursor notified; no guard/test weakened. t211's old shoulder expectation wants the held weapon HUD; the new carry HUD intentionally retains the Watchman/belt. Grokbot notified to review that assertion; test untouched. Ordinary dismount still restores the held weapon HUD.

Independent Antigravity QA, full suite and 48-zombie performance remain pending. Training still has its existing blanket placement refusal (already sent to Claude); the Training ghost is consequently red. Actual relocation/placement is verified in a normal match. No git, ordinary mortar behavior, general weapon grips, damage, economy or zombie changes.
