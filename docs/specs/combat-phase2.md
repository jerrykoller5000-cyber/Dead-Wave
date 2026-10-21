# Combat Phase 2 — the guardian night (showcase)

Owner: Grokbot (`combat/*` after split). Spec-only deliverable for **GB-13** while
Cursor lands the split. Ground truth: `docs/specs/combat-phase1.md`, `docs/gameplay.md`,
`docs/specs/ui-phase1.md` §5 (HQ briefing), `docs/specs/objectives-phase2.md` (defenders
are separate), live symbols in `index.html` (READ ONLY — do not edit for this task).

**Do not treat this file as live code.** Symbols below are greppable names or proposed
names. No `index.html` implementation until the split lands; implementation is a later
GB after Claude + ChatGPT review this spec.

Performance budget (AGENTS.md §12): **60 fps @ 48 zombies** (`MAX_ZOMBIES = 48`).

Jerry order of work, step 8: *Showcase: the guardian night, replays of the scripted deaths.*
This doc is the night. Scripted-death replays stay a separate later task.

---

## 0. Intent (one paragraph)

Once per schedule, the night is a **fightable Cave Guardian** showcase — not the immortal
scripted grab (`caveguard` / `beginScriptedKill`). The player reads it coming through
`caveWarn`, `getWavePreview`, and ChatGPT's HQ briefing / minimap, then beats it by killing
the Guardian (and clearing the rest of that night's plan). It drops Cash + skulls in the
existing economy loop, plus one unique one-time reward ChatGPT keys in `ui/strings.js`.

---

## 1. Which night

### Existing day loop (Phase 1 contracts — do not break)

| Symbol | Rule today | Keep |
| --- | --- | --- |
| `day` | Integer; `+= 1` in `startPrep()` | yes |
| `phase` | `'idle'` → `'prep'` → `'wave'` | yes |
| `bloodMoon` | `day >= 4 && day % 4 === 0` | yes (FX + cash mult) |
| Colossus | `day % 5 === 0` → `waveQueue.push('colossus')` | yes, except §1.2 override |
| Surround | `day >= 6 && day % 3 === 0 && day % 5 !== 0` | yes, except §1.2 override |
| Preview freeze | Plan fixed in `startPrep`; spawn consumes it | yes |

Gameplay.md "night" = the **wave** after the current **prep**.

### Proposed schedule

| Flag | Rule | First night | Recurrence |
| --- | --- | --- | --- |
| `guardianNight` | `day >= 6 && day % 6 === 0` | **Day 6** | 6, 12, 18, 24, 30… |

**Why day 6:** player has already seen Blood Moon (day 4) and Colossus (day 5). Day 6 is
also today's first surround day — the showcase **replaces surround** that night so the
threat reads as one mouth, not six.

### Stacking / priority (§1.2)

When flags collide, apply in this order (highest wins the *boss slot*):

1. **`guardianNight`** — one fightable `guardian` in the plan; **no** `waveSurround`;
   **no** extra `colossus` push that day (Guardian *is* the boss).
2. Else **colossus** (`day % 5 === 0`) as today.
3. Else normal composition + optional surround.

Blood Moon **still applies** on guardian nights that are also `% 4 === 0` (days 12, 24…):
red sky, `bloodMoon` speed, ×1.5 skull/Cash rules unchanged. Preview sets
`bloodMoon: true` and `hasGuardian: true` together.

| Day | BM | Colossus | Surround (today) | Phase 2 night |
| --- | --- | --- | --- | --- |
| 4 | yes | — | — | Blood Moon only |
| 5 | — | yes | — | Colossus |
| **6** | — | — | would surround | **Guardian Night** (no surround) |
| 8 | yes | — | — | Blood Moon |
| 10 | — | yes | — | Colossus |
| **12** | yes | — | would surround | **Guardian + Blood Moon** (no surround, no colossus) |
| **18** | — | — | would surround | **Guardian Night** |
| **30** | yes | would | — | **Guardian + Blood Moon** (Guardian replaces colossus) |

Acceptance: for a fixed seed, `getWavePreview(day).hasGuardian === (day >= 6 && day % 6 === 0)`.

---

## 2. Where it comes from

### Source cave (deterministic)

| Field | Value |
| --- | --- |
| Theme | **`chalk`** (bone arch / pale limestone — `THEME_BY_SIXTH` index **5**) |
| Why | Matches pale stone Cave Guardian mesh language; distinct from wet/iron fodder nights |
| `caveIndex` | Index of the `POI.caves` entry whose `theme === 'chalk'` after `planCaves()` |
| Spawn | Mouth of that cave only (same mouth spawn path as horde), **not** lake / drowned |
| Fallback | If chalk missing (should not happen — Claude owns six themes), use `hill` (barrow) |

Assault set on guardian nights: **only** the guardian cave (plus drowned lake if composition
still includes `drowned`). No second-mouth pick. `waveBearings` = that cave's `ang` only.

### Not this event

| Thing | Role | Stay separate |
| --- | --- | --- |
| `caveguard` + `beginScriptedKill('cave')` | Immortal scripted death grab | Unchanged; still not in wave preview |
| Objective defenders (`spawnObjectiveDefenders`) | Radio shamblers etc. | Unchanged; not wave count |
| Colossus | Every 5th day boss | Deferred on guardian nights (§1.2) |

### Proposed type key

| Key | Role |
| --- | --- |
| `guardian` | **New** fightable showcase boss for this night |
| `caveguard` | Scripted-death only (ceremonial stats today) — **never** enter `waveQueue` |

Do not overload `caveguard` into the horde table; ChatGPT and tests already treat it as
scripted-only (`ui-phase1.md` §5: exclude scripted guardians unless Grokbot schedules a
real showcase — this *is* that exception, via `guardian`).

### Rough combat feel (tuning proposal — not live)

| Stat | Proposal vs Colossus | Notes |
| --- | --- | --- |
| HP | ~380–450 (Colossus 520) | Shorter than titan; denser tell windows |
| Speed | ~2.0–2.4 | Faster than Colossus 1.6; slower than demons |
| Armor | ~0.25–0.35 | Not bullet-immune; explosives help |
| Damage | ~22–28 | Serious but not one-shot |
| Radius / scale | ~0.7 / ~1.7 | Tall gaunt silhouette (reuse guardian mesh dress) |
| `cashDrop` / skull value | **150** Cash on kill (Colossus 120) | See §5 |
| Tactics | `'boss'` | Focus player / cabin; ignore decoy like Colossus |
| Field cost | Counts **1** toward `MAX_ZOMBIES` | Reserve a slot; see §6 |

---

## 3. How the player reads it coming

Three channels, all Phase-1-compatible. ChatGPT owns copy; Grokbot owns facts.

### 3.1 `caveWarn` (Claude world FX — Grokbot calls)

| When | Call | Level |
| --- | --- | --- |
| `startPrep` on guardian night | `caveWarn(guardianCaveIndex \| cave, 2)` | **2** (max eyes / dust) |
| Other assault caves that night | none (only chalk) | — |
| `beginWave` | optional pulse `caveWarn(..., 2)` again | same cave |
| After guardian dies / wave clear | `caveWarn(..., 0)` | clear |

Non-guardian preps keep today's warn behaviour from combat-phase1.

### 3.2 `getWavePreview` extensions (Grokbot — additive)

Keep Phase 1 shape. Add fields (do not remove existing ones):

```js
/**
 * Additive on WavePreview (combat-phase1):
 * @property {boolean} hasGuardian
 * @property {number} guardianCaveIndex   // POI.caves index; -1 if none
 * @property {string|null} guardianCaveTheme  // 'chalk' (or fallback)
 * @property {boolean} guardianNight      // same as hasGuardian for v1
 *
 * queue may include exactly one 'guardian' on those days (not 'caveguard').
 * byTypeAndCave includes that row with the chalk caveIndex.
 */
```

**Freeze rule unchanged:** decided once in `startPrep`; spawn must match.

### 3.3 HQ briefing / strings (ChatGPT consumes)

ui-phase1 §5 already allows a scheduled showcase. Suggested keys (ChatGPT owns text):

| Key | Use |
| --- | --- |
| `wave.preview.guardianNight` | Title / badge on Day N briefing |
| `wave.preview.guardianFromCave` | "From the chalk bone-arch" (or cave name) |
| `wave.preview.guardianUrgent` | Locked + unlocked urgent line (always show even without Field Intel) |
| `wave.preview.hasGuardian` | Roster row label for type `guardian` |

**Field Intel:** Guardian appears in the **locked** urgent strip always; full HP/count row
only with Field Intel (count is always 1).

### 3.4 Minimap

| Cue | Owner |
| --- | --- |
| Rim bearing arc on chalk only | Grokbot `waveBearings` |
| Stronger pulse on guardian cave | ChatGPT minimap on `caveWarn` / prep event |
| Optional boss pip once spawned | ChatGPT; Grokbot may expose `getGuardianAlive()` later |

---

## 4. How it is beaten (testable)

### Win conditions

| Condition | Required |
| --- | --- |
| Guardian HP ≤ 0 (`typeKey === 'guardian'`, once) | **Yes** |
| Planned wave queue fully spawned and cleared (fodder / specialists) | **Yes** |
| Survive until clock / dawn without kills | **No** — not a survival-only night |
| Destroy "cores" / runes / props | **No** for v1 (out of scope) |
| Visit the cave mouth | **No** — Guardian marches out with the wave |

Wave clear / day clear fires only when:

1. `waveSpawned === waveTotal` (plan drained), and
2. no living wave zombies remain, and
3. guardian is dead (or was never planned).

If the marine dies, existing game-over / scripted paths unchanged. Walking into a cave mouth
can still trigger immortal `caveguard` scripted kill — that is **not** the showcase fight.

### Fail / partial

| Case | Result |
| --- | --- |
| Guardian still alive, fodder cleared | Wave **not** cleared; guardian keeps hunting |
| Guardian dead, fodder still out | Normal clear-the-rest |
| Player ignores chalk and kites | Valid; Guardian still pathfinds via existing boss tactics |

### Acceptance checks (for a later implement GB)

1. Day 6 prep: `hasGuardian === true`, `guardianCaveTheme === 'chalk'`, `surround === false`.
2. Spawn sequence includes exactly one `'guardian'` assigned to chalk `caveIndex`.
3. Killing guardian awards §5 drop once; second kill impossible.
4. Day 5 still has colossus, no guardian; day 4 blood moon, no guardian.
5. `MAX_ZOMBIES` never exceeded; live count with guardian ≤ 48.
6. `caveguard` still absent from `waveQueue` / preview buckets.

---

## 5. What it drops

Coordinate with ChatGPT economy language: **skulls → bank at HQ → Cash**. No new currency.
Grokbot grants combat drops; ChatGPT keys strings / kiosk messaging. Do not edit `ui/*` here.

| Drop | Amount / rule | Notes |
| --- | --- | --- |
| Cash / skull value on kill | **150** base (banner like Colossus) | Blood Moon ×1.5 applies if `bloodMoon` |
| Combo / streak | Normal kill-streak rules | Guardian counts as a kill |
| Medpack touch chance | Same as brute/colossus tier | Existing drop table |
| **Unique one-time reward** | First Guardian kill **per run** | See below |

### Unique reward (proposal for ChatGPT + Claude)

| Proposal | Detail |
| --- | --- |
| Id | `reward.guardianFirstBlood` (strings) / receipt `guardian-night-first` |
| Effect | If mortar blueprint not owned → grant mortar blueprint unlock; else grant **+80 Cash** (banked as skulls pickup or direct Cash per economy owner) |
| Once | Per run; idempotent receipt (same pattern as objective `receiptId`) |
| Not | Field Intel unlock (that stays kiosk 120 Cash) |
| Not | Immortality, god weapons, or free full catalogue |

ChatGPT: please confirm strings + whether blueprint grant goes through existing purchase/
unlock path without charging Cash. Claude: approve as contract when implementation is queued.

---

## 6. Budget, roles, preview freeze

| Constraint | Guardian-night rule |
| --- | --- |
| `MAX_ZOMBIES = 48` | Guardian uses 1 live slot; swell fodder so peak live ≤ 48 |
| Fodder | Reduce `HORDE_MULT` swell by ~15–25% on guardian nights **or** trim shambler tail so specialists + guardian fit |
| Cave roles | Chalk `bone` trait may apply to **fodder** from that mouth; Guardian uses its own boss stats (no double `hpMul`) |
| Preview freeze | Guardian row frozen in `startPrep` with the rest of the plan |
| Ambush | Policy A from phase1: only retarget within `caveIndices` (chalk only → stays chalk) |

---

## 7. Proposed APIs (light — for Claude review; not live)

| Export / event | Owner | Shape / note |
| --- | --- | --- |
| `getWavePreview` additive fields | Grokbot | §3.2 |
| `isGuardianNight(day?)` | Grokbot | `boolean`; optional sugar |
| `getGuardianState()` | Grokbot | `{ planned, alive, caveIndex, hp, maxHp } \| null` |
| `onPrepStarted` / preview already includes guardian | Grokbot → ChatGPT | No new event required for v1 |
| `caveWarn` levels 0/2 | Claude (existing) | Grokbot calls |
| First-blood grant | Grokbot + ChatGPT economy | Idempotent receipt; Claude records in `docs/contracts.md` |

No world layout / `POI.caves` moves (AGENTS.md §10).

---

## 8. Out of scope / after the split

| Item | Status |
| --- | --- |
| Any `index.html` / `combat/*` implementation | **After split** — not GB-13 |
| GB-12 floors follow aim (D-12) | After split; separate from this spec |
| Scripted-death **replays** (Jerry step 8 second half) | Later showcase task |
| New cave / lake guardian spawn geometry | No — use chalk mouth |
| Core / rune destroy win condition | Not v1 |
| Changing Blood Moon or Colossus formulas globally | No — only §1.2 priority |
| Editing ChatGPT `ui/*` or economy files | Request only |
| Immortal `caveguard` fight | Never — keep scripted |

---

## 9. File map (post-split)

| Module | Change when implementing |
| --- | --- |
| `combat/waves.js` | `guardianNight` flag, priority vs colossus/surround, queue row, preview fields |
| `combat/zombies.js` | `ZOMBIE_TYPES.guardian` fightable stats + mesh dress (share art with cave guardian) |
| `combat/caveRoles.js` | No guardian trait row; chalk fodder unchanged |
| `ui/strings.js` | ChatGPT keys §3.3 / §5 |
| `docs/contracts.md` | Claude records approved exports |

---

## 10. Review asks

- **Claude:** schedule (§1), chalk source (§2), API list (§7), first-blood reward shape (§5), no world moves.
- **ChatGPT:** briefing / urgent copy keys (§3.3), Field Intel behaviour, unique reward presentation (§5), minimap pulse intensity.

Implementation waits on their review + the split. Owner of this doc: **Grokbot**.
