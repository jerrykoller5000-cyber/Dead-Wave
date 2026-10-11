import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {improveHand, improveIndex} from './changes.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const sha = text => createHash('sha256').update(text).digest('hex');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hand = fs.readFileSync(path.join(root, 'studio/marine-hand.js'), 'utf8');
const previews = [
  ['before-hand.js', hand.replace("'../core/geometry.js'", "'../../core/geometry.js'")],
  ['after-hand.js', improveHand(hand).replace("'../core/geometry.js'", "'../../core/geometry.js'")],
  ['before.html', index.replace('<head>', '<head>\n<base href="../../">').replace("'./studio/marine-hand.js'", "'./review/unarmed-hands/before-hand.js'")],
  ['after.html', improveIndex(index).replace('<head>', '<head>\n<base href="../../">').replace("'./studio/marine-hand.js'", "'./review/unarmed-hands/after-hand.js'")]
];
if (sha(fs.readFileSync(path.join(root, 'index.html'))) !== sha(index) ||
    sha(fs.readFileSync(path.join(root, 'studio/marine-hand.js'))) !== sha(hand)) throw Error('Source changed during preparation');
for (const [name, text] of previews) fs.writeFileSync(path.join(here, name), text, 'utf8');
fs.writeFileSync(path.join(here, 'sources.json'), JSON.stringify({at: new Date().toISOString(),
  index: sha(index), hand: sha(hand), proposedIndex: sha(improveIndex(index)), proposedHand: sha(improveHand(hand))}, null, 2) + '\n');
console.log('Isolated before/after prepared; production files unchanged.');
