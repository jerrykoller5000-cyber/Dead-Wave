// studio/node-three.mjs — lets Node load the studio and the rigs with real three.js maths, for
// the bake scripts and the unit tests (the game and the renderer get three from the import map):
//   node --import ./studio/node-three.mjs studio/bake-guardian.mjs
//   node --import ./studio/node-three.mjs --test studio/
import { register } from 'node:module';
register(new URL('./node-three-hook.mjs', import.meta.url));
