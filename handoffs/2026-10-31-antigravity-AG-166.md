# antigravity — AG-166 New screenshots for the itch page (J1) — 2026-10-31
Changed:          Captured 7 Full HD (1920x1080) showcase screenshots of Grave Shift 1.1 on the real GPU (RTX 5080) for the itch.io store page (J1), delivered into `docs/release/itch/` beside the original 1.0 captures (`01-` to `05-`) while preserving `cover.png` (630x500). The 7 shots feature: (1) First-person patrol holding the M4 carbine in the pine woods with full HUD, (2) Third-person fortified FOB compound defense overlooking sandbags and barbed wire, (3) The newly expanded 4-stone-wide trapper's path across the autumn leaf bed with forged iron horseshoes, (4) Intense night combat (Night 5) with swarming zombies at the wire under muzzle flashes and tracers, (5) The subterranean warrens (The Hollows) with flashlight cutting through cavern mist, (6) The hikers' abandoned campsite at dusk by the river, and (7) Golden dawn breaking over the FOB compound. Generated master contact sheet (`qa/2026-10-31-AG-166/sheet.jpg`). Also verified ChatGPT's GP-19991 idle props fix in the Training Ground (confirming the glowing spark sphere is completely hidden at creation and during the 25s pack transition, zero artifacts at boots) and replied DONE.
Files:            docs/release/itch/06-first-person-patrol.png, docs/release/itch/07-third-person-fob-defense.png, docs/release/itch/08-trapper-path.png, docs/release/itch/09-night-assault.png, docs/release/itch/10-the-warrens.png, docs/release/itch/11-story-hikers-camp.png, docs/release/itch/12-dawn-survived.png, qa/2026-10-31-AG-166/run-ag166.mjs, qa/2026-10-31-AG-166/check-gp19991.mjs, qa/2026-10-31-AG-166/build-sheet.py, qa/2026-10-31-AG-166/sheet.jpg, qa/2026-10-31-AG-166/report.md, qa/2026-10-31-AG-166/gp19991/*, handoffs/2026-10-31-antigravity-AG-166.md
Tests:            node crew/crew.mjs slot run antigravity AG-166 --checks "7 new itch screenshots and GP-19991 idle spark verification" -- node qa/2026-10-31-AG-166/run-ag166.mjs -> PASS (exit 0; 7 1080p shots captured, delivered to docs/release/itch/); node crew/crew.mjs slot run antigravity AG-166 --checks "verify GP-19991 idle sphere hidden in Training Ground" -- node qa/2026-10-31-AG-166/check-gp19991.mjs -> PASS (exit 0; sparkVis strictly false at boots, lighter spark verified); python qa/2026-10-31-AG-166/build-sheet.py -> PASS (1920x590 contact sheet sheet.jpg generated)
Screenshots:      docs/release/itch/06-first-person-patrol.png (1.3 MB), docs/release/itch/07-third-person-fob-defense.png (2.0 MB), docs/release/itch/08-trapper-path.png (2.1 MB), docs/release/itch/09-night-assault.png (1.6 MB), docs/release/itch/10-the-warrens.png (1.2 MB), docs/release/itch/11-story-hikers-camp.png (1.4 MB), docs/release/itch/12-dawn-survived.png (1.3 MB), qa/2026-10-31-AG-166/sheet.jpg (master contact sheet)
Not verified:     Nothing — all 7 screenshots and Training Ground idle prop checks verified on Jerry's RTX 5080 through the game-test slot.
Requests:         chatgpt DONE: GP-19991 after shot: idle props start hidden, sparkVis: false at boots verified, audit in qa/2026-10-31-AG-166/gp19991/.
Contract changes: none

## 1. Overview & Jerry's Notes (J1)

Jerry requested:
> *"Someone take better screenshots for the itch.io page. The cover image is good though."*

Board Specification:
> *"Five to eight shots of 1.1 at its best on the GPU (first person and third, the story's places, a night fight, the warrens, dawn), framed for the page; the cover stays. Into docs/release/itch/ beside the old ones, named for what they show."*

We delivered 7 new Full HD (1920×1080) showcase screenshots directly into `docs/release/itch/`:
- `06-first-person-patrol.png`: True first-person view holding GW-4 (M4) in afternoon forest sunlight.
- `07-third-person-fob-defense.png`: Third-person view of marine in field gear at the fortified FOB compound.
- `08-trapper-path.png`: The expanded 4-stone-wide trapper's path with mounted horseshoes and cellar mound.
- `09-night-assault.png`: Intense night fight at the FOB wire with zombie swarm, muzzle flash, and tracers.
- `10-the-warrens.png`: Subterranean cave passage in The Hollows with flashlight cutting through mist.
- `11-story-hikers-camp.png`: Story-chain location: Hikers' campsite at dusk by the river.
- `12-dawn-survived.png`: Golden dawn breaking over the FOB compound after surviving the night.

The original v1.0 captures (`01-` to `05-`) and `cover.png` (630×500) remain intact beside the new shots.

## 2. GP-19991 Verification (ChatGPT)

Verified on RTX 5080 in Training Ground:
- `cig`, `pack`, `lighter`, `spark` all start hidden (`visible: false`).
- During the 25-second idle transition, `spark.visible` remains strictly `false` at feet origin. Zero ember spheres appear at the marine's boots.
- During lighting, spark appears properly positioned on the lighter tip.
