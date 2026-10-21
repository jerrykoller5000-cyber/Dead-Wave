import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parsePrompts, makePlan} from './batch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../Claude outputs/PROMPTS-2.md');
const text = fs.readFileSync(source, 'utf8');
const manifest = parsePrompts(text, 'Claude outputs/PROMPTS-2.md');
// Independent existing catalogue cross-check; it never overrides Jerry's attached source.
const catalogue = JSON.parse(fs.readFileSync(path.resolve(here, '../../z-sounds/manifest-2.json'), 'utf8'));
assert.equal(manifest.sounds.length, 179);
assert.deepEqual(manifest.sounds.map(s => [s.n, s.folder, s.prompt, s.requestedSeconds, s.loop, s.priority]),
  catalogue.sounds.map(s => [s.n, s.folder, s.prompt, s.seconds, s.loop, s.start]));
assert.equal(fs.readFileSync(source, 'utf8'), text, 'Source changed during preparation.');
fs.writeFileSync(path.join(here, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
const plan = makePlan(manifest);
fs.writeFileSync(path.join(here, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({sounds: manifest.sounds.length, categories: new Set(manifest.sounds.map(s => s.folder.split('/')[0])).size,
  priorities: manifest.sounds.filter(s => s.priority).length, ...plan.summary}, null, 2));
