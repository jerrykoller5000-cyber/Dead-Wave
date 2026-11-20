// qa/2026-11-18-AG-356/capture-ag356.mjs
// Review-only RTX 5080 WebGPU capture for AG-356 (Spitter restyle plan sheet + Bomber side-by-side).
// Does NOT start index.html / game engine.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const QA_DIR = path.join(ROOT, 'qa', '2026-11-18-AG-356');
const FRAMES_DIR = path.join(QA_DIR, 'frames');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const SPITTER_H = 1.9662; // neutral current spitter height from export-glb.mjs
const SPECS = {
  ours: { kind: 'glb', url: '/qa/2026-11-18-AG-356/ours-neutral/spitter.glb', targetHeight: SPITTER_H },
  tripo: { kind: 'glb', url: '/Claude%20outputs/J168/tripo/spitter/Spitter.glb', targetHeight: SPITTER_H },
  proposed: { kind: 'proposed', targetHeight: SPITTER_H },
  bomber: { kind: 'glb', url: '/Claude%20outputs/J168/proportions/ours/bomber.glb', targetHeight: null }, // native 1.9884 m
};

const VIEWS = [
  { id: 'front', yaw: 0, headOnly: false },
  { id: '3q', yaw: 40, headOnly: false },
  { id: 'side', yaw: 90, headOnly: false },
  { id: 'back', yaw: 180, headOnly: false },
  { id: 'head', yaw: 22, headOnly: true },
];

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    '--window-size=1600,1200',
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});

const report = { at: new Date().toISOString(), backend: null, spitterH: SPITTER_H, frames: {}, pairs: {}, proposedSize: null };

try {
  const page = await browser.newPage({ width: 1600, height: 1200 });
  await page.setViewport(1200, 1200);
  await page.send('Page.bringToFront').catch(() => {});
  await page.goto(`${server.origin}/qa/2026-11-18-AG-356/render-ag356.html`, { timeout: 120000 });
  const ready = await page.waitFor('window.AG356_READY === true', { timeout: 60000 });
  assert.ok(ready, 'render-ag356.html did not become ready');

  report.backend = await page.evaluate('window.AG356.backend');
  assert.equal(report.backend, 'WebGPUBackend', `Expected WebGPUBackend, got ${report.backend}`);

  // 1. Export proposed blockout GLB for silhouette/landmark measurement
  const exp = await page.evaluate('window.AG356.exportProposedGlb()');
  fs.writeFileSync(path.join(QA_DIR, 'proposed-spitter.glb'), Buffer.from(exp.glbBase64, 'base64'));
  report.proposedSize = exp.size;
  console.log('Exported proposed-spitter.glb size:', exp.size);

  // 2. Capture OURS / TRIPO / PROPOSED individual views (1200x1200)
  for (const who of ['ours', 'tripo', 'proposed']) {
    for (const v of VIEWS) {
      const outPath = path.join(FRAMES_DIR, `${who}-${v.id}.png`);
      const frame = await page.evaluate(
        `window.AG356.renderSingle(${JSON.stringify(SPECS[who])}, ${v.yaw}, { headOnly: ${v.headOnly}, width: 1200, height: 1200 })`
      );
      await page.setViewport(1200, 1200);
      await page.screenshot(outPath);
      const md5 = crypto.createHash('md5').update(fs.readFileSync(outPath)).digest('hex').slice(0, 8);
      report.frames[`${who}-${v.id}`] = { file: `qa/2026-11-18-AG-356/frames/${who}-${v.id}.png`, md5, ...frame };
      console.log(`Captured ${who}-${v.id}: fillH=${(frame.hFill * 100).toFixed(1)}% h=${frame.boundsH.toFixed(3)}m md5=${md5}`);
    }
  }

  // 3. Capture Bomber vs Spitter side-by-side at true scale (1440x1080)
  await page.setViewport(1440, 1080);
  const pairCases = [
    { id: 'bomber-vs-ours-front', left: SPECS.bomber, right: SPECS.ours, yaw: 0, modelYaw: 0, sil: false, sep: 0.72 },
    { id: 'bomber-vs-proposed-front', left: SPECS.bomber, right: SPECS.proposed, yaw: 0, modelYaw: 0, sil: false, sep: 0.70 },
    { id: 'bomber-vs-proposed-3q', left: SPECS.bomber, right: SPECS.proposed, yaw: 0, modelYaw: -38, sil: false, sep: 0.70 },
    { id: 'bomber-vs-proposed-side', left: SPECS.bomber, right: SPECS.proposed, yaw: 0, modelYaw: -90, sil: false, sep: 0.68 },
    { id: 'bomber-vs-proposed-sil-front', left: SPECS.bomber, right: SPECS.proposed, yaw: 0, modelYaw: 0, sil: true, sep: 0.70 },
    { id: 'bomber-vs-proposed-sil-side', left: SPECS.bomber, right: SPECS.proposed, yaw: 0, modelYaw: -90, sil: true, sep: 0.68 },
    { id: 'bomber-vs-ours-sil-front', left: SPECS.bomber, right: SPECS.ours, yaw: 0, modelYaw: 0, sil: true, sep: 0.72 },
  ];
  for (const pc of pairCases) {
    const outPath = path.join(FRAMES_DIR, `${pc.id}.png`);
    const frame = await page.evaluate(`(async () => {
      const L = ${JSON.stringify(pc.left)}, R = ${JSON.stringify(pc.right)};
      const res = await window.AG356.renderPair(L, R, ${pc.yaw}, { silhouette: ${pc.sil}, separation: ${pc.sep}, modelYawDeg: ${pc.modelYaw}, width: 1440, height: 1080 });
      return res;
    })()`);
    await page.screenshot(outPath);
    const md5 = crypto.createHash('md5').update(fs.readFileSync(outPath)).digest('hex').slice(0, 8);
    report.pairs[pc.id] = { file: `qa/2026-11-18-AG-356/frames/${pc.id}.png`, md5, ...frame };
    console.log(`Captured ${pc.id}: leftH=${frame.leftSize[1]}m rightH=${frame.rightSize[1]}m md5=${md5}`);
  }
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}

fs.writeFileSync(path.join(QA_DIR, 'capture-report.json'), JSON.stringify(report, null, 2));
console.log('DONE AG-356 WebGPU capture.');
