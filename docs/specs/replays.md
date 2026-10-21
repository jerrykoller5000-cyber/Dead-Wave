# Scripted-death replays — showcase (spec only)

Owner: Grokbot (`combat/*` after split). Spec-only deliverable for **GB-18**
(Jerry's order of work, step 8, second half). Ground truth: `docs/specs/combat-phase2.md`
§8 (left this for later), live `beginScriptedKill` / `finishScriptedKill` /
`checkScriptedKillTriggers` / `DEATH_WAYS` / `tt_death_log` in `index.html`
(READ ONLY — do not edit for this task), `ui/strings.js` death keys
(`death.caveguard.*`, `death.tentacles.*`), AGENTS.md rule 10 (world stays
deterministic).

**Do not treat this file as live code.** Propose only. Claude approves into a
decision; implementation is a later GB (and ChatGPT UI wiring) after that.

Jerry order of work, step 8: *Showcase: the guardian night, replays of the
scripted deaths.* The guardian night is `combat-phase2.md`. This doc is the
replays.

---

## 0. Intent (one paragraph)

The two scripted death cines Grokbot owns — the cave-mouth grab and the
Underwater Pit haul — are showcase moments. Once the player has died that way
at least once, they can **watch the cine again** without starting a new run,
without spending economy, and without touching the live wave plan or the world
layout. Replay is a **read-only cine overlay** on top of an already-ended (or
paused-at-menu) session. It is not a second chance, not a practice fight, and
not a debug spawn of `caveguard`.

---

## 1. Which deaths can be replayed

### In scope (Grokbot owns the cine)

| Replay id | Live trigger today | `beginScriptedKill` kind | `lastDeathCause` / `DEATH_WAYS` key | Place line |
| --- | --- | --- | --- | --- |
| `cave` | Walk into a cave mouth (`checkScriptedKillTriggers`) | `'cave'` | `caveguard` | Cave name (`lastDeathPlace`) |
| `tentacle` | Swim inside `LAKE_HOLE.grabR` | `'tentacle'` | `tentacles` | `Underwater Pit` |

These are the only two paths that run `scriptedKill` (~8.9 s cine + burial handoff).
They already share one owning block in combat.

### Out of scope (v1)

| Thing | Why not |
| --- | --- |
| Ordinary combat deaths (`shambler`, `guardian`, `colossus`, fire, acid, …) | No cine to replay — `endGame` + burial only |
| Fightable showcase `guardian` (GB-14) | A real fight, not a scripted grab; never `beginScriptedKill` |
| Immortal live `caveguard` as a fight | Remains scripted-only (combat-phase2 §8) |
| Tree / towerfall / bird / blast | No dedicated scripted-kill rig |
| Dev `godmode` / debug kills | Never write `tt_death_log`; never unlock replays |
| Replaying someone else's death mid-wave while alive | Would steal control from a live run |

Acceptance: the replay catalogue length is **2**, keyed `cave` and `tentacle`.

---

## 2. Unlock

Reuse the existing profile catalogue — do not invent a second store.

| Rule | Detail |
| --- | --- |
| Unlock store | `localStorage` key `tt_death_log` (already written by `recordDeath`) |
| Unlock condition | Cause key present in `loadDeathLog()`: `caveguard` unlocks replay `cave`; `tentacles` unlocks replay `tentacle` |
| First-time | The death that unlocks it is the live scripted kill; the death screen may offer "Watch again" immediately for that cause |
| Profile scope | Per browser profile (same as today's death log). No run-local unlock |
| Never unlock from | Debug spawns, aborted cines (`abortScriptedKill`), victories |

ChatGPT surfaces locked entries as `???` (same language as the Ways-to-die grid)
until unlocked; Grokbot only answers "is this replay unlocked?".

---

## 3. Where the player starts a replay

### Recommended entry points (v1)

| Entry | When | Owner of chrome | Behaviour |
| --- | --- | --- | --- |
| **A. Death screen — Watch again** | `gameOver` and the death that just ended was `caveguard` or `tentacles` | ChatGPT (button on `#win` / death panel) | Replays **that** cine in place, then returns to the same death screen. Default primary CTA next to "Try again" / menu |
| **B. Death-log tile** | Death screen catalogue: a found `caveguard` / `tentacles` tile is clickable | ChatGPT | Starts that replay even if this run died another way (unlocked earlier) |
| **C. Title / HQ archive (optional v1.1)** | At the title screen, or at the HQ during prep when no wave is live | ChatGPT | Same cine, then dismiss back to title or prep. **Not required for v1** if A+B ship |

**Decision ask for Claude:** approve A+B as v1; park C until after A+B feel right.

### Not an entry point

- Mid-wave, mid-prep while alive (would need pause + state isolation we do not want)
- Shop, build wheel, mortar seat, objective hold
- Antigravity / `tools/shoot.mjs` cameras (those stay shot rigs)

---

## 4. Cost and rewards

| Rule | Proposal |
| --- | --- |
| Cost | **Free** once unlocked |
| Cash / skulls / bank | Never charged, never granted |
| Purchase / `purchase-delivered` | Never fired |
| First-blood / blueprints / objectives | Untouched |
| Why free | Showcase (Jerry step 8), not an economy sink; the unlock already cost a death |

If Claude wants a soft sink later, prefer a small **banked skull** fee at the HQ
archive (entry C), never on the death-screen "Watch again" for the death you
just took. Not v1.

---

## 5. What state a replay must not touch

Replay is a **cine overlay**. Hard bans (acceptance checks):

| State | Rule |
| --- | --- |
| Run identity | No new `runId`; do not call `startMatch` / `resetGame` / `startPrep` |
| `day`, `phase`, `waveQueue`, `wavePreview`, `waveBearings`, `bloodMoon`, guardian plan flags | Frozen for the whole replay |
| Bank, Cash, skull bag, owned weapons/builds, ammo, fuel, MedPens | Unchanged before vs after |
| Builds / turrets / logs / felled trees | No place, repair, damage, or flow-field rebuild |
| Objectives / receipts / `guardianFirstBloodDone` | Unchanged |
| World layout, `POI.caves`, seeds, tree yaw (AGENTS.md §10) | No writes; cave used for `cave` replay is **the cave from the recorded death** when available, else the chalk cave by index (deterministic read-only pick) — never `planCaves()` again |
| `tt_death_log` | Do **not** append again on replay finish |
| `lastDeathCause` / `lastDeathPlace` | Preserve the values that were already on the death screen; replay may set a temporary cine-local copy only |
| Live zombies | Hidden or frozen for the cine duration; not despawned from the wave plan. Prefer hide+pause AI over `zombies.length = 0` |
| Audio bed | Cine audio only; do not restart the wave bed as a new night |

On finish or abort: restore player pose / camera / `document.body` cine classes to
the pre-replay death-screen (or title) presentation. `finishScriptedKill` today
calls `endGame(false)` — **replay must not**. A dedicated finish path ends the
overlay only.

---

## 6. Combat API proposal (not live)

| Export / helper | Owner | Shape / note |
| --- | --- | --- |
| `listScriptedDeathReplays()` | Grokbot | `[{ id: 'cave'\|'tentacle', causeKey, unlocked, labelKey, descriptionKey }]` |
| `canReplayScriptedDeath(id)` | Grokbot | `boolean` — unlocked && no live `scriptedKill` && (gameOver \|\| on title) && !won-path blocking |
| `beginScriptedDeathReplay(id, opts?)` | Grokbot | Starts cine; `opts.caveIndex` optional for `cave`. Returns `{ ok, reason? }`. Reasons: `'locked'`, `'busy'`, `'alive'`, `'unknown'` |
| `isScriptedDeathReplay()` | Grokbot | `true` while a replay cine is running (so UI hides Try-again, and triggers ignore mouths) |
| `dw-game` `scripted-death-replay` | Grokbot → ChatGPT | `{ type, id, phase: 'start'\|'end'\|'abort' }` |

Live `beginScriptedKill` stays for real deaths. Replay shares rig/update code via
an internal flag `sk.replay === true` (or a thin wrapper) so `finish` skips
`endGame` / `recordDeath`.

`checkScriptedKillTriggers` must no-op while `isScriptedDeathReplay()` or while
the death panel is up waiting after a replay.

No world moves. No new cave geometry.

---

## 7. ChatGPT's parts

| Piece | Owner | Notes |
| --- | --- | --- |
| Death-screen **Watch again** button | ChatGPT | Shown when `canReplayScriptedDeath` for the current cause; calls `beginScriptedDeathReplay` |
| Death-log tile click → replay | ChatGPT | Only for `caveguard` / `tentacles` when unlocked |
| Strings in `ui/strings.js` | ChatGPT | Propose keys below; copy is ChatGPT's call |
| Title / HQ archive panel | ChatGPT | Optional v1.1 (entry C) |
| Hiding Try-again / menus during cine | ChatGPT | Listen for `scripted-death-replay` phases |

### Proposed string keys (ChatGPT fills copy)

```
replay.watchAgain          — button on death screen
replay.watch               — short verb on a catalogue tile
replay.locked              — tooltip / label when not yet found
replay.cave.title          — "Cave grab" (or better)
replay.cave.blurb          — one line
replay.tentacle.title      — "Underwater Pit"
replay.tentacle.blurb      — one line
replay.busy                — "Already playing"
replay.archive.title       — HQ/title panel header (v1.1)
```

Existing `death.caveguard.*` / `death.tentacles.*` stay the catalogue names;
replay keys are actions and panel chrome only.

---

## 8. Acceptance (for the later implementation GB)

1. With an empty `tt_death_log`, `canReplayScriptedDeath('cave')` and
   `('tentacle')` are false; no Watch-again control.
2. After one live cave scripted death, `tt_death_log` contains `caveguard`,
   Watch-again appears, and a replay plays the cave cine without changing
   `day`, bank, Cash, skulls, or `wavePreview`.
3. Finishing a replay does **not** grow `tt_death_log`, does **not** fire
   `guardian-first-blood` / `purchase-delivered` / supply grants, and returns
   to the death screen.
4. Aborting (menu / reset) cleans the rig the same way `abortScriptedKill`
   does today, still without mutating economy or the wave plan.
5. A tentacle replay can be started from the catalogue after unlock even if
   this run's cause was something else.
6. Headless test: snapshot bank + `day` + `waveQueue` JSON before/after a
   forced replay; deep-equal. Plus `listScriptedDeathReplays().length === 2`.

Screenshots (Antigravity, later): death screen with Watch-again; one frame
mid-cave replay; death screen restored after.

---

## 9. Out of scope / later

| Item | Status |
| --- | --- |
| Any `index.html` / `combat/*` / `ui/*` implementation | **After Claude decision** — not GB-18 |
| HQ / title archive (entry C) | v1.1 |
| Paid replays | Not v1 |
| Replaying ordinary combat deaths | Never (no cine) |
| Making `caveguard` fightable | Never |
| Editing world / cave positions | No (rule 10) |
| Changing burial cine (`startDeathCine`) art | Separate, if at all |

---

## 10. File map (post-approval implementation)

| Module | Change |
| --- | --- |
| `combat/scriptedDeath.js` (or zombies section today) | Replay flag, list/can/begin helpers, finish-without-endGame |
| `ui/strings.js` | ChatGPT keys §7 |
| Death panel / `#win` markup | ChatGPT |
| `docs/contracts.md` | Claude records approved exports |
| New test `tools/tests/tNN.js` | Before/after state freeze + unlock gating |

---

## 11. Review asks

- **Claude:** unlock via `tt_death_log` (§2), free cost (§4), hard state bans (§5),
  API list (§6), v1 entries A+B only (§3). Approve as a decision (or amend).
- **ChatGPT:** Watch-again + catalogue click chrome, string keys (§7), whether
  entry C is worth a GP after A+B.

Owner of this doc: **Grokbot**. Implementation waits on Claude's decision.
