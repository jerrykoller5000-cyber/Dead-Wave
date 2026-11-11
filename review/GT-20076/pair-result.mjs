import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [model,beforePhase,afterPhase,...pairNumbers] = process.argv.slice(2);
assert(/^[a-z0-9]+$/.test(model) && [beforePhase,afterPhase].every(s => /^catalog-[a-z0-9-]+$/.test(s)));
assert(pairNumbers.length && pairNumbers.every(s => /^\d+$/.test(s)));
const read = async phase => JSON.parse(await readFile(new URL('./'+phase+'/audit.json',import.meta.url),'utf8'))[model];
const before = await read(beforePhase), after = await read(afterPhase);
const raw = subject => subject.rawOverlaps || subject.overlaps;
const key = pair => [pair.a,pair.b].sort().join(' | ');
const original = new Set(raw(before).map(key)), current = new Set(raw(after).map(key));
for (const index of pairNumbers) {
  const oldPair = raw(before)[Number(index)];
  assert(oldPair,'No such original pair '+index);
  assert(!current.has(key(oldPair)),'Original crossing remains: '+key(oldPair));
}
assert.equal(after.parts,before.parts,'Artwork part count changed');
assert(after.openSurfaces <= before.openSurfaces,'Additional open surface');
for (const name of ['loose','unseated','detailBreaches']) assert.deepEqual(after[name],[],'New or unresolved '+name);
assert.deepEqual([...current].filter(pair => !original.has(pair)),[],'New intersection');
console.log('PASS',model,'original pair(s)',pairNumbers.join(','),'removed; raw',original.size,'to',current.size,
  'open',after.overlaps.length,'named exclusions',after.excusedSeats?.length || 0);
