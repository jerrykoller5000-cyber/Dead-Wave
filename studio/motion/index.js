// studio/motion/index.js — every motion preset, by "rig/name" (D-42). Claude's.
// Presets are data (studio/motion/<rig>/<name>.json); they're listed here so the game, the scene
// renderer and the motion lab find them without a fetch. A new preset is a new file plus one line.
import shambler from './zombie/shambler.json' with { type: 'json' };
import feral from './zombie/feral.json' with { type: 'json' };
import brute from './zombie/brute.json' with { type: 'json' };
import marine from './marine/marine.json' with { type: 'json' };

const ALL = { 'zombie/shambler': shambler, 'zombie/feral': feral, 'zombie/brute': brute, 'marine/marine': marine };
export const presets = {
  names: () => Object.keys(ALL),
  json: (ref) => ALL[ref] || null
};
