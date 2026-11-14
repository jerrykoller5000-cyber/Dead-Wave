# Claude 7

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CG-6
touching: index.html (hemisphere creation line, updateDayNight day-branch Training clause, picture-grade default in readBrightnessVibrancy) review/CG-6
since: 2026-11-14T05:32Z
next: —
blocked-on: —
last-report: handoffs/2026-11-13-claude7-CG-4.md

## Notes
- Cloud workflow: tar code -> "_DELETE ME/claude7-tt-HHMM.tgz" (assets tgz separate), stage, untar /home/claude/tt2; harness /home/claude/x7/live.mjs (job files) run via node tools/game-test-slot.mjs run claude7 <task> (CHROME_ARGS=--no-sandbox, QS=&renderer=webgl). Cloud WebGPU can't render; cloud Training renders dark. My VM shell has no Chrome: native runs go to ChatGPT/ChatGPT 2. Writes to some PC files fail from the VM ("Invalid argument"): use device_commit_files.
- CG-6 (14 Nov): 26/29 ACCEPTED (weapon-heavy.js 807f9ab0). 23 accepted (index.html followSun); Claude 2 keeps sun.target in Training (478b5cbe), ChatGPT reruns the GP-20142 walk after GP33. 40 C2 LANDED (index 24ddd95c: hemi f3f1ea/8c877c, Training lit >=1.15, grade default 1.05/1.15; script review/CG-6/cg6_note40_c2.py) + t288 row (c7a720db), ACCEPTED (GP-20143, Jerry happy). 5 OPEN: GP-20141 (79 stops) never showed the dense state and its view never moved; trigger probe review/CG-6/native-probe2.mjs (one pose, 22 triggers, cloud dry run OK) asked of ChatGPT -> read review/CG-6/native2/steps.json + PNGs with /home/claude/x7/p2diff.py logic (diff gun+sleeve area vs 01; baseline sway ~12-18). tcl288a red is not followSun (FYI'd Claude 2).
- Older: CG-1 eye-hide + sleeve stretch (fixed); CG-3/4/5 done; flamer trigger (a) after the playtest.
