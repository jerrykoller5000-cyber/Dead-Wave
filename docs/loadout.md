# The loadout: the Armory, holsters and magazines (D-61)

Owner: Claude (CL-89, P-110). For: Jerry to read. Built by Cursor (CU-64 the holster and going unarmed, CU-65 the
Armory in the game, CU-66 magazines), ChatGPT (GP-78 the Armory window and `game/armory.js`, GP-79 magazines on the
HUD) and Claude (CL-90, what he carries shows on him). Written 2026-09-29 from `index.html` as it stands.

## The short version

- He goes out with **four guns and his pistol**: two primaries slung on his back, two secondaries in cross-draw
  holsters under his arms, and the base pistol on his hip, always.
- Everything else he owns waits in the **Armory** at the HQ, each gun with its magazines, for the rest of the run.
- **Magazines are real.** R keeps the old magazine with the rounds left in it; a double tap drops it for a faster
  reload, and it is gone unless he picks it up before the next dawn or dusk.
- He can **holster everything** and run unarmed, 10% faster.

## 1. Where each gun goes

| Where | What | How many |
| --- | --- | --- |
| **Primary slots** (slung on his back, one over each shoulder) | M4, AK-47, AA-12, shotgun, sniper, launcher, flamethrower, minigun, chainsaw | 2 |
| **Secondary slots** (cross-draw holsters under his arms) | Uzi, revolver, a second pistol | 2 |
| **The hip holster** (drop-leg rig, already modelled) | The base pistol | 1, always; it never leaves |
| **Outside the slots** | The knife and the machete (F), grenades (G), MedPens (H) | as today |

**Akimbo** (Y) is two of the same secondary: two Uzis or two revolvers in the two secondary holsters, or the hip pistol
with a second pistol in a secondary holster. Buying the pair at the kiosk (`dualOwned` today) buys the second gun;
it needs a free secondary slot to go out with him.

**A fresh run** (D-30): the pistol on his hip, the slots empty. The first guns he buys go straight into a free slot of
their kind; once the slots are full, a bought gun goes into the Armory.

## 2. The Armory (GP-78, CU-65)

A window at the HQ beside the CIF (CU-61), open during prep only.

- Four slots to fill, each showing the gun and its magazines. The hip pistol is shown, fixed.
- The shelf: every other gun he owns, each with its own magazines, rounds and upgrades (extended mag, laser, mods).
  Nothing on the shelf is lost or refilled; it is exactly as he left it.
- Swap by picking a slot, then a gun from the shelf. A primary can't go in a secondary slot, or the other way round.
- The loadout is applied when he closes the window; the next wave goes out with it.
- `game/armory.js` is pure (no three.js, no DOM): the slots, the shelf, the rules above, and `take(gun)` / `stow(gun)`
  / `buy(gun)` returning what changed. Unit-tested. The window only draws it.
- The weapon wheel (Q) and cycling show only what he carries: the four slots, the hip pistol, and **Unarmed**.
- Per player (D-58): each player has his own slots and shelf. Cash stays shared.

## 3. Holstered and unarmed (CU-64)

- **Unarmed** is a slice on the weapon wheel, and **U** does it at once (U again draws the gun he had).
- Unarmed, nothing fires and blades still work (F). Walk and run speed ×1.10.
- With Fleet foot (D-59) the two together never pass ×1.30 (Fleet foot 5 alone is ×1.25).
- The pistol draws from and goes back to the hip holster; primaries unsling from the back; secondaries draw across the
  chest. The moves are CL-90's (studio clips); until they land, the gun simply appears in his hands as today.
- Swimming already holsters whatever he holds; it uses the same holster now.

## 4. Magazines (CU-66, GP-79)

**What changes.** Today each calibre has one reserve count (`reserveAmmo['5.56mm']`), and a reload takes rounds from
it. From CU-66 the magazine-fed guns carry **magazines**, each with its own rounds.

| Gun | Feeds from | Reload |
| --- | --- | --- |
| Pistol, Uzi, M4, AK-47, sniper | Box magazines (12, 32, 30, 30, 5; the extended-mag upgrade makes each 1.5×) | R: stow or drop the magazine |
| AA-12 | 20-shell drums | R: stow or drop the drum |
| Minigun | 300-round belt boxes | R: stow or drop the box |
| Flamethrower | Fuel tanks (60) | R: stow or drop the tank |
| Revolver | **Speed loaders** of 6 | R: empties the cylinder (the empties fall), a loader goes in |
| Shotgun | Loose shells, one at a time | Round by round: R starts loading shells one after another; fire to stop (new: today one timed reload fills the tube) |
| Launcher | Loose 40 mm grenades, one at a time | Round by round, like the shotgun (new: today one timed reload fills it) |
| Chainsaw | Fuel, as today | As today |

**R, once: stow.** The magazine in the gun goes into the dump pouch on his belt with whatever rounds are left in it,
and the fullest magazine he carries goes in. The normal reload time.

**R, twice quickly (within 0.3 s): drop.** The magazine falls to the ground (the dropped-mag prop exists:
`spawnDroppedMag`) and a new one goes in, in about **60%** of the reload time. The dropped magazine keeps its rounds
and can be picked up by walking over it; it is gone at the next **dawn or dusk**. An empty magazine is always
discarded, stowed or dropped.

**Akimbo** stows or drops both magazines together.

**How many he carries.** The same amount of ammunition as today, in magazines: the carried cap for each gun is today's
reserve cap (`RESERVE_CAP`, with the ×1.4 of GB-36 and the extended-mag ×1.5) divided by the magazine size, rounded
down. For example the M4: 252 rounds is 8 magazines of 30. So nothing gets easier or harder yet; GP-77 re-bases the
economy.

**Buying.** The kiosk sells full magazines for a gun ("M4 magazine · 30 rounds"), speed loaders, loose shells and
grenades, belt boxes and tanks, at today's price per round. Calibres shared by two guns (12 gauge: the shotgun's loose
shells and the AA-12's drums) are sold as each gun's own.

**The HUD (GP-79).** Beside the ammo count, one small icon per carried magazine showing how full it is. "spare"
becomes **"mags"** (box magazines, drums, belt boxes, tanks), **"loaders"** (the revolver), **"shells"** (the
shotgun) or **"rounds"** (the launcher's grenades) by gun.

## 5. What shows on him (CL-90)

From the loadout and what is left: the two slung primaries, the cross-draw holsters, the hip pistol, magazine pouches
on the vest, grenades, a shell bandolier (shotgun), a 40 mm belt (launcher), the bulky rest in his backpack (belt
boxes, the tank). Each in 3-4 stages from full to empty. Made in the studio, reviewed by Jerry in the review folders.

## 6. For the builders, in order

1. **GP-78** `game/armory.js` and the window (pure, tests), from sections 1-2.
2. **CU-64** the holster, U and Unarmed on the wheel, the speed cap (section 3).
3. **CU-66** magazines (section 4); t25 and the ammo tests re-based.
4. **CU-65** the Armory wired into the game: the loadout applied at the end of prep, the wheel filtered, purchases to
   a free slot or the shelf; per player (after CU-63).
5. **GP-79** the magazine HUD; **CL-90** what he carries.

## Calls made here (Jerry can overrule)

- U holsters; the wheel gets an Unarmed slice. No existing key is moved.
- The shotgun and the launcher load round by round (D-61; P-114's "unchanged" is superseded): each shell takes its share of today's reload time, and firing stops the loading.
- Empty magazines are thrown away; there is no refilling magazines from loose rounds for now.
- The loadout can be changed only at the Armory, during prep.
