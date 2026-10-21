# Overnight improvements — Dead Wave / Tiny Trek

**For:** Jerry  
**When:** 2026-09-23 (America/Chicago)  
**Box work only** — no CopyFromBox / deploy. Parent owns desktop merge.

---

## What I changed overnight

### Text merge (Goal A)
- Reset working `index.html` from `index.desktop-fresh.html` so other agents’ mid-file work (caveguard spawn filter, mortar reach / deck height) stayed intact.
- Re-applied all **16** text-audit replacements onto that base — **0 skipped**.
- Extra high-confidence copy:
  - Combo banners + HUD mult: `cash` → `skull value` (player-facing).
  - Blood moon: “kills pay x1.5” → “kills worth x1.5 skull value”.
  - Day-cleared sub: “repair, build, resupply, turn in skulls”.
  - Settings **Skip prep time** row: `hidden` (button still in DOM; `autoSkipPrep` / localStorage untouched).
- Menu eyebrow: `CARACAL INTERACTIVE PRESENTS`. Quit button kept.

### Splash / menu polish (Goal B)
- Snapshot: `assets/intro/opening.css.pre-menu`.
- Eyebrow: 9px, tighter letter-spacing (~.18em), wrap-friendly so the long studio line doesn’t sprawl.
- Wordmark: slight tracking tweak, rust glow on **Wave**, thin rust underline accent, soft radial behind the mark; splash matches menu weight.
- Tagline under menu wordmark: *Survive the days. Bank skulls. Fortify the cabin.*
- Opening intro card: same CARACAL eyebrow above the wordmark.
- Quit (`#menuQuitBtn`): transparent list style with rust-tinted hover (no solid danger pill).
- Footer left as Signal established / Dead Wave.

### Reports
- This file; text audit report/inventory remain the source of truth for the economy pass.

---

## Biggest improvements next (prioritized)

### 1. Teach the economy in the first 60 seconds (clarity / onboarding)
The audit’s core lesson: **kills → skulls → HQ window (E) → Cash → kiosk/builds**. Tips now say it; the *run* still doesn’t.

Concrete:
- First-run coach: after the first skull pickup, a one-shot banner “E at the cabin window to bank skulls.”
- On first day-cleared, pulse the HQ window / skull HUD once.
- Optional tiny “unbanked value” flash when the player walks past HQ with skulls during prep.

This is the highest leverage fix in the game. New players will otherwise farm kills and wonder why Cash doesn’t move.

### 2. Kill or wire dead Settings (meta / trust)
`autoSkipPrep` is stored and toggled but **never read**; prep is HQ-alarm only. I hid the row overnight so Settings doesn’t lie.

Decide one:
- **Delete** the setting + dead `skipPrep()` path, or
- **Rewire** it to auto-sound the HQ alarm after N seconds of prep (with a clear label: “Auto-start wave after 5s”).

Leaving dead controls trains players to mistrust every other toggle.

### 3. One vocabulary for value (clarity)
Streaks, Scavenger, blood moon, and Colossus now say **skull value**. Keep that everywhere player-facing. Internal comments can lag. Avoid “cash from kills” unless it’s a rare direct `spawnCashDrop`.

### 4. Prep as a real choice, not empty time (gameplay)
Prep has no clock — good — but it can feel idle after the first shop pass.

Concrete:
- Soft objectives during prep: “fortify the east approach,” “turn in skulls,” “buy one blueprint.”
- A prep checklist in the wave HUD (3 ticks max), cleared as you do them.
- Don’t bring back a hard countdown unless Skip/Auto-start is real again.

### 5. Wave readability & threat telegraph (gameplay / polish)
Mouth arcs and type tips are solid. Next wins:
- Distinct audio sting per special (bomber / leaper / demon roar already exist — make sure first-of-type always banners once).
- Colossus / blood moon already banner; add a short minimap pulse on mouths that will open *this* wave during the last seconds before alarm.

### 6. Build / fortify discoverability (gameplay)
Wheel is paged (Structure / Defenses / Turrets) but tips used to say “all eleven.” Blueprints + Fortify are easy to miss.

Concrete:
- First time you open Blueprints, a one-line hint: “Unlocks appear in Hold-B.”
- Greyed wheel slots show unlock path (“Kiosk → Blueprints”) not just a price.

### 7. Performance & warm-up honesty (performance)
Pre-roll / shader warm-up is sophisticated; loading status still starts at “Connecting.” Prefer milestones that match what the warm-up is actually doing (“Compiling shaders,” “Pooling zombies”) so a long first load feels intentional, not stuck.

### 8. Multi-agent workflow (process)
Tonight’s pattern worked: **desktop-fresh base → surgical text re-apply → parent deploys**. Keep it.

Concrete rules that will save you pain:
- Mid-file systems (spawn, mortar, NVG) and **player-facing copy** should not share a single “edit the whole index.html” ownership without a freshest-base merge step.
- Prefer small, greppable string replacements over large tip-block rewrites when possible — easier to re-apply when another agent moves lines.
- One agent owns deploy (`CopyFromBox`); everyone else writes box artifacts + a short merge note (applied / skipped counts).
- Snapshot before visual passes (`opening.css.pre-menu`) the same way we snapshot text (`index.pre-text-audit.html`).

### 9. Polish backlog (lower, still worth it)
- Win / death tone pass (warm but less “Nice work.” arcade).
- Callsign / Signal established microcopy.
- Hide Testing tips behind `?debug=1` if you ship builds to other people.
- Kiosk-locked strings: keep while `KIOSK_PREP_ONLY` can flip, or delete if that flag is permanently false.

---

## Honest take

Dead Wave’s systems are already deep (skull economy, streaks-as-powers, HQ ritual, build wheel, blood moon). The overnight text pass didn’t invent that loop — it **named it correctly**. The next biggest wins are teaching that loop in-world, removing or wiring dead UI, and protecting the multi-agent merge discipline so copy and systems don’t thrash each other.

Files for parent:
- `/workspace/tiny-trek/index.html` — desktop-fresh + text + menu HTML
- `/workspace/tiny-trek/assets/intro/opening.css` — menu/splash polish
- `/workspace/tiny-trek/OVERNIGHT_IMPROVEMENTS.md` — this note
