# CLAUDE DIRECTOR handoff, 2026-11-18 ~16:55Z

Written by the outgoing Director (session 01KSTj64KeayqqcvEWhs5BGb) for the fresh Director instance, at Jerry's request ("this director chat may have gotten too bogged down ... hand off a fresh instance of yourself and restart those agents").

## Role (Jerry's standing orders)
- You are CLAUDE DIRECTOR (crew agent id `claude`, cards CL-) of Jerry's "Grave Shift" crew on Tiny Trek (folder `C:\Users\Zero\Desktop\Tiny Trek`, `$HOME/mnt/Tiny Trek` in device_bash).
- D-145: plan; keep `crew/BOARD.md` current (CRLF!); answer requests FIRST; review every sheet by LOOKING at the pictures; write commit jobs; turn Jerry's notes into cards/decisions.
- D-146: a director check every ~10 min via a self-scheduled chain. Lesson learned: turns can lag a lot. Before every schedule call, run `date -u` with device_bash (the cloud clock is unreliable), schedule 25-35 min ahead, and keep the scheduled prompt SHORT. Schedule the next check FIRST each time.
- "Make sure that everyone has a job and is doing it proficiently." The Director only plans, manages, reviews and coordinates.
- NEVER answer "No response requested." When Jerry types "Continue from where you left off.", ALWAYS make the next director tool call first. End replies with a short status line, using the device `date -u` time.
- Jerry is autistic and has brain damage: plain, clear language, short sentences, one idea per bullet. He judges by pictures; send him every landed set and every sheet he must judge.

## Security and standing constraints (all in force)
- Never push from the cloud. Commits go only through `Claude Commit.bat`, run by Jerry or by Antigravity on Jerry's ask (the bat also pushes; D-27). Claude and the crew never run git on the PC, not even read-only.
- No agent runs git checkout/restore/reset/stash/clean. Commit trailers: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: <the current session URL>`.
- Never enter passwords or PINs, never complete CAPTCHAs, never change system or security settings, never self-approve permission dialogs. Publishing and money are Jerry's. Never click Enable Overages / Add Credits / Upgrade.
- Deleting needs Jerry's OK: move files to the gitignored `_DELETE ME/` instead. gh-* / pk-* files and recordings are never uploaded.
- Reference models and photos are LOOK-ONLY (J168): Tripo GLBs live in `Claude outputs/J168/tripo/<type>/` (gitignored), are never put in the repo, never loaded by the game, never shipped, never sampled/traced. No logos or markings on models (exception: D-200 brute hazard paint).
- AGENTS rules: own files or NAMED LOANS only; never revert others' work; never weaken tests (an expectation change needs --review + the Director's OK); game tests only through the slot; never close Jerry's windows; kill processes by PID only.
- Scheduled tasks: do not call list_triggers; delete/disable denied; update OK. Restarts need Jerry's approval. If a create/fire_trigger is denied, ask Jerry.
- Computer use: only with Jerry's OK, never while a game-test slot is held (check `node crew/crew.mjs` "Game-test slot: free"), always computer_release_lock afterwards. ChatGPT windows: the "ChatGPT" app (Codex) on monitor "KG271U N3".
- If WebFetch fails, never fall back to curl/wget/python/mirrors. Jerry's email is private. Jerry's Desktop holds sensitive items (bank statements, .kdbx, W9, Veteran Affairs): never open or stage them.
- A jerry MANUAL-GAME lease means PAUSE. Keep index.html and crew/BOARD.md CRLF. Claude sessions have NO GPU: 5080 runs go to Antigravity / ChatGPT / ChatGPT 2. Missing three.js APIs go into tools/tests/fakethree.mjs (one fix).
- D-202: the ChatGPT agents' own approval reviewers refuse production landings on the Director's OK alone. Jerry approves landings directly in their window. Never work around it.
- D-208: when Jerry is away, he may give an explicit per-item OK in chat ("Approve J164"). Then the Director may relay it by computer use into that ChatGPT chat, clearly signed "Claude Director here, typing for Jerry ... covers <item> only; if your reviewer will not accept a relayed approval, do not land". One item per OK. Used twice: Brute step 1 (landed 05:28Z) and J164 (landed 10:25Z); both accepted.
- D-175: the ChatGPTs run GPT-6.1 Sol (High), not the pricey GPT-6 Astra. Check the model picker when starting a new ChatGPT chat.

## Tools and recipes
- crew: `cd "$HOME/mnt/Tiny Trek"; timeout 40 node crew/crew.mjs requests claude`. Reply: `crew.mjs reply claude "<title words>" DONE|LATER|NOTE|WONT "<line>"`. Request: `crew.mjs request claude <agent> "<title>" --body-file $HOME/x.txt [--fyi]`. Agents: claude2, claude3, claude4 (= Claude 1), claude5, claude6, chatgpt, chatgpt2, antigravity. Retry helper (replies sometimes don't stick):
  `rep(){ for i in $(seq 1 8); do timeout 40 node crew/crew.mjs reply claude "$1" "$2" "$3" >/dev/null 2>&1; grep -qF "$4" handoffs/requests.md && { echo "OK $1"; return; }; sleep 6; done; echo "FAIL $1"; }`
- Read a request body: `awk -v t="<title>" 'index($0,t){f=1;print;next} f&&/^## /{exit} f' handoffs/requests.md`
- LOG: `crew/LOG.md` (append-only). Slot status: `node crew/crew.mjs | grep "Game-test slot"`.
- BOARD edits: a python read-modify-write keeping CRLF, write to p+'.cl' then os.replace. Decisions go as a new `- **D-2xx**` line inserted ABOVE the newest D line; append dated notes to the relevant D line.
- Image review: device_stage_files (Windows paths) -> PIL thumbnail (<=1900 px) into the scratchpad -> Read. Big sheets: crop.
- Sending to Jerry: copy into /mnt/user-data/outputs/<J168|zombies-2026-11-18>/ -> SendUserFile (render) -> device_commit_files to `C:\Users\Zero\Desktop\Tiny Trek\Claude outputs\<same folder>\<file>`.
- Tripo render pipeline (cloud scratchpad `glbview/`, three@0.175 + Playwright): `cp X.glb model.glb; node shoot.js $D $D <name>` (env YAW0=3.14159265 for the Tripo SURVIVORS, which face backwards; shootfit.js for long models), cmp.py / cmps.py build the ours-vs-Tripo sheets. A new cloud session must recreate it if needed (the scratchpad is session-local).
- Commit job: STAGED and waiting: `Claude outputs/commit/message.txt.ready` + `files.txt.ready` (ALL). Only when Jerry says "commit": rename them to message.txt / files.txt and ask Antigravity to run `cmd /c "Claude Commit.bat" < nul`. Last commit aa9ebc53e (local; its push failed). Update the message if more lands first.

## Live state (md5 first 8)
index.html 72e543b4 (J164 landed) | studio/zombie-brute.js c73deb90 (brute step 1) | studio/marine-body.js 0d761307 | world/cave-guardian.js d3cd4dfc | game/brute-behavior.js 1c934fc8 | game/leaper-motion.js f6252825 | studio/zombie-humanoids.js 3d96fdb9 | studio/zombie-guardian-detail.js 460d1acf | tools/tests/fakethree.mjs 3da2a2c0

## Decisions this session (on the BOARD)
- D-199 t164 whip = live red, bar unchanged. D-200 brute helmet knock-off, hazard paint yes, demon keeps flames + lava cracks, colossus drops the gold block. D-201 brute = ChatGPT 2's hunched plan v2, step by step. D-202 approvals (above). D-203 cave guard plan GO (ChatGPT).
- D-204 SPIDER = Jerry's Tripo spider (`tripo/spider/Spider.glb`), not shape B.
- D-205 SURVIVORS: keep Tripo's good parts, ditch its mistakes. Brandt KEEPS bandolier, aviators, full beard. Okafor CLEAN-SHAVEN, patrol cap, thin white armband. Camo stays green. PIKE: Tripo body proportions only; gear and hat suspect (Pike GLB not yet in `tripo/survivor-pike/`).
- D-206 COLOSSUS CRATE ours to design: stones fully inside, nothing through bars; harness straps never clip (in motion too); top open, sized from GP150 A-true-top-reach-bound. ChatGPT, after the cave guard.
- D-207 SHAMBLER FIDELITY TEST (AG-357) + D-209 Jerry's notes (see below).
- D-208 relay rule (above).
- Also: J168 stands (Tripo models never in the game); no custom engine for Grave Shift (maybe a future project); no Pike yet.

## Open work by agent (as of ~16:50Z)
- ANTIGRAVITY: AG-357 step 4b, the FINAL shambler, review-only in `review/AG-357/`. Jerry's priorities, in order: (A) MOUTH/JAW: a tall vertical scream, NOT a puppet slot; the JAW WIDER (U-shape out to the cheekbones under the ears); BOTTOM TEETH as big as the uppers; (B) the BASE OF THE SKULL big and round, clearly wider than the neck (back, side, 3q); the size transition neck-to-skull was bad ("Bingo"); (C) sculpt the forms, don't paint them with AO; then the TANK TOP shape (U-scoop front + back, 3-4 cm straps, deep armholes, loose hang, ragged hem); then minor items (bigger crowded teeth, deeper eye sockets, nose cavity, neck tendons) and a PATCHIER hair variant. Look first, then Jerry. After Jerry signs off: the production rebuild on the real rig (suggest Claude 3) + the same kit for the other humanoid zombies. Bench result: merged 2 draws, 512 atlas + ORM, LOD1 at 15 m; 30 shamblers at 60 fps; at 120 shamblers CPU 7.6 ms vs ours 5.4 ms.
- CHATGPT 2 (new chat "Review Brute Step 2 and Plan Spider", GPT-6.1 Sol High): brute step 2 (hunch working in review; t222 12/0, t93 11/0). Skirt: the thigh-parented panels FAILED; it has a NAMED REVIEW LOAN of studio/zombie-concepts.js remember/restore for six cloth pivot groups ONLY: additive, and it must prove all 14 other zombie types' cache are byte-identical. It also holds a named loan of game/brute-behavior.js applyBrutePose (hit zones must follow the body). Then SPIDER P4 (menacing eye cluster, big chelicerae, 3-4 tall raked dorsal horns, ridged carapace, thinner leg tips). P3 was sent to Jerry as a direction check.
- CHATGPT ("Check in and continue work"): GP154 cave guard step 1c (C5 joints green, palms above the floor, boss-only poseProfile approved, surfaceAt ground callback approved) is running the ABBA x6 load confirmation (title +13.76% earlier, but the trace shows zero new pre-title calls). GP153 step 1b is LAND-READY from the Director: Jerry must approve the landing (ask him: "approve cave guard 1b"). NEXT for ChatGPT: D-203 step 2 = fewer, bigger stone plates with moss, stone skull + brow + fanged jaw (review-only); then the claw curl; then the colossus crate (D-206). GP152 leaper float (J167) is PARKED (v36 failed t330 parity); revisit later.
- OPEN ITEM, no owner: "t222 spawn-state hit gaps": Feral chest misses at RNG offsets 21/23/29 and Shambler front knees at offset 4, on OLD code too = pre-existing. Not waived.
- OPEN: two old t184 hand reds (R-hand below shoulder 0.24 m, near knee 0.60 m) + t184 gun direction 0.15 rad (pre-existing state/timing); hands owner = Claude 1.
- AG-356 spitter plan sent to Jerry; no answer yet. Notes for the build: a hunch + head jut, waist near Tripo 0.29 m, ribs, skull face, drool hanging from the lip.
- Survivors (D-205): no owner yet. Pike: render when the GLB lands.

## Waiting on Jerry
1. Approve the cave guard 1b landing (or approve it in ChatGPT's window).
2. "commit" (he can't right now).
3. His verdict on the final shambler after AG-357 4b.
4. Spitter plan go/changes.

## Claude crew status
All Claude crew sessions were idle since yesterday (Claude 1 21:29Z, Claude 2 23:12Z, Claude 3 21:56Z, Claude 5 19:31Z, Claude 6 00:38Z). Jerry asked to restart them; fresh sessions were started at ~17:00Z with these first jobs:
- Claude 1 (claude4): hands. The two t184 hand reds, review-only diagnosis; then the J161 hands design (Claude 5's draft is in the project).
- Claude 2: the t222 spawn-state hit gaps (Feral chest, Shambler knees). Diagnose the real hit-geometry/pose gaps, review-only, bars unchanged.
- Claude 3: the shambler PRODUCTION REBUILD PLAN on the real rig (studio/zombie-humanoids.js), from AG-357, ready for when Jerry signs off; then the D-205 survivors plan (Brandt, Okafor).
- Claude 5: the second reviewer (D-187): review sheets with the Director, and finish the J161 hands design draft with Claude 1.
- Claude 6: the J168 proportions follow-ups: CF-15 numbers for the survivors (Brandt/Okafor vs Tripo) and the spider P4 shape checks; Pike when its GLB lands.

## LATE ADDITION ~17:00Z: D-211, Jerry's STANDING ORDER (read this first)
"Approve. You guys do not need permission for small changes like that. What I need from you guys is: here is my finished version of this particular zombie. I look at it and either say it is good, or there are areas that need revisions."
- Small/incremental landings need NO Jerry permission: the Director's look + the original gates are enough, and Jerry's standing approval covers them. ChatGPT agents quote D-211 to their approval reviewers; if a reviewer still refuses, the Director relays (D-208), and nobody works around it.
- Show Jerry FINISHED zombies only: one complete look sheet (front/3q/side/back, head close-up, day + night, next to his Tripo) for a good/revisions verdict. Do not send him step-by-step sheets.
- Cave guard step 1b: Jerry APPROVED it at ~17:00Z; the outgoing Director relayed it to ChatGPT (landing GP153 1b).
- "Waiting on Jerry" is now only: the commit (he can't right now) and verdicts on FINISHED zombies (next: the shambler after AG-357 4b; the spitter plan is still open).
- ~17:02Z: relayed Jerry's 1b approval + D-211 into ChatGPT's chat, and nudged the idle ChatGPT 2 chat to continue (its blockers were answered on the board). LESSON: computer use HIDES Chrome; ChatGPT's per-page perf batches show the slot "free" between pages, so check the LOG for an active batch, not just the slot. My 17:01Z use probably broke ChatGPT's run 22 (told it a rerun of that page is allowed).
- The Codex chats only work while a turn runs: when a ChatGPT chat stops "blocked" on a Director answer, reply on the board AND (with Jerry's OK for computer use) nudge its chat to continue.
