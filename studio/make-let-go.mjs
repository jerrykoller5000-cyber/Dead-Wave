// studio/make-let-go.mjs — CL-81: the review scene for the kick-free's let-go, made from the game's own scene.
//
//   node studio/make-let-go.mjs [at]      at: seconds into the haul the kick lands (default 3.4)
//
// The let-go is a branch of studio/scenes/guardian-grab-drag.json ("branches.letGo"): the game takes it on the last
// E press, whenever that comes. A review render needs it at a set time, so this writes guardian-let-go.json: the same
// scene with "autoBranch" at that time and its length run on to the branch's end. Edit the branch in
// guardian-grab-drag.json, then run this and render: node tools/studio.mjs scene studio/scenes/guardian-let-go.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scenes');
const at = Number(process.argv[2] || 3.4);
const src = JSON.parse(fs.readFileSync(path.join(DIR, 'guardian-grab-drag.json'), 'utf8'));
const b = src.branches && src.branches.letGo;
if (!b) throw new Error('guardian-grab-drag.json has no branches.letGo');
const r = JSON.parse(JSON.stringify(src));
r.name = 'guardian-let-go';
r.task = 'CL-81';
r.notes = "CL-81 (P-68), for review only: made from guardian-grab-drag.json by studio/make-let-go.mjs (don't edit by hand)." +
  ' The run-out grab and the haul, then the kick-free\'s let-go branch taken ' + at + ' s in, as the game takes it on the last E.';
r.autoBranch = { name: 'letGo', at };
r.length = Math.round((at + b.length) * 1000) / 1000;
fs.writeFileSync(path.join(DIR, 'guardian-let-go.json'), JSON.stringify(r, null, 2) + '\n');
console.log('wrote studio/scenes/guardian-let-go.json (the let-go at ' + at + ' s, ' + r.length + ' s long)');
