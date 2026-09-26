// studio/motion-report.test.mjs — the report CLI, run as an agent runs it: a child process (D-42).
//   node --import ./studio/node-three.mjs --test studio/motion-report.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { report } from './motion-report.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-motion-report-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

// Runs the CLI from the repo root; resolves with { code, out, err } whatever the exit code.
const cli = (args, { hook = true } = {}) => new Promise((resolve) => {
  const argv = [...(hook ? ['--import', './studio/node-three.mjs'] : []), 'studio/motion-report.mjs', ...args];
  execFile(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', timeout: 60000 }, (e, out, err) => resolve({ code: e ? e.code : 0, out, err }));
});

// A draft preset in a file of its own, as an agent tunes a copy: the shambler with one wrong expectation.
const draft = path.join(TMP, 'draft.json');
const sham = JSON.parse(fs.readFileSync(path.join(ROOT, 'studio/motion/zombie/shambler.json'), 'utf8'));
fs.writeFileSync(draft, JSON.stringify({ ...sham, name: 'draft', expect: [{ hit: 'rifle', want: 'flinch' }, { hit: 'shotgun-far', want: 'down' }] }, null, 2));

// What only a child process shows: exit codes, the usage on stderr, running without --import, and a
// file written by another process. One at a time: the suite runs its files side by side and
// motion.test.mjs times 48 bodies a frame, which a dozen processes at once would starve on 4 cores.
const one = await cli(['zombie/shambler', '--hits', 'rifle,shotgun-close', '--from', 'front,back']);
const check = await cli([draft, '--hits', 'rifle', '--from', 'front', '--check']);
const bad2 = await cli(['zombie/shambler', '--frobnicate']);
const json1 = await cli(['zombie/feral', '--hits', 'shotgun-far,kill', '--from', 'side', '--json', path.join(TMP, 'a.json')]);
const bare = await cli(['zombie/feral', '--hits', 'rifle', '--from', 'front'], { hook: false });

// The rest runs the same report() in this process (no start-up each time): what it prints, its exit
// code, or the sentence it stops with.
const inproc = (args) => {
  const lines = [];
  try { const r = report(args, (s) => lines.push(s)); return { code: r.code, out: lines.join('\n') + '\n', err: '' }; }
  catch (e) { return { code: 2, out: lines.join('\n'), err: String(e.message) }; }
};
const vs = inproc(['zombie/shambler', '--vs', 'zombie/brute', '--hits', 'shotgun-close,rifle', '--from', 'front']);
const tried = inproc(['zombie/shambler', '--try', 'hits.pellet.knockdown=20', '--hits', 'shotgun-close', '--from', 'front', '--check']);
const swept = inproc(['zombie/shambler', '--sweep', '--kinds', 'pellet', '--hits', 'rifle', '--from', 'front']);
const json2 = inproc(['zombie/feral', '--hits', 'shotgun-far,kill', '--from', 'side', '--json', path.join(TMP, 'b.json')]);
const bad1 = inproc(['zombie/nobody']);
const bad3 = inproc(['zombie/shambler', '--hits', 'bazooka']);
const all = inproc(['all', '--hits', 'rifle', '--from', 'front']);

test('one preset: a titled table, a row per hit and side, what the columns mean, and its expectations', () => {
  assert.equal(one.code, 0, one.err);
  const out = one.out;
  assert.match(out, /^zombie\/shambler v\d+ {2}\(rig zombie: shambler, scale 1; standing on zombie\/idle; hit 0\.5 s in; 60 fps\)$/m);
  assert.match(out, /^hit +from +outcome +steps +time +chest +drop +moved +along +fell +lowest +off-bal +snap$/m);
  assert.match(out, /^rifle +front +flinch +0 +\d\.\d\d/m);
  assert.match(out, /^rifle +back +flinch +0 /m);
  assert.match(out, /^shotgun-close +front +down +0 +\d\.\d\d/m);
  assert.match(out, /^shotgun-close +back +down /m);
  assert.equal(out.split('\n').filter((l) => /^(rifle|shotgun-close) /.test(l)).length, 4);
  assert.match(out, /it steps at balance\.step 0\.13 and falls at balance\.fall 0\.5/);
  assert.match(out, /^expect: all \d+ hold\.$/m);
});

test('--vs: two presets side by side, a changed outcome marked ! and changed numbers *', () => {
  assert.equal(vs.code, 0, vs.err);
  assert.match(vs.out, /^A: zombie\/shambler v\d+ /m);
  assert.match(vs.out, /^B: zombie\/brute v\d+ {2}\(rig zombie: brute, scale 1\.38;/m);
  assert.match(vs.out, /^shotgun-close +front +down +flinch +! /m);
  assert.match(vs.out, /^rifle +front +flinch +flinch +0 /m);
  assert.match(vs.out, /1 outcome differs \(!\): shotgun-close from the front \(down to flinch\)\. \d+ numbers? differs? by more than/);
  assert.match(vs.out, /^A expect: all \d+ hold\.$/m);
  assert.match(vs.out, /^B expect: all \d+ hold\.$/m);
});

test('--try: the preset against a copy with a number changed; --check fails when the copy breaks an expectation', () => {
  assert.match(tried.out, /^B: zombie\/shambler with hits\.pellet\.knockdown=20 v\d+ /m);
  assert.match(tried.out, /^shotgun-close +front +down +(flinch|stagger) +! /m);
  assert.match(tried.out, /^B expect: \d+ of \d+ FAIL:\n {2}zombie\/shambler v\d+: shotgun-close from the front should be "down" but it was "(flinch|stagger)": /m);
  assert.equal(tried.code, 1, 'an expectation failed and --check was given');
});

test('--sweep: where the outcome changes for a kind, and how far each battery hit is from a change', () => {
  assert.equal(swept.code, 0, swept.err);
  assert.match(swept.out, /^Sweep from the front: the power \(m\/s at the point hit\) where the outcome changes, searched up to its knockdown or --max\.$/m);
  assert.match(swept.out, /^pellet +at chest +to 5\.50: +flinch, stagger from \d\.\d\d, down from 5\.50 \(its knockdown\)$/m);
  assert.doesNotMatch(swept.out, /^bullet /m, '--kinds pellet sweeps only pellets');
  assert.match(swept.out, /^shotgun-far +3\.20 +stagger +\d\.\d\d over flinch->stagger at \d\.\d\d; 2\.30 under stagger->down at 5\.50$/m);
  assert.match(swept.out, /^shotgun-close +6\.50 +down +1\.00 over stagger->down at 5\.50$/m);
});

test('--json: everything as data, and the same data from another process', () => {
  assert.equal(json1.code, 0, json1.err);
  assert.equal(json2.code, 0, json2.err);
  assert.match(json1.out, /Wrote .*a\.json\./);
  const a = fs.readFileSync(path.join(TMP, 'a.json'), 'utf8'), b = fs.readFileSync(path.join(TMP, 'b.json'), 'utf8');
  assert.equal(a, b, 'deterministic: a child process and this one write the same file');
  const d = JSON.parse(a);
  assert.equal(d.presets.length, 1);
  const bat = d.presets[0].battery;
  assert.equal(bat.preset, 'zombie/feral');
  assert.deepEqual(bat.runs.map((r) => [r.hit, r.from, r.outcome]), [['shotgun-far', 'side', 'stagger'], ['kill', 'side', 'dead']]);
  for (const k of ['steps', 'time', 'chest', 'drop', 'moved', 'along', 'fell', 'lowest', 'offBalance', 'snap', 'events', 'times']) assert.ok(k in bat.runs[0], k);
  assert.ok(d.presets[0].expect.results.every((r) => r.ok && !('run' in r)));
});

test('mistakes are sentences; from the command line, with the usage and exit 2', () => {
  assert.equal(bad2.code, 2, bad2.out);
  assert.match(bad2.err, /unknown option --frobnicate/);
  assert.match(bad2.err, /^usage: node --import \.\/studio\/node-three\.mjs studio\/motion-report\.mjs/m);
  assert.match(bad1.err, /^no preset at studio\/motion\/zombie\/nobody\.json \("zombie\/nobody"\)$/);
  assert.match(bad3.err, /^hit "bazooka" is not one of rifle, shotgun-far, /);
});

test('a draft preset file: its expectations checked, the miss explained, --check exits 1', () => {
  assert.match(check.out, /^.*draft\.json v\d+ {2}\(rig zombie: shambler, scale 1;/m, 'a preset not named after a zombie type stands as a shambler');
  assert.match(check.out, /^expect: 1 of 2 FAIL:\n {2}zombie\/draft v\d+: shotgun-far from the front should be "down" but it was "stagger": /m);
  assert.match(check.out, /hits\.pellet\.knockdown 5\.5/);
  assert.equal(check.code, 1);
});

test('all: every preset on disk; and it runs without --import too', () => {
  assert.equal(all.code, 0, all.err);
  const titles = all.out.split('\n').filter((l) => /^[a-z]+\/[a-z0-9-]+ v\d+ {2}\(rig /.test(l)).map((l) => l.split(' ')[0]);
  for (const ref of ['marine/marine', 'zombie/brute', 'zombie/feral', 'zombie/shambler']) assert.ok(titles.includes(ref), `${ref} in ${titles.join(', ')}`);
  assert.equal(bare.code, 0, bare.err);
  assert.match(bare.out, /^rifle +front +stagger /m);
});

// --- Review fixes (report package review, 2026-09-26) ------------------------------------------

test('all: a body without the point a hit names (the spider has no shoulders) is hit on a stand-in, and every preset is reported', () => {
  const r = inproc(['all', '--hits', 'brute-swing', '--from', 'front']);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^brute-swing \(on \w+: no shoulderR\) +front +\w+/m);
  for (const p of ['marine/marine', 'spider/spider', 'zombie/brute', 'zombie/feral', 'zombie/shambler']) assert.match(r.out, new RegExp('^' + p.replace('/', '\\/') + ' v\\d+ ', 'm'), p);
});
