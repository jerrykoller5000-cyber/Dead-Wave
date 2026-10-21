// tools/zsounds-index.mjs — CL-148: write z-sounds/index.json, the list of Jerry's recorded zombie takes, for a copy
// of the game served by something other than tools/serve.py or tools/serve.mjs (they answer /__zsounds live). The
// game reads /__zsounds first and this file second (core/takes.js). Usage: node tools/zsounds-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listZSounds } from './serve.mjs';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const files = listZSounds(root);
fs.writeFileSync(path.join(root, 'z-sounds', 'index.json'), JSON.stringify({ root: 'z-sounds', files }, null, 1) + '\n');
console.log(`z-sounds/index.json: ${files.length} takes`);
