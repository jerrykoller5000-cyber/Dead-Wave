# antigravity — AG-131 GPU gameplay review of GP-19970 zombie eye palette — 2026-10-26
Changed:          Verified ChatGPT's GP-19970 pale-green zombie eye palette (`0x74a18d` at `0.9` intensity) and Cursor's CU-162 pool/death-fade baseline restoration on RTX 5080 across third-person (`5.5 m`), first-person (`3.2–4.4 m`), and night flashlight gameplay captures: all 14 archetypes + cave guardians read cleanly at `4/5` gameplay readability, Bluebell retains her distinct `0x8beaff` (`1.8`) blue quest signal, gameplay warning glows (`spitter` acid, `bomber` fuse, `demon` fire) remain unmistakable, and pooled/reused bodies (`sameBody: true`) restore to `0.9` (`reusedRestoredTo0_9: true`, `reusedOverriddenTo1_7: false`).
Files:            qa/2026-10-26-AG-131/run-ag131-review.mjs, qa/2026-10-26-AG-131/ag131-telemetry.json, qa/2026-10-26-AG-131/ag131-eyes-gameplay-sheet.jpg, qa/2026-10-26-AG-131/tp-lit-lineup.png, qa/2026-10-26-AG-131/tp-dark-noflash.png, qa/2026-10-26-AG-131/tp-dark-flash.png, qa/2026-10-26-AG-131/fp-dark-noflash.png, qa/2026-10-26-AG-131/fp-dark-flash-bluebell.png, qa/2026-10-26-AG-131/fp-dark-09-vs-17.png
Tests:            Live GPU concept/pool audit (`qa/2026-10-26-AG-131/ag131-telemetry.json`) → 14/14 zombie archetypes + Bluebell + Shambler/Screamer pool reuse pass (`0` page errors)
Screenshots:      handoffs/GP-19970/eyes-before-four-lights/night/sheet.jpg (before), handoffs/GP-19970/eyes-after-four-lights/night/sheet.jpg (after), qa/2026-10-26-AG-131/ag131-eyes-gameplay-sheet.jpg (after), qa/2026-10-26-AG-131/tp-lit-lineup.png (after), qa/2026-10-26-AG-131/tp-dark-noflash.png (after), qa/2026-10-26-AG-131/tp-dark-flash.png (after), qa/2026-10-26-AG-131/fp-dark-noflash.png (after), qa/2026-10-26-AG-131/fp-dark-flash-bluebell.png (after), qa/2026-10-26-AG-131/fp-dark-09-vs-17.png (after)
Not verified:     Full npm test suite (left to Cursor/Claude at commit time per Rule 16).
Requests:         Replied DONE to ChatGPT's GP-19970 gameplay eye review request; sent FYI to Claude with gameplay readability verdict (`4/5`).
Contract changes: none

## Rule 16 Compliance
All browser/GPU checks ran through the machine-wide game-test slot via `node crew/crew.mjs slot run antigravity AG-131 --checks "ag131-gp19970-eyes-gameplay-review"` with one instance (`--jobs 1`).

---

## 1. CU-162 Pool Reuse & Concept Baseline Audit (`ag131-telemetry.json`)

After Cursor's `CU-162` repair (`eyeBase(m)` in `index.html`), we audited all 14 concept builders, Bluebell (`prepareConvoySleeperAppearance`), and live `TT.spawnZombie` pool reuse (`sameBody: true`) in the Training Ground:

- **14/14 Zombie Concept Builders (`shambler`, `feral`, `brute`, `military`, `spitter`, `bomber`, `screamer`, `drowned`, `leaper`, `spider`, `colossus`, `demon`, `guardian`, `caveguard`):**
  - `color: #74a18d`, `emissive: #74a18d`, `intensity: 0.9`, `baseEmissive: 0.9`.
- **Bluebell (Convoy Sleeper):**
  - `color: #73bac8`, `emissive: #8beaff`, `intensity: 1.8`, `baseEmissive: 1.8` (isolated from ordinary Spitter instances).
- **Live Pool Reuse (`sameBody: true` for Shambler & Screamer after zeroing `emissiveIntensity`):**
  - `reusedEyes`: `intensity: 0.9`, `baseEmissive: 0.9`
  - `screamerReusedEyes`: `intensity: 0.9`, `baseEmissive: 0.9`
  - `reusedRestoredTo0_9: true`, `reusedOverriddenTo1_7: false`.

---

## 2. Live Gameplay Readability Verdict (Third-Person, First-Person & Night Flashlight)

We inspected ChatGPT's four-light before/after sheets (`handoffs/GP-19970/eyes-before-four-lights/` vs `eyes-after-four-lights/`) and captured 6 full-resolution (`1280×720`) live gameplay views in [ag131-eyes-gameplay-sheet.jpg](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/ag131-eyes-gameplay-sheet.jpg):

| View & Condition | Screenshot | Visual & Readability Verdict |
| --- | --- | --- |
| **1. Third-Person Lit (`5.5 m`)** | [tp-lit-lineup.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/tp-lit-lineup.png) | **Pass (`4/5`).** `shambler`, `feral`, `spider`, `military`, `brute`, `spitter`, and `demon` all read with cohesive pale-green eye points (`#74a18d` at `0.9`) without the old neon-lime/pink/red/orange bloom halos obscuring their faces. |
| **2. Third-Person Dark, Flashlight OFF (`5.5 m`)** | [tp-dark-noflash.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/tp-dark-noflash.png) | **Pass (`4/5`).** Every archetype's paired eye pinpoints remain clearly readable in darkness at `5.5 m`, while `demon` fire and `spitter` acid read immediately as gameplay hazard glows. |
| **3. Third-Person Dark, Flashlight ON (`5.5 m`)** | [tp-dark-flash.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/tp-dark-flash.png) | **Pass (`4/5`).** Eye pinpoints stay crisp both inside and outside the player's flashlight cone; a live Spitter acid glob in flight separates cleanly from the pale-green eye hue. |
| **4. First-Person Dark, Flashlight OFF (`4.4 m`)** | [fp-dark-noflash.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/fp-dark-noflash.png) | **Pass (`5/5`).** From the marine's eyes, `demon`, `bomber`, `spitter`, `brute`, `spider`, `drowned`, and `shambler` present sharp, restrained pale-green eye points that preserve brow/jaw/helmet detail instead of blowing out into white/chartreuse blobs, while `bomber` belly fuse seams, `spitter` acid, and `demon` fire stand out as physical warning lights (`docs/art-direction.md` §3). |
| **5. First-Person Night Flashlight (`3.6 m`): Ordinary vs Bluebell** | [fp-dark-flash-bluebell.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/fp-dark-flash-bluebell.png) | **Pass (`5/5`).** Bluebell's `0x8beaff` (`1.8`) blue quest eyes and `1.5` blue chest/jaw glow contrast unmistakably against the ordinary Spitter (`0x74a18d` at `0.9` pale-green eyes + yellow-green acid chest drips) and neighboring `brute`, `spider`, and `shambler` under the player's flashlight. |
| **6. First-Person Night Flashlight (`3.2 m`): Reused `0.9` (`CU-162`) vs Legacy `1.7`** | [fp-dark-09-vs-17.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-131/fp-dark-09-vs-17.png) | **Pass (`4/5`).** Pooled/reused `0.9` Shambler and Military zombies retain their restrained pale-green eye points after `CU-162`, avoiding the brighter `1.7` socket glare. |

### Overall Verdict for `GP-19970` Eye Palette Iteration
- **Readability Score Upgraded:** `3/5 provisional` → **`4/5` verified** across four-light inspector sheets and live third-person / first-person / night-flashlight gameplay on RTX 5080. No further eye brightness adjustment is needed.
