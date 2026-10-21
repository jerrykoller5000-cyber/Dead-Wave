# Board queues archived 2026-10-19

Finished tasks moved off crew/BOARD.md (`node crew/crew.mjs tidy`). Each one's report is in handoffs/.

<!-- crew.mjs tidy, 2026-10-19T00:15Z: 38 finished -->

## Claude

### (no phase)

- [x] **CL-202** **Health check, part 1** done: the full suite on the 09:25 copy (3608 pass, 187 fail in 71 files), every red sorted below (`handoffs/2026-10-15-claude-CL-202-triage.md`); everything committed and pushed (e9c4612).
- [x] **CL-204** **The orders card at the drop.** `handoffs/2026-10-15-claude-CL-204-207.md`.
- [x] **CL-205** **The survivors bury him.**
- [x] **CL-206** **The wall of tags.**
- [x] **CL-207** **The true ending's walk to the dock.**
- [x] **CL-203** **Frame budgets** set: `docs/budgets.md`. 48 dead draw 1.68 M triangles against a 1.2 M budget; every zombie kind is over its 6 k; the marine and the survivors are over on draws. Frame time on Jerry's GPU still to come (AG-82).
- [x] **CL-210** **The marine and the survivors inside their budgets** (`docs/budgets.md`): the marine in the game 100 draws to ≤ 40 (merge the cloth and the gear by material); each survivor on the roof 92-127 draws and 40 k triangles to ≤ 20 draws and ≤ 15 k.
- [x] **CL-209** **My reds** (CL-202's list): the music since the ElevenLabs switch (t60, t61, t73, t172, t106), the HUD trim's stale checks (t72, t181), the world (t39, t46, t50, t176, t177, t204), the marine (t183, t184, t195, t208, t209), the Training Ground (t182), t226 (timed out).

## Cursor

### (no phase)

- [x] **CU-155** Fakethree raycast so suite rounds can hit
- [x] **CU-153** Fix verified defects from Antigravity model audits
- [x] **CU-152** Review and improve Antigravity model upgrade batches
- [x] **CU-147** **The smoking pose (Jerry, in chat)**: the cigarette the right way round, the glove off the face. Finish it, then the tasks below in order.
- [x] **CU-148** **Bench numbers for budgets.** `tools/bench.mjs`: add draw calls and triangles (`renderer.info`, as scene-counts.mjs reads them) to every scenario, and a `--night N` scenario that jumps to night N's last push with the horde out (`devJumpToNight`, then start it). Prints one JSON line per scenario. Antigravity runs it on Jerry's GPU (AG-82).
- [x] **CU-149** **The desktop build boots.** `tools/package.mjs`: add `combat/`; keep the `.wav`s the game loads (core/audio.js, ui/range-start-audio.js); copy `z-sounds/`; `npm run build` must run the boot check, not `--no-check`. desktop/src-tauri: a reload (F5) must not refill localStorage from the launch snapshot over newer values. One product name in what the player sees (Grave Shift); file names may stay Dead-Wave (D-79).
- [x] **CU-150** **Don't lose a run by accident.** A confirm before Quit to menu ends a run; on closing or reloading the tab mid-run, the browser's leave-page prompt, and the run recorded either way. A "Reset profile" button in Settings with a confirm (D-31).
- [x] **CU-151** **End-of-day commit (standing).** At the end of each working day, after Claude's suite (or the day's targeted checks), commit and push everything checked out; a one-line summary in the log. Claude does it when you're not on.

## ChatGPT

### (no phase)

- [x] **GP-19924** **Zombie joints (Jerry, in chat).** Check it out with `--done`: the full suite it waited for is Claude's CL-202 (in the cloud); nothing more to run.
- [x] **GP-19922** **All zombies smoothed.** The same: check out with `--done`.
- [x] **GP-19923** **The demon's fire.** The same.
- [x] **GP-19925** **Story v3 words, one pass** (story.md is the text; Claude's 2026-10-07 cards say where): Ridgeline lines 8, 12 and 15 as story.md §4, and the Hush-origin line; the orders: Claude added `story.orders.*` (CL-204); show them on the HQ briefing from `briefing-open`'s new `orders` (ui/wave-preview.js); the mural says DEADWALKERS (`hq.mural.title`): the unit is the Gravewalkers; the three road notes, each its own text and signature (`story.prop.convoy`, `utilityTruck`, `fuel`); the guardian "driven back", never "defeated" (`reward.guardianFirstBlood`, `scouting.trick.guardian`, the "GUARDIAN DOWN" banner); `world.cabin`/`map.cabin`/`build.obstacle.cabin` say FOB Threshold or HQ; the objective titles from v1 (`medicalConvoy`, `hikersCache`) reworded; the `story.survivor.reyes/voss/kettle` keys renamed `pike/brandt/okafor` with every reader. Fix the tests that hold the old words (ui/briefing.browser.mjs "Call the boat", ui/survivors.browser.mjs fixtures).
- [x] **GP-19926** **One name for the night.** "Night N" everywhere the player reads it: the night banner ("DAY N — HORDE INBOUND", "DAY N CLEARED"), Ember Night's banner, the briefing, the prep box, the wave strings; and the night's own name from tools/nights.py on the scouting card ("Night 6 · Chalk"), with Swarm Night warned like Fog and the siege. One table in JS that both read.
- [x] **GP-19927** **What a new player reads.** The pause Tips lose the "Testing" section (dev cheats); the kiosk's hard-coded English (index.html 24700s: 'Bigger gas tank', ' pair', ' suppressor', 'Repair armor', 'Nothing to upgrade yet') and the "Training Ground" button and win-screen defaults go to strings; "gear kiosk" vs "supply terminal" and "Supply locker" vs "vault": one name each; `objectives.holdRepair`'s stale "Hold E for 6 seconds". The upgrades tab's `let any = true` (it can never say "Nothing to upgrade yet").
- [x] **GP-19928** **The first run.** The first time Play is pressed on a profile with no runs, one card offers the Training Ground first ("New here? Ten minutes on the range"), Play anyway or Training; never again after. And read every `// <task id>` string block other agents added (see above) once, for voice.

## Grokbot

### (no phase)

- [x] **GB-180** **The weapon redo (Jerry, in chat).** Closed by Claude after pass 7 (Jerry: the guns are frozen for 1.0; bugs only).
- [x] **GB-186** **Boarding Heron wins the run.** t147 "held 2 s: aboard, the run is won", t160 "aboard" (the end card says "Try again?"), t170 (the stir's kick-free), t55 (E held at a site): every E-hold flow is red. Keys are ignored while `menuCamera.deploying`; make the checks wait for the landing, then fix what's left. Winning is 1.0's first job.
- [x] **GB-181** **t221 and t252**: new reds after GB-177 (a casing thrown to the gun's right). Fix the game or the test, rule 13.
- [x] **GB-182** **Heron needs the relay: say so.** Today night 20 quietly doesn't end the run if the relay was never repaired. From the morning of night 15, while the relay is down: the scouting card and a radio-less line on the HQ board say Heron can't find him without it, and the relay cabinet is marked on the map. On the prep before night 20 with the relay down, the prompt says why Heron isn't on offer.
- [x] **GB-183** **The silenced night.** docs/specs/secret-quest.md §70: the night after a silenced day has half-size pushes, no guardian and no Ember Night. The director (`startPrep`) doesn't check it today.
- [x] **GB-184** **The director's leftovers.** `pickZombieType` (relay-called spawns) can never pick a spitter or screamer: use the night plan's kinds; remove the unused `trimGuardianFodder`, `swellWithFodder`/`HORDE_MULT` and their stale comments; docs/specs/difficulty.md row 13 (`ground:40`).
- [x] **GB-187** **The builds and the horde reds**: t1, t3 (a light or a turret on a deck: "cell taken"), t17 (the reticle through the roof), t112, t76, t77, t96, t168, and the cloud-timing ones re-run on Jerry's PC first: t74, t75, t97, t171; t85 (the dawn banner's skull count: stale if CL-181 removed the banner).
- [x] **GB-188** **The guns' reds**: t187 (the zoom and the head coming back up), t188 (revolver and Uzi size, the barrel on the reticle, the AA-12 support anchor), t213, t214 (the fullest magazine first), t223, t224 (pistols on the pack), t189 and t218 (they run out of time: shorten or split).

## Antigravity

### (no phase)

- [x] **AG-85** Fresh close-ups of the fixed hats and GPU frame-time numbers
- [x] **AG-79** **Buildables, part 1.** Changes ready: queue its game checks (`slot run`) and check out. Buildable visuals are frozen for 1.0 after AG-80 (bugs only).
- [x] **AG-80** **Buildables, part 2.** The same; include Cursor's two findings (the mine's buried LED, the missing tier variants in the camera job).
- [x] **AG-81** **Eyes on CL-198 (the marine's fabric)** in the inspector, in the same slot batch: crouch, run, reload, aim, grenade and dive in issue, hot-weather and full kit; the four hats.
- [x] **AG-82** **Frame time on Jerry's GPU, after CU-148.** Through the slot: `bench.mjs --night N` for nights 5, 10, 14, 18 and 20, and the megaswarm (48), at Jerry's graphics preset and at High; the JSON lines and a two-line summary in the report. Claude sets the budgets from them (CL-203).
- [x] **AG-83** **The installer on a clean profile, after CU-149.** Build it, install it as a fresh Windows user (no Node, no repo), start a run, play the first night, quit, reopen: settings and the best run are kept; note anything that fails or looks wrong.
- [x] **AG-84** **The sandbag wall, tier 2, inside its budget** (`docs/budgets.md`): 6.2 k triangles and 248 parts to ≤ 1.5 k in the game, the same look from 5 m. Count with `DWInspect.show('build.sandbag', { variant: '2' }).info`.

