# Claude 7

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CG-6 D-182 last pass, the look: J153 5 camo resize first, then 26/29, 23, 40
touching: review/CG-6
since: 2026-11-13T22:39Z
next: —
blocked-on: —
last-report: handoffs/2026-11-13-claude7-CG-4.md

## Notes
- Cloud workflow: tar code -> "_DELETE ME/claude7-tt-HHMM.tgz" (assets tgz separate), stage, untar /home/claude/tt2; harness /home/claude/x7/live.mjs (job files) run via node tools/game-test-slot.mjs run claude7 <task> (CHROME_ARGS=--no-sandbox, QS=&renderer=webgl). Cloud WebGPU can't render; cloud Training renders dark. My VM shell has no Chrome: native runs go to ChatGPT/ChatGPT 2. Writes to some PC files fail from the VM ("Invalid argument"): use device_commit_files.
- CG-6 (14 Nov): 26/29 ACCEPTED (weapon-heavy.js 807f9ab0). 23 accepted (index.html followSun, texel-snapped sun shadow). 40: proposal sent (C1 neutral indoor fill; review/CG-6/note40-proposal.jpg), Director shows Jerry before any change. 5 OPEN: 05 = gun+sleeve camo ~4x denser (06 normal); cloud never shows it; review/CG-6/native-probe.mjs waits for a native run (ChatGPT 2), then read review/CG-6/native/stops.json + pictures. Handoff handoffs/2026-11-14-claude7-CG-6.md (interim).
- Older: CG-1 eye-hide + sleeve stretch (fixed); CG-3/4/5 done; flamer trigger (a) after the playtest.
