import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// CL-163: ChatGPT's run.mjs for the music batch. Output defaults to the game's z-music folder, where Jerry picks takes.
import {makePlan, inspectProgress, runBatch, recoverTake} from './batch-music.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), action = args.shift() ?? 'plan', opts = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i], value = args[i + 1];
  if (!['--scope', '--variants', '--limit', '--group', '--output', '--max-credits', '--clip', '--from', '--allow-moved-clips', '--manifest', '--first'].includes(key) || value === undefined)
    throw new Error('Unknown or incomplete option: ' + key);
  opts[key.slice(2)] = value;
}
if (!['plan', 'generate', 'summary', 'recover'].includes(action)) throw new Error('Use plan, summary, generate or recover.');
if (opts.manifest && !opts.output) throw new Error('A separate manifest needs an explicit --output folder.');
const manifest = JSON.parse(fs.readFileSync(path.resolve(opts.manifest ?? path.join(here, 'manifest-music.json')), 'utf8'));
const plan = makePlan(manifest, {scope: opts.scope ?? 'all', variants: Number(opts.variants ?? 4),
  limit: opts.limit === undefined ? Infinity : Number(opts.limit), group: opts.group ?? null, first: Number(opts.first ?? 1)});
const output = path.resolve(opts.output ?? path.join(here, '..', '..', 'z-music'));
if (action === 'recover') {
  if (!opts.clip || !opts.from) throw new Error('Recovery needs --clip and --from.');
  console.log('Recovered ' + recoverTake(plan, output, opts.clip, opts.from));
  console.log('No generation requests sent and no additional credits used.');
  process.exit(0);
}
if (opts['allow-moved-clips'] !== undefined && !['true', 'false'].includes(opts['allow-moved-clips']))
  throw new Error('Allow moved clips must be true or false.');
const allowMovedClips = opts['allow-moved-clips'] === 'true';
const inspection = inspectProgress(plan, output, {allowMovedClips});
const summary = {output, ...plan.summary, progress: inspection.summary,
  estimateNote: 'Approximate credits: ' + manifest.creditsPerMinute + ' per minute of music (an estimate from ElevenLabs plan pricing). Your account pricing determines actual charges.'};
if (action === 'summary') { console.log(JSON.stringify(summary)); }
else {
  console.log('Music: ' + plan.summary.sounds + ' tracks / ' + plan.summary.clips + ' takes / ' + plan.summary.minutes + ' minutes');
  console.log('Already saved: ' + inspection.summary.done + '; remaining: ' + inspection.summary.pending);
  if (inspection.summary.exported) console.log('Previously completed clips moved out of this folder: ' + inspection.summary.exported + '; skipped without charging again.');
  console.log('Approximate remaining credits: ' + inspection.summary.estimatedRemainingCredits);
  console.log('Output: ' + output);
  if (inspection.summary.uncertain || inspection.summary.conflicts)
    console.log('Review required: ' + inspection.summary.uncertain + ' uncertain / ' + inspection.summary.conflicts + ' conflicting clips.');
  if (action === 'generate') {
    const controller = new AbortController();
    const stop = () => { console.log('Stopping. Current request may have used credits; progress is preserved.'); controller.abort(); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    try {
      const result = await runBatch(plan, {output, apiKey: process.env.ELEVENLABS_API_KEY,
        allowMovedClips,
        maxCredits: Number(opts['max-credits']), signal: controller.signal,
        onEvent(e) {
          if (e.type === 'start') console.log('Composing ' + e.id + ' (a song can take a few minutes)');
          if (e.type === 'done') console.log('Saved ' + e.completed + '/' + e.total + ' new takes; ' + e.usedCredits + ' reported/estimated credits.');
          if (e.type === 'rate-limit') console.log('Rate limit; waiting ' + e.seconds + 's.');
          if (e.type === 'stop') console.log(e.reason);
        }});
      console.log(result.stopped ? 'Batch stopped; saved clips remain available.' : 'Batch complete.');
      if (result.stopped) process.exitCode = 2;
    } catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
  } else console.log('Plan only: no requests sent and no credits used.');
}
