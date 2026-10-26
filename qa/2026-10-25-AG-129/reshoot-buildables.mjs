import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, 'qa', '2026-10-25-AG-129');

const lights = [
  { name: 'noon', time: 'noon' },
  { name: 'overcast', time: 0.44 },
  { name: 'dusk', time: 'dusk' },
  { name: 'night', time: 'night' }
];

function cleanDir(relDir) {
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return;
  for (const f of fs.readdirSync(abs)) {
    if (f.endsWith('.png') || f.endsWith('.json') || f.endsWith('.jpg')) {
      try { fs.unlinkSync(path.join(abs, f)); } catch {}
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

run(process.execPath, ['tools/camera.mjs', 'start', '--agent', 'antigravity', '--task', 'AG-129']);

try {
  const buildKinds = ['wall', 'floor', 'barricade', 'sandbag', 'wire', 'railing', 'platform', 'pillar', 'stairs', 'spikes', 'mine', 'lure', 'barrel'];
  for (const l of lights) {
    const outDir = `review/principles/buildables-${l.name}/`;
    cleanDir(outDir);
    const job = {
      shots: buildKinds.map((k) => ({ target: `build:${k}:*`, view: 'three', time: l.time, wait: 30 })),
      out: outDir,
      sheet: true
    };
    run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(job), '--agent', 'antigravity', '--task', 'AG-129']);
    const sheetSrc = path.join(ROOT, outDir, 'sheet.jpg');
    const sheetDst = path.join(QA_DIR, `after-buildables-${l.name}.jpg`);
    if (fs.existsSync(sheetSrc)) fs.copyFileSync(sheetSrc, sheetDst);
  }

  cleanDir('qa/2026-10-25-AG-129/traps-barrel-closeup/');
  const trapsCloseJob = {
    shots: [
      { target: 'build:spikes:*', view: 'three', time: 'noon', wait: 30 },
      { target: 'build:spikes:*', view: 'low', time: 'noon', wait: 30 },
      { target: 'build:wire:*', view: 'three', time: 'noon', wait: 30 },
      { target: 'build:wire:*', view: 'front', time: 'noon', wait: 30 },
      { target: 'build:barrel:*', view: 'three', time: 'noon', wait: 30 },
      { target: 'build:barrel:*', view: 'side', time: 'noon', wait: 30 }
    ],
    out: 'qa/2026-10-25-AG-129/traps-barrel-closeup/',
    sheet: true
  };
  run(process.execPath, ['tools/camera.mjs', 'job', JSON.stringify(trapsCloseJob), '--agent', 'antigravity', '--task', 'AG-129']);

  cleanDir('qa/2026-10-25-AG-129/gameplay-12m/');
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
        wait: 30,
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

  cleanDir('qa/2026-10-25-AG-129/inspector-check');
  run(process.execPath, ['tools/camera.mjs', 'reload', '--inspect', '--agent', 'antigravity', '--task', 'AG-129']);
  run(process.execPath, ['tools/camera.mjs', 'check', 'build.', '--out', 'qa/2026-10-25-AG-129/inspector-check', '--agent', 'antigravity', '--task', 'AG-129']);
} finally {
  spawnSync(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-129'], { cwd: ROOT, stdio: 'inherit', env: process.env });
}
