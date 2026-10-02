// tools/belowsound.mjs — CL-101: record a scripted walk below (AudioSys's Hollows ambience) for Jerry to listen to.
//
//   node tools/belowsound.mjs [theme] [out]     theme: wet (default), iron, root, shale, hill; out: review/below-sound/v1
//   node tools/belowsound.mjs places [out]      CL-82: a walk up to a cave mouth by night, away, and down to the pit
//
// Opens tools/belowsound.html in Chrome, which plays the ambience with the real core/audio.js and records the mix
// (the context's output goes to a MediaRecorder). The walk: topside, down into the warren, quiet with the Hush humming,
// the stir climbing (the rock's groans, the guardian in the walls), the warning, the meter knocked back, the Hush
// dying, back up. Writes <out>/below-<theme>.webm, then ffmpeg makes the .ogg next to it if it's there.
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const theme = process.argv[2] || 'wet';
const out = path.resolve(ROOT, process.argv[3] || 'review/below-sound/v1');
export const PLAN = [
  { from: 0, to: 4, label: 'topside' },
  { from: 4, to: 16, label: 'below, quiet, the Hush on', below: true, stir: 0.08 },
  { from: 16, to: 30, label: 'the stir climbing', below: true, stirFrom: 0.1, stirTo: 0.97 },
  { from: 30, to: 38, label: 'the warning', below: true, stir: 1, phase: 'warning' },
  { from: 38, to: 41, label: 'knocked back to half', below: true, stir: 0.5 },
  { from: 41, to: 46, label: 'the Hush dies', below: true, stir: 0.52, hush: false },
  { from: 46, to: 50, label: 'back up', below: false }
];
// CL-82: the places that are alive, topside (no warren).
const PLACES = [
  { from: 0, to: 4, label: 'in the open, night', night: true },
  { from: 4, to: 22, label: 'walking up to a cave mouth', night: true, cave: 0.7, cavePan: -0.4 },
  { from: 22, to: 26, label: 'away again', night: true },
  { from: 26, to: 40, label: 'by the lake over the pit', night: true, pit: 0.8, pitPan: 0.3 }
];
const plan = theme === 'places' ? PLACES : PLAN;
const srv = await serve(ROOT);
const browser = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.goto(srv.origin + '/tools/belowsound.html');
  await page.waitFor('window.ready === true', { timeout: 30000 });
  const r = await page.evaluate(`runTour(${JSON.stringify(theme === 'places' ? 'shale' : theme)}, ${JSON.stringify(plan)})`, 120000);
  if (!r || r.error) throw new Error('no recording: ' + (r && r.error));
  fs.mkdirSync(out, { recursive: true });
  const webm = path.join(out, `below-${theme}.webm`);
  fs.writeFileSync(webm, Buffer.from(r.b64, 'base64'));
  // The game's ambience sits low under everything else; turned up here (peak to -1 dB) so it can be heard on its own.
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-af', 'loudnorm=I=-24:TP=-1:LRA=18', '-c:a', 'libopus', '-b:a', '128k', webm.replace(/\.webm$/, '.ogg')]); fs.unlinkSync(webm); } catch { /* keep the webm */ }
  console.log(theme, 'recorded:', JSON.stringify(r.counts), r.marks.join(' / '));
} finally { await browser.close(); await srv.close(); }
