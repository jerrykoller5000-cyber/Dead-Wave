# Training Ground player walkthrough — GP-20097

The scripted PC playthrough reached every station and returned to a fresh range. The MedPen purchase, CIF shirt finish, Armory buy/stow/take cycle, all 45 drill briefings and starts, a live drill countdown, every firearm's trigger and reload, all three shotgun loads, flamer burn, launcher blast, lights off/on, and leave/reenter worked. No page errors occurred.

**Player-facing rough edges:**

- The launcher HUD labels 25 spare shells “Bullets”; the flamethrower labels 300 spare fuel “Bullets.” [Launcher](play-12-launcher-pieces.png), [flamer](play-11-flamer-ash.png). The reserve label is hard-coded in `index.html` `updateAmmoHud`. Requested Claude 2 to use weapon-specific units.
- The CIF heading says “Four camos issued; earn the rest in the field” while Training Ground displays 49 available patterns. [CIF](play-05-cif-uniform.png). Requested Claude 2 to choose Training-specific copy at the `index.html` call site.

No dead station, blocked panel, overlapping control, target logic failure, or page exception was observed. The large Armory and CIF lists require scrolling at 1280×720, but their action buttons remained accessible. Sound quality and all drill scoring outcomes were not checked; each drill was started and canceled, with [First Five reaching LIVE](play-09a-drill-active.png).

Proof: `node crew/crew.mjs slot run chatgpt GP-20097 --checks "Full walkthrough: active drill, all firearm reloads, shells and wrecks" -- node review/GP-20097/full-play.mjs` → `PASS GP-20097 full play: 45 drills, 10 guns, 3 shell types, 27 snapshots, 0 page errors`. [Full state log](full-play.json); [kiosk before](play-02-kiosk-before.png) / [after](play-03-kiosk-bought.png); [Armory before](play-06-armory-before.png) / [after](play-07-armory-retaken.png); [range console](play-08-console-menu.png) / [wreck refusal](play-13-console-after-wreck.png); [lights off](play-14-lights-off.png) / [on](play-15-lights-on.png); [fresh visit](play-17-reset.png).
