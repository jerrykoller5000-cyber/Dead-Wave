import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parsePrompts, makePlan} from './batch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../Claude outputs/PROMPTS-3.md');
const text = fs.readFileSync(source, 'utf8');
const manifest = parsePrompts(text, 'Claude outputs/PROMPTS-3.md');
const catalogue = JSON.parse(fs.readFileSync(path.resolve(here, '../../z-sounds/manifest-3.json'), 'utf8'));
assert.equal(manifest.sounds.length, 84);
assert.equal(manifest.sounds.filter(s => s.priority).length, 20);
assert.deepEqual(manifest.sounds.map(s => [s.n, s.folder, s.prompt, s.requestedSeconds, s.loop, s.priority, s.status]),
  catalogue.sounds.map(s => [s.n, s.folder, s.prompt, s.seconds, s.loop, s.start, s.status]));
assert.equal(fs.readFileSync(source, 'utf8'), text, 'Source changed during preparation.');
const plan = makePlan(manifest);
// Only batch 3's plan is refreshed; paid receipts and both batches' audio stay intact.
for (const [name, data] of [['manifest-3.json', manifest], ['plan-3.json', plan]])
  fs.writeFileSync(path.join(here, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({categories: new Set(manifest.sounds.map(s => s.folder.split('/')[0])).size,
  priorities: manifest.sounds.filter(s => s.priority).length, ...plan.summary}, null, 2));
