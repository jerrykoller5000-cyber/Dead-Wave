# GP-25 — Skull economy through Day 10

Proposal for Jerry, 2026-09-24; paired with Grokbot's [GB-29 difficulty proposal](difficulty.md).
No prices, rewards, horde sizes or combat stats have been changed by this task.

Recommend keeping the starting 40 Cash, pistol, ordinary ammunition prices and
early weapon prices. Make a MedPen affordable, moderate specialist payouts and
the streak's economic multiplier, and preserve fractional skull value instead of
rounding every kill. Heavy weapons become a choice around days 8–10. Playtest this
as a candidate, not a final balance: weak aim plus poor skull recovery still
produces an ammo deficit in the stress case below.

## What stays fixed, and what the model actually counts

Kills create bankable skull value. Collecting a skull changes the bag, not Cash.
Only a completed deposit at the HQ window credits Cash; Cash pays for the kiosk,
blueprints, placed pieces, repairs and upgrades. Defense kills still drop base
value and never advance the player's streak. No kill pays Cash directly.

Read the actual `waveComposition` and `startPrep` amendments, not just the raw
`zombiesForDay` formula. Normal-wave totals through day 10 are **20, 50, 100, 130,
221, 214, 300, 350, 390, 431**. Day 5 is 220 ordinary bodies plus a Colossus; day 10
is 430 plus a Colossus. Day 6 already trims some fodder and adds a Guardian. This
proposal preserves that existing rule; it introduces no new trim or reduction.

The model reads current source functions and tables into a separate VM. Its local
seed 24 affects only the estimate, not world generation or the game's RNG. It uses
GB-29's proposed HP scales (.70/.80/.90/.95 for days 1–4, 1 for 5–7, 1.05 for 8–10),
not the current unscaled runtime. GB-29's slower movement and spawn caps remain
Grokbot's proposal. The budget does not model encounter timing or survival.

## Skull value by type and day

These are **base skull-value contributions per eligible kill**, before streak,
Scavenger and collection losses. Normal value applies on days 1–3, 5–7, 9–11 and
all later non-Ember days; no hidden daily inflation. Ember value applies on days
4, 8, 12, and every fourth day thereafter, preserving the existing ×1.5 bonus.
Specialists pay their own value whenever they actually occur, including daytime
encounters. A type listed here does not imply it appears on Day 1.

- Shambler: current **1** → proposed **1 normal / 1.5 Ember**.
- Feral: **4** → **3 / 4.5**.
- Leaper: **6** → **5 / 7.5**.
- Drowned: **6** → **5 / 7.5**.
- Military: **8** → **7 / 10.5**.
- Brute: **14** → **12 / 18**.
- Spider: **10** → **8 / 12**.
- Spitter: **9** → **7 / 10.5**.
- Screamer: **11** → **9 / 13.5**.
- Bomber: **9** → **8 / 12**.
- Demon: **20** → **18 / 27**.
- Colossus: **120** → **100 / 150**.
- Fightable Guardian: **150** → **120 / 180**.
- Immortal cave creature: **0 / 0**. It is not an economic target. D-25's cave poke
  starts a scripted grab, not a farmable fight.

Keep the approved planned-Guardian first-blood blueprint/80-value fallback
unchanged and once per run. That reward is separate from the ordinary skull drop;
the baseline budget assumes the player receives the free mortar blueprint, not
80 extra value, and does not price a free placed mortar.

Propose the streak's **skull-value** multipliers as **1.10 at 5 kills, 1.25 at 10,
1.40 at 20, 1.60 at 30** (currently 1.25/1.5/2/2.5). Leave its combat powers and
player-only attribution alone. Keep Scavenger +12% per rank, max five. At every
kill the economy samples the current valid player multiplier; defense kills use
1 even while the player's streak is active. On a maximum-streak, maximum-Scavenger
Ember kill the multiplier is 1.6 × 1.6 × 1.5 = **3.84**, down from 6. This is a
proposal for Grokbot's reward boundary, not permission for UI to change combat.

**Fix rounding before judging the advertised bonuses.** Today a 1-value shambler
at ×1.25 rounds back to 1; at ×1.5 it rounds to 2. The advertised percentage and
the received value disagree, especially on Ember Night. Accumulate contributions
in integer ten-thousandths of skull value, emit only whole value into the existing
pooled skull drops, and retain the fractional remainder in the run save. Flush
remaining whole pooled value into a physical skull at wave clear, before advancing
the day. Never credit it straight to Cash; never discard it on a menu transition.
Retain sub-unit remainder across days, clear it on a new run, and make restore
atomic. The bag/Cash HUD continues to show whole units, so there is no penny counter.
Twenty ×1.1 shambler kills should produce exactly 22 bankable value before losses.

## Proposed kiosk prices

Keep **Pistol free, Uzi 70, pump shotgun 110, revolver 140, M4 160, AK 195**. These
already give useful choices without buying the whole arsenal on the first night.
Changes: **sniper 260 → 320; AA-12 380 → 550; launcher 340 → 520; minigun 420 → 650;
flamethrower 210 → 300; chainsaw 190 → 220**. A new gun still arrives with one loaded
magazine, not a full reserve. Include the refill quote alongside Buy as GP-22 does.

Keep ammunition pack size/price exactly as today (Cash): **.45 36/12; 9mm 60/14;
5.56mm 60/20; 7.62mm 60/24; .44 12/15; .338 10/28; 12ga 20/20; 40mm 6/44;
7.62 belt 300/48; Fuel 60/24; mortar 60mm 4/34; chainsaw gas 45 seconds/18**.
Keep reserve caps and full-price partial-pack behavior; avoid a second ammo pricing
system. Restock all retains its visible complete quote and all-or-nothing purchase.

Change **MedPen 65 → 25**. One mistake should compete with a wall or ammo pack,
not cost nearly the first new gun. Keep its healing amount and three-item carry
cap. Keep **helmet 70, plate carrier 120, pads 50, NVG 130 after the helmet, laser
60, flashlight 45, Field Intel 120**. Armor automatically replenishes at the next
day as today; do not count a mandatory daily armor repair bill in the budget.

Keep build blueprint and placement costs, but display them separately: the first
wall costs **25 plans + 14 placement = 39**, two walls cost **53**, a light turret
costs **55 + 24 = 79**, and a mortar without the earned blueprint costs **120 + 60
= 180**, plus shells. The free starting barricade blueprint makes each barricade
**8 Cash**; it is the sensible first defensive purchase. Tier-blueprint and per-piece
upgrade charges both remain. No turret ammo subsidy or invented maintenance tax.

Keep existing per-weapon magazine upgrades, akimbo costs and the 85-Cash chainsaw
tank upgrade. Perks retain current first-rank prices: Vitality 45, Stopping power
60, Quick hands 50, Fleet foot 50, Scavenger 65, Grenadier 55; subsequent rank price
remains round(base × (1 + .85 × currentRank)). This gives late surpluses useful
choices without raising the basic survival bill. No new day-based purchase locks.

## Affordability: one reproducible route

Assume 85% of earned skull value is collected **and successfully banked**, 70%
shot accuracy, body shots, neutral cave traits, no headshots, streak, perks, free
ammo, day-skirmish proceeds, healing drops or cache rewards. Count all scheduled
wave bodies, including bosses. Start with 40 Cash and 48 pistol rounds (12 loaded,
36 spare); subsequent guns contribute their actual loaded magazine only. Unspent
rounds carry forward, and pack purchases round up to whole packs. All modeled
bullets hit only one target; no penetration, melee or turret damage savings.

Use pistol through day 3, Uzi on days 4–5, AK on days 6–10 in the reference route.
Buy requested items only when 24 Cash remains; defer unaffordable choices and retry
on following days. Optional walls never precede their blueprint. These are end-of-day
ledgers, **after banking and replacing consumed ammo**, not automatic cash awards:

- **End Day 1:** 20 kills contribute 20 value; 17 banked. Starting rounds cover
  29 estimated shots; no purchased ammo yet. **57 Cash available before optional
  buys**, or **41 left after two barricades**. A wall+plans costs 39 but leaves only
  18 for supplies, so two barricades are the safer first choice. A MedPen costs 25;
  Uzi is still a saving target. The reference route does not buy healing yet.
- **End Day 3:** cumulative **164 banked**, **72 spent on ammo**, leaving **132 total
  purchasing power** including the initial 40. After the two barricades and Uzi,
  **46 Cash remains**. The MedPen is deferred to day 4 to retain the 24-Cash reserve.
  A player who skips the barricades could have Uzi + MedPen and 37 left. The model
  uses the pistol for Day 3; purchasing Uzi here equips it for Day 4.
- **End Day 5:** cumulative **770 banked**, **464 spent on ammo**, **346 purchasing
  power** before all non-ammo spending. The route has bought two barricades (16),
  Uzi (70), one MedPen (25) and now AK (195), leaving **40 Cash**. A player can choose
  M4 instead and retain 75. Buying a rifle does not also promise armor, Field Intel
  and a turret; those compete for the same balance.
- **End Day 10:** cumulative **3,592 banked**, **1,640 spent on ammo**, **1,992 total
  purchasing power**. In addition to the earlier purchases, the route buys helmet
  (70), wall plans and two walls (53) on day 7, then minigun (650) by day 10. Total
  non-ammo spend **1,079**, leaving **913 Cash**. This can instead support NVG (130),
  vest (120), light turret+plans (79), Field Intel (120) and a repair/medical reserve.
  These are alternatives, not an assertion the route already owns them. The
  minigun arrives after the modeled Day-10 fight, so its future ammo is not included.

The route could afford the 650-Cash minigun after Day 8 if it prioritizes that over
other defenses; it is not hard-gated to Day 10. That matches GB-29's days 8–11 heavy
weapon goal. The unchanged horde remains the source of growing buying power.

Day-specific gross value in the reference mix: **20 / 120 / 433 / 813** on days
1 / 3 / 5 / 10, compared with current base payouts **20 / 126 / 478 / 890** before
streaks. Across 100 isolated seeds the candidate's day-5 gross ranges **431–437**
and day-10 gross **807–817**; those small composition differences do not warrant
pretending every run pays exactly the reference value. The current Ember per-kill
rounding adds further excess (day 4 reference 358 currently versus candidate 279).

## Pressure tests and limitations

- **65% banked, 70% accuracy:** Uzi is delayed beyond day 3; minigun is still deferred
  at day 10, with **420 Cash** left after the purchases the route can afford.
- **85% banked, 50% accuracy:** Uzi is again delayed; day-10 minigun is deferred with
  **499 Cash** left. Ammunition is a real progression cost rather than free upkeep.
- **Uniform +.10 armor (iron-cave stress):** reference route still reaches the AK
  after day 5, but only **26 Cash** remains then; after the day-10 minigun it has
  **275**. Cave traits affect bullet breakpoints. Do not promise every shambler is
  always one pistol shot merely because neutral base HP is 24.
- **Continuous ×1.6 skull-value bonus:** day-10 remainder rises to **3,069** after
  the same purchases. This is an upper-income sensitivity, not an achievable
  first-kill streak; GB-29's early burst gaps can break streaks. It excludes the
  cost and effect of Scavenger. High-skill players can progress faster; never tune
  ordinary ammo affordability around a permanent maximum streak.
- **65% banked AND 50% accuracy:** the virtual ledger cannot fund the planned
  ammunition from day 5 onward (**51 short on day 5; 538 short by day 10**). Negative
  numbers mean unmet ammo cost, not a negative wallet the game allows. This candidate
  is not proven beginner-safe. Before adoption, test optional caches, careful knife
  use and cheaper weapon paths. If it still forces scavenging after every mistake,
  reduce basic ammo costs or retain current specialist payouts; don't shrink hordes
  or quietly auto-credit Cash to conceal the deficit.

These expense estimates require mid-wave HQ trips: Day 5 uses about **1,100 Uzi
rounds / 18 purchased packs** in the reference route, well beyond the reserve cap.
The kiosk currently opens during waves (`KIOSK_PREP_ONLY=false`) and pauses the sim,
but returning, banking, surviving and fitting each full pack under the cap take
time. The model assumes packs are bought as space becomes available, not loaded
all at prep. It does not establish within-wave liquidity or a safe travel route.
If the intended flow closes the kiosk at night, this design is invalid without an
explicit ammo/logistics solution; do not change hours silently.

The budget includes just one MedPen and modest construction, no destroyed-base
replacement or unexpected repairs. It therefore overstates discretionary buying
power in a rough run. Free cache/airdrop supplies, defensive kills, headshots and
melee would reduce ammo spending; extra ambient kills add both income and cost.
Their net benefit is deliberately not invented. Day-6 first blood gives a blueprint
in this route; future repeated-guardian bonuses are outside the ten-day horizon.

## Owner work and acceptance after approval

- **ChatGPT:** approved value/price data and integer remainder logic in economy;
  keyed skull-value/streak copy; separate blueprint/placement quote; honest purchase
  receipts. No implementation in this proposal.
- **Grokbot:** authoritative eligible death source and sampled streak multiplier;
  unchanged total/type plan, agreed GB-29 scales, wave-clear skull flush position.
  Preserve player-only streaks and defense base rewards.
- **Cursor:** save/migrate the fractional remainder and queued whole skull value
  atomically with bank, bag and run state; legacy saves default to zero remainder.
- **Claude:** approve cross-owner reward/flush/save contracts and the prices Jerry
  chooses. No new persistent currency or special tutorial reward exchange rate.
- **Antigravity:** complete real Day-1/3/5/10 loops with no debug grants. Record
  ammo used, banks completed, Cash spent, deaths/retries, HQ trips and time spent
  shopping. Try rifle-first and barricade-first choices and at least one weak-aim
  run. Compare combat time with GB-29, not just final wallet screenshots.

Arithmetic acceptance: exact conservation across rounding/pooling/pickup/bank;
duplicate death/deposit/restore cannot mint value; 20 ×1.1 shamblers equal 22 value;
defense kills never raise streak; direct and defensive payouts use the right
multipliers; caveguard remains zero. Verify old saves, fractional carry over a
day boundary, unfinished pickup pools, full-price capped packs, all price labels,
and all prices actually debited. Do not change any test expectation before Jerry/
Claude approves a balance change; submit those tests for lead review.

## Reproduce and decide

Run `node docs/specs/economy-model.mjs`. It prints all ten daily type counts,
expenses, purchases, deferred choices, sensitivities and 100-seed gross ranges.
Source table/function fingerprint for this report:
`905ed4c0905097d76d1034281bcb2d01ac0bdf26bb661ffa0f3300d940e923f6`.
It exits with assertions for the 20/100/221/431 anchor totals and every reference
Cash identity. This verifies the arithmetic, not the proposed game's difficulty.

For Jerry's morning: recommend trying the **25-Cash MedPen and exact fractional
accounting first**, alongside GB-29, then the specialist/streak/heavy-price bundle
as one measured tuning candidate. Keep current base fodder value and horde sizes.
Do not approve a full roll-out solely from this spreadsheet-style estimate: the
ammo-return burden and combined low-skill deficit are the key playtest questions.
