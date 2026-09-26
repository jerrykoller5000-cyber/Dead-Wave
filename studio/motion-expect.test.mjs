// studio/motion-expect.test.mjs — every preset on disk does what its "expect" says (D-42, contract 6).
//   node --import ./studio/node-three.mjs --test studio/motion-expect.test.mjs
// An expectation is the part of a reaction Jerry approved. When one fails, the preset changed how a
// body reacts: tune it back (studio/motion-report.mjs shows the numbers), or, if the change is meant,
// the expectation changes too and the lead reviews it (AGENTS.md rule 13, D-7).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExpect, checkExpect, explain } from './motion-expect.js';
import { validateMotion, loadMotion } from './motion.js';
import { runHit } from './motion-battery.js';
import { presets } from './motion/index.js';

const STUDIO = path.dirname(fileURLToPath(import.meta.url));
// Every preset file, whether or not studio/motion/index.js lists it yet.
const onDisk = fs.readdirSync(path.join(STUDIO, 'motion'), { withFileTypes: true }).filter((d) => d.isDirectory())
  .flatMap((d) => fs.readdirSync(path.join(STUDIO, 'motion', d.name)).filter((f) => f.endsWith('.json')).map((f) => `${d.name}/${f.slice(0, -5)}`)).sort();
const read = (ref) => JSON.parse(fs.readFileSync(path.join(STUDIO, 'motion', ref + '.json'), 'utf8'));
// The get-up clips a preset names, from disk, as the report reads them.
const clipOf = (ref) => { const f = path.join(STUDIO, 'clips', ref + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };

test('the presets on disk are found, and the four first ones say what they expect', () => {
  for (const ref of ['zombie/shambler', 'zombie/feral', 'zombie/brute', 'marine/marine']) {
    assert.ok(onDisk.includes(ref), ref);
    assert.ok((read(ref).expect || []).length >= 8, `${ref} has its expectations`);
  }
});

for (const ref of onDisk) {
  test(`${ref} does what its expectations say`, () => {
    const json = read(ref);
    assert.deepEqual(validateMotion(json), [], 'the preset itself is valid, "expect" and all (contract 6: unknown fields are fine)');
    assert.deepEqual(validateExpect(json.expect), []);
    const r = checkExpect(json, { clipOf });
    if (!r.results.length) { console.log(`  ${ref}: no expectations yet`); return; }
    console.log(`  ${ref} v${r.version}: ${r.results.length - r.failures.length} of ${r.results.length} hold`);
    assert.deepEqual(r.failures, []);
  });
}

test('a bad expectation says what is wrong, in sentences', () => {
  const errs = validateExpect([
    { hit: 'rifle', want: 'flinch', form: 'back' },
    { hit: 'bazooka', want: 'down' },
    { hit: 'rifle', want: 'wobble' },
    { hit: 'rifle', from: 'above', want: 'flinch' },
    { hit: 'kill', want: 'down' },
    { hit: 'grenade', want: 'dead' },
    { hit: 'rifle', want: 'stagger' },
    { want: 'down', note: 3 },
    'rifle'
  ]);
  const has = (re) => assert.ok(errs.some((e) => re.test(e)), `${re} in:\n  ${errs.join('\n  ')}`);
  has(/^expect\[0\]\.form is not a field: an entry has hit, from, want, note$/);
  has(/^expect\[1\]\.hit "bazooka" is not a battery hit: the hits are rifle, shotgun-far, shotgun-close, machete, brute-swing, grenade, kill$/);
  has(/^expect\[2\]\.want "wobble" is not an outcome: the outcomes are none, flinch, stagger, down, dead$/);
  has(/^expect\[3\]\.from "above" is not a side: a hit comes from the front, the back, the side$/);
  has(/^expect\[4\]: "kill" always ends "dead", so it can't want "down"$/);
  has(/^expect\[5\]: only "kill" ends "dead"; grenade wants none, flinch, stagger or down$/);
  has(/^expect\[6\] says rifle from the front again \(first at expect\[0\]\): say each once$/);
  has(/^expect\[7\]\.hit is missing/);
  has(/^expect\[7\]\.note is a sentence/);
  has(/^expect\[8\] must be an object like/);
  assert.deepEqual(validateExpect({ hit: 'rifle' }), ['"expect" is a list of { "hit": "<battery hit>", "want": "<outcome>" }']);
  assert.deepEqual(validateExpect(undefined), []);
});

test('a miss names the preset, the hit, what it wanted and got, and the number to turn', () => {
  const json = structuredClone(presets.json('zombie/shambler'));
  json.expect = [{ hit: 'shotgun-far', want: 'down' }, { hit: 'shotgun-close', want: 'stagger' }, { hit: 'rifle', want: 'flinch' }];
  const r = checkExpect(json);
  assert.equal(r.results.length, 3);
  assert.deepEqual(r.results.map((x) => x.ok), [false, false, true]);
  const [far, close] = r.failures;
  assert.match(far, /^zombie\/shambler v\d+: shotgun-far from the front should be "down" but it was "stagger": \d+ steps?; most off balance [\d.]+ m \(it steps at balance\.step 0\.13, falls at balance\.fall 0\.5\); this hit is 3\.2 × hits\.pellet\.scale 1 \/ mass 1 = 3\.2 against hits\.pellet\.knockdown 5\.5/);
  assert.match(close, /should be "stagger" but it was "down": it fell at once: this hit is 6\.5 × hits\.pellet\.scale 1 \/ mass 1 = 6\.5 against hits\.pellet\.knockdown 5\.5\.$/);
  assert.match(r.results[2].sentence, /^rifle from the front: flinch, as expected$/);
  // A preset with broken entries isn't run; its problems are the failures.
  const broken = checkExpect({ ...presets.json('zombie/brute'), expect: [{ hit: 'rifle', want: 'meh' }] });
  assert.equal(broken.results.length, 0);
  assert.match(broken.failures[0], /^zombie\/brute v\d+: expect\[0\]\.want "meh" is not an outcome/);
});

test('explain says why for each outcome, in the preset\'s own numbers', () => {
  const p = loadMotion(presets.json('zombie/shambler'));
  assert.match(explain(runHit('zombie/shambler', 'rifle'), p), /^no step; most off balance [\d.]+ m \(it steps at balance\.step 0\.13\); this hit is 2\.5 × hits\.bullet\.scale 1 \/ mass 1 = 2\.5 against hits\.bullet\.knockdown 7; itself again [\d.]+ s after the hit$/);
  assert.match(explain(runHit('zombie/shambler', 'kill'), p), /^killed; it settled [\d.]+ s after the hit$/);
  assert.equal(explain(runHit('zombie/shambler', 'kill', { until: (n) => n === 'dead' }), p), 'killed');
  assert.match(explain({ outcome: 'none', kind: 'bullet', power: 1 }, p), /never woke/);
});
