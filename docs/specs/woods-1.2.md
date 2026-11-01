# The woods (1.2): the valley hides its places

CL-287. Jerry's order D-103, his answers D-105, the speed it stands on D-104 (CL-288). Jerry's plan doc, with the maps:
https://claude.ai/artifact/V5AumdfFujtfV13hPy85aR. World layout is Claude's (rule 10); every part below names its owner.

## 1. What it is for

Today about 430 trees stand in a 220 m circle (one per ~20 m, canopy over 4.2 % of the floor), every site sits 10 m clear
of trees and the day fog starts at 190 m: from the HQ roof 8 of the valley's 12 places are in plain sight. Jerry: the
places should be covered "with trees and terrain", "forcing the player to leave HQ on world finding missions"; paths
open and closed; building only on some ground; "terrifying at night, but cause curiosity and exploration during the
day"; each place "a distinct entity with secrets and it's own spin"; the drop-in "a bit like you are lost in the woods".

## 2. The rules every stage keeps

1. **No place is seen from the HQ.** From the yard (eye 1.7 m) no site's centre has a clear line; from the roof only the
   mast's light and the skyline's pulls (§4.3). tools/sightlines.mjs (CU-196) measures it; W1's test holds it.
2. **Every place is a clearing at the end of a trail that bends.** The place opens in the last 20-30 m of its trail.
3. **The valley speaks in pulls, not markers.** Smoke, light, birds and sound say where to go; the map shows only what
   he has found (D-105).
4. **The same routes for him and the dead.** Walls shape both; the dead follow trails and gaps (W2's navigation).
5. **No slower than 1.1 (D-99).** The woods are built on CL-288's GPU forest and recorded static world; each stage
   lands with a before/after on Jerry's PC. How thick (30-40 m of sight by day to start) is tuned by speed and play
   (D-105: "up to your discretion based off of performance").

## 3. The layout (Jerry: "Yes I like that layout")

| Place | Where | Notes |
| --- | --- | --- |
| HQ | the middle, a clearing ~24 m across | a thicket ring at ~60 m, open only where the trails pass |
| Landing clearing | ~45 m south-west, one bend from the HQ | the drop-in (§4.5) |
| Rangers' camp (Brandt) | west, 110-160 m | moved from 42 m south-west |
| Trapper's (Okafor) | north, 110-160 m, across the river | moved from 55 m north-east; reached over a bridge |
| Hikers' camp (Pike) | south, 110-160 m, by the fire tower | moved from 82 m; the kit wants a tree over water: pick the spot with GB-196's rules or move the water |
| Fuel depot (Price) | east, 110-160 m, on the road to the mast | moved from 48 m east |
| The mast and relay (Sato) | east hilltop, as now | the one open hilltop: the only view over the canopy |
| Convoy, Clarke's truck, dock, tower, graveyard, cabins, caves | as now | each gets its clearing and bending trail |

The river's two bridges are chokepoints. Exact spots are chosen against slope, water and each mission's needs (MU-12
lists everything tied to each camp's position; moving one is that list). Each camp moves once, into its clearing
(CL-285 part B lives here now).

## 4. The stages

### W1 · Hide and reveal (Jerry plays it after)

1. **The headroom first (CL-288):** the recorded static world, the cached sun shadow, the GPU forest (instanced, culled
   and LOD-picked on the GPU, far trees as cards). Owner: Claude, with GP-19996's report and MU-13's map.
2. **The ground:** ridges and hollows that break the lines from the HQ (terrain shaping in the height function, kept
   out of the trails and clearings). Owner: Claude.
3. **The woods:** tree density from a forest mask (dense everywhere but clearings, trails, glades and the mast's top),
   an understory of brush, saplings and fallen logs, a light haze in the woods by day. Owner: Claude (placement),
   Antigravity (the look on the GPU).
4. **The places moved and cleared:** the four camps to their quarters; every site's clearing and bending trail;
   PATHS rerouted. Owner: Claude; each mission's owner checks their mission at its new spot.
5. **The pulls:** the mast's red light; chimney smoke at the trapper's; a black smoke column over the depot; crows
   over the hikers' camp; the depot's generator tick and the trapper's iron chimes carried far. Owners: Antigravity
   (smoke, crows, light), Claude (sound beds, with Muse's pack map).
6. **Found, not shown:** the first time he walks into a place's clearing its card comes up (GP-19997's words); the
   minimap and full map draw only ground he has seen, and places only once found. Owner: Cursor (the map and card),
   ChatGPT (words).
7. **The test:** no site open from the yard (rule 1), every site reachable by a trail, the camps in their quarters at
   110-160 m. Owner: Claude, on CU-196's tool.

### W2 · Open and closed (Jerry plays it after)

1. **Walls:** thicket, fallen logs and rock in bands (the HQ's ring, the foothills, between quarters), solids for him
   and the dead, gaps where the trails pass. Owner: Claude (placement), Antigravity (the look).
2. **The dead's navigation:** a flow field over a grid toward the HQ and toward him, walls as blocked cells, run in a
   worker; the horde's approach points from it; the unstick sidestep kept for what the field misses. MU-14 maps every
   place it plugs in. Owner: Grokbot.
3. **Building on clear ground only:** tryPlace refuses the woods; the HQ clearing and a few flats take walls and
   turrets. Owner: Cursor.
4. **Chainsaw shortcuts (D-105: "a genius idea"):** marked fallen logs the chainsaw cuts through (time and noise that
   draws the dead); a cut log opens a gap for him and for the dead (the flow field updates). Owner: Grokbot.
5. **The story's gates** (CL-285 part C, game/chain-gates.js): the eight blockers placed in the new layout. Owners: each
   mission's owner, on Claude's page-side system.

### W3 · Each place its own (Jerry plays it after)

1. Each place's ground, light, sound and one secret off its path (the doc's first table).
2. Each place's own foliage and one event only it has (Jerry's addition, D-105; the doc's second table).
3. **The drop-in:** the insertion lands him in the landing clearing with the orders card in hand; one trail out, two
   bends, the HQ clearing the first reveal of the run (~1 minute in); the tutorial prompts come down the trail with him.
4. **Night in the woods:** warnings before every attack from the dark (branches, brush, a shape crossing the light);
   the HQ's floodlight glow over the canopy as the way home.
Owners: Claude (drop-in, sound), Antigravity (foliage, lights), the places' mission owners (events and secrets).

## 5. Out of scope

Bigger than the circle; new missions; weather beyond today's (the haze is new, the storms stay as they are).
