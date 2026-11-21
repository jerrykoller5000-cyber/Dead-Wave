// tools/placement-audit/no-bake.js — CF-19: world/bake.js with the merging off, for the placement audit only (run.mjs
// maps /world/bake.js here through the test page's import map). Every prop keeps its own mesh and name, so a hit says
// which prop it is. The game itself never loads this file.
export function bakeStatic() { return { merged: 0, removed: 0 }; }
export function foldStatic() { return { folded: 0, removed: 0 }; }
