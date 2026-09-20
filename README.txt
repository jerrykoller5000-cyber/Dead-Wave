Dead-Wave

Run "Play Dead-Wave.bat" (serves this folder on port 8766) and open the page it launches.
Requires network once for Three.js (three@0.175, WebGPU build, via CDN). Everything else is
in index.html.

The launcher opens the game in its own Edge window with --force_high_performance_gpu and its
own profile (%LOCALAPPDATA%\TinyTrek\Browser). On a laptop with integrated + NVIDIA/AMD
graphics, Chrome and Edge otherwise run on the integrated chip - Chrome ignores the page's
powerPreference on Windows (crbug.com/369219127) - and the game runs ~3x slower. The separate
profile is what makes the flag stick even when Edge is already open. Without Edge installed it
falls back to the default browser. The permanent alternative is Windows Settings > System >
Display > Graphics > (your browser) > High performance.

Settings are reachable from the title screen as well as Esc mid-match - one panel, shown
from both places (volume, look sensitivity, graphics, camera, fullscreen, skip prep).

Graphics quality (Settings: Low / Medium / High / Max)
  Picked automatically on first run (Intel integrated -> Low, anything else -> High) until you
  choose one; your choice is remembered. Applies live. Resolution, shadow resolution and
  ground-cover distance switch instantly; MSAA and bloom rebuild the post chain; turning the
  sun's shadow on or off rebuilds the lit shaders, so the first fight after that can hitch
  once or twice. A fresh launch compiles everything up front as usual.
             render scale  MSAA  bloom  sun shadow  ground cover
    Low      0.60          -     -      off         55 m
    Medium   0.65          -     yes    1024        95 m
    High     1.00 (<=1.5x) 4x    yes    2048        all
    Max      1.00 (<=2x)   4x    yes    4096        all
  Render scale is a fraction of native device pixels. Measured at 1536x794 (1.25x DPI), real
  Edge, fight / calm, fresh load per preset, midday:
    Intel UHD (integrated)   Low 82 / 91 fps and Medium 63 / 70 (30 zombies), High 32 / 34 (14)
    RTX 4050 Laptop          every preset 98-144 fps with 14 zombies (144 Hz display cap)
  On the integrated GPU, cost tracks pixel count (~6.4 ms fixed + ~6.9 ms per megapixel);
  MSAA adds ~5.7 ms at 1920x992, sun shadows ~1.6 ms, bloom ~1.1 ms. The CPU side stays at
  5-10 ms a frame even in a fight, so the game is GPU-bound there, not draw-bound.

Renderer
  Dead-Wave runs on Three.js WebGPURenderer. Given WebGPU it uses it; without it the same
  renderer falls back to WebGL2 on its own - one renderer, two backends, one set of
  materials. The backend that actually came up is printed in the debug overlay.

Renderer performance notes
  A node renderer rebuilds every lit material's shader whenever the set of lights in the
  scene changes, and it tracks per-object state that a WebGL renderer barely noticed.
  Three habits that were nearly free before are expensive here, and all three are now
  avoided on purpose:
    * the scene's light count never changes. One shared muzzle light (not one per gun),
      a fixed four-light pool that ground fire and decoy beacons borrow from, and a
      flashlight built at load rather than on first press.
    * no material.needsUpdate at runtime. Canopy fade and puddles swap material
      references instead, which is what needsUpdate was being used to fake.
    * nothing is added to or removed from the scene during play. Tracers, casings,
      blood, debris, gibs, motes, ripples, ground fires, acid and every projectile come
      from pools: parked hidden when they expire, taken back out when needed. Their
      materials come from bounded pools too, so colour varies by setHex on a uniform
      rather than by minting a material.
  There is also a pipeline warm-up at load (everything hidden is compiled once up front),
  which is why startup pauses for a beat.
  If you add effects later: reuse materials, pool meshes, never add or remove lights at
  runtime, and avoid material.needsUpdate outside of load.

  Tree canopies are merged geometry: one vertex-coloured mesh per canopy instead of one
  per leaf blob, with each blob's vertex range remembered so it can still be shot off on
  its own (its vertices collapse to a point). An InstancedMesh version was tried first
  and backed out: on a real GPU every same-sized canopy drew with the first one's
  matrices. ?canopy=legacy restores one mesh per blob.

  Water waves run on the GPU as a TSL positionNode. The position buffer is written once
  at load and never touched again; only a time uniform changes. The CPU path is still
  there as a fallback, distance-gated to 130m, and takes over automatically if the node
  material fails to build.

  Ground cover (grass, bushes, ferns, flowers, mushrooms, twigs) is merged into 30m
  cells, ~270 draws instead of ~2,500, with the wind sway done in the vertex shader from
  a per-vertex weight. Zombie bodies are compacted from ~31 meshes to ~15: every rigid
  segment between joints is one vertex-coloured mesh, and every joint still moves.

  Post-processing: a threshold bloom over the whole frame. Fire, muzzle flashes,
  tracers, lasers, zombie eyes and the kiosk screen are pushed above 1.0 so only they
  bleed; the low-poly mid-tones do not. ?post=off removes it.

  Shader variants and the "random hiccup": this renderer compiles a separate shader for
  each combination of material settings it sees (transparent or not, vertex colours or
  not, emissive intensity zero or not, and so on), ~30ms each, on the frame it is first
  needed — and it THROWS THAT SHADER AWAY the moment the last material using it is
  disposed. So: a staged fight runs behind the start menu at load (canvas hidden) to
  compile everything a real fight uses, and nothing transient is ever disposed any more
  (severed limbs share the body's materials, leaves and shotgun shells are pooled, bodies
  are always recycled). If you add an effect later: pool its material, never dispose it,
  and add it to preRollFight() so it compiles at load.

  The ?debug=1 overlay now shows 'worst' (longest frame in the last window, in ms) and
  'hitch' (running count of frames over 50ms). Those are read from the raw wall clock,
  not from the simulation's dt, which is clamped. If stutter comes back, that counter is
  the thing to watch - and it tells me far more than 'it feels laggy' can.

URL switches
  ?debug=1         perf overlay (backend / FPS / worst frame / hitch count / draws / tris) + window.TT
  ?renderer=webgl  force the WebGL2 fallback (for A/B-ing a suspected WebGPU problem)
  ?sky=flat        skip the node-graph sky and use a plain coloured dome
  ?canopy=legacy   go back to one mesh per leaf blob
  ?water=cpu       go back to the CPU water wave (if the GPU wave looks wrong)
  ?foliage=legacy  go back to one mesh per grass tuft (no GPU sway)
  ?post=off        no bloom
  ?raf=timer       DEBUG ONLY: drive frames from a timer so the game keeps running in a
                   hidden/background tab (browsers stop requestAnimationFrame there)
  They combine, so ?renderer=webgl&sky=flat&canopy=legacy&water=cpu&foliage=legacy&post=off
  is the whole pre-WebGPU rendering path with the new gameplay on top.
  The Three.js version is one line at the top of index.html, in the import map.

Controls
  WASD / arrows  move, screen-relative (W is up the screen whichever way you aim)
                 Shift  run          Space  jump
  V              dodge roll (untouchable mid-roll, ~1s cooldown)
  C              crouch (hold) - slower, tighter shot groups, lower profile
                 (deliberately not Ctrl - see the note at the bottom about Ctrl+W)
  Mouse          aim anywhere, 360°. The marine turns to face the reticle; the camera does
                 NOT turn or pan with the aim (Project Zomboid-style, centred on the marine),
                 so nothing moves under the reticle when you move the mouse and shots land on
                 it. The reticle locks onto a zombie's body when it's over one, and above the
                 skyline it aims into the sky.
  Wheel          zoom the camera in / out: 6 m to 24 m from the marine (default 12 m). In
                 build mode it cycles builds; scoped, it dials the sniper's magnification.
                 1 / 2 are barricade / wall again.
  Auto tilt      the tilt is the terrain's job now, not the wheel's (Esc > Settings > Camera:
                 Off / Gentle / Strong, default Gentle). Ground rising ahead drops the camera
                 so you look up the hill (~39° facing a climb against ~50° on the flat), a
                 drop ahead raises it (~59°), and ground behind the camera lifts it over the
                 lip instead of hauling it in against the marine's back. Off gives the old
                 manual tilt back on middle-drag.
  Follow cursor  Esc > Settings > Camera (default on). The view slides toward where you point
                 once the cursor leaves the middle ~18% of the screen, capped at 3 m. It is a
                 pure pan - the heading and angle never change - and it is applied after the
                 camera's follow lerp rather than through it, which is what keeps it from
                 dragging the ground out from under a reticle you have just put on a zombie
                 (through the lerp that cost 2 shots in 12; after it, 16/16).
  Middle drag    rotate the camera (drag up/down also tilts, when auto tilt is Off). A middle
                 click without a drag cycles the sniper scope magnification: 2X / 4X / 6X.
  Look sens.     Esc > Settings > Look (0.25x - 3x): middle-drag speed, and how far the
                 sniper reticle throws while scoped.
  LMB            fire / hold for the chainsaw and flamethrower        RMB  zoom (real scope on the sniper)
  Q              cycle weapons R      reload      G  grenade      F  knife (left hand;
                 knife: 3.2m reach, 45 damage, 0.30s, ±87° arc - one-shots shamblers,
                 ferals, leapers, screamers, spitters and bombers, and sweeps a crowd;
                 the Machete from the kiosk's Upgrades tab replaces it: 3.8m reach,
                 85 damage, 0.40s, ±93° arc)
  H              use a medkit (bought at the kiosk, or a rare enemy drop heals on touch)
  E              the action key - whatever the prompt at the bottom of the screen says:
                   at the kiosk: open it (E or Esc closes it; time stops while it's open). Its
                   prep-only hours are switched off, so it trades mid-wave too.
                   at a mortar: man it. LMB lobs a shell at the reticle (dotted arc + landing
                   ring), E leaves it, T shoulders it to carry it (no weapons while carrying;
                   slower); LMB or E sets it down. You're rooted while manning it.
  B              build mode (1-9, 0, -: barricade / wall / sandbag / spikes / fuel drum / mine /
                 decoy beacon / light / flame / heavy / mortar - the barricade is free, the rest
                 need their blueprint first)
  T / X          repair / sell nearest build
  ~              dev console. Type "bigtex shooter" for unlimited cash ("broke" turns it back off).
  Enter          during prep: skip the countdown and start the wave now
  Volume         Music and SFX sliders under Esc > Settings (remembered between runs;
                 defaults 30% music / 80% SFX)
  Fullscreen     F11, or the toggle under Esc > Settings. Taken on the document root so
                 the HUD goes fullscreen with the canvas. Remembered between runs, and
                 re-entered when you pick a mode - a browser only grants fullscreen from
                 inside a click or keypress, so it can't be restored at load. Esc leaves
                 fullscreen (the browser's own handling) and that counts as turning it off.
  N              night vision  Z  laser sight   L  gun flashlight   M  mute   Esc  pause
                 (N / Z / L do nothing until the gear is bought at the kiosk; night vision needs
                 the helmet first - it mounts on the helmet rails)

Systems
  Loadout        you start with a pistol, a knife and $40. Everything else is bought at the kiosk:
                 the yellow terminal a few strides from the spawn clearing (yellow square on the map).
  Prep           2 minutes between waves (was 12 seconds), with a countdown under the clock at the
                 top of the screen: green, amber under 30s, red and pulsing under 10s. It reads
                 "grace period - clock held" while the opening no-zombie grace is still running.
                 Enter starts the wave immediately (ending the grace too). Esc > Settings >
                 "Skip prep time" makes every prep a 5-second countdown instead (remembered).
  Kiosk tabs     Weapons (one-time unlock, arrives loaded) - Ammo (spare rounds behind the magazine;
                 R reloads from them, and they're only sold here; chainsaw buys seconds of gas) -
                 Gear (NVG, laser, flashlight) - Upgrades (extended mags, +50%, except revolver and
                 launcher; bigger chainsaw tank; machete) - Perks - Blueprints (a build type
                 only appears in the B menu once its plans are bought; placing still costs per piece)
  Ammo HUD       "loaded / mag  ·  N spare". Out of spares mid-wave means out of ammo - plan for it.
  Health         regenerates slowly (after 5s without a hit) but only ever back up to 40% of max.
                 Past that you need a medkit: H uses a carried one (kiosk, $55, carry 3, heals 60%);
                 enemies rarely drop a medpack that heals 50% on touch (brutes and the colossus
                 are the best odds). Your own grenades hurt you, and so does brushing a burning
                 zombie - stand back, or roll.
  Cash drops     dropped money lasts 60 seconds. It pulses slowly, faster and faster as the clock
                 runs down, then shrinks away. Go and get it.
  Airdrops       rare now (every 4-7 minutes) and money only - a bounty for walking out to it.
  Defend mode    the cabin is 1.65x bigger with a health bar floating over the roof; no zombies
                 rise within ~100 ft of it, so the fight comes to you from outside the clearing.
  Horde pace     every zombie type runs 15% faster than it used to, and the Shambler another
                 25% on top (2.55 -> 3.19 m/s) - the fodder keeps up with you now.
  Horde size     every wave carries 10x the bodies. The extra nine tenths are all Shamblers:
                 the specialist counts are unchanged, just spread through a much longer
                 wave, so the horde grew without the field filling up with brutes. Day 7
                 goes 30 bodies to 300, still with 2 bombers / 4 brutes / 2 spiders /
                 2 spitters / 1 screamer. Spawn cadence is about 3.5 a second to match, and
                 MAX_ZOMBIES (how many stand on the field at once) went 36 -> 48. That
                 constant is the density knob if a machine can't hold it - see its comment
                 in index.html for what was measured and why the numbers are soft.
  Enemies        the construction worker is gone. New from day 2-3: Leapers (pale, run on all fours,
                 jump 5-14m onto you - sidestep the landing), the Drowned (fish-people that only ever
                 surface from the river; fast in the water, sluggish on land), and from day 4-5
                 Spiders (a pale zombie crawling on six human limbs - two pairs of arms and its
                 legs - with its head out front; hang back at 7-15m and shoot webbing that slows you - kill them
                 first). Bombers are fat now: bigger belly, bigger blast radius, and 20%
                 quicker (3.6 -> 4.32 m/s) before their close-range sprint. Spitters no
                 longer throw acid - lobbing things is the spider's job - they walk in and
                 then crawl the last 15m at a quarter speed.
  Armor          the marine starts in a field cap, shirt and H-harness chest rig. Helmet ($70, +25), Plate carrier ($120, +50)
                 and Knee & elbow pads ($50, +15) are bought in the kiosk's Gear tab; each one appears on
                 the model when bought and adds to the ARMOR bar under health. Armor soaks 65% of
                 every hit while it lasts (sparks instead of blood), is repaired at the kiosk
                 ("Repair armor") and comes back to full at the start of each day. Pads also get
                 you up from a dodge roll sooner. The NVG mount, helmet, vest and pads are all
                 hidden on the marine until owned.
  Music          assets/soundtrack/ is a mood-driven score (see below): a menu theme, three day
                 tracks, two night tracks, five fight tracks, two blood-moon/colossus tracks and
                 two endings. The game crossfades between them on wave start / day cleared /
                 nightfall, never repeats a track back to back, and breathes for a few seconds
                 between calm tracks. Music ducks when you're near death, in the shop or paused.
  Ambience       wind through the trees (louder in the forest, gusting), the river when you're
                 near it, birds by day, crickets and owls at night, thunder in the rain, and a
                 far-off groan now and then after dark. Gunshots and explosions run through a
                 short outdoor reverb so they roll off the treeline instead of stopping dead.
  Sprint FOV     the camera opens up ~5 degrees at a flat sprint; grass bends away from you and
                 from the nearest few zombies (GPU, no CPU cost).
  Knockdowns     an explosion floors anything short of a colossus; a point-blank shotgun blast
                 floors the small types. They topple, lie helpless a moment, and get back up.
                 Brutes only go down to explosives. Can't be chained (cooldown).
  Felled trees   a tree you chop or shoot down falls with real weight: it accelerates, hits
                 the ground with a thump, crushes anything under the trunk (you included -
                 watch where they fall), and lies there for ~20 s before sinking away.
  Kill streaks   chain kills within 2.6 s: 5 / 10 / 20 / 30 in a row pay x1.5 / x2 / x3 / x4 cash
  Headshots      bullets in the top of the body do bonus damage and usually take the head off
  Perks          Vitality, Stopping power, Quick hands, Fleet foot, Scavenger, Grenadier - 5 ranks each
                 (kiosk, Perks tab)
  Blood Moon     every 4th day: red sky, faster horde, x1.5 cash
  Bombers        from day 5: glowing gut, sprint and detonate on contact; chain-react with other zombies
  Build menu     fuel drums are a blueprint now (no more map dressing) - place one, shoot it with the
                 pack beside it, stand back; they chain. Mines go off under the first zombie on them.
                 Decoy beacon: 20s of flashing and screaming that the horde chases instead of you
                 (the colossus ignores it). Sandbags: cheap low cover. Mortar: see controls - shells
                 are sold under Ammo.
  Flamethrower   kiosk weapon ($210). Hold to hose fire; fuel tanks are the ammo (60 units, ~10s of
                 flame; "bigger tank" upgrade +50%). The fire is a stream of burning fuel blobs
                 (~72/s): they leave the nozzle at ~17 m/s plus your own speed, slow under drag,
                 sag while liquid and rise as they burn, turning white-hot > orange > red > smoke.
                 Reach is about 7 m. The nozzle follows your aim but is held between ~7° down
                 and ~34° up, so aiming at your own boots still throws the fire out ahead of you
                 (and spray-back never lights the ground within 1.8 m of you). Blobs splash and
                 spread along the ground and light it (the
                 ground keeps burning for a few seconds - it burns you too), hiss out to steam on
                 water, and cling to zombies they hit, igniting them. A body in front shields the
                 ones behind; burning zombies still light whatever they're pressed against.
                 Damage per zombie is capped at one hit per weapon tick (the old cone's rate).
                 Nozzle flare, a firelight on the surroundings and a faint rumble while firing.
  Minimap        north-up, east on the right - the same handedness as the view (it used to be
                 mirrored, so the arrow turned the opposite way to the camera). White arrow:
                 where you face; pale wedge: what the camera shows; zombies: big red dots that
                 flash (~2 Hz) with a glow behind them (the colossus larger); yellow square:
                 kiosk; cyan: your builds; red arcs
                 on the rim: where the wave is coming from.
  Defend mode    the base is a log cabin that smokes and loses its window boards as it takes damage
  Weapon holds   every gun has a proper two-handed hold (WEAPON_HOLD in index.html): rifles
                 and the shotgun shouldered with the stock butt at the shoulder and the support
                 hand ahead of the mag / on the pump, pistols held out two-handed, the minigun,
                 flamethrower and chainsaw braced at the hip. The gun is placed with its grip at
                 the hold, pointed at the reticle, and both arms are solved onto it with a
                 two-bone IK, with a bladed torso twist for the long guns so the support arm
                 can reach. On a reload the support hand goes foregrip > mag well > belt
                 pouch > mag well > foregrip.
  No look-ahead  the camera stays centred on the marine. Every version that leaned the view
                 toward the cursor slid the world under the reticle the moment you moved it
                 onto a target - measured, two shots in three missed a zombie the reticle had
                 just been put on. Scroll the wheel up to see farther instead.
  Sniper scope   RMB with the sniper out drops to a true first-person scope view (vignette +
                 mil-dot reticle, your own body hidden) instead of just zooming the third-person
                 camera in. A middle click cycles 2X/4X/6X magnification. Mouse sensitivity is damped heavily
                 while scoped (a lot more so at higher magnification), and on top of that the
                 reticle now eases onto where you're pointing instead of snapping straight there,
                 so it actually has some weight - small hand movements settle instead of sending
                 the crosshair flying, and 6X in particular is deliberately slow and heavy. Nudge
                 the mouse a little to track a target; push it further toward the edge of the
                 screen to swing further

Assets
  assets/soundtrack/*.mp3   the score the game plays (15 tracks, 44.1 kHz stereo, 160 kbps).
                            Generated by tools/compose.py + tools/synth.py (numpy/scipy): real
                            song forms (intro / verse / chorus / breakdown / climax / outro),
                            chord progressions per key, motif-based lead lines, synth pads, bass,
                            arps, plucked strings, drums, delay and reverb. Re-render with
                            `python3 tools/compose.py assets/soundtrack` then encode with ffmpeg.
                              menu_treeline            72 BPM  D dorian    title screen
                              day_morning_watch        96 BPM  G dorian    day prep
                              day_riverside           104 BPM  A mixolyd.  day prep
                              day_open_ground          92 BPM  E minor     day prep
                              night_lanterns           80 BPM  A phrygian  night prep
                              night_embers             84 BPM  G minor     night prep
                              fight_breach            128 BPM  E minor     waves
                              fight_run_the_line      140 BPM  A minor     waves
                              fight_teeth             150 BPM  C phrygian  waves
                              fight_ash_wind          118 BPM  D aeolian b5 waves
                              fight_wire              132 BPM  F# harm.min waves
                              boss_red_sky            100 BPM  C minor     blood moon / colossus
                              boss_colossus            90 BPM  Bb phrygian blood moon / colossus
                              end_fallen               66 BPM  A minor     game over
                              end_dawn                 84 BPM  G major     victory
  assets/music/*.mp3        the old chiptune pack. No longer referenced by the game - safe to delete.
  assets/UAL1_Standard.glb  Quaternius Universal Animation Library (CC0) - currently unused; all
                            characters are built and animated procedurally in index.html

Note on Ctrl+W
  Crouch used to be bound to Ctrl, which meant holding Ctrl+W (crouch-walk forward) collided
  with the browser's own "close this tab" shortcut. That one's not fixable from the page's own
  code - Ctrl+W (along with a handful of others like Ctrl+N/Ctrl+T) is a reserved shortcut that
  browsers deliberately don't let any web page override, even with preventDefault(). Crouch is
  now on C instead, which has no such conflict.
