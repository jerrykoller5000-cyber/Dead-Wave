# Board queues archived 2026-10-10

Finished tasks moved off crew/BOARD.md (`node crew/crew.mjs tidy`). Each one's report is in handoffs/.

<!-- crew.mjs tidy, 2026-10-10T05:57Z: 31 finished -->

## Cursor — integration, git, tools, engine core

### Now

- [x] **CU-88** **Bug: the Hush and the warrens.** Jerry: charge the Hush, go to a cave, press E to go down: nothing happens, and
  after that the alarm can't be sounded. Find it, fix it, and a test that walks that path (handoffs/2026-10-06-jerry-playthrough-1.md).

## Grokbot — combat

### Now

- [x] **GB-133** **Bugs.** (1) Reloading the 40 mm launcher throws six casings for every one. (2) Jerry found no way to upgrade
  a build: the Upgrade slot on the build wheel exists, so make it findable (the prompt, the wheel, the first-use card) or
  say what's missing (handoffs/2026-10-06-jerry-playthrough-1.md).
- [x] **GB-134** **The grenade's arc, and the launcher's.** Hold G: an arc grows from a short lob (a tap) to the longest throw at 3 s;
  where terrain cuts it, the arc shows that. The 40 mm launcher gets an arc like the mortar's.
- [x] **GB-135** **The horde (D-77).** Faster dead on average, up to 90% of his sprint; sprinters outrun his sprint. 70% close in
  together, 30% flank. A mass, not single fights: Jerry never felt a horde, and night 20 was "a slow boring trickle". Look
  at the waves' pacing and sizes as well as the walk.
- [x] **GB-136** **The maimed dead (D-77).** No legs: they crawl. One leg: they hop at 75% of their speed. No limbs at all: they
  die (no more crawling torsos). Claude makes the crawl and the hop in CL-129; the rules and the speeds here.
- [x] **GB-137** **The true magazine and reload system.** Jerry: it never got implemented. `game/magazines.js` (D-61) keeps each
  magazine's rounds; find what of it the game and the HUD don't use yet and finish it, so a reload swaps a real magazine.
- [x] **GB-141** **t23 and t68 against GB-137's rules** (from GB-140). t23's reload is refused now (no fuller magazine) and t68
  expects buying the AK never to lower a 999 reserve, which is now the spares exactly. Change the rule or the test; say which.
- [x] **GB-142** **t98: something moves more than 4 m in 100 ms,** ragdolls on and off (it failed before CL-129 too).
- [x] **GB-143** **t185: the M4 sometimes fires one round on a held trigger** (run 2 and its retry). Likely the first-draw
  stall t187 had: count the hold in game time.
- [x] **GB-140** **The integration run while Cursor is away** (Claude, 2026-10-07). `npm test` twice on Jerry's PC (check-players
  passes again), the real-renderer smoke run, each red to its owner with the failing lines; flaky ones listed apart. GP-84,
  GP-138 to GP-147 and GB-137 wait on this. No git: Cursor still commits when it is back.
- [x] **GB-138** **The Watchman MG.** Jerry: it never got created. Make the M240 on its tripod real: bought, placed, manned, with
  its own feed, and Brandt's on the roof.

## ChatGPT — what the player reads and decides

### Now

- [x] **GP-84** **R5 · P-141.** The words and the HUD below: the Hush's battery, the stir, the depth, "No building down
  here", pickups; the board's warrens and passages; the Marrow cave's sealed door (story v2). After CU-86 (the live depth, the clearances and the pickup
  receipts: handoffs/2026-10-02-chatgpt-GP-84-contract-check.md). Details: `docs/roadmap.md` P-141.
- [x] **GP-138** **The CIF window** (Jerry's playthrough): "Your Gravewalker" starts with the turning paused; only items he has
  unlocked are listed; a new look for the window; the colour of the lightning-proof boots can be changed. Claude does the
  figure itself in CL-125.
- [x] **GP-139** **Notifications move left.** The new-gun unlock and the skulls processed drop down from the Dead-Wave/prep panel
  on the left, as part of it, not mid-screen. Every other notice that can go there goes there; the kill streaks stay.
- [x] **GP-140** **The supply terminal's tabs.** Each tab's sub-tabs named and coloured apart so they catch the eye (Jerry's
  example: Weapons in yellow over GUNS in green and UPGRADES in brown), on every tab.
- [x] **GP-141** **The Armory: the gun in 3D.** A small view of the selected gun that he can turn, like the CIF's figure.
- [x] **GP-145** **The minimap's enemy indicator** (was CU-89, D-78). True direction every time, including after the camera
  turns (it lies now); several directions at once; smaller. By day it shows only the dead he has been near or seen; at night,
  the direction of any within 50 m. index.html drawMinimap; check in on index.html (minimap).
- [x] **GP-146** **The map** (was CU-90, D-78). His facing and the camera's facing, as on the minimap. Every place a `?` until he
  has found it (FOB Threshold always shown); the caves by their real names once found (Root Warren...); the HQ is FOB
  Threshold on both maps.
- [x] **GP-147** **Mission indicators** (was CU-91, D-78) on the minimap and the map: where the current objectives are.
- [x] **GP-148** **GB-137's reload banners in the catalogue.** R with no fuller magazine now refuses with a banner through
  `sayText` and English fallbacks: `hud.ammo.noFullerMag` (NO FULLER MAGAZINE), `hud.ammo.noFullerLoader` (NO FULLER LOADER)
  and `hud.ammo.noFullerHelp`. Your wording, in ui/strings.js; no index.html change needed.

## Claude — lead; the world, the studio and the reactions

### Now

- [x] **CL-125** **The CIF's Gravewalker.** Arms relaxed at his sides, not held out; the whole of him in view with a slight zoom on
  the part being changed (the boots can't be seen now); the NVGs on his head only when the helmet is worn and the NVGs are
  unlocked. With GP-138.
- [x] **CL-126** **The walk and the run.** He bobs side to side oddly; the legs and the body's turn look goofy and stiff. And he
  breathes hard at idle after a run.
- [x] **CL-127** **The radio mast.** How to repair it is obvious, the repair bar easy to see while repairing, and the supply pickup
  in its own spot away from the repair point.
- [x] **CL-128** **Music: each night its own.** A score that gives each night special attention. Jerry's inspiration:
  https://www.youtube.com/watch?v=zjyQWpJc6qk
- [x] **CL-129** **The dead look and move better.** Better models and animation for every kind, more engaging to look at; the
  crawl (no legs) and the hop (one leg) for GB-136.
- [x] **CL-130** **The dead sound like themselves.** Each kind its own sounds.
- [x] **CL-132** **The broken characters** (Jerry, 2026-10-07: "whats the deal with all these alien like symbols?"). index.html's text was
  double-encoded once (UTF-8 read as Windows-1252): `Â·` for ·, `GÃƒâ€"3` for G×3, `Ã¢â‚¬â€` for —, on the HUD and in 720 lines. Put
  back exactly, and a test that fails on any of it in the game's files.
- [x] **CL-135** **The weapon sounds, take two** (Jerry, 2026-10-09: the reloads and the high end "sound like bones clinking together or a xylophone"; switching "should sound like a CRT TV static switching"). The punch and sub kept; everything above them shaped noise (steel, polymer, hands, dirt); every reload cue, impact and grenade sound banked; a CRT channel change on every weapon change, the dial's tick on the wheel; the sniper's bolt on GB-146's beats. Listen: `review/weapon-sounds-2/`. `handoffs/2026-10-09-claude-CL-135.md`, t223.
- [x] **CL-134** **The weapon sounds, overhauled** (Jerry, 2026-10-09: "impactful and fun to hear"). Every gun, explosion, hit, blade and reload sound rebuilt as layered, banked samples with tails and echoes; suppressors heard; built off the main thread. Listen: `review/weapon-sounds/`. `handoffs/2026-10-09-claude-CL-134.md`, t220.
- [x] **CL-133** **The marine, smooth and fluid** (Jerry, 2026-10-08: "Make all of the Player's movements and animations smooth and fluid. Make that shit smoove as hell."). A cross-fade between his pose states, the run blended in, an S-curve start, a step glide, the camera's look eased, the gun given inertia, every ease frame-rate free. `handoffs/2026-10-08-claude-CL-133.md`, t216.
- [x] **CL-131** **The Watchman MG, carried and fired.** From GB-138: shouldered (T) it still shows the mortar; give it its own carried
  model, tip its barrel up and down with the aim, throw links and brass, and give it its own report if the AK's isn't right.

