// GP-182: local, resumable batch runner. No paid calls without the generate command.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

export const SCHEMA = 'grave-shift-elevenlabs-sfx-v1';
export const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128';
export const MODEL = 'eleven_text_to_sound_v2';
export const sha = value => createHash('sha256').update(value).digest('hex');
const rounded = n => Math.round(n * 1000) / 1000;
const folderPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export function parsePrompts(text, sourceName = 'PROMPTS-2.md') {
  const headers = [...text.matchAll(/^\*\*(\d+)\. `([^`]+)`\*\*([^\r\n]*)/gm)];
  if (!headers.length) throw new Error('No numbered sound prompts found.');
  const sounds = headers.map((m, i) => {
    const body = text.slice(m.index + m[0].length, headers[i + 1]?.index ?? text.length);
    const blocks = [...body.matchAll(/^```[^\r\n]*\r?\n([\s\S]*?)^```\s*$/gm)];
    if (blocks.length !== 1) throw new Error('Expected one prompt block for ' + m[2]);
    const prompt = blocks[0][1].trim();
    const duration = m[3].match(/(?:^|[·\s])(\d+(?:\.\d+)?)\s*s\b/i);
    const auto = /\bAuto\b/i.test(m[3]);
    const status = m[3].match(/\b(NEW|MISSING|UPGRADE|TRY)\b/);
    if (!duration && !auto) throw new Error('Missing duration for ' + m[2]);
    return {n: Number(m[1]), folder: m[2], priority: m[3].includes('★'),
      status: status?.[1].toLowerCase() ?? 'unspecified',
      requestedSeconds: auto ? null : Number(duration[1]), loop: /\bLOOP\b/.test(m[3]), prompt};
  });
  const manifest = {schema: SCHEMA, source: sourceName, sourceSha256: sha(text),
    model: MODEL, promptInfluence: 0.6, variants: 4, sounds};
  validateManifest(manifest);
  return manifest;
}

export function validateManifest(manifest) {
  if (manifest?.schema !== SCHEMA || manifest.model !== MODEL || !Array.isArray(manifest.sounds))
    throw new Error('Unrecognized sound manifest.');
  if (!Number.isFinite(manifest.promptInfluence) || manifest.promptInfluence < 0 || manifest.promptInfluence > 1)
    throw new Error('Prompt influence must be between zero and one.');
  const folders = new Set(), numbers = new Set();
  for (const sound of manifest.sounds) {
    if (!folderPattern.test(sound.folder) || folders.has(sound.folder)) throw new Error('Unsafe or repeated sound folder.');
    if (!Number.isInteger(sound.n) || sound.n < 1 || numbers.has(sound.n)) throw new Error('Invalid or repeated prompt number.');
    if (typeof sound.prompt !== 'string' || !sound.prompt.trim() || sound.prompt.length > 450)
      throw new Error('Prompt must have 1-450 characters: ' + sound.folder);
    if (typeof sound.priority !== 'boolean' || typeof sound.loop !== 'boolean') throw new Error('Invalid sound flags.');
    if (sound.requestedSeconds !== null && (!Number.isFinite(sound.requestedSeconds) || sound.requestedSeconds <= 0 || sound.requestedSeconds > 30))
      throw new Error('Duration must be positive and at most 30 seconds.');
    folders.add(sound.folder); numbers.add(sound.n);
  }
  return manifest;
}

export function makePlan(manifest, {scope = 'all', variants = manifest.variants, limit = Infinity, group = null} = {}) {
  validateManifest(manifest);
  if (!['all', 'priority'].includes(scope)) throw new Error('Scope must be all or priority.');
  if (!Number.isInteger(variants) || variants < 1 || variants > 20) throw new Error('Takes must be 1-20.');
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) throw new Error('Limit must be positive.');
  const selected = manifest.sounds.filter(s => (scope === 'all' || s.priority) && (!group || s.folder.split('/')[0] === group))
    .sort((a, b) => Number(b.priority) - Number(a.priority) || a.n - b.n);
  if (!selected.length) throw new Error('No sounds match this selection.');
  const jobs = [];
  // Take one of every selected sound first, then take two, etc. A small limit samples different sounds.
  for (let take = 1; take <= variants; take++) for (const sound of selected) {
    const seconds = sound.requestedSeconds === null ? null : Math.max(0.5, sound.requestedSeconds);
    const payload = {text: sound.prompt, loop: sound.loop, prompt_influence: manifest.promptInfluence, model_id: MODEL};
    if (seconds !== null) payload.duration_seconds = seconds;
    const fingerprint = sha(JSON.stringify({payload, output: 'mp3_44100_128'})).slice(0, 16);
    const relative = sound.folder + '/' + String(take).padStart(2, '0') + '_eleven_' + fingerprint + '.mp3';
    jobs.push({id: relative, folder: sound.folder, n: sound.n, take, priority: sound.priority,
      requestedSeconds: sound.requestedSeconds, seconds, loop: sound.loop, payload,
      estimatedCredits: seconds === null ? 100 : Math.ceil(rounded(seconds * 20))});
  }
  const chosen = jobs.slice(0, limit);
  return {schema: SCHEMA, source: manifest.source, sourceSha256: manifest.sourceSha256,
    jobs: chosen, summary: {sounds: new Set(chosen.map(j => j.folder)).size, clips: chosen.length,
      fixedSeconds: rounded(chosen.reduce((n, j) => n + (j.seconds ?? 0), 0)),
      autoDurationClips: chosen.filter(j => j.seconds === null).length,
      shortClipsAdjusted: chosen.filter(j => j.requestedSeconds !== null && j.requestedSeconds < 0.5).length,
      estimatedCredits: chosen.reduce((n, j) => n + j.estimatedCredits, 0)}};
}

function checkedPath(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.split('/').some(s => !s || s === '.' || s === '..'))
    throw new Error('Unsafe output path.');
  const absoluteRoot = path.resolve(root), target = path.resolve(absoluteRoot, relative);
  if (!target.startsWith(absoluteRoot + path.sep)) throw new Error('Output escaped its folder.');
  // Refuse junctions/symlinks so generated files cannot be redirected out of the selected folder.
  for (let p = absoluteRoot; ; p = path.dirname(p)) {
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw new Error('Output folder uses a symbolic link.');
    if (path.dirname(p) === p) break;
  }
  let current = absoluteRoot;
  for (const piece of relative.split('/')) {
    current = path.join(current, piece);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Output uses a symbolic link.');
  }
  return target;
}

let saveSequence = 0;
const fileWaitCell = new Int32Array(new SharedArrayBuffer(4));
// Windows readers can briefly lock a destination. Retry this same file save,
// never the paid generation request, and retain its journal if replacement fails.
export function atomicJson(file, data, {rename = fs.renameSync,
  sleep = ms => Atomics.wait(fileWaitCell, 0, 0, ms)} = {}) {
  const temp = file + '.' + process.pid + '.' + (++saveSequence) + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'});
  for (let attempt = 0; ; attempt++) {
    try { rename(temp, file); return; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(error.code) || attempt >= 24) throw error;
      sleep(Math.min(250, 25 * (attempt + 1)));
    }
  }
}

export function looksLikeMp3(bytes) {
  if (bytes.length < 32) return false;
  let offset = 0;
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3') {
    if ([...bytes.subarray(6, 10)].some(n => n > 127)) return false;
    offset = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]);
    if (bytes[5] & 0x10) offset += 10;
  }
  if (offset + 4 > bytes.length) return false;
  const a = bytes[offset], b = bytes[offset + 1], c = bytes[offset + 2];
  return a === 255 && (b & 224) === 224 && (b & 24) !== 8 && (b & 6) !== 0 &&
    (c >> 4) !== 0 && (c >> 4) !== 15 && ((c >> 2) & 3) !== 3;
}

function loadState(file) {
  if (!fs.existsSync(file)) return {schema: SCHEMA, jobs: {}};
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (state.schema !== SCHEMA || !state.jobs || typeof state.jobs !== 'object' || Array.isArray(state.jobs))
    throw new Error('Unrecognized progress file; refusing to overwrite it.');
  // A failed atomic replacement may leave a newer, fully written paid receipt.
  // Only advance an existing in-flight record whose identity/attempt still matches.
  const root = path.dirname(file), prefix = path.basename(file);
  const names = fs.readdirSync(root).filter(n => n.startsWith(prefix + '.') && /^\.\d+(?:\.\d+)?\.tmp$/.test(n.slice(prefix.length)));
  for (const name of names) {
    const journalFile = checkedPath(root, name);
    let journal;
    try {
      if (fs.statSync(journalFile).size > 1024 * 1024) continue;
      journal = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
    } catch { continue; }
    if (journal.schema !== SCHEMA || !journal.jobs) continue;
    for (const [id, current] of Object.entries(state.jobs)) {
      const newer = journal.jobs[id];
      if (!['sending', 'uncertain', 'received'].includes(current.status) ||
        !['received', 'done'].includes(newer?.status) || !/^[a-f0-9]{64}$/.test(newer.sha256) ||
        !Number.isInteger(newer.bytes) || newer.bytes < 32 || newer.bytes > 10 * 1024 * 1024) continue;
      const same = ['folder', 'take', 'attempts', 'estimatedCredits', 'requestedSeconds', 'generatedSeconds']
        .every(key => newer[key] === current[key]);
      if (!same || (current.sha256 && current.sha256 !== newer.sha256)) continue;
      state.jobs[id] = {...newer, status: 'received'};
    }
  }
  return state;
}

function reconcile(job, entry, file, allowMovedClips = false) {
  if (!entry) return fs.existsSync(file) ? 'conflict' : 'pending';
  if (['done', 'received'].includes(entry.status)) {
    if (fs.existsSync(file)) {
      const bytes = fs.readFileSync(file);
      if (bytes.length === entry.bytes && sha(bytes) === entry.sha256 && looksLikeMp3(bytes)) return 'done';
    }
    // User-approved batch continuation: a fully saved clip may have been moved for editing.
    // Keep its receipt and never bill again; interrupted/received requests cannot use this path.
    if (allowMovedClips && entry.status === 'done' && !fs.existsSync(file) &&
      Number.isInteger(entry.bytes) && entry.bytes >= 32 && /^[a-f0-9]{64}$/.test(entry.sha256)) return 'exported';
    return 'uncertain'; // A paid generation is known, but its verified output is missing.
  }
  if (['sending', 'uncertain'].includes(entry.status)) return 'uncertain';
  return fs.existsSync(file) ? 'conflict' : 'pending';
}

export function inspectProgress(plan, output, {allowMovedClips = false} = {}) {
  const root = path.resolve(output), file = checkedPath(root, '.elevenlabs-progress.json');
  const state = loadState(file), jobs = plan.jobs.map(job => ({job,
    status: reconcile(job, state.jobs[job.id], checkedPath(root, job.id), allowMovedClips)}));
  const pending = jobs.filter(x => x.status === 'pending');
  return {jobs, summary: {done: jobs.filter(x => ['done', 'exported'].includes(x.status)).length,
    exported: jobs.filter(x => x.status === 'exported').length,
    uncertain: jobs.filter(x => x.status === 'uncertain').length,
    conflicts: jobs.filter(x => x.status === 'conflict').length, pending: pending.length,
    estimatedRemainingCredits: pending.reduce((n, {job}) => n + job.estimatedCredits, 0)}};
}

// Explicit user recovery only: import the matching MP3 downloaded from ElevenLabs History.
export function recoverTake(plan, output, jobId, downloadedFile, {allowReencodedHistory = false} = {}) {
  const job = plan.jobs.find(j => j.id === jobId);
  if (!job) throw new Error('Clip is not in this batch plan.');
  const root = path.resolve(output), release = lockFolder(root);
  try {
    const progressFile = checkedPath(root, '.elevenlabs-progress.json'), state = loadState(progressFile);
    const entry = state.jobs[jobId];
    if (!entry || !['sending', 'uncertain', 'received'].includes(entry.status))
      throw new Error('Only an interrupted or uncertain take can be recovered.');
    const bytes = fs.readFileSync(path.resolve(downloadedFile));
    if (!looksLikeMp3(bytes) || bytes.length > 10 * 1024 * 1024) throw new Error('Download is not a recognizable MP3.');
    const reencoded = entry.sha256 && (sha(bytes) !== entry.sha256 || bytes.length !== entry.bytes);
    if (reencoded && !allowReencodedHistory)
      throw new Error('Download does not match the recorded paid take; choose its original MP3.');
    const file = checkedPath(root, jobId);
    if (fs.existsSync(file)) {
      if (sha(fs.readFileSync(file)) !== sha(bytes)) throw new Error('Existing recording differs; refusing to overwrite it.');
    } else {
      fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes, {flag: 'wx'});
    }
    if (reencoded) Object.assign(entry, {originalSha256: entry.sha256, originalBytes: entry.bytes,
      recoveredEncodingDifferent: true});
    Object.assign(entry, {status: 'done', bytes: bytes.length, sha256: sha(bytes), recoveredFromHistory: true, at: new Date().toISOString()});
    atomicJson(progressFile, state);
    return jobId;
  } finally { release(); }
}

function lockFolder(root) {
  fs.mkdirSync(root, {recursive: true});
  const lock = checkedPath(root, '.elevenlabs-batch.lock');
  if (fs.existsSync(lock)) {
    let old;
    try { old = JSON.parse(fs.readFileSync(lock, 'utf8')); } catch { throw new Error('Progress lock needs manual review.'); }
    if (!Number.isInteger(old.pid) || old.schema !== SCHEMA) throw new Error('Unrecognized progress lock.');
    let running = true;
    try { process.kill(old.pid, 0); } catch (e) { if (e.code === 'ESRCH') running = false; }
    if (running) throw new Error('Another batch is running in this output folder.');
    fs.unlinkSync(lock); // Checked, exact stale lock file; never removes user audio or folders.
  }
  fs.writeFileSync(lock, JSON.stringify({schema: SCHEMA, pid: process.pid}), {flag: 'wx'});
  return () => fs.unlinkSync(lock);
}

// Display selected diagnostic fields, never a raw response or request headers.
async function rejectionDetails(response, apiKey) {
  const clean = value => {
    if (typeof value !== 'string') return '';
    let text = value;
    for (const secret of [apiKey, encodeURIComponent(apiKey)])
      if (secret) text = text.split(secret).join('[hidden key]');
    return text.replace(/(?:sk_|xi_)[a-zA-Z0-9_-]{16,}/g, '[hidden key]')
      .replace(/(?:xi-api-key|api[_ -]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '[hidden credential]')
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 800);
  };
  try {
    const reader = response.body.getReader(), chunks = []; let size = 0;
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.length;
      if (size > 32768) { await reader.cancel(); return {kind: '', message: ''}; }
      chunks.push(Buffer.from(value));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')), detail = body?.detail;
    const kind = clean(detail?.status ?? body?.status);
    const message = Array.isArray(detail)
      ? clean(detail.map(e => typeof e?.msg === 'string' ? e.msg : '').filter(Boolean).join('; '))
      : clean(typeof detail === 'string' ? detail : detail?.message ?? body?.message);
    return {kind, message};
  } catch { return {kind: '', message: ''}; }
}

async function requestSound(job, apiKey, {fetchImpl, sleep, signal, onEvent, beforeAttempt}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    beforeAttempt();
    let response;
    try {
      const timeout = AbortSignal.timeout(180000);
      response = await fetchImpl(ENDPOINT, {method: 'POST', headers: {'xi-api-key': apiKey, 'Content-Type': 'application/json'},
        body: JSON.stringify(job.payload), signal: signal ? AbortSignal.any([signal, timeout]) : timeout});
    } catch {
      return {status: 'uncertain', reason: 'Connection interrupted; check ElevenLabs History before retrying.'};
    }
    if (!response.ok) {
      const {kind, message} = await rejectionDetails(response, apiKey);
      if (response.status === 429 && kind !== 'quota_exceeded' && attempt < 3) {
        const retry = Number(response.headers.get('retry-after'));
        const seconds = Math.min(60, Math.max(1, Number.isFinite(retry) && retry > 0 ? retry : 2 ** (attempt + 1)));
        onEvent({type: 'rate-limit', seconds, id: job.id});
        try { await sleep(seconds * 1000, signal); } catch { return {status: 'failed', reason: 'Stopped while waiting; no clip generated.'}; }
        continue;
      }
      return {status: response.status >= 500 || response.status === 408 ? 'uncertain' : 'failed',
        reason: 'ElevenLabs returned HTTP ' + response.status + (kind ? ' (' + kind + ')' : '') +
          (message ? ': ' + message : '. No readable explanation was returned.')};
    }
    let bytes;
    try {
      const reader = response.body.getReader(), chunks = []; let size = 0;
      while (true) {
        const {done, value} = await reader.read(); if (done) break;
        size += value.length;
        if (size > 10 * 1024 * 1024) { await reader.cancel(); throw new Error('Oversize'); }
        chunks.push(Buffer.from(value));
      }
      bytes = Buffer.concat(chunks);
    } catch { return {status: 'uncertain', reason: 'Audio download interrupted; check ElevenLabs History.'}; }
    if (!looksLikeMp3(bytes)) return {status: 'uncertain', reason: 'Response was not a recognizable MP3; check ElevenLabs History.'};
    const costHeader = response.headers.get('character-cost');
    const cost = costHeader !== null && /^\d+(?:\.\d+)?$/.test(costHeader) ? Number(costHeader) : null;
    return {status: 'received', bytes, actualCredits: cost, requestId: response.headers.get('request-id') ?? null};
  }
}

export async function runBatch(plan, {output, apiKey, maxCredits, fetchImpl = globalThis.fetch,
  sleep = (ms, signal) => delay(ms, undefined, {signal}), onEvent = () => {}, signal, allowMovedClips = false,
  saveJson = atomicJson} = {}) {
  if (!apiKey || typeof apiKey !== 'string') throw new Error('An ElevenLabs API key is required.');
  if (!Number.isFinite(maxCredits) || maxCredits <= 0) throw new Error('A positive credit estimate limit is required.');
  if (!Array.isArray(plan?.jobs) || !plan.jobs.length) throw new Error('Empty batch.');
  // Validate job paths before creating any folder or sending any request.
  const root = path.resolve(output);
  for (const job of plan.jobs) {
    checkedPath(root, job.id);
    if (!Number.isFinite(job.estimatedCredits) || job.estimatedCredits <= 0) throw new Error('Invalid job estimate.');
  }
  const release = lockFolder(root), progressFile = checkedPath(root, '.elevenlabs-progress.json');
  try {
    const state = loadState(progressFile), inspection = inspectProgress(plan, root, {allowMovedClips});
    if (inspection.summary.uncertain || inspection.summary.conflicts)
      throw new Error('Some clips need review. Check progress.json/ElevenLabs History; no paid requests were sent.');
    if (inspection.summary.estimatedRemainingCredits > maxCredits)
      throw new Error('Remaining batch estimate exceeds the credit limit; no paid requests were sent.');
    let used = 0, completed = 0;
    const save = () => saveJson(progressFile, state);
    for (const {job, status} of inspection.jobs) {
      if (signal?.aborted) return {completed, skipped: inspection.summary.done, usedCredits: used, stopped: true};
      if (status === 'done' || status === 'exported') {
        if (state.jobs[job.id].status !== 'done') { state.jobs[job.id].status = 'done'; save(); }
        onEvent({type: 'skip', id: job.id}); continue;
      }
      if (used + job.estimatedCredits > maxCredits) return {completed, skipped: inspection.summary.done, usedCredits: used, stopped: true};
      const previous = state.jobs[job.id];
      state.jobs[job.id] = {status: 'pending', folder: job.folder, take: job.take, estimatedCredits: job.estimatedCredits,
        attempts: previous?.attempts ?? 0, requestedSeconds: job.requestedSeconds, generatedSeconds: job.seconds};
      onEvent({type: 'start', id: job.id, completed, total: inspection.summary.pending});
      const result = await requestSound(job, apiKey, {fetchImpl, sleep, signal, onEvent,
        beforeAttempt() { state.jobs[job.id].status = 'sending'; state.jobs[job.id].attempts++; save(); }});
      const entry = state.jobs[job.id];
      if (result.status !== 'received') {
        Object.assign(entry, {status: result.status, reason: result.reason, at: new Date().toISOString()}); save();
        onEvent({type: 'stop', id: job.id, reason: result.reason});
        return {completed, skipped: inspection.summary.done, usedCredits: used, stopped: true, reason: result.reason};
      }
      // Save the known paid response before the audio write. A crash can then be reconciled by its hash.
      Object.assign(entry, {status: 'received', sha256: sha(result.bytes), bytes: result.bytes.length,
        actualCredits: result.actualCredits, requestId: result.requestId, at: new Date().toISOString()});
      const file = checkedPath(root, job.id);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      try { save(); }
      catch (error) {
        // Retain the paid audio even if the progress journal stays locked.
        // The journal above has its hash, so next launch can reconcile this file.
        if (!fs.existsSync(file)) fs.writeFileSync(file, result.bytes, {flag: 'wx'});
        throw error;
      }
      fs.writeFileSync(file, result.bytes, {flag: 'wx'}); // Never replaces an existing recording.
      entry.status = 'done'; save(); completed++;
      used += result.actualCredits ?? job.estimatedCredits;
      onEvent({type: 'done', id: job.id, completed, total: inspection.summary.pending, usedCredits: used});
    }
    return {completed, skipped: inspection.summary.done, usedCredits: used, stopped: false};
  } finally { release(); }
}
