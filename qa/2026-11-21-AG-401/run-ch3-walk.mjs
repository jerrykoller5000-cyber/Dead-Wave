import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, 'qa', '2026-11-21-AG-401');
const WALK_DIR = path.join(ROOT, 'review', 'CH-3', 'walk');
fs.mkdirSync(QA_DIR, { recursive: true });
fs.mkdirSync(path.join(WALK_DIR, 'noon'), { recursive: true });
fs.mkdirSync(path.join(WALK_DIR, 'lightsoff'), { recursive: true });
fs.mkdirSync(path.join(WALK_DIR, 'closeups'), { recursive: true });

const LOG_PATH = path.join(QA_DIR, 'run.log');
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });

function log(line) {
  const text = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(text);
  logStream.write(text);
}

// 1. Build 1920x1080 tour jobs from CG-1 fixed views
function adaptTour(srcRel, outSub, sheetName, lightsOn) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, srcRel), 'utf8'));
  const shots = src.shots.map((s) => {
    const base = path.basename(s.out);
    return {
      ...s,
      size: '1920x1080',
      out: `review/CH-3/walk/${outSub}/${base}`,
      pre: lightsOn
        ? 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(true); await wait(500);'
        : 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(false); await wait(500);',
    };
  });
  return {
    cmd: 'batch',
    shots,
    sheet: true,
    cols: 3,
    sheetFile: `review/CH-3/walk/${sheetName}`,
  };
}

const tourNoon = adaptTour('review/CG-1-training/tour-after-noon.json', 'noon', 'sheet-tour-noon.jpg', true);
const tourOff = adaptTour('review/CG-1-training/tour-after-lightsoff.json', 'lightsoff', 'sheet-tour-lightsoff.jpg', false);

const PRE_ON = 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(true); await wait(450);';
const PRE_SHUTTER_HALF = 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(true); T.trainingDbg.tg().securityDoor.setState({ amount: 0.45, locked: true, blocked: false }); await wait(450);';
const PRE_SHUTTER_RESET = 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(true); T.trainingDbg.tg().securityDoor.setState({ amount: 1, locked: false, blocked: false }); await wait(450);';
const PRE_GATE_OPEN = 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(true); T.trainingDbg.tg().releaseGate.setState({ amount: 1, lit: true }); await wait(450);';
const PRE_GATE_RESET = 'T.setViewFirstDbg(true); T.trainingDbg.tg().setLights(true); T.trainingDbg.tg().releaseGate.setState({ amount: 0, lit: false }); await wait(450);';

const cShot = (id, caption, cam, pre = PRE_ON) => ({
  target: `xyz:${cam.tx},${cam.ty},${cam.tz}`,
  cam,
  caption: `${id} ${caption}`,
  size: '1920x1080',
  out: `review/CH-3/walk/closeups/${id}.png`,
  time: 'noon',
  pre,
});

const closeupsJob = {
  cmd: 'batch',
  shots: [
    // Floor tiles (feet + 10 m grazing angle)
    cShot('C01-floor-feet', 'Floor tile at feet (~1.5 m, eye height)', { x: 0, y: -198.3, z: -646.0, tx: 0, ty: -200.0, tz: -644.6, fov: 65 }),
    cShot('C02-floor-10m', 'Floor tile at 10 m grazing angle + firing line paint', { x: 0, y: -198.3, z: -649.5, tx: 0, ty: -200.0, tz: -639.5, fov: 55 }),

    // Range ceiling baffles + fixtures + duct/pipe
    cShot('C03-ceiling-baffles', 'Range ceiling baffles, fixtures, duct and pipe', { x: 0, y: -197.4, z: -643.5, tx: 0, ty: -194.2, tz: -635.5, fov: 72 }),

    // Firing bench top + front + CG-7 props + lane numbers
    cShot('C04-bench-top-props', 'Firing bench west end: top, ear tray, mug, clipboard, bucket, broom', { x: -5.3, y: -198.3, z: -641.3, tx: -7.1, ty: -199.2, tz: -639.5, fov: 60 }),
    cShot('C05-bench-front-lanes', 'Firing bench front, stripe, glove, lane numbers and floor paint', { x: 2.0, y: -198.3, z: -642.0, tx: 2.6, ty: -199.3, tz: -639.2, fov: 62 }),

    // Hangar column base + truss joint
    cShot('C06-column-base', 'Hangar column base (unobstructed east pillar z=-616)', { x: -10.4, y: -198.3, z: -617.4, tx: -8.0, ty: -199.3, tz: -616.0, fov: 60 }),
    cShot('C07-truss-joint', 'Hangar roof truss-to-column joint and roof deck', { x: -14.5, y: -183.0, z: -635.5, tx: -8.5, ty: -177.5, tz: -640.0, fov: 65 }),

    // Armory booth + CIF + Kiosk copies
    cShot('C08-armory-booth', 'Armory booth front (mesh, window, racks behind)', { x: 5.4, y: -198.3, z: -643.0, tx: 7.95, ty: -198.6, tz: -643.0, fov: 62 }),
    cShot('C09a-cif-copy', 'CIF terminal copy close-up', { x: 5.7, y: -198.3, z: -650.2, tx: 7.95, ty: -198.6, tz: -650.2, fov: 60 }),
    cShot('C09b-kiosk-copy', 'Supply kiosk copy + wall notice close-up', { x: 5.7, y: -198.3, z: -646.6, tx: 7.95, ty: -198.6, tz: -646.6, fov: 60 }),

    // Backstop + target stand base
    cShot('C10-backstop', 'Range backstop rubber blocks, frame and hood', { x: 0, y: -198.3, z: -613.2, tx: 0, ty: -198.5, tz: -610.0, fov: 62 }),
    cShot('C11-target-base', 'Target stand base, pole and lower plate (lane 1)', { x: 4.5, y: -198.4, z: -633.8, tx: 6.0, ty: -199.3, tz: -632.0, fov: 60 }),

    // Security shutter (lowered halfway to show slats + guides + trim + keypads)
    cShot('C12-security-shutter', 'Security shutter (half-down), door trim and keypad', { x: -10.8, y: -198.3, z: -648.0, tx: -8.0, ty: -198.4, tz: -648.0, fov: 65 }, PRE_SHUTTER_HALF),

    // Back wall: rack + Days board + roster; lockers + whiteboard + CG-7 light switch
    cShot('C13-backwall-rack', 'Back-wall weapon rack (missing hook), Days board and roster', { x: 3.4, y: -198.3, z: -649.2, tx: 3.4, ty: -198.5, tz: -652.0, fov: 65 }, PRE_SHUTTER_RESET),
    cShot('C14-lockers-switch', 'Back-wall lockers (dented door), whiteboard and CG-7 light switch', { x: -4.4, y: -198.3, z: -649.0, tx: -4.4, ty: -198.6, tz: -652.0, fov: 68 }),

    // Signs/posters + cracked taped monitor & range console
    cShot('C15a-poster-sign', 'Range safety sign on swing bracket (~1.8 m)', { x: 6.2, y: -198.2, z: -638.8, tx: 7.7, ty: -198.2, tz: -637.6, fov: 50 }),
    cShot('C15b-monitor-console', 'Cracked taped monitor (west wall) + range console', { x: -5.4, y: -198.3, z: -643.8, tx: -8.0, ty: -198.6, tz: -643.5, fov: 68 }),

    // Training dummy
    cShot('C16-dummy', 'Training melee dummy torso, seams, post and base', { x: -4.7, y: -198.3, z: -641.6, tx: -6.85, ty: -198.8, tz: -642.1, fov: 58 }),

    // Build room west wall: skull window + HQ panel
    cShot('C17-skull-window', 'Skull intake window + mounted specimens', { x: -41.4, y: -198.3, z: -643.0, tx: -43.98, ty: -198.6, tz: -643.0, fov: 62 }),
    cShot('C18-hq-panel', 'HQ zombie alarm panel close-up', { x: -41.6, y: -198.3, z: -637.0, tx: -43.98, ty: -198.6, tz: -637.0, fov: 60 }),

    // Razor coil + fence post
    cShot('C19-razor-fence', 'Perimeter fence post, rails, chain-link and razor coil', { x: -11.9, y: -198.2, z: -636.0, tx: -10.0, ty: -197.6, tz: -636.0, fov: 58 }),

    // Zombie gate leaves (closed) + tunnel (open) + gate-end props
    cShot('C20-zombie-gate', 'Zombie gate leaves, frame and containment header (closed)', { x: -26.0, y: -198.3, z: -616.5, tx: -26.0, ty: -198.2, tz: -612.0, fov: 68 }),
    cShot('C21-tunnel-open', 'Zombie holding tunnel interior (gate open, from room side)', { x: -26.0, y: -198.3, z: -614.5, tx: -26.0, ty: -198.3, tz: -604.0, fov: 65 }, PRE_GATE_OPEN),
    cShot('C22-gate-containment-props', 'Gate end: hose reel, stencil plate, floor drain and grime', { x: -30.4, y: -198.3, z: -615.4, tx: -31.5, ty: -199.1, tz: -612.0, fov: 62 }, PRE_GATE_RESET),

    // Infirmary inside (bed/IV/O2/revivals + cabinet/sharps/mug/cot)
    cShot('C23-infirmary-bed', 'Infirmary inside: bed, IV stand, O2 tank, revivals tally', { x: -38.0, y: -198.3, z: -648.3, tx: -41.2, ty: -199.1, tz: -650.3, fov: 68 }),
    cShot('C24-infirmary-cabinet', 'Infirmary inside: medical cabinet, sharps bin, mug, cot', { x: -40.5, y: -198.3, z: -648.3, tx: -37.8, ty: -199.1, tz: -650.4, fov: 68 }),

    // Containment gun close-up
    cShot('C25-containment-gun', 'Containment wall turret close-up (west wall)', { x: -39.5, y: -195.2, z: -633.8, tx: -43.2, ty: -194.4, tz: -632.0, fov: 58 }),
  ],
  sheet: true,
  cols: 3,
  sheetFile: 'review/CH-3/walk/sheet-closeups.jpg',
};

const jobs = [
  ['job-tour-noon.json', tourNoon],
  ['job-tour-lightsoff.json', tourOff],
  ['job-closeups.json', closeupsJob],
];
for (const [name, data] of jobs) {
  fs.writeFileSync(path.join(QA_DIR, name), JSON.stringify(data, null, 2));
}
log(`Wrote 3 jobs (${tourNoon.shots.length} + ${tourOff.shots.length} + ${closeupsJob.shots.length} = ${tourNoon.shots.length + tourOff.shots.length + closeupsJob.shots.length} shots at 1920x1080)`);

function runCam(args) {
  log(`RUN: node tools/camera.mjs ${args.join(' ')}`);
  const res = spawnSync(process.execPath, ['tools/camera.mjs', ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.stdout) {
    process.stdout.write(res.stdout);
    logStream.write(res.stdout);
  }
  if (res.stderr) {
    process.stderr.write(res.stderr);
    logStream.write(res.stderr);
  }
  log(`EXIT: ${res.status}`);
  return res.status ?? 1;
}

const common = ['--agent', 'antigravity', '--task', 'AG-401'];
let exitCode = 0;

try {
  let code = runCam(['start', '--training', '--onscreen', '--size', '1920x1080', ...common]);
  if (code !== 0) throw new Error(`camera start failed with code ${code}`);

  for (const [name] of jobs) {
    code = runCam(['job', `qa/2026-11-21-AG-401/${name}`, ...common]);
    if (code !== 0) {
      log(`WARNING: ${name} exited with code ${code}`);
      if (!exitCode) exitCode = code;
    }
  }
} catch (err) {
  log(`ERROR: ${err && err.stack ? err.stack : err}`);
  exitCode = 1;
} finally {
  runCam(['stop', ...common]);
}

// Verify all outputs exist, non-empty, and SHA-256 unique
const allShots = [...tourNoon.shots, ...tourOff.shots, ...closeupsJob.shots];
const hashes = new Map();
let missing = 0;
let small = 0;
let dupes = 0;
for (const s of allShots) {
  const abs = path.join(ROOT, s.out);
  if (!fs.existsSync(abs)) {
    log(`MISSING: ${s.out}`);
    missing++;
    continue;
  }
  const buf = fs.readFileSync(abs);
  if (buf.length < 5000) {
    log(`SMALL (${buf.length} B): ${s.out}`);
    small++;
  }
  const h = crypto.createHash('sha256').update(buf).digest('hex');
  if (hashes.has(h)) {
    log(`DUPLICATE: ${s.out} === ${hashes.get(h)}`);
    dupes++;
  } else {
    hashes.set(h, s.out);
  }
}
log(`VERIFY: total=${allShots.length} present=${allShots.length - missing} unique=${hashes.size} missing=${missing} small=${small} dupes=${dupes}`);
logStream.end();
process.exit(exitCode || (missing > 0 ? 1 : 0));
