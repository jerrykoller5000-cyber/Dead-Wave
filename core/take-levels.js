// core/take-levels.js — CL-161: the loudness (RMS over the part that sounds) each folder of Jerry's takes is evened to.
// One-shots: what the game's own synthesized sound measured at the same place in the mix (the camera, levelDbg), so a
// recording comes in where the sound it replaces sat. Beds (the loops): 0.05, and audio.js's BED_K sets their level.
// A folder not listed takes its group's default (core/takes.js TARGET_RMS). Jerry's knob is z-sounds/levels.json.
// measured (CL-161, the synth through levelDbg in Chromium) unless marked ~ (no synth there: set by its neighbours)
export const TAKE_LEVELS = {
  'below/drip': 0.006,   // ~
  'below/rock-groan': 0.0139,
  'builds/door-close': 0.0219,
  'builds/door-open': 0.0077,
  'builds/invalid': 0.024,
  'builds/mine-beep': 0.0356,
  'builds/place-metal': 0.0112,
  'builds/place-sandbag': 0.0314,
  'builds/place-turret': 0.0249,
  'builds/place-wire': 0.0059,
  'builds/place-wood': 0.0272,
  'builds/repair': 0.0267,
  'builds/sell': 0.0238,
  'builds/spike-snap': 0.0332,
  'builds/stairs-fold': 0.0134,
  'builds/upgrade': 0.025,   // ~
  'bullet-impacts/dirt': 0.0093,
  'bullet-impacts/leaves': 0.0034,
  'bullet-impacts/metal': 0.025,
  'bullet-impacts/ricochet': 0.012,   // ~
  'bullet-impacts/rock': 0.0098,
  'bullet-impacts/sand': 0.0064,
  'bullet-impacts/water': 0.0063,
  'bullet-impacts/whiz': 0.01,   // ~
  'bullet-impacts/wood': 0.0198,
  'hq/alarm-klaxon': 0.082,
  'hq/alarm-rumble': 0.0956,
  'hq/armory-bench': 0.015,   // ~
  'hq/bag-throw': 0.0068,
  'hq/cash': 0.0248,
  'hq/cif-locker': 0.012,   // ~
  'hq/crate-land': 0.0317,
  'hq/flare-burst': 0.0348,
  'hq/flare-launch': 0.0138,
  'hq/hq-ding': 0.0392,
  'hq/hq-machine': 0.0177,
  'hq/kiosk-buy': 0.0203,
  'hq/kiosk-shutter-close': 0.0117,
  'hq/kiosk-shutter-open': 0.0102,
  'hq/kiosk-tab': 0.0115,
  'hq/pickup': 0.0283,
  'hq/radio-call': 0.015,   // ~
  'hq/radio-off': 0.012,   // ~
  'hq/skull-pickup': 0.0149,
  'player/armor-don': 0.0108,
  'player/armor-hit': 0.0271,
  'player/breath-tired': 0.0037,
  'player/burial-chisel': 0.0162,
  'player/burial-dig': 0.0195,
  'player/burial-heave': 0.0072,
  'player/chute-land': 0.012,   // ~
  'player/death': 0.025,   // ~
  'player/dodge-roll': 0.0058,
  'player/flashlight-click': 0.0255,
  'player/footstep-dirt': 0.0022,
  'player/footstep-run-dirt': 0.003,
  'player/footstep-tile': 0.012,   // ~
  'player/footstep-water': 0.0025,
  'player/footstep-wood': 0.0142,
  'player/grenade-throw': 0.0064,
  'player/heartbeat-low': 0.0387,
  'player/hurt': 0.0193,
  'player/hurt-heavy': 0.025,   // ~
  'player/jump': 0.0194,
  'player/ladder-climb': 0.008,   // ~
  'player/land': 0.012,   // ~
  'player/medkit': 0.0135,
  'player/medpen': 0.0156,
  'player/nvg-off': 0.0108,
  'player/nvg-on': 0.0122,
  'player/swim-stroke': 0.006,   // ~
  'player/vault': 0.008,   // ~
  'story/camera': 0.015,   // ~ CL-272: like the paper, a small thing in his hands
  'story/hush-dying': 0.0089,
  'story/paper': 0.012,   // ~ CL-272: paperRustle's two hisses
  'story/relay-clunk': 0.04,   // ~ CL-272: relayClunk's low thump
  'story/vault-door': 0.035,   // ~ CL-272: vaultDoor's bolts and drone
  'training/alarm': 0.069,
  'training/clear-all': 0.025,   // ~
  'training/gate-open': 0.03,   // ~
  'training/infirmary-wake': 0.025,   // ~
  'training/light-switch': 0.02,   // ~
  'training/panel-beep': 0.02,   // ~
  'training/panel-enter': 0.02,   // ~ CL-272: the way in, like the panel's beep
  'training/target-fall': 0.03,   // ~
  'training/target-hit': 0.04,   // ~
  'training/target-rise': 0.02,   // ~
  'training/wall-impact': 0.03,   // ~
  'turrets/heavy-turret-shot': 0.0268,
  'turrets/light-turret-shot': 0.0344,
  'turrets/machine-gun-mount': 0.012,   // ~
  'turrets/mortar-dismount': 0.01,   // ~
  'turrets/mortar-incoming': 0.03,   // ~
  'turrets/mortar-mount': 0.012,   // ~
  'turrets/mortar-round-drop': 0.012,   // ~
  'turrets/servo': 0.012,   // ~
  'ui/back': 0.012,   // ~
  'ui/panel-deny': 0.025,   // ~ CL-272: relayKey(false)'s low square
  'ui/panel-key': 0.014,   // ~ CL-272: relayKey's click
  'ui/panel-open': 0.02,   // ~ CL-272: relayOpen's two chimes
  'ui/reset-blip': 0.025,   // ~ CL-272: resetBlip's two squares
  'ui/click': 0.012,   // ~
  'ui/day-cleared': 0.0177,
  'ui/expand': 0.0226,
  'ui/game-over': 0.022,
  'ui/hover': 0.006,   // ~
  'ui/map-close': 0.014,   // ~
  'ui/map-open': 0.014,   // ~
  'ui/objective': 0.025,   // ~
  'ui/streak': 0.0204,
  'ui/victory': 0.0303,
  'ui/wave-start': 0.041,
  'vehicles/cargo-plane-flyover': 0.0283,
  'vehicles/chute-open': 0.0172,
  'vehicles/floatplane-approach': 0.03,   // ~
  'vehicles/floatplane-landing': 0.03,   // ~
  'vehicles/floatplane-takeoff': 0.03,   // ~
  'weapon-foley/belt-feed': 0.0046,
  'weapon-foley/bolt-cycle': 0.0067,
  'weapon-foley/brass': 0.0016,
  'weapon-foley/brass-concrete': 0.0016,   // ~
  'weapon-foley/chainsaw-cut': 0.0093,
  'weapon-foley/chainsaw-dry-pull': 0.0143,
  'weapon-foley/chainsaw-rev': 0.015,   // ~
  'weapon-foley/chainsaw-start': 0.0151,
  'weapon-foley/chainsaw-stop': 0.014,
  'weapon-foley/charging-handle': 0.0142,
  'weapon-foley/cylinder-open': 0.0157,
  'weapon-foley/cylinder-spin': 0.0047,
  'weapon-foley/drum-in': 0.009,
  'weapon-foley/drum-out': 0.0094,
  'weapon-foley/dry-fire': 0.0073,
  'weapon-foley/grenade-bounce': 0.0078,
  'weapon-foley/grenade-pin': 0.005,
  'weapon-foley/knife-hit': 0.0207,
  'weapon-foley/knife-swing': 0.015,
  'weapon-foley/launcher-open': 0.0215,
  'weapon-foley/launcher-shell': 0.0064,
  'weapon-foley/machete-chop': 0.0284,
  'weapon-foley/machete-swing': 0.0112,
  'weapon-foley/mag-drop': 0.0109,
  'weapon-foley/mag-in': 0.01,
  'weapon-foley/mag-out': 0.0104,
  'weapon-foley/mag-release': 0.0173,
  'weapon-foley/mag-slap': 0.0119,
  'weapon-foley/pump-back': 0.0112,
  'weapon-foley/pump-forward': 0.0112,   // ~
  'weapon-foley/shell-insert': 0.0093,
  'weapon-foley/slide-back': 0.0086,
  'weapon-foley/slide-forward': 0.0051,
  'weapon-foley/weapon-switch': 0.0105,
  'weapon-foley/wheel-tick': 0.009,
  'weapons/auto-shotgun': 0.0307,
  'weapons/carbine': 0.03,
  'weapons/carbine-suppressed': 0.025,
  'weapons/explosion': 0.0385,
  'weapons/grenade-launcher': 0.0347,
  'weapons/machine-gun-shot': 0.032,
  'weapons/mortar-launch': 0.0368,
  'weapons/pistol': 0.0269,
  'weapons/pistol-suppressed': 0.0212,
  'weapons/revolver': 0.0321,
  'weapons/rifle': 0.0325,
  'weapons/rotary-spin-end': 0.012,   // ~
  'weapons/shotgun': 0.0332,
  'weapons/smg': 0.0432,
  'weapons/sniper': 0.0306,
  'world/barrel-explode': 0.0405,
  'world/big-splash': 0.0267,
  'world/birds-day': 0.0037,
  'world/chapel-choir': 0.0171,
  'world/heavenly-choir': 0.0157,
  'world/holy-blast': 0.0372,
  'world/lightning-strike': 0.037,
  'world/owl': 0.0058,
  'world/pit-rumble': 0.0816,
  'world/rabbit-screech': 0.0109,
  'world/rock-break': 0.0247,
  'world/surface-gasp': 0.0079,
  'world/thunder': 0.0243,
  'world/tree-crown-fire': 0.0072,
  'world/tree-fall': 0.0117,
  'world/tree-thud': 0.0181,
  // the beds
  'below/warren-ambience': 0.05,
  'builds/lure': 0.05,
  'hq/generator': 0.05,
  'player/nvg-hum': 0.05,
  'story/hush-hum': 0.05,
  'story/rune-door-hum': 0.05,
  'story/the-tone': 0.05,
  'training/ventilation': 0.05,
  'vehicles/cargo-plane-interior': 0.05,
  'vehicles/floatplane-idle': 0.05,
  'weapon-foley/chainsaw-idle': 0.05,
  'weapons/flamethrower': 0.05,
  'weapons/rotary-gun-loop': 0.05,
  'weapons/rotary-spin-loop': 0.05,
  'world/campfire': 0.05,
  'world/cave-mouth': 0.05,
  'world/crickets-night': 0.05,
  'world/fire-burning': 0.05,
  'world/fog-wind': 0.05,
  'world/frogs-night': 0.05,
  'world/graveyard-ambience': 0.05,
  'world/lake-shore': 0.05,
  'world/rain': 0.05,
  'world/river': 0.05,
  'world/underwater': 0.05,
  'world/wind-day': 0.05,
  'world/wind-night': 0.05,
};
// The beds (looping takes): loaded two takes at most.
export const BEDS = Object.freeze(["below/warren-ambience", "builds/lure", "hq/generator", "player/nvg-hum", "story/hush-hum", "story/rune-door-hum", "story/the-tone", "training/ventilation", "vehicles/cargo-plane-interior", "vehicles/floatplane-idle", "weapon-foley/chainsaw-idle", "weapons/flamethrower", "weapons/rotary-gun-loop", "weapons/rotary-spin-loop", "world/campfire", "world/cave-mouth", "world/crickets-night", "world/fire-burning", "world/fog-wind", "world/frogs-night", "world/graveyard-ambience", "world/lake-shore", "world/rain", "world/river", "world/underwater", "world/wind-day", "world/wind-night"]);
