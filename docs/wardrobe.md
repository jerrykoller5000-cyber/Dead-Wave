# The dressing room: what he can wear and how the camos are earned (D-66)

Owner: Claude (CL-96, P-130). For Jerry to read, and for the builders: Cursor (CU-70, the dressing room in the game),
Claude (CL-97, the new parts on the marine), ChatGPT (GP-82, the unlocks). Written 2026-09-30 from `index.html` as
it stands after CL-94 (the marine's own materials per item) and CL-90 (what he carries on him).

## The short version

- The CIF window at the HQ grows into a **dressing room**: a 3D view of the marine he can drag round a full 360 (it
  turns slowly on its own when left alone), and a tab for each thing he wears.
- **Each item takes its own camo** (or plain colour): helmet cover, facemask, shirt, trousers or shorts, holsters,
  hat, gloves, backpack, and the armour with its straps. Weapons take camo too, one pick per gun.
- **Boots** come in black, brown or tan. **Hats:** the 8-point cover, a boonie, a ballcap worn forwards or
  backwards. **Gloves** on or off, **sleeves** rolled or down, **shorts** or trousers. **Hair, eye and skin
  colour.** **Eyewear** (Jerry): aviators, a pit-viper style, a Wayfarer style, the GWOT ballistic goggles.
- The **facemask never comes off**: his face stays a mystery. It starts coyote brown.
- **Four camos are free:** M81 Woodland, Coyote Brown, Olive Drab and MARPAT. The other 45 are **earned in play**,
  from what the game already remembers between runs (best-run records, finished runs, wins, badges). The console's
  **"dapper dan"** unlocks everything.
- It is all **looks**: nothing here changes armour, speed or anything in the fight. What he wears is kept between
  runs (a profile, like the badges), never the kit he bought in a run (D-30).

## 1. The items

Every item below is already its own part on the marine with its own material (`userData.wardrobe`, CL-94), except
the new ones CL-97 builds (marked *new*).

| Tab | Item | The choice | Takes camo | Default |
| --- | --- | --- | --- | --- |
| Head | Hat (`cap`) | 8-point cover, boonie *new*, ballcap forwards *new*, ballcap backwards *new* | yes | 8-point cover, M81 |
| Head | Helmet (`helmet`) | the cover's camo (the helmet itself is bought in the run, as today) | yes | M81 |
| Head | Facemask (`mask`) | colour or camo only; never off | yes | Coyote Brown |
| Head | Eyewear *new* | none, aviators, pit-viper style, Wayfarer style, GWOT ballistic goggles | no (frame colour from the item) | none |
| Body | Shirt (`shirt`) | sleeves down or rolled *new* | yes | M81, sleeves down |
| Body | Trousers or shorts (`trousers`) | trousers or shorts *new* ("pants" and "trousers" are the same item) | yes | M81 trousers |
| Body | Gloves (`gloves`) | on or off *new* | yes | on, black |
| Body | Boots (`boots`) | black, brown, tan | no | black |
| Kit | Armour and straps (`carrier`, `pads`) | the carrier, its pouches and straps, the knee and elbow pads (bought in the run, as today) | yes | Ranger green (today's) |
| Kit | Holsters (`holster`, `belt`) | the hip holster and belt, and CL-90's cross-draw holsters | yes | today's |
| Kit | Backpack (`pack`) | the pack, its pocket and bedroll | yes | today's green |
| Him | Hair | colour: black, dark brown, brown, auburn, blond, grey | no | dark brown |
| Him | Eyes | colour: brown, hazel, green, blue, grey | no | brown |
| Him | Skin | six tones, light to dark | no | today's |
| Guns | One pick per gun | camo on the gun's furniture (stock, grip, handguard); metal stays metal | yes | none (bare) |

- **Kit he has not bought** (the helmet, the carrier, the pads) is still chosen here: the preview can show him
  wearing it ("show the bought kit" toggle, on by default) so the pick can be seen. In a run it appears only once
  bought, as today (`applyGearVisibility`).
- **The hat and the helmet:** with the helmet on, the hat is hidden (as the field cap is today). The ear defenders
  come with the helmet (CL-94).
- **Eyewear** sits over the eyes above the mask; the GWOT goggles are the ballistic kind, worn on the face (the
  helmet's stowed goggles stay on the helmet). With NVG down, the eyewear is hidden.
- **The burial detail** always wears woodland MARPAT, whatever he picked (CL-105).
- **"Plain colours"** (Jerry's colour chart, CU-61) are camos here like the patterns: any camo pick can be a plain
  colour.

## 2. Storage and players

- One wardrobe per **profile**, saved as `tt_wardrobe`:
  `{ version: 1, items: { shirt: { camo: 'm81', sleeves: 'down' }, trousers: { camo: 'm81', cut: 'trousers' }, ... },
  guns: { m4: 'multicam', ... }, body: { hair: 'darkBrown', eyes: 'brown', skin: 3 } }`.
  An unknown or locked value falls back to the default for that item, so a bad save never breaks the marine.
- The old `tt_camo` (CU-61, one camo for everything) seeds it once: on the first load with no `tt_wardrobe`, every
  camo item starts on the `tt_camo` pick (except the facemask, which starts coyote brown).
- **Per player (D-58):** each player in `players` has his own wardrobe. The local one is the profile's; in co-op
  (R7) a client sends his wardrobe to the host once when he joins, and the host shows him in it.
- **Camo per item:** the shared camo tile of CU-61 becomes one tile per camo in use (items with the same camo share
  a tile), so the shirt can be MultiCam while the trousers are M81. At most a dozen 256-pixel tiles.

## 3. The dressing room (CU-70)

- The CIF window keeps its place on the HQ's east wall (CL-103b), prep only. It opens on the dressing room.
- Left: the marine on a turntable, lit like the HQ yard by day. Drag to turn him; he turns slowly on his own when
  left. A second small render of the marine rig (`TT.makeMarine()`, CL-94), dressed from the picks, not the one in
  the world.
- Right: tabs Head, Body, Kit, Him, Guns. Each item shows its choices and, for camo items, the camo grid (patterns,
  then plain colours, as today's CIF).
- A pick applies at once to the preview and to him. Nothing to confirm; Escape or Done closes.
- **Locked camos** show greyed with a padlock and the way to earn them ("Survive to night 12"), from GP-82's words.
- "Reset to default" per tab.

## 4. How the camos are earned (GP-82)

Earned camos are kept for good (the profile, `tt_unlocks`). Each rule reads what the game already keeps between runs:
the best-run records (`tt_best_run`, GP-52: best day, kills, streak, headshots and skulls in one run, runs finished,
wins), and the badges (`tt_badges`, GP-65). A debug run (CU-59's `debugTouched`) earns nothing, as with badges. An
unlock shows a toast when the run ends ("New camo: Flecktarn").

**Free from the start:** M81 Woodland (`m81`), Coyote Brown (`coyoteBrown`), Olive Drab (`oliveDrab`), MARPAT
(`marpat`).

**The plain colours** (23), the early ones:

| Camo | Earned by |
| --- | --- |
| Khaki (`khaki`) | reach day 2 |
| Tan (`tan`) | reach day 3 |
| Army Green (`armyGreen`) | reach day 4 |
| Drab (`drab`) | reach day 5 |
| Field Drab (`fieldDrab`) | reach day 6 |
| Foliage Green (`foliageGreen`) | reach day 8 |
| Dark Olive Green (`darkOliveGreen`) | reach day 10 |
| Battleship Grey (`battleshipGrey`) | reach day 12 |
| Gunmetal (`gunmetal`) | reach day 14 |
| Ecru (`ecru`) | finish 3 runs |
| Desert Sand (`desertSand`) | finish 10 runs |
| Camouflage Green (`camouflageGreen`) | a streak of 8 |
| Rifle Green (`rifleGreen`) | a streak of 12 |
| Charcoal (`charcoal`) | a streak of 16 |
| Dark Khaki (`darkKhaki`) | 100 kills in one run |
| Olive (`olive`) | 200 kills in one run |
| Forest Green (`forestGreen`) | 300 kills in one run |
| Sandy Brown (`sandyBrown`) | 25 headshots in one run |
| Air Force Blue RAF (`airForceBlueRaf`) | 50 headshots in one run |
| Feldgrau (`feldgrau`) | bank 100 skulls in one run |
| Navy Blue (`navyBlue`) | bank 250 skulls in one run |
| Prussian Blue (`prussianBlue`) | the "first bank" badge |
| Air Force Blue USAF (`airForceBlueUsaf`) | the "relay online" badge |

**The patterns** (22), the harder ones:

| Camo | Earned by |
| --- | --- |
| DBDU (`dbdu`) | reach day 16 |
| DCU (`dcu`) | reach day 18 |
| MultiCam (`multicam`) | reach day 20 |
| Tiger Stripe (`tigerStripe`) | a streak of 20 |
| Zaire Leopard (`zaireLeopard`) | a streak of 25 |
| Giraffe (`giraffe`) | a streak of 30 |
| DPM Woodland (`dpmWoodland`) | 400 kills in one run |
| Flecktarn (`flecktarn`) | 500 kills in one run |
| Swiss TAZ (`swissTaz`) | 100 headshots in one run |
| PAP Digital (`papDigital`) | bank 500 skulls in one run |
| MCCUU (`mccuu`) | get out on the boat once |
| Green MultiCam (`greenMulticam`) | get out on the boat 3 times |
| UCP (`ucp`) | the "night five" badge |
| M14 Woodland (`m14Woodland`) | the "night ten" badge |
| CADPAT (`cadpat`) | the "night twenty" badge |
| Sumpftarn (`sumpftarn`) | the "fog survivor" badge |
| Cactus (`cactus`) | the "kicked free" badge |
| M14 Desert (`m14Desert`) | the "out on the boat" badge |
| Serbian Karst (`serbianKarst`) | the "thousand skulls" badge |
| French CE (`french`) | the "thousand kills" badge |
| Telo Mimetico (`teloMimetico`) | the "hundred headshots" badge |
| DPM Desert (`dpmDesert`) | the "streak twenty" badge |

Everything that is not a camo (the hats, eyewear, boots, gloves, sleeves, shorts, hair, eyes and skin) is free.

**"dapper dan"** typed in the console (the same place as the other console commands) unlocks every camo for the
profile, with a toast. It is a cheat: it doesn't count as earning, so no badge comes from it.

## 5. For the builders, in order

1. **GP-82** `ui/unlocks.js`: pure, unit-tested: `unlockedCamos(records, badges)` from the tables above, the
   `tt_unlocks` store, the end-of-run check and its toast, "dapper dan", and the words ("Survive to night 12").
2. **CL-97** the new parts on the rig (the boonie, the ballcaps, eyewear, rolled sleeves, shorts, bare hands, hair,
   eyes, skin; camo on the guns), each through the studio review folders, and `dressMarine(marine, wardrobe)` that
   applies a wardrobe to any marine (the player, the preview, a co-op player).
3. **CU-70** the dressing room: the tabs, the turntable, `tt_wardrobe` and its `tt_camo` seed, one camo tile per camo
   in use; it calls CL-97's `dressMarine` and reads GP-82's locks. It can start on the items that exist today
   (every camo item, boots, gloves colour) before CL-97's new parts land.

## Calls made here (Jerry can overrule)

- Only camos are earned; every other option is free from the start.
- The unlocks come from the best single run, not lifetime totals, because that is what the game keeps today; lifetime
  totals would need new counters.
- Kit bought in a run (helmet, carrier, pads) is styled here but still has to be bought each run.
- Gun camo covers the furniture only; the metal stays metal.
