import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, jobReq, report } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the crew game-test slot');

const ROOT = process.cwd();
const SRC_JOB = path.join(ROOT, 'Claude outputs', 'CH-1-menus', 'job-CH1-training-menus.json');
const RECEIPT_PATH = path.join(ROOT, 'qa', '2026-11-20-AG-398', 'build-wheel-receipt.json');

const fullJob = JSON.parse(fs.readFileSync(SRC_JOB, 'utf8'));
const bwShots = fullJob.shots.filter((s) => s.out && s.out.includes('23-build-wheel')).map((s) => {
  const pre = s.pre.replace(
    "home(); K('KeyB'); await wait(900);",
    "const b=tg.build; P.position.x=((b.minGX+b.maxGX)/2)*b.grid+b.offset; P.position.z=((b.minGZ+b.maxGZ)/2)*b.grid+b.offset; await wait(1200); K('KeyB'); await wait(900);",
  );
  return { ...s, caption: s.note, pre };
});
assert.equal(bwShots.length, 3, 'Expected 3 build-wheel shots');

class DisplayCamera extends Engine {
  async load() {
    const originalGoto = this.page.goto;
    this.page.goto = function (address, ...args) {
      const native = new URL(address);
      native.searchParams.delete('raf');
      return originalGoto.call(this, native.href, ...args);
    };
    try {
      await super.load();
    } finally {
      this.page.goto = originalGoto;
    }
  }
}

const receipt = { startedAt: new Date().toISOString(), shots: [] };
const engine = new DisplayCamera({
  training: true,
  onscreen: true,
  warm: 'none',
  renderer: 'webgl',
  size: '1920x1080',
});

try {
  await engine.open();
  receipt.backend = await engine.page.evaluate('TT.getRendererBackend()');
  receipt.renderer = engine.renderer;
  const ready = await engine.page.waitFor(
    'TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
    { timeout: 90000 },
  );
  assert(ready, 'Training warm-up/blackout did not finish');
  await engine.page.send('Page.bringToFront');

  await engine.page.evaluate(`(() => {
    const originalAim = CamRig.aim;
    window.__bwProof = [];
    CamRig.aim = async (request) => {
      const result = await originalAim({ ...request, caption: '' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const w = document.getElementById('wheel');
      window.__bwProof.push({
        out: request.out,
        wheelShow: !!(w && w.classList.contains('show')),
        wheelText: w ? w.textContent.trim().slice(0, 80) : '',
      });
      return result;
    };
  })()`);

  const res = await engine.run(jobReq({ shots: bwShots, out: fullJob.out, sheet: false }));
  receipt.result = res;
  receipt.proof = await engine.page.evaluate('window.__bwProof');
  report(res);
  assert(res.ok, 'Build-wheel capture failed');
  assert(receipt.proof.every((p) => p.wheelShow), 'Build wheel did not show: ' + JSON.stringify(receipt.proof));

  // Rebuild the full 69-shot contact sheet from all PNGs on disk so row 23 shows the real Build Wheel.
  const cols = fullJob.cols || 3;
  const tw = fullJob.tile || 640;
  const th = Math.round((tw * 9) / 16);
  const rowsCount = Math.ceil(fullJob.shots.length / cols);
  await engine.page.evaluate(`(() => {
    const c = document.createElement('canvas');
    c.width = ${cols * tw};
    c.height = ${rowsCount * th};
    const g = c.getContext('2d');
    g.fillStyle = '#111';
    g.fillRect(0, 0, c.width, c.height);
    window.__sheetCanvas = c;
    window.__sheetCtx = g;
  })()`);

  for (let i = 0; i < fullJob.shots.length; i++) {
    const s = fullJob.shots[i];
    const abs = path.resolve(ROOT, s.out);
    assert(fs.existsSync(abs), `Missing PNG: ${s.out}`);
    const b64 = fs.readFileSync(abs).toString('base64');
    const x = (i % cols) * tw;
    const y = Math.floor(i / cols) * th;
    const label = s.note || s.caption || path.basename(s.out);
    await engine.page.evaluate(`(async (b64, px, py, tw, th, label) => {
      const im = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = 'data:image/png;base64,' + b64;
      });
      const g = window.__sheetCtx;
      g.drawImage(im, px, py, tw, th);
      g.fillStyle = '#000b';
      g.fillRect(px, py + th - 26, tw, 26);
      g.fillStyle = '#f4ecd0';
      g.font = '600 15px Arial, sans-serif';
      g.fillText(label, px + 8, py + th - 8, tw - 16);
      g.strokeStyle = '#000';
      g.lineWidth = 2;
      g.strokeRect(px, py, tw, th);
    })(${JSON.stringify(b64)}, ${x}, ${y}, ${tw}, ${th}, ${JSON.stringify(label)})`, 30000);
  }

  const sheetData = await engine.page.evaluate(`window.__sheetCanvas.toDataURL('image/jpeg', 0.86).split(',')[1]`, 60000);
  const sheetAbs = path.resolve(ROOT, fullJob.out, 'sheet.jpg');
  fs.writeFileSync(sheetAbs, Buffer.from(sheetData, 'base64'));
  receipt.sheet = path.relative(ROOT, sheetAbs).split(path.sep).join('/');
  console.log('rebuilt sheet: ' + receipt.sheet);
} catch (err) {
  receipt.error = String(err && err.stack ? err.stack : err);
  console.error(receipt.error);
  process.exitCode = 1;
} finally {
  try {
    await engine.close();
  } finally {
    receipt.finishedAt = new Date().toISOString();
    fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  }
}
