import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, 'qa', '2026-11-21-AG-401');
const WALK_DIR = path.join(ROOT, 'review', 'CH-3', 'walk');
const LOG_PATH = path.join(QA_DIR, 'run-fixup.log');
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });

function log(line) {
  const text = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(text);
  logStream.write(text);
}

// 1. True lamps-off 18-view tour: uses toggleLights() + time "midnight"
const srcOff = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/CG-1-training/tour-after-lightsoff.json'), 'utf8'));
const tourOffV2 = {
  cmd: 'batch',
  shots: srcOff.shots.map((s) => ({
    ...s,
    size: '1920x1080',
    time: 'midnight',
    out: `review/CH-3/walk/lightsoff/${path.basename(s.out)}`,
    pre: 'T.setViewFirstDbg(true); if (T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); await wait(450);',
  })),
  sheet: true,
  cols: 3,
  sheetFile: 'review/CH-3/walk/sheet-tour-lightsoff.jpg',
};

// 2. Fixed tunnel open shot + 2 supplemental close-ups (lane numbers + mop corner)
const closeupsFix = {
  cmd: 'batch',
  shots: [
    {
      target: 'xyz:3,-200,-638.9',
      cam: { x: 3.0, y: -198.3, z: -640.5, tx: 3.0, ty: -200.0, tz: -638.7, fov: 62 },
      caption: 'C05b-lane-numbers Lane numbers on floor downrange of firing bench',
      size: '1920x1080',
      out: 'review/CH-3/walk/closeups/C05b-lane-numbers.png',
      time: 'noon',
      pre: 'T.setViewFirstDbg(true); if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); await wait(450);',
    },
    {
      target: 'xyz:-43.5,-199.4,-613.3',
      cam: { x: -41.0, y: -198.3, z: -615.8, tx: -43.5, ty: -199.4, tz: -613.3, fov: 62 },
      caption: 'C22b-mop-corner Gate-end west corner: mop bucket, squeegee and wall',
      size: '1920x1080',
      out: 'review/CH-3/walk/closeups/C22b-mop-corner.png',
      time: 'noon',
      pre: 'T.setViewFirstDbg(true); if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); await wait(450);',
    },
    {
      target: 'xyz:-26,-198.3,-604',
      cam: { x: -26.0, y: -198.3, z: -614.5, tx: -26.0, ty: -198.3, tz: -604.0, fov: 65 },
      caption: 'C21-tunnel-open Zombie holding tunnel interior (gate open via deployNow)',
      size: '1920x1080',
      out: 'review/CH-3/walk/closeups/C21-tunnel-open.png',
      time: 'noon',
      pre: 'T.setViewFirstDbg(true); if (!T.trainingDbg.lights().on) T.trainingDbg.toggleLights(); T.trainingDbg.deployNow("shambler", 1); await wait(1800);',
    },
  ],
  sheet: true,
  cols: 3,
  sheetFile: 'review/CH-3/walk/sheet-closeups-extra.jpg',
};

fs.writeFileSync(path.join(QA_DIR, 'job-tour-lightsoff-v2.json'), JSON.stringify(tourOffV2, null, 2));
fs.writeFileSync(path.join(QA_DIR, 'job-closeups-fix.json'), JSON.stringify(closeupsFix, null, 2));

function runCam(args) {
  log(`RUN: node tools/camera.mjs ${args.join(' ')}`);
  const res = spawnSync(process.execPath, ['tools/camera.mjs', ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.stdout) { process.stdout.write(res.stdout); logStream.write(res.stdout); }
  if (res.stderr) { process.stderr.write(res.stderr); logStream.write(res.stderr); }
  log(`EXIT: ${res.status}`);
  return res.status ?? 1;
}

const common = ['--agent', 'antigravity', '--task', 'AG-401'];
let exitCode = 0;
try {
  let code = runCam(['start', '--training', '--onscreen', '--size', '1920x1080', ...common]);
  if (code !== 0) throw new Error(`camera start failed: ${code}`);

  code = runCam(['job', 'qa/2026-11-21-AG-401/job-tour-lightsoff-v2.json', ...common]);
  if (code !== 0) exitCode = code;

  code = runCam(['job', 'qa/2026-11-21-AG-401/job-closeups-fix.json', ...common]);
  if (code !== 0 && !exitCode) exitCode = code;
} catch (err) {
  log(`ERROR: ${err && err.stack ? err.stack : err}`);
  exitCode = 1;
} finally {
  runCam(['stop', ...common]);
}

const checkShots = [...tourOffV2.shots, ...closeupsFix.shots];
const hashes = new Map();
let missing = 0;
for (const s of checkShots) {
  const abs = path.join(ROOT, s.out);
  if (!fs.existsSync(abs)) { log(`MISSING: ${s.out}`); missing++; continue; }
  const h = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  hashes.set(h, s.out);
}
log(`VERIFY FIXUP: total=${checkShots.length} present=${checkShots.length - missing} unique=${hashes.size} missing=${missing}`);
logStream.end();
process.exit(exitCode || (missing > 0 ? 1 : 0));
