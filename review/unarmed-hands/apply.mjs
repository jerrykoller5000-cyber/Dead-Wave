import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {improveHand, improveIndex} from './changes.mjs';

// Run only after Claude approves ownership or Jerry explicitly overrides it,
// and after the live file parts are reserved through crew.mjs in.
if (!process.argv.includes('--apply-approved')) throw new Error('Live application requires explicit ownership approval.');
const sha = text => createHash('sha256').update(text).digest('hex');
const names = ['index.html', 'studio/marine-hand.js'];
const before = names.map(name => fs.readFileSync(name, 'utf8'));
const after = [improveIndex(before[0]), improveHand(before[1])];
for (let i = 0; i < names.length; i++)
  if (sha(fs.readFileSync(names[i], 'utf8')) !== sha(before[i])) throw new Error('Concurrent edit: ' + names[i]);
for (let i = 0; i < names.length; i++) {
  if (sha(fs.readFileSync(names[i], 'utf8')) !== sha(before[i])) throw new Error('Concurrent edit: ' + names[i]);
  fs.writeFileSync(names[i], after[i], 'utf8');
}
fs.writeFileSync('review/unarmed-hands/live-sources.json', JSON.stringify({at: new Date().toISOString(),
  files: names.map((name, i) => ({name, before: sha(before[i]), after: sha(after[i])}))}, null, 2) + '\n', 'utf8');
console.log('Applied focused hand closure, wrist easing and walk/run elbow easing.');
