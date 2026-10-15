# Representative broader-suite triage — GP-19919

Read-only source and CPU-probe comparison, 2026-10-14. No game logic or test expectations were changed. No extra browser workers were started while the parent's four-worker suite ran.

## The saved counts are historical aggregates

`suite-baseline.json` contains a copy of `crew/tests.json`. `tools/tests/run-all.mjs` lines 241–260 merge historical per-file results whenever a named test run is performed, then stamp a new top-level time and commit. Our named tinspect/t215 run updated those two entries; it did not freshly execute t3, t50, t91, t107 or t111. Their saved zero-failure counts cannot be presented as a complete equivalent pre-audit run. The initial full-suite attempt was blocked before assertions by the now-fixed HTTP media starvation.

## Reproduced existing contract/parity gaps

- **t111: height-only headshot assertions are stale.** It supplies only `hitY` to `damageZombie` and expects headshot bonuses above old head-height lines. The retained pre-audit fixture already calls `confirmedHead(z, info)` with the comment “height alone never counts.” `game/zombie-headshots.js` requires `info.headHit`, plus face/head tags for Military/Brute. CPU probes confirm height-only calls return false for all five tested types. This predates the inspector audit; the owner must reconcile the test with the approved posed-head policy.
- **t91: the fake raycaster cannot produce a projectile hit on a posed surface.** The retained fixture already routes bullets/pellets through `zombieRoundHit` → `zombieSurface`. `fakethree.mjs` has `Raycaster.intersectObjects() { return []; }`. A segment through a real fake-body mesh consequently returns no surface hit, so the shell cannot create the corpse expected by the test. This is an existing renderer-double limitation exposed by the earlier surface collision policy. The new instanced bounds implementation does not change raycasting.
- **t107: one brute is reused after his plate breaks.** AK damage is 27. The test hits the same plate with AK27, pellet20, melee40, then chainsaw30. Existing breakable armor has 40 back/45 front HP. The first two hits break that plate; subsequent hits receive the exposed multiplier 2. The unchanged armor helper yields melee damage36 and saw27, while the test still demands18 and13.5. The threshold pellet remains protected at9. This follows the earlier breakable-plate behavior, not the inspector.

Command: `node review/inspector-audit-GP19919/automation/triage.mjs`. Evidence: `triage.json` contains these probe results and eight matching SHA256 pairs for the retained versus current game source: resolveTarget, placeRefusal, placeBuildAt, tbParts, buildTreeBatches, updateTreeBatches, zombieRoundHit and damageZombie.

## Paired runtime comparison completed

After the four-worker suite finished, the same unchanged tests were run sequentially on the retained pre-audit fixture and a current fixture, in one isolated owned browser with fresh pages/local storage. Both fixtures used the same current external modules and fake renderer.

Command:

`node review/inspector-audit-GP19919/automation/triage-browser.mjs t3 t50`

Results from `triage-browser.json`:

- **t3:** pre-audit **4 pass / 1 fail**, current **4 pass / 1 fail**. Identical failure: `FAIL turret: no aim lv1, aimed at the deck lv1`. Durations 37.2s and 35.3s.
- **t50:** pre-audit **17 pass / 1 fail**, current **17 pass / 1 fail**. Identical failure: `FAIL batched count recovers (405)`. Durations 21.9s and 21.9s.

These reproduce before the inspector audit under equivalent current dependencies; neither appeared only after the audit. Their relevant inline build/tree functions are also byte-identical. This comparison isolates inline source changes rather than claiming a complete historical dependency snapshot. It never reloaded or stopped the shared camera daemon, and closed only its own browser/server.

The full suite remains authoritative for current failures. Neither its assertions nor its expected values should be weakened to produce a green summary. The combat fixture discrepancies and the reproduced pre-existing build/tree failures belong in owner requests.
