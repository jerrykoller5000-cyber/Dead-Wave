// studio/models/index.js — every model, by "kind/name" (docs/studio.md §11). Claude's.
// Models are data (studio/models/<kind>/<name>.json); they're listed here so the game, the rigs and
// the pages find them without a fetch. A new model is a new file plus one line.
import fuelDrum from './prop/fuel-drum.json' with { type: 'json' };
import evacBoat from './prop/evac-boat.json' with { type: 'json' };
import spider from './creature/spider.json' with { type: 'json' };
import zombie from './creature/zombie.json' with { type: 'json' };

const ALL = {
  'prop/fuel-drum': fuelDrum,
  'prop/evac-boat': evacBoat,
  'creature/spider': spider,
  'creature/zombie': zombie
};
export const models = {
  names: () => Object.keys(ALL),
  json: (ref) => ALL[ref] || null,
  // The models that name a rig to register as (studio/rigs.js registers each one).
  rigs: () => Object.keys(ALL).filter((ref) => typeof ALL[ref].rig === 'string')
};
