import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, 'qa', '2026-10-25-AG-129');
fs.mkdirSync(QA_DIR, { recursive: true });

// 1. Preserve "before" sheets if not already saved
const lights = [
  { name: 'noon', time: 'noon' },
  { name: 'overcast', time: 0.44 },
  { name: 'dusk', time: 'dusk' },
  { name: 'night', time: 'night' }
];

for (const grp of ['turrets', 'buildables']) {
  for (const l of lights) {
    const src = path.join(ROOT, 'review', 'principles', `${grp}-${l.name}`, 'sheet.jpg');
    const dst = path.join(QA_DIR, `before-${grp}-${l.name}.jpg`);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      console.log(`Saved before sheet: ${path.relative(ROOT, dst)}`);
    }
  }
}

function run(cmd, args) {
  console.log(`\n>>> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${cmd} ${args.join(' ')}`);
  }
}

// 2. Run verification tests (t25, t31, t215) with --jobs 1
run(process.execPath, ['tools/tests/run-all.mjs', 't25', 't31', 't215', '--agent', 'antigravity', '--task', 'AG-129', '--jobs', '1']);

// 3. Start camera on real GPU
run(process.execPath, ['tools/camera.mjs', 'start', '--agent', 'antigravity', '--task', 'AG-129']);

try {
  // 4a. Four-light sheets for turrets
  for (const l of lights) {
    const outDir = `review/principles/turrets-${l.name}/`;
    const job = {
      shots: [{ target: 'turrets', view: 'three', time: l.time }],
      out: outDir,
      sheet: true
    };
    run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(job), '--agent', 'antigravity', '--task', 'AG-129']);
    const sheetSrc = path.join(ROOT, outDir, 'sheet.jpg');
    const sheetDst = path.join(QA_DIR, `after-turrets-${l.name}.jpg`);
    if (fs.existsSync(sheetSrc)) fs.copyFileSync(sheetSrc, sheetDst);
  }

  // 4b. Four-light sheets for buildables
  const buildKinds = ['wall', 'floor', 'barricade', 'sandbag', 'wire', 'railing', 'platform', 'pillar', 'stairs', 'spikes', 'mine', 'lure', 'barrel'];
  for (const l of lights) {
    const outDir = `review/principles/buildables-${l.name}/`;
    const job = {
      shots: buildKinds.map((k) => ({ target: `build:${k}:*`, view: 'three', time: l.time })),
      out: outDir,
      sheet: true
    };
    run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(job), '--agent', 'antigravity', '--task', 'AG-129']);
    const sheetSrc = path.join(ROOT, outDir, 'sheet.jpg');
    const sheetDst = path.join(QA_DIR, `after-buildables-${l.name}.jpg`);
    if (fs.existsSync(sheetSrc)) fs.copyFileSync(sheetSrc, sheetDst);
  }

  // 4c. Close-up profile + 3/4 sheet for AG-129 rebuilt turrets (light, heavy, flame)
  const turretCloseJob = {
    shots: [
      { target: 'build:heavy:*', view: 'three', time: 'noon' },
      { target: 'build:heavy:*', view: 'side', time: 'noon' },
      { target: 'build:light:*', view: 'three', time: 'noon' },
      { target: 'build:light:*', view: 'side', time: 'noon' },
      { target: 'build:flame:*', view: 'three', time: 'noon' },
      { target: 'build:flame:*', view: 'side', time: 'noon' }
    ],
    out: 'qa/2026-10-25-AG-129/turrets-closeup/',
    sheet: true
  };
  run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(turretCloseJob), '--agent', 'antigravity', '--task', 'AG-129']);

  // 4d. Close-up profile + 3/4 sheet for AG-129 rebuilt traps & barrel (spikes, wire, barrel)
  const trapsCloseJob = {
    shots: [
      { target: 'build:spikes:*', view: 'three', time: 'noon' },
      { target: 'build:spikes:*', view: 'low', time: 'noon' },
      { target: 'build:wire:*', view: 'three', time: 'noon' },
      { target: 'build:wire:*', view: 'front', time: 'noon' },
      { target: 'build:barrel:*', view: 'three', time: 'noon' },
      { target: 'build:barrel:*', view: 'side', time: 'noon' }
    ],
    out: 'qa/2026-10-25-AG-129/traps-barrel-closeup/',
    sheet: true
  };
  run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(trapsCloseJob), '--agent', 'antigravity', '--task', 'AG-129']);

  // 4e. Gameplay-distance (12 m) shots across the 4 lights for the 6 rebuilt families
  const gameplayTargets = ['build:heavy', 'build:light', 'build:flame', 'build:spikes', 'build:wire', 'build:barrel'];
  const gameplayShots = [];
  for (const t of gameplayTargets) {
    for (const l of lights) {
      gameplayShots.push({
        target: t,
        yaw: 38,
        pitch: 24,
        dist: 12,
        time: l.time,
        caption: `${t} @ 12m (${l.name})`,
        row: t,
        out: `qa/2026-10-25-AG-129/gameplay-12m/${t.replace(/:/g, '-')}-${l.name}.png`
      });
    }
  }
  const gameplayJob = {
    shots: gameplayShots,
    out: 'qa/2026-10-25-AG-129/gameplay-12m/',
    cols: 4,
    sheet: true
  };
  run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(gameplayJob), '--agent', 'antigravity', '--task', 'AG-129']);

  // 5. Marine Inspector check on build.*
  run(process.execPath, ['tools/camera.mjs', 'reload', '--inspect', '--agent', 'antigravity', '--task', 'AG-129']);
  run(process.execPath, ['tools/camera.mjs', 'check', 'build.', '--out', 'qa/2026-10-25-AG-129/inspector-check', '--agent', 'antigravity', '--task', 'AG-129']);
} finally {
  // 6. Always stop camera daemon
  spawnSync(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-129'], { cwd: ROOT, stdio: 'inherit', env: process.env });
}
