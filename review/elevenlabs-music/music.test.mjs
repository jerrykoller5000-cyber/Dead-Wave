// CL-163: offline checks for the music batch. The network is simulated; nothing is sent to ElevenLabs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makePlan, runBatch, inspectProgress, validateManifest, ENDPOINT, MODEL, looksLikeMp3} from './batch-music.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest-music.json'), 'utf8'));
// A real 0.5 s MP3 (ffmpeg, 44.1 kHz 192 kbps), so the runner's MP3 check is exercised for real.
const MP3 = Buffer.from(fs.readFileSync(path.join(here, 'test-take.mp3.b64'), 'utf8'), 'base64');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'music-'));
function fakeFetch(calls, {status = 200, body = MP3} = {}) {
  return async (url, init) => {
    calls.push({url, body: JSON.parse(init.body), key: init.headers['xi-api-key']});
    if (status !== 200) return new Response(JSON.stringify({detail: {status: 'bad_prompt', message: 'nope'}}), {status});
    return new Response(body, {status: 200, headers: {'song-id': 'song_' + calls.length}});
  };
}

test('the manifest covers every music slot, instrumental, no names', () => {
  validateManifest(manifest);
  assert.equal(manifest.tracks.length, 45);
  const groups = {};
  for (const t of manifest.tracks) groups[t.folder.split('/')[0]] = (groups[t.folder.split('/')[0]] || 0) + 1;
  assert.deepEqual(groups, {calm: 6, 'day-fights': 5, nights: 20, specials: 1, endings: 2, stings: 11});
  const banned = /\b(doom|id software|bobby prince|mick gordon|quake|wolfenstein|metallica|slayer|pantera|megadeth|nintendo|sega|famicom)\b/i;
  for (const t of manifest.tracks) {
    const text = JSON.stringify(t.prompt ?? t.plan);
    assert.ok(!banned.test(text), 'a name in ' + t.folder);
    if (t.mode === 'plan') {
      assert.equal(t.plan.chunks.length, 7, t.folder);
      for (const c of t.plan.chunks) assert.ok(c.negative_styles.includes('vocals'));
    }
  }
  assert.ok(looksLikeMp3(MP3));
});

test('the plan: rounds of takes, readable names, the right request bodies', () => {
  const plan = makePlan(manifest, {scope: 'all', variants: 2});
  assert.equal(plan.jobs.length, 90);
  assert.ok(plan.jobs.slice(0, 45).every(j => j.take === 1) && plan.jobs.slice(45).every(j => j.take === 2));
  const night = plan.jobs.find(j => j.folder === 'nights/night-20-last-stand');
  assert.match(night.id, /^nights\/night-20-last-stand\/night-20-last-stand-take1-[0-9a-f]{10}\.mp3$/);
  assert.equal(night.payload.model_id, MODEL);
  assert.equal(night.payload.composition_plan.chunks.length, 7);
  assert.equal(night.payload.prompt, undefined);
  const sting = plan.jobs.find(j => j.folder === 'stings/wave-alarm');
  assert.deepEqual(Object.keys(sting.payload).sort(), ['force_instrumental', 'model_id', 'music_length_ms', 'prompt']);
  assert.equal(sting.payload.music_length_ms, 6000);
  const test1 = makePlan(manifest, {scope: 'test', variants: 1});
  assert.deepEqual(test1.jobs.map(j => j.folder).sort(), ['nights/night-20-last-stand', 'stings/wave-alarm']);
  // A later round only adds the new takes.
  assert.equal(makePlan(manifest, {variants: 4, first: 3}).jobs.length, 90);
});

test('generate, resume, deleted takes are never made again', async () => {
  const out = tmp(), calls = [];
  const plan = makePlan(manifest, {scope: 'test', variants: 2});
  const r1 = await runBatch(plan, {output: out, apiKey: 'k', maxCredits: 1e6, fetchImpl: fakeFetch(calls), allowMovedClips: true});
  assert.equal(r1.completed, 4); assert.equal(calls.length, 4);
  assert.ok(calls.every(c => c.url === ENDPOINT && c.key === 'k'));
  assert.ok(ENDPOINT.startsWith('https://api.elevenlabs.io/v1/music?output_format='));
  for (const j of plan.jobs) assert.deepEqual(fs.readFileSync(path.join(out, j.id)), MP3);
  const state = JSON.parse(fs.readFileSync(path.join(out, '.elevenlabs-progress.json'), 'utf8'));
  assert.ok(Object.values(state.jobs).every(e => e.status === 'done' && e.songId));
  // Jerry deletes a stinker, then runs a bigger selection: the deleted one is skipped, not paid for again.
  fs.unlinkSync(path.join(out, plan.jobs[0].id));
  const plan4 = makePlan(manifest, {scope: 'test', variants: 4});
  const before = inspectProgress(plan4, out, {allowMovedClips: true}).summary;
  assert.equal(before.exported, 1); assert.equal(before.pending, 4);
  const r2 = await runBatch(plan4, {output: out, apiKey: 'k', maxCredits: 1e6, fetchImpl: fakeFetch(calls), allowMovedClips: true});
  assert.equal(r2.completed, 4); assert.equal(calls.length, 8);
  assert.ok(!fs.existsSync(path.join(out, plan.jobs[0].id)));
});

test('a rejected prompt stops the batch with ElevenLabs\' reason and writes nothing', async () => {
  const out = tmp(), calls = [];
  const plan = makePlan(manifest, {scope: 'test', variants: 1});
  const r = await runBatch(plan, {output: out, apiKey: 'k', maxCredits: 1e6, fetchImpl: fakeFetch(calls, {status: 400})});
  assert.equal(r.stopped, true); assert.match(r.reason, /HTTP 400 \(bad_prompt\): nope/);
  assert.equal(calls.length, 1);
  assert.ok(!fs.existsSync(path.join(out, plan.jobs[0].id)));
});

test('the credit limit is checked before anything is sent', async () => {
  const out = tmp(), calls = [];
  const plan = makePlan(manifest, {scope: 'test', variants: 1});
  await assert.rejects(runBatch(plan, {output: out, apiKey: 'k', maxCredits: 10, fetchImpl: fakeFetch(calls)}), /exceeds the credit limit/);
  assert.equal(calls.length, 0);
});
