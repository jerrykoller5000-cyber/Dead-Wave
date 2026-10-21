import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sha, parsePrompts, makePlan} from './batch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const attached = fs.readFileSync(path.resolve(here, '../../Claude outputs/PROMPTS-3.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest-3.json'), 'utf8'));
const output = path.join(here, '.offline-batch-3-output');
const cli = (...args) => spawnSync(process.execPath, [path.join(here, 'run.mjs'), ...args], {encoding: 'utf8'});

test('all 84 batch 3 prompts and metadata match Jerry’s source and Claude’s independent catalogue', () => {
  assert.deepEqual(manifest, parsePrompts(attached, 'Claude outputs/PROMPTS-3.md'));
  const catalogue = JSON.parse(fs.readFileSync(path.resolve(here, '../../z-sounds/manifest-3.json'), 'utf8'));
  assert.equal(manifest.sounds.length, 84);
  assert.deepEqual(manifest.sounds.map(s => [s.n, s.folder, s.prompt, s.requestedSeconds, s.loop, s.priority, s.status]),
    catalogue.sounds.map(s => [s.n, s.folder, s.prompt, s.seconds, s.loop, s.start, s.status]));
  assert.deepEqual(manifest.sounds.reduce((totals, s) => ({...totals, [s.status]: (totals[s.status] ?? 0) + 1}), {}),
    {new: 25, missing: 27, upgrade: 26, try: 6});
});

test('336 distinct jobs preserve every prompt, duration, loop and influence across four rounds', () => {
  const plan = makePlan(manifest);
  assert.deepEqual(plan, JSON.parse(fs.readFileSync(path.join(here, 'plan-3.json'), 'utf8')));
  assert.equal(plan.jobs.length, 336);
  assert.equal(new Set(plan.jobs.map(j => j.id)).size, 336);
  assert.equal(plan.jobs.filter(j => j.loop).length, 36);
  assert.equal(plan.summary.shortClipsAdjusted, 16);
  assert.equal(plan.summary.estimatedCredits, 17520);
  for (const sound of manifest.sounds) {
    const jobs = plan.jobs.filter(j => j.n === sound.n);
    assert.deepEqual(jobs.map(j => j.take), [1, 2, 3, 4]);
    for (const job of jobs) {
      assert.equal(job.folder, sound.folder);
      assert.equal(job.payload.text, sound.prompt);
      assert.equal(job.payload.duration_seconds, Math.max(0.5, sound.requestedSeconds));
      assert.equal(job.payload.loop, sound.loop);
      assert.equal(job.payload.prompt_influence, 0.6);
    }
  }
});

test('batch 3 sample and priority selections use the new 20 starred prompts', () => {
  const sample = makePlan(manifest, {scope: 'priority', variants: 1, limit: 3});
  assert.deepEqual(sample.jobs.map(j => j.folder), ['crew/megaphone-squawk', 'crew/truck-horn', 'crew/flare-distant']);
  assert.equal(sample.summary.estimatedCredits, 140);
  const priority = makePlan(manifest, {scope: 'priority', variants: 1});
  assert.equal(priority.jobs.length, 20);
  assert(priority.jobs.every(j => j.priority && j.take === 1));
});

test('CLI requires an explicit output for another manifest and reads separate batch 3 progress', () => {
  const missing = cli('summary', '--manifest', path.join(here, 'manifest-3.json'));
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /explicit --output/);
  const result = cli('summary', '--manifest', path.join(here, 'manifest-3.json'), '--output', output);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.output, output);
  assert.equal(summary.sounds, 84);
  assert.equal(summary.clips, 336);
  assert.equal(summary.progress.pending, 336);
  assert.equal(summary.progress.done, 0);
  assert.equal(summary.progress.uncertain + summary.progress.conflicts, 0);
});

test('old CLI still defaults to batch 2, and its frozen manifest and plan have not changed', () => {
  const before = JSON.parse(fs.readFileSync(path.join(here, 'batch-3-before.json'), 'utf8'));
  for (const entry of before) assert.equal(sha(fs.readFileSync(path.join(here, entry.file))), entry.hash);
  const result = cli('summary', '--allow-moved-clips', 'true');
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.output, path.join(here, 'Generated'));
  assert.equal(summary.sounds, 179);
  assert.equal(summary.clips, 716);
});

const psQuote = text => "'" + text.replaceAll("'", "''") + "'";
function launcher({batch3 = true, full = false, choice = '4'}) {
  const command = `$global:batchTestAnswers = @(${psQuote(choice)}, 'NO'); $global:batchTestAnswerIndex = 0; ` +
    `function global:Read-Host { param($Prompt, [switch]$AsSecureString) ` +
    `if ($AsSecureString) { throw 'Unexpected API key prompt during offline verification' }; ` +
    `if (${full ? '$true' : '$false'}) { return 'NO' }; ` +
    `$answer = $global:batchTestAnswers[$global:batchTestAnswerIndex]; $global:batchTestAnswerIndex++; return $answer }; ` +
    `& ${psQuote(path.join(here, 'Start batch.ps1'))} ` + (full ? '-FullBatch ' : '') +
    (batch3 ? `-ManifestPath ${psQuote(path.join(here, 'manifest-3.json'))} -OutputPath ${psQuote(output)}` : '');
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
    {encoding: 'utf8', timeout: 30000, env: {...process.env, ELEVENLABS_API_KEY: ''}});
}

test('real PowerShell full batch 3 launcher displays 336 clips and declines before requesting a key', () => {
  const result = launcher({full: true});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /all 84 sounds, four takes each \(336 clips\)/);
  assert.match(result.stdout, /Sounds: 84\. Takes: 336\. Already saved: 0/);
  assert.match(result.stdout, /Estimated remaining credits: 17520/);
  assert(result.stdout.includes(output));
  assert.match(result.stdout, /No credits used/);
  assert.doesNotMatch(result.stdout, /Generating /);
  for (const name of ['Generate batch 3.cmd', 'Start batch 3.cmd']) {
    const cmd = fs.readFileSync(path.join(here, name), 'utf8');
    assert.match(cmd, /-ManifestPath "%~dp0manifest-3.json" -OutputPath "%~dp0Generated-3"/);
    assert.equal(cmd.includes('-FullBatch'), name.startsWith('Generate'));
  }
});

test('real menu supports batch 3 sample, priority and plan-only, while batch 2 keeps its original selection', () => {
  for (const [choice, sounds, clips] of [['1', 3, 3], ['2', 20, 20], ['4', 84, 336]]) {
    const result = launcher({choice});
    assert.equal(result.status, 0, result.stderr);
    assert(result.stdout.includes(`Sounds: ${sounds}. Takes: ${clips}.`), result.stdout);
    assert.match(result.stdout, /No credits used/);
  }
  const old = launcher({batch3: false, choice: '4'});
  assert.equal(old.status, 0, old.stderr);
  assert.match(old.stdout, /all 179 sounds, four takes each \(716 clips\)/);
  assert.match(old.stdout, /Sounds: 179\. Takes: 716\./);
  assert.match(old.stdout, /No credits used/);
});
