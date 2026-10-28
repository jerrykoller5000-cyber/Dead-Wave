// tools/zsounds-index.mjs — CL-148: write z-sounds/index.json, the list of Jerry's recorded zombie takes, for a copy
// of the game served by something other than tools/serve.py or tools/serve.mjs (they answer /__zsounds live). The
// game reads /__zsounds first and this file second (core/takes.js). Usage: node tools/zsounds-index.mjs
// CL-272 (D-94): the takes made from his sound packs (pk-*, git-ignored) go in z-sounds/index-packs.json (git-ignored
// too) instead, so the committed index never names a file a clone doesn't have. The game reads both.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listZSounds } from './serve.mjs';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const all = listZSounds(root);
const isPack = (f) => /^pk-/i.test(f.split('/').pop());
const files = all.filter((f) => !isPack(f)), packs = all.filter(isPack);
fs.writeFileSync(path.join(root, 'z-sounds', 'index.json'), JSON.stringify({ root: 'z-sounds', files }, null, 1) + '\n');
fs.writeFileSync(path.join(root, 'z-sounds', 'index-packs.json'), JSON.stringify({ root: 'z-sounds', files: packs }, null, 1) + '\n');
console.log(`z-sounds/index.json: ${files.length} takes; z-sounds/index-packs.json: ${packs.length} from the packs`);
