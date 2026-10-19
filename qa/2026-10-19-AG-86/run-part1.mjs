import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-10-19-AG-86');
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

function saveDataUrl(filePath, dataUrl) {
  const m = /^data:[^;]+;base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid data URL for ' + filePath);
  fs.writeFileSync(filePath, Buffer.from(m[1], 'base64'));
}

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });

const summary = {
  at: new Date().toISOString(),
  renderer: null,
  feet: [],
  budgetModels: [],
  benchNight20High: null,
};

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const url = `${server.origin}/index.html?inspect`;
  console.log(`part1: opening inspector ${url}`);
  await page.goto(url, { waitUntil: 'none' });
  const ready = await page.waitFor('!!(window.DWInspect && window.DWInspect.ready)', { timeout: 120000 });
  if (!ready) throw new Error('DWInspect never became ready');

  summary.renderer = await page.evaluate(`(() => {
    const gl = window.TT?.renderer?.getContext?.();
    const dbg = gl?.getExtension?.('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : (window.TT?.renderer?.constructor?.name || 'unknown');
  })()`);
  console.log(`part1: renderer = ${summary.renderer}`);

  // 1. GP-19929 walking feet (brute, drowned, spitter, military, colossus, side views)
  const walkIds = ['zombie.brute', 'zombie.drowned', 'zombie.spitter', 'zombie.military', 'zombie.colossus'];
  for (const id of walkIds) {
    const res = await page.evaluate(`(async () => {
      const D = window.DWInspect;
      await D.show(${JSON.stringify(id)}, { mode: 'walk', view: 'side', instant: true });
      D.overlay('grid', true);
      D.play();
      const ix = D._ix;
      const floorY = ix.stage?.group?.position?.y ?? 0;
      const z = D.zombie.get();
      const ud = z?.mesh?.userData || {};
      const Three = ix.THREE;
      let minSoleRel = Infinity;
      let maxSoleRel = -Infinity;
      const tStart = ix.clock.gameTime;
      while (ix.clock.gameTime - tStart < 1.2) {
        await ix.nextFrame();
        z.mesh.updateMatrixWorld(true);
        for (const side of ['L', 'R']) {
          const ankle = ud['ankle' + side] || ud['leg' + side];
          if (ankle) {
            const box = new Three.Box3().setFromObject(ankle);
            if (Number.isFinite(box.min.y)) {
              const rel = box.min.y - z.mesh.position.y;
              if (rel < minSoleRel) minSoleRel = rel;
              if (rel > maxSoleRel) maxSoleRel = rel;
            }
          }
        }
      }
      D.pause();
      // Frame the side view cleanly
      D.view({ yaw: 90, pitch: 4, margin: 1.15 }, { instant: true, follow: true });
      await ix.nextFrame();
      const png = await D.shot({ type: 'image/png' });
      const cur = D.current();
      return {
        id: ${JSON.stringify(id)},
        info: cur?.info,
        size: cur?.size,
        minSoleRel: Number.isFinite(minSoleRel) ? +minSoleRel.toFixed(4) : null,
        maxSoleRel: Number.isFinite(maxSoleRel) ? +maxSoleRel.toFixed(4) : null,
        png
      };
    })()`, 60000);
    const shortName = id.replace('zombie.', '');
    const outPath = path.join(SHOTS_DIR, `gp19929-${shortName}-walk-side.png`);
    saveDataUrl(outPath, res.png);
    summary.feet.push({
      id: res.id,
      shot: `qa/2026-10-19-AG-86/shots/gp19929-${shortName}-walk-side.png`,
      minSoleRelM: res.minSoleRel,
      maxSoleRelM: res.maxSoleRel,
      info: res.info,
    });
    console.log(`part1: captured ${id} walk-side (sole rel y: [${res.minSoleRel}, ${res.maxSoleRel}] m)`);
  }

  // 2. GP-19930 budget models (military, bomber, screamer, demon, spitter) in live mode (front & three views)
  const budgetIds = ['zombie.military', 'zombie.bomber', 'zombie.screamer', 'zombie.demon', 'zombie.spitter'];
  for (const id of budgetIds) {
    const res = await page.evaluate(`(async () => {
      const D = window.DWInspect;
      await D.show(${JSON.stringify(id)}, { mode: 'live', view: 'front', instant: true });
      const ix = D._ix;
      D.play();
      await ix.waitGame(0.25);
      D.pause();
      D.view({ yaw: 0, pitch: 5, margin: 1.12 }, { instant: true, follow: true });
      await ix.nextFrame();
      const frontPng = await D.shot({ type: 'image/png' });
      D.view({ yaw: 36, pitch: 12, margin: 1.12 }, { instant: true, follow: true });
      await ix.nextFrame();
      const threePng = await D.shot({ type: 'image/png' });
      const cur = D.current();
      return {
        id: ${JSON.stringify(id)},
        info: cur?.info,
        size: cur?.size,
        errors: D.errors(),
        frontPng,
        threePng
      };
    })()`, 60000);
    const shortName = id.replace('zombie.', '');
    const frontPath = path.join(SHOTS_DIR, `gp19930-${shortName}-front.png`);
    const threePath = path.join(SHOTS_DIR, `gp19930-${shortName}-three.png`);
    saveDataUrl(frontPath, res.frontPng);
    saveDataUrl(threePath, res.threePng);
    summary.budgetModels.push({
      id: res.id,
      frontShot: `qa/2026-10-19-AG-86/shots/gp19930-${shortName}-front.png`,
      threeShot: `qa/2026-10-19-AG-86/shots/gp19930-${shortName}-three.png`,
      info: res.info,
      size: res.size,
      errors: res.errors,
    });
    console.log(`part1: captured ${id} live budget model (tris=${res.info?.tris}, meshes=${res.info?.meshes}, mats=${res.info?.mats})`);
  }

  // Build composite contact sheet of the 5 walking side shots (row 1) + 5 GP-19930 front shots (row 2) + 5 GP-19930 3/4 shots (row 3)
  const tiles = [
    ...walkIds.map((id) => ({
      label: `GP-19929 ${id} (walk side)`,
      b64: fs.readFileSync(path.join(SHOTS_DIR, `gp19929-${id.replace('zombie.', '')}-walk-side.png`)).toString('base64'),
    })),
    ...budgetIds.map((id) => {
      const m = summary.budgetModels.find((x) => x.id === id);
      return {
        label: `GP-19930 ${id} front (${m?.info?.tris}t/${m?.info?.meshes}d)`,
        b64: fs.readFileSync(path.join(SHOTS_DIR, `gp19930-${id.replace('zombie.', '')}-front.png`)).toString('base64'),
      };
    }),
    ...budgetIds.map((id) => {
      const m = summary.budgetModels.find((x) => x.id === id);
      return {
        label: `GP-19930 ${id} 3/4 (${m?.info?.tris}t/${m?.info?.meshes}d)`,
        b64: fs.readFileSync(path.join(SHOTS_DIR, `gp19930-${id.replace('zombie.', '')}-three.png`)).toString('base64'),
      };
    }),
  ];

  const sheetDataUrl = await page.evaluate(`(async (tiles) => {
    const cols = 5, rows = 3, tw = 384, th = 216, header = 34;
    const c = document.createElement('canvas');
    c.width = cols * tw;
    c.height = rows * th + header;
    const g = c.getContext('2d');
    g.fillStyle = '#111';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#f2c418';
    g.font = '600 16px Arial';
    g.fillText('AG-86 Part 1 · GP-19929 Walking Feet (Row 1) & GP-19930 Live Budget Models (Rows 2-3) · RTX 5080', 10, 22);
    for (let i = 0; i < tiles.length; i++) {
      const im = new Image();
      await new Promise((r, j) => { im.onload = r; im.onerror = j; im.src = 'data:image/png;base64,' + tiles[i].b64; });
      const x = (i % cols) * tw;
      const y = header + Math.floor(i / cols) * th;
      g.drawImage(im, x, y, tw, th);
      g.fillStyle = 'rgba(0,0,0,0.72)';
      g.fillRect(x, y + th - 24, tw, 24);
      g.fillStyle = '#f4ecd0';
      g.font = '600 12px Arial';
      g.fillText(tiles[i].label, x + 6, y + th - 8);
      g.strokeStyle = '#222';
      g.strokeRect(x, y, tw, th);
    }
    return c.toDataURL('image/jpeg', 0.9);
  })(${JSON.stringify(tiles)})`, 60000);
  saveDataUrl(path.join(SHOTS_DIR, 'part1-sheet.jpg'), sheetDataUrl);
  console.log('part1: saved qa/2026-10-19-AG-86/shots/part1-sheet.jpg');
} finally {
  await browser.close();
  await server.close();
}

// 3. Now run tools/bench.mjs --night 20 --gfx high sequentially (single game instance)
console.log('part1: running node tools/bench.mjs --night 20 --gfx high ...');
const benchRun = spawnSync(process.execPath, [path.join(ROOT, 'tools/bench.mjs'), '--night', '20', '--gfx', 'high'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
process.stdout.write(benchRun.stdout || '');
process.stderr.write(benchRun.stderr || '');
if (benchRun.status !== 0) {
  throw new Error(`bench.mjs exited with status ${benchRun.status}`);
}
const jsonLines = (benchRun.stdout || '')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.startsWith('{') && l.endsWith('}'));
const lastJson = jsonLines.at(-1);
if (!lastJson) throw new Error('No JSON line found in bench.mjs output');
summary.benchNight20High = JSON.parse(lastJson);
fs.writeFileSync(path.join(OUT_DIR, 'part1-bench.jsonl'), lastJson + '\n', 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'part1-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log('part1: complete ->', lastJson);
