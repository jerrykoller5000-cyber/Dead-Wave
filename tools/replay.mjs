// CU-160: replay one of Jerry's clips through the game-test slot.
//
//   node tools/replay.mjs qa/clips/<clip>.json --agent cursor --task CU-160
//   node tools/replay.mjs <clip> --from 12 --shots 30 --frames 0-90 --video
//
// --from is seconds into the clip. --shots is every Nth replayed frame (default 30).
// --video asks ffmpeg for an mp4 of those frames; without ffmpeg the filmstrip is the record.
// The game opens with the clip's seed. TT.stepFrame drives his dts. Output lands in
// qa/clips/<name>/replay-current/.
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes('--' + name);

if (flag('help') || !argv.length || argv[0].startsWith('--')) {
  console.log('node tools/replay.mjs qa/clips/<clip>.json --agent <name> --task <id> [--from s] [--shots N] [--frames a-b] [--video]');
  process.exit(argv.length ? 0 : 1);
}

if (!process.env.DW_GAME_TEST_TOKEN) {
  const agent = opt('agent', '');
  const task = opt('task', '');
  if (!agent || !task) {
    console.error('replay needs --agent and --task; it queues itself on the game-test slot');
    process.exit(1);
  }
  const slot = fileURLToPath(new URL('./game-test-slot.mjs', import.meta.url));
  const child = spawn(process.execPath, [slot, 'run', agent, task, '--checks', 'replay ' + path.basename(argv[0]), '--minutes', opt('minutes', '20'), '--', process.execPath, fileURLToPath(import.meta.url), ...argv], { stdio: 'inherit', cwd: ROOT });
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  await run();
}

async function run() {
  const clipPath = path.resolve(ROOT, argv[0]);
  const clip = JSON.parse(fs.readFileSync(clipPath, 'utf8'));
  const from = Number(opt('from', '0')) || 0;
  const every = Math.max(1, Number(opt('shots', '30')) || 30);
  const range = String(opt('frames', '') || '');
  let lo = 0, hi = Infinity;
  if (range.includes('-')) { const [a, b] = range.split('-'); lo = Number(a) || 0; hi = Number(b) || Infinity; }
  const name = path.basename(clipPath, '.json');
  const outDir = path.join(ROOT, 'qa', 'clips', name, 'replay-current');
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 1280, height: 720 });
  const seed = clip.rngSeed >>> 0;
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&flightrng=${seed}`, { timeout: 180000 });
  const ready = await page.waitFor('!!window.TT && !!window.TT.stepFrame', { timeout: 180000 });
  if (!ready) throw new Error('the game did not finish loading');
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  const armed = await page.evaluate(`window.TT.flightRestore(${JSON.stringify(clip)})`);
  const frames = clip.frames || [];
  let start = 0;
  if (from > 0) {
    while (start < frames.length && frames[start].t < (clip.snapshots[0] ? clip.snapshots[0].t : 0) + from) start++;
  }
  start = Math.max(start, lo);
  const end = Math.min(frames.length, hi);
  const numbers = [];
  let shot = 0;
  for (let i = start; i < end; i++) {
    const f = frames[i];
    const row = await page.evaluate(`(() => { window.TT.stepFrame(${f.dt}); const p = window.TT.player.position, c = window.TT.camera; return { i: ${i}, t: ${f.t}, px: p.x, py: p.y, pz: p.z, cx: c.position.x, cy: c.position.y, cz: c.position.z, fov: c.fov, speed: Math.hypot(p.x - ${f.px}, p.z - ${f.pz}) }; })()`);
    numbers.push(row);
    if ((i - start) % every === 0) {
      shot++;
      await page.screenshot(path.join(outDir, 'f' + String(shot).padStart(4, '0') + '.png'));
    }
  }
  fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ clip: name, commit: clip.commit || null, from, frames: numbers }, null, 1));
  if (flag('video')) {
    await new Promise((resolve) => {
      execFile('ffmpeg', ['-y', '-framerate', '10', '-i', path.join(outDir, 'f%04d.png'), '-pix_fmt', 'yuv420p', path.join(outDir, 'replay.mp4')], (err) => {
        if (err) console.log('replay: no ffmpeg, filmstrip only');
        else console.log('video: ' + path.join(outDir, 'replay.mp4'));
        resolve();
      });
    });
  }
  console.log('replay: ' + numbers.length + ' frames, ' + shot + ' shots -> ' + path.relative(ROOT, outDir));
  try { await page.send('Page.close', {}); } catch (_) {}
  try { await browser.close(); } catch (_) {}
  try { await server.close(); } catch (_) {}
}
