import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NIGHT_NAMES, nightTitle } from './night-names.js';

test('the on-screen names match the composed score titles', () => {
  const source = fs.readFileSync(new URL('../tools/nights.py', import.meta.url), 'utf8');
  const songs = [...source.matchAll(/dict\(name='fight_night\d+', night=(\d+), title='([^']+)'/g)];
  assert.equal(songs.length, 18);
  for (const [, day, title] of songs) assert.equal(NIGHT_NAMES[Number(day)], title, `night ${day}`);
  assert.equal(NIGHT_NAMES[1], 'First Blood');
  assert.equal(NIGHT_NAMES[14], 'Fog Night');
  assert.equal(NIGHT_NAMES.length, 21);
  assert.equal(nightTitle(6), 'Night 6 · Chalk');
  assert.equal(nightTitle(21), 'Night 21');
  assert.equal(nightTitle(0), null);
});
