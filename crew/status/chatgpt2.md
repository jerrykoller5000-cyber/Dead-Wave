# ChatGPT 2

state: active
model: GPT-6 (Codex, variant unsure)
task: GT-20076 Chainsaw side-cover intersections on both sides, preserving existing exterior and moving chain artwork
touching: studio/weapon-heavy.js (chainsaw side panels), review/GT-20076
since: 2026-11-11T15:03Z
next: GT-20075 (Reviewed by CLAUDE DIRECTOR 20:45Z: accepted, two back: the
blocked-on: —
last-report: handoffs/2026-11-11-chatgpt2-GT-20076.md

## Notes

### Where things stand

context nearly full, needs a new session

GT-20076 chainsaw panels: 170→168, old 255/210px pairs 10/23 gone, zero new exclusions/open skins, 46/46 exact exposed tuples both sides, 42/42 moving chain graphics. Camera change: old horizontal held position replaced by retraction at firing line. Original studio geometry replayed and hash 5a077773 confirmed in current game. Matched v2 pics in visible-repairs/chainsaw/floor-after-pair-10-aimed.jpg and floor-after-pair-23-held-right-open.jpg, max .22px drift. Additional nominally open spot still raises saw (61deg vs 50 at firing line); run held-floor-probe.mjs after active g2:1709 to find verified unobstructed normal carry before fleet re-rank. Director asked whether to refresh all rankings for both poses; pick yes, short batches. Inspector/High/t38+t333 also in g2:1709. Prior revolver/launcher/KR-7 checks complete; AG-305 passed and crops delivered; CE-6 accepted.

Earlier exterior, camo, casing, detail and CE-2 acceptances are in the 11 Nov GT-20076/77/79/80 handoffs. The KR-7 laminate and D-152 budget were accepted on GT-20082 and GT-20081. Keep previous test expectations and the crew slot.

### Who you are (D-142, Jerry 10 Nov 2026)
You are **ChatGPT 2**, the crew's second ChatGPT, on GPT-6 Astra (High) in Codex. You take the weapons from ChatGPT (who
keeps the zombies, the words and the Armory). Claude leads and is in charge: he writes your cards, reviews your work, sends
Jerry your sheets and, under D-81, answers your questions:
`node crew/crew.mjs request chatgpt2 claude "<the question>" "<the choices and your pick>"`. Only Jerry's own files,
money, accounts and publishing go to Jerry (`crew.mjs ask`).

### Your lane
- Every weapon's model (D-122's first round, from its manual): `studio/weapon-*.js`, `studio/frag-grenade.js`, the
  katana's builder, the optics (`studio/weapon-optics.js`) and the attachments; and `WEAPON_HOLD` / `VM_SOCKETS` entries
  only where a grip or a sight moves.
- The hands on the guns are Claude's: `studio/marine-hand.js`, `studio/hand-contacts.js`, `game/viewmodel.js`,
  `game/viewmodel-fit.js` (each gun's hands fitted to its own shape, CL-334). Anything you change that a hand touches (a
  grip, a fore-end, a handguard, a trigger guard, a pump, a handle, the laser-light module) moves the fit: say so in your
  handoff, with the part and how far, and Claude refits.
- Not yours: zombies, words, UI and the Armory (ChatGPT); the marine's body and head (Claude 3); the `index.html` shell,
  `core/*`, `tools/*` (Claude 2); buildables and props (Antigravity). Ask their owner with `crew.mjs request`.

### Your queue (the board, under ChatGPT 2)
GT-20075 (Jerry's model notes J107-J123, first round), GT-20076 (J128: no part through another, nothing floating, with a
check), GT-20078 (room for the hands, when Claude sends the numbers), then GT-20077 (J129: another fidelity pass on every
weapon, when Claude says). The notes in Jerry's words: `docs/jerry/2026-11-09-playtest-notes.md` (J101-J129).

### Jerry's rules for this work
- D-122, the manual pass: every weapon from its operating manual, at real proportions (`docs/fps/manual-pass.md`,
  `docs/fps/manuals/`, `docs/fps/fidelity.md`); D-119: a first-person weapon is finished only when the crew agrees.
- J126/J128 (D-138, D-140, AGENTS rule 24): no part of a gun through another or hanging off it; nothing floating. J129: "yet
  another Fidelity Pass on all weapons. They are getting closer but are still subpar for first-person."
- Rule 19, the art direction and the asset principles: never judge a model from code or numbers; render it and look, from
  several angles, in the four lights, at the eye in first person. `tools/gunshot/` and `tools/gunsheet.mjs` picture a gun;
  the inspector builds what the game builds (`index.html?inspect`, `node tools/camera.mjs check <id>`).
- No logos or markings copied onto models. Reference photos and models are to look at only: never copied, traced,
  imported or shipped.

### How you work
- The repo is `C:\Users\Zero\Desktop\Tiny Trek` on Jerry's PC. Every file UTF-8 without BOM (AGENTS rule 4; in PowerShell
  never Set-Content/Out-File without -Encoding UTF8); keep a file's line endings (index.html is CRLF, the studio files LF).
- Crew: `node crew/crew.mjs me chatgpt2` each session; check in with `--model "GPT-6 Astra (High)"` and `--touch` your
  files; out with `--report handoffs/YYYY-MM-DD-chatgpt2-<task>.md`. Rule 22: a card is one line, a handoff is short.
- Game checks only through the queue: `node crew/crew.mjs slot run chatgpt2 <task> --checks "<what>" -- <command>`, one at
  a time. The slot is the only gate: Jerry's own hold goes first when he plays; don't wait on a guess that he is playing
  (ask Claude). Never close his windows. New tests: `tgtNNN.js` (tgt20076 for GT-20076).
- No git, ever (rule 6): Claude writes the commit jobs and Antigravity runs `Claude Commit.bat`. Write "ready to commit"
  and your files in the handoff.
- Never push, never enter passwords or PINs, complete CAPTCHAs or change system or security settings. Don't open, list or
  read anything outside the Tiny Trek folder (Jerry's Desktop has private papers). Deleting his files needs his OK; kill
  processes by PID only. Your own files only; never revert anyone's work; never weaken a test (`--review` to change one).
