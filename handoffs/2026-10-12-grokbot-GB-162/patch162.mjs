import fs from 'node:fs';
const f = 'world/training.js', before = fs.readFileSync(f); let s = before.toString('utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('anchor x' + n + ': ' + a.slice(0, 80)); s = s.replace(a, b); };
rep("import { dressTrainingWear } from './training-wear.js';   // GB-159\n", "import { dressTrainingWear } from './training-wear.js';   // GB-159\nimport { dressBuildWear } from './training-build-wear.js';   // GB-162\n");
rep("  const wear = dressTrainingWear(T, { R, B, bedAt, add, box, std, lampMat, root: g,\n    texture: (w, h, draw) => keep(canvasTex(T, w, h, draw)) });\n",
    "  const wear = dressTrainingWear(T, { R, B, bedAt, add, box, std, lampMat, root: g,\n    texture: (w, h, draw) => keep(canvasTex(T, w, h, draw)) });\n  // GB-162 (Jerry): the build room's history: minigun holes, old blood, acid, burns, webs (world/training-build-wear.js).\n  const buildWear = dressBuildWear(T, { B, D, gate, add, std, texture: (w, h, draw) => keep(canvasTex(T, w, h, draw)) });\n");
rep("...wear.decals, ...wear.dead, wear.flicker]);", "...wear.decals, ...wear.dead, wear.flicker, ...buildWear.decals]);");
rep("    keepOut,   // GB-161\n", "    keepOut,   // GB-161\n    buildWear: { parts: buildWear.parts, mounts: buildWear.mounts },   // GB-162\n");
if (!fs.readFileSync(f).equals(before)) throw new Error('changed underneath');
fs.writeFileSync(f, s, 'utf8'); console.log('patched');
