# Controls

## Movement

| Key | Action |
| --- | --- |
| `WASD` / arrows | Move, screen-relative (`W` is up the screen whichever way you aim) |
| `Shift` | Run |
| `Space` | Jump |
| `V` | Dodge roll. Untouchable mid-roll, about 1 s cooldown |
| `C` (hold) | Crouch: slower, tighter shot groups, lower profile |

Crouch is on `C` rather than `Ctrl` on purpose: `Ctrl+W` (crouch-walk forward) is the browser's
own "close tab" shortcut, which no web page can override. `Ctrl+N` and `Ctrl+T` are reserved the
same way.

## Aiming and combat

| Input | Action |
| --- | --- |
| Mouse | Aim anywhere, 360 degrees. The marine turns to face the reticle |
| `LMB` | Fire. Hold for the chainsaw and flamethrower |
| `RMB` | Zoom. A real first-person scope on the sniper rifle |
| Hold `Q` | Weapon wheel: time slows, point at a gun, release to draw it. A quick tap steps to the next one |
| `R` | Reload from the reserve. While a build ghost is up it cycles the axis lock instead |
| `G` | Grenade. Your own grenades hurt you |
| `F` | Knife, left hand: 3.5 m reach, 54 damage, 0.28 s, +/-87 degree arc |
| `H` | Use a medkit |

The reticle locks onto a zombie's body when it is over one, and aims into the sky above the
skyline. The camera does not turn with your aim, so nothing moves under the reticle when you
move the mouse and shots land on it.

The knife one-shots Shamblers, ferals, Leapers, Screamers, Spitters and Bombers, and sweeps a
crowd, and every blade hit shoves bodies back hard enough to buy the space it was meant to.
The Machete (kiosk, Upgrades tab) replaces it: 3.8 m reach, 85 damage, 0.40 s, +/-93 degree arc.

### Sniper scope

`RMB` with the sniper out drops to a first-person scope view (vignette, mil-dot reticle, your own
body hidden). A middle click cycles 2X / 4X / 6X, or use the wheel. Mouse sensitivity is damped
while scoped, more at higher magnification, and the reticle eases onto where you point instead of
snapping there, so 6X is deliberately slow and heavy. Nudge the mouse to track a target; push it
toward the screen edge to swing further.

## Action key and the world

| Key | Action |
| --- | --- |
| `E` | Whatever the prompt at the bottom of the screen says (below) |
| Hold `B` | Build wheel, the same way. A quick tap enters or leaves build mode |
| `Y` | Switch between one gun and two, once you own the pair (pistol, Uzi, revolver) |
| `T` / `X` | Repair / sell. While a build ghost is up these act on the cell you are pointing at, not the nearest piece |
| `Enter` | During prep: skip the countdown and start the wave now |

**`E` at the kiosk** opens it (`E` or `Esc` closes it; time stops while it is open). It trades mid-wave too.

**`E` at a mortar** mans it. `LMB` lobs a shell at the reticle (dotted arc and landing ring), `E`
leaves it, `T` shoulders it to carry it (no weapons while carrying, and you are slower), and
`LMB` or `E` sets it down. You are rooted while manning it.

**The build wheel** (hold `B`) holds twelve: the shovel, then barricade, wall, sandbag, spikes,
fuel drum, mine, decoy beacon, light, flame, heavy, mortar. The **shovel** ($4) is not a structure
— it levels the cell you point at and blends it into the ground around it. Rough or sloping
ground refuses a build; this is how you fix it, and it is the one entry that works on a cell that
already has something standing in it. Every slot is always in the same place whether or
not you own it, so buying a blueprint never moves the others; locked ones sit greyed with their
price and say so if you pick them. The barricade is free, the rest need their plans from the
kiosk, and placing still costs per piece.

**Placement is a lattice of 2 m cells over the whole map**, one piece per cell, like bricks in a
course. 2 m because that is exactly how wide a wall section is, so a run of them meets edge to
edge with no gap for the horde to walk through. You aim at the cell you want rather than placing
a fixed distance ahead, out to 9 m, and the cell under the reticle is filled green or red so you
can see the answer before you commit. `R` turns the piece a quarter turn at a time, which is how
you take a corner. A cell is refused if it already holds something, if the ground is too rough or
too steep, if it is in or beside the water, or if a tree, rock or building is in the way — and
the refusal says which.

The bar along the bottom of the screen lists the keys while you are building, including `B` to
leave build mode.

## Gear

| Key | Action |
| --- | --- |
| `N` | Night vision (needs the helmet first, it mounts on the helmet rails) |
| `Z` | Laser sight |
| `L` | Gun flashlight |
| `M` | Mute |
| `Esc` | Pause and Settings |
| `~` | Dev console. `bigtex shooter` gives unlimited cash, `broke` turns it back off |
| `F11` | Fullscreen |

`N`, `Z` and `L` do nothing until the gear is bought at the kiosk.

## Camera

| Input | Action |
| --- | --- |
| Wheel | Zoom in and out, 6 m to 24 m from the marine (default 12 m) |
| Middle drag | Rotate the camera. Dragging up/down also tilts, when Auto tilt is Off |
| Middle click | Cycle the sniper scope magnification (without a drag) |

The scroll wheel only ever zooms now, in build mode as everywhere else — except while scoped,
where it dials the sniper's magnification.

**Auto tilt** (Esc > Settings > Camera: Off / Gentle / Strong, default Gentle). The tilt is the
terrain's job. Ground rising ahead drops the camera so you look up the hill (about 39 degrees
facing a climb against about 50 on the flat), a drop ahead raises it (about 59), and ground behind
the camera lifts it over the lip instead of hauling it in against the marine's back. Off gives
the old manual tilt back on middle-drag.

**Follow cursor** (Esc > Settings > Camera, default on). The view slides toward where you point
once the cursor leaves the middle 18% of the screen, capped at 3 m. It is a pure pan: the heading
and angle never change. It is applied after the camera's follow lerp rather than through it,
which keeps it from dragging the ground out from under a reticle you have just put on a zombie
(through the lerp that cost 2 shots in 12; after it, 16 of 16).

**Sprint FOV.** The camera opens up about 5 degrees at a flat sprint.

## Settings

Settings are reachable from the title screen and from `Esc` mid-match, in the same panel:
music and SFX volume (defaults 30% / 80%), look sensitivity, graphics quality, camera, fullscreen
and "Skip prep time". Everything is remembered between runs.

- **Look sensitivity** (0.25x to 3x): middle-drag speed, and how far the sniper reticle throws while scoped.
- **Fullscreen**: `F11` or the toggle. It is taken on the document root so the HUD goes fullscreen
  with the canvas. It is re-entered when you pick a mode, because a browser only grants
  fullscreen from inside a click or keypress and so it cannot be restored at load. `Esc` leaves
  fullscreen (the browser's own handling) and that counts as turning it off.
- **Skip prep time**: every prep becomes a 5-second countdown instead of two minutes.
