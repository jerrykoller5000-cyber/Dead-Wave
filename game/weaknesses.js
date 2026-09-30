// D-62, CL-91: share of a hit each fightable kind takes by damage type.
// The mouth guardian is invulnerable and deliberately absent. GB-104 consumes
// this same table in combat; UI reads COUNTER to describe its tradeoffs.
const rows = {
  brute:    { bullet: 0.45, pellet: 0.45, fire: 0.9,  blast: 0.9,  blade: 0.45, crush: 0.9,  burn: 1.0 },
  shambler: { bullet: 1,    pellet: 1,    fire: 1,    blast: 1,    blade: 1.5,  crush: 0.6 },
  feral:    { bullet: 1,    pellet: 1.4,  fire: 1,    blast: 0.6,  blade: 1,    crush: 1 },
  leaper:   { bullet: 1.3,  pellet: 1,    fire: 1,    blast: 1,    blade: 0.6,  crush: 1 },
  spider:   { bullet: 0.7,  pellet: 1.1,  fire: 1.6,  blast: 0.92, blade: 0.92, crush: 0.92 },
  drowned:  { bullet: 0.96, pellet: 1.3,  fire: 0.4,  blast: 0.96, blade: 0.96, crush: 0.96 },
  military: { bullet: 0.7,  pellet: 0.88, fire: 0.88, blast: 1.4,  blade: 0.88, crush: 0.88 },
  spitter:  { bullet: 1.3,  pellet: 1,    fire: 1,    blast: 1,    blade: 0.6,  crush: 1 },
  screamer: { bullet: 1.4,  pellet: 0.6,  fire: 1,    blast: 1,    blade: 1,    crush: 1 },
  bomber:   { bullet: 1,    pellet: 1,    fire: 1.5,  blast: 1,    blade: 0.5,  crush: 1 },
  demon:    { bullet: 1.2,  pellet: 0.82, fire: 0.2,  blast: 0.82, blade: 0.7,  crush: 0.82 },
  colossus: { bullet: 0.5,  pellet: 0.68, fire: 0.68, blast: 1.3,  blade: 0.68, crush: 0.68 },
  guardian: { bullet: 0.6,  pellet: 0.7,  fire: 1.4,  blast: 0.7,  blade: 0.7,  crush: 0.7 }
};
export const WEAKNESS = Object.freeze(Object.fromEntries(
  Object.entries(rows).map(([kind, values]) => [kind, Object.freeze(values)])
));

// [best answer, worst answer] for each kind, matching docs/weaknesses.md.
const counters = {
  brute: ['blast', 'bullet'], shambler: ['blade', 'crush'], feral: ['pellet', 'blast'],
  leaper: ['bullet', 'blade'], spider: ['fire', 'bullet'], drowned: ['pellet', 'fire'],
  military: ['blast', 'bullet'], spitter: ['bullet', 'blade'], screamer: ['bullet', 'pellet'],
  bomber: ['fire', 'blade'], demon: ['bullet', 'fire'], colossus: ['blast', 'bullet'],
  guardian: ['fire', 'bullet']
};
export const COUNTER = Object.freeze(Object.fromEntries(
  Object.entries(counters).map(([kind, pair]) => [kind, Object.freeze(pair)])
));
