# antigravity — AG-415 Jerry direct: full-fledged optional Training Area tutorial — 2026-11-24

Changed: Built a complete, 100% optional interactive **PGB Field Orientation** tutorial for the Training Ground covering all core game systems across **10 modules and 37 hands-on steps**: movement/camera/Slow-Mo/1P-3P, firing-line targets/reloads/combat dummy/range drills, Armory loadout/Weapon Wheel/fire selector (`X` on full-auto)/shotgun shell switching (`X` on pump, D-150)/dual wield (`Y`)/workbench optics & finishes, CIF armor & uniform camo + facility blackout + Dark-Ops kit (`1` NVG / `2` Flashlight / `3` Laser), Supply Terminal/arc-aimed grenades/40% regen limit & MedPen trauma recovery (`H`), Security Door keypad & Build Hangar markings, Build Wheel (`B`)/2m grid placement & rotation (`R`)/stacking & elevation (`PageUp`/`PageDown`)/upgrade, repair (`T`) & drag-box scrap (`X`)/vaulting & barricades, defensive traps/autonomous turrets/crew-served Mortar & Watchman MG, HQ Panel live combat waves & Skulls → HQ Sample Intake Window → Cash banking loop, plus Field Infirmary recovery and FOB Threshold valley briefing (day exploration, minimap/Tab map, earned skills, specialist zombies, field tools). Includes a zero-DOM state machine (`game/training-tutorial.js`), localStorage persistence (`tt_training_tutorial_v1`, cleared with Reset Profile), PGB CRT UI (`ui/training-tutorial.js` + `ui/training-tutorial.css`) with non-blocking Entry Offer Card (auto-suppressed in `?debug=1`/`?inspect`), compact top-bar Orientation button, Pause menu entry, `O` Syllabus Drawer for jumping to any module/step or skipping/resetting, slim top-center modal-open ribbon when Armory/CIF/Shop/HQ Panel is open, 3D pulsing ground waypoint beacon (`ui/training-tutorial-beacon.js`) + projected screen-space pointer, and safe contextual practice assist actions for every hands-on step.

Files: `game/training-tutorial.js` (new), `game/training-tutorial.test.mjs` (new), `ui/training-tutorial.js` (new), `ui/training-tutorial.css` (new), `ui/training-tutorial-beacon.js` (new), `ui/training-tutorial.browser.mjs` (new), `ui/strings.js` (`tutorial.*` strings + `orientation: 'O'` input label), `index.html` (Training tutorial CSS/imports/pause button/`KeyO` shortcut/state-diff runtime bridge/`TT.trainingTutorialDbg`), `qa/AG-415/` (new)

Tests:
- `node --test game/training-tutorial.test.mjs ui/strings.test.mjs` → 22 pass, 0 fail (6 new tutorial tests covering schema/immutability, offer persistence, corrupt storage fallback, full 37-step walkthrough, navigation/skip/reset, and full `ui/strings.js` key cross-reference; 16 existing strings tests).
- `node --test game/training-*.test.mjs ui/training-*.test.mjs ui/strings.test.mjs ui/coach.test.mjs ui/key-guide.test.mjs ui/range-drills.test.mjs ui/range-feedback.test.mjs` → 167 pass, 1 pre-existing unrelated fail (`ui/training-security.test.mjs:53`, `2.99 !== 3.12` in untouched `world/training.js`).
- `node tools/check-players.mjs` → `check-players: 320 player.position reads, all in the allowed places`.
- `node crew/crew.mjs slot run antigravity AG-415 --checks "AG-415 training-tutorial.browser.mjs final WebGPU proof" -- node ui/training-tutorial.browser.mjs` (RTX 5080 WebGPU) → `PASS AG-415 training-tutorial.browser.mjs (webgpu): 14/14 checks green, 12 GPU screenshots saved, 0 errors.`
- `node tools/tests/run-all.mjs t215 t182 t219 t310 --jobs 1 --agent antigravity --task AG-415 --all-fails` → `4 checks: 67 pass, 0 fail` (`t182` 36/36, `t215` 4/4 zero mojibake, `t219` 22/22, `t310` 5/5).
- Game-test slot rule (AGENTS.md rule 16): observed; all browser runs executed sequentially under `node crew/crew.mjs slot run antigravity AG-415` / `run-all.mjs --jobs 1 --agent antigravity --task AG-415`, 0 page/console errors.

Screenshots (NVIDIA GeForce RTX 5080, WebGPU, `qa/AG-415/`):
- Entry Offer Card (1280×720, 3P live Training Ground): `qa/AG-415/01-offer-card.png`
- Pause Menu with `FIELD ORIENTATION` entry (offer card cleanly hidden under Pause): `qa/AG-415/02-pause-menu.png`
- Full CRT Syllabus Drawer (10 modules, 37 step chips, separated danger-red Reset Progress): `qa/AG-415/03-syllabus-drawer.png`
- Module 1 Movement & Sprint 3P HUD + 3D floor waypoint beacon + projected pointer: `qa/AG-415/04-step-movement-3p.png`
- Module 1 First-Person view (`5`) readability & live green checkmark confirmation: `qa/AG-415/05-first-person-view.png`
- Module 3 Armory open with slim top-center orientation ribbon (0 buttons covered): `qa/AG-415/06-modal-armory-dock.png`
- Module 4 Dark-Ops blackout + Night Vision (`1`) + Flashlight (`2`) + Laser (`3`) confirmed: `qa/AG-415/07-darkops-nvg-night.png`
- Module 7 Build Hangar 24m grid ghost placement + bottom-left build controls clear: `qa/AG-415/08-build-hangar-3p.png`
- Module 9 Live Combat Drill + center 5-second containment countdown clear: `qa/AG-415/09-combat-wave-hud.png`
- Module 10 FOB Threshold Field Briefing with pinned footer & scrollable body: `qa/AG-415/10-campaign-briefing.png`
- Graduation & Syllabus completion progress (green completed chips, zero ghost tracker): `qa/AG-415/11-graduation-syllabus.png`
- Narrow `390×844` responsive mobile viewport (pointer clamped above card, 0 overflow): `qa/AG-415/12-narrow-390px.png`

UI principles check (`docs/ui-principles.md` §6, 0–5):
- Readability: 5 (amber/green CRT phosphor on near-black glass with <4% scanlines, keycap badges, crisp contrast in noon range light, blackout NVG night, 1P/3P, and 390px narrow viewports)
- Hierarchy: 5 (current step title, keycaps, and live checklist lead; secondary tip box sits muted beneath; modal-open mode collapses to a single-line top-center confirmation ribbon)
- Consistency: 5 (uses Branch olive bezel, cut-corner `.tt-plate`, `--font-display`/`--font-hud`, sodium amber active / Ridgeline green confirmed / red destructive palette, all copy routed through `ui/strings.js` with zero brackets/HTML)
- Placement: 5 (3D beacon & projected tag point directly to world stations; top-right tracker occupies the open Training HUD slot with 0 overlap against `#trainingHud`, `#hudTopLeft`, `#ammo`, `#perf`, and modals; hides automatically under `#pause.show` and outside Training)
- Safety: 5 (100% optional, never locks controls on entry, auto-suppressed in `?debug=1`/`?inspect`; `Reset Progress` separated on the left of the Syllabus footer in danger red; `Exit` isolated in top-right header)
- Both views: 5 (verified in 3P `04-step-movement-3p.png` / `08-build-hangar-3p.png`, 1P `05-first-person-view.png`, blackout/NVG night `07-darkops-nvg-night.png`, Armory modal `06-modal-armory-dock.png`, and 390px mobile `12-narrow-390px.png`)

Not verified:
- Full `npm test` suite (deferred to coordinated integration / commit pass per AGENTS.md rule 16 and D-135); targeted Training and encoding checks (`t182`, `t215`, `t219`, `t310`) and the full 14-check real-GPU tutorial suite all passed.
- Interactive live physical walk-through of every single one of the 37 steps by hand in one continuous real-time session (all 37 steps verified end-to-end in `game/training-tutorial.test.mjs`, and 14 live browser/key/hook checkpoints across Modules 1–10 verified on RTX 5080 WebGPU in `ui/training-tutorial.browser.mjs`).

Requests: none.
Contract changes: none.
