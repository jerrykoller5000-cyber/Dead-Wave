# Difficulty without changing horde sizes (GB-29)

Proposal only for Jerry's morning. **Wave totals and compositions stay as they are today** (HORDE_MULT 10, `waveComposition` / `zombiesForDay` unchanged). Difficulty comes from **per-day speed / health / damage**, **how many are up at once**, and **gaps between bursts** — CoD-Zombies-style slow start on days 1–3 even though the queue still has 20–100+ bodies.

Coordinate the reward / skull side with ChatGPT **GP-25**.

## Unchanged horde totals (today)

| Day | Scripted mix before swell | After `HORDE_MULT=10` (wave total) | Notes |
|-----|---------------------------|-----------------------------------|-------|
| 1 | 2 shambler | **20** | |
| 2 | 5 (shambler/feral) | **50** | |
| 3 | 10 (shambler/feral/leaper/drowned) | **100** | |
| 4 | 13 specialists | **130** | |
| 5 | `zombiesForDay(5)=22` then specialists | **~220** | |
| 10 | `zombiesForDay(10)=43` | **~430** | Concurrent still capped by `MAX_ZOMBIES=48` |

Live bodies on the field today already stop at **48** (`MAX_ZOMBIES`). The early-game problem is that bursts fill that cap quickly and fodder moves like mid-game.

## Proposed levers (combat)

### A. Day scale table (multiply type base stats after spawn)

Base today (reference): shambler hp **24** / speed **3.19** / damage **6**; feral **15 / 5.4 / 7**; leaper **30 / 4.2 / 10**; drowned **40 / 2.4 / 10**; military **50 / 3.15 / 12**; brute **85 / 1.85 / 16**.

| Day | HP × | Speed × | Damage × | Feel |
|-----|------|---------|----------|------|
| 1 | 0.70 | **0.45** | 0.65 | Slow shuffle; forgiving hits |
| 2 | 0.80 | **0.55** | 0.75 | Still slow, a bit denser |
| 3 | 0.90 | **0.70** | 0.85 | Ramp toward "real" |
| 4 | 0.95 | 0.85 | 0.95 | |
| 5–7 | 1.00 | 1.00 | 1.00 | Current baseline |
| 8–11 | 1.05 | 1.05 | 1.05 | Soft climb |
| 12–15 | 1.10 | 1.08 | 1.10 | |
| 16–20 | 1.15 | 1.12 | 1.15 | |

Specialists (spider/bomber/demon/screamer/guardian) use the same day multipliers so early specialists are not secretly full-strength.

### B. Concurrent on-field soft cap (spawn throttle, not a smaller wave)

Do **not** change wave totals. When `alive >= dayActiveCap`, pause spawning until a kill frees a slot (same pattern as today's MAX_ZOMBIES gate).

| Day | Proposed `dayActiveCap` | Today |
|-----|-------------------------|-------|
| 1 | **8** | 48 |
| 2 | **12** | 48 |
| 3 | **16** | 48 |
| 4 | **24** | 48 |
| 5–7 | **32** | 48 |
| 8+ | **48** (`MAX_ZOMBIES`) | 48 |

### C. Burst gaps

Today (approx): burst size `5+rand(0..4)` (+2 from day 4), short `spawnCd`.

Proposed:

| Day | Burst size | Gap between bursts | First spawn delay after alarm |
|-----|------------|--------------------|-------------------------------|
| 1 | 2–3 | **6–9 s** | 2.5 s |
| 2 | 3–4 | **5–7 s** | 2.0 s |
| 3 | 4–5 | **4–6 s** | 1.5 s |
| 4–5 | 5–7 | 3–5 s | 1.0 s |
| 6+ | keep current | keep current | keep current |

## Pistol shots per kill (for GP-25)

| Target | Base HP | Pistol dmg 24 | Shots today | Shots under day-1 HP×0.70 |
|--------|---------|---------------|-------------|---------------------------|
| Feral | 15 | 24 | **1** | **1** |
| Shambler | 24 | 24 | **1** | **1** (hp≈17) |
| Leaper | 30 | 24 | **2** | **1–2** |
| Screamer | 28 | 24 | **2** | **1** |

Early "slow start" is **not** more shots per fodder — it is **slower feet + fewer on screen + longer gaps**. That keeps skull economy predictable for GP-25 while the first nights feel teachable.

If Jerry wants early shamblers to take **2 pistol shots**, raise day-1/2 shambler effective HP to ≥25 after scale (e.g. day-1 HP×1.05 only on shambler) instead of cutting pistol damage.

## Intended weapon progression (combat view, for economy modeling)

| Days | Primary | Panic / backup | Buy targets |
|------|---------|----------------|-------------|
| 1–2 | Pistol (.45) | Knife (post GB-31: ~52 DPS, max 2 hits) | Ammo packs, 1 medkit |
| 3–4 | Pistol → Uzi or pump shotgun | Knife / grenade | Walls, first specialty gun |
| 5–7 | Rifle (M4/AK) or AA-12 | Machete if bought | Armor / turret |
| 8–11 | Heavy (minigun / flamer / launcher) | — | Boss prep |
| 12+ | Full kit | — | Upkeep |

## What this proposal does **not** change

- Horde size / `HORDE_MULT` / type mix lists  
- `MAX_ZOMBIES` hard ceiling (48)  
- Skull drop table (GP-25 owns that proposal)  
- Knife / gun base damage numbers (except day scale above)

## Implementation sketch (after Jerry / Claude approve)

1. `dayCombatScale(day) -> { hp, speed, damage, activeCap, burst, gap }` table in combat.  
2. Apply hp/speed/damage in `spawnZombie` after type def.  
3. Spawn path respects `activeCap` like MAX_ZOMBIES.  
4. Burst scheduler reads day gap/size.  
5. Tests: day-1 shambler speed/hp within tolerance; activeCap blocks 9th spawn; wave total for day 1 still 20.

## Open for Jerry

1. Prefer **speed+cap** only, or also **2-shot shamblers** on days 1–2?  
2. Cap table aggressive (8/12/16) or gentler (12/18/24)?  
3. Should Ember Night / guardian nights ignore early scales (always full stats)?
