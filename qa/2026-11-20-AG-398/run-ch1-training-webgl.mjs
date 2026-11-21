import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, jobReq, report } from '../../tools/camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the crew game-test slot');

const ROOT = process.cwd();
const SRC_JOB = path.join(ROOT, 'Claude outputs', 'CH-1-menus', 'job-CH1-training-menus.json');
const RECEIPT_PATH = path.join(ROOT, 'qa', '2026-11-20-AG-398', 'training-webgl-receipt.json');

const job = JSON.parse(fs.readFileSync(SRC_JOB, 'utf8'));

// Patch `pre` in memory only (source job file untouched):
// 1. In reset(): cancel any active range drill (#rangeDrillHud -> Escape) and clear any pending countdown
//    or live training zombies (#trainingPanel .tp-clear:not(.tp-clear-layout)), which previously left
//    "3 zombies loose" after shot 12 and broke shots 12 (1366/960), 14 (range drill HUD), and 23 (build wheel).
// 2. In shot 14 (14-range-drill-hud): wait until #rangeDrillHud shows active .rd-numbers (up to 13 s).
// 3. Copy shot.note -> shot.caption for readable sheet.jpg tile labels while CamRig.aim strips caption
//    from the rendered PNG so top-left HEALTH HUD is never occluded.
const CLEAR_SNIPPET =
  `if(shown('#rangeDrillHud')){K('Escape');await wait(300);}` +
  `if(D.state?.()?.deployment?.read?.()||shown('#trainingCountdown')||(T.zombies&&T.zombies.some(z=>z.alive))){` +
  `D.act('trainingPanel');await wait(250);document.querySelector('#trainingPanel .tp-clear:not(.tp-clear-layout)')?.click();await wait(200);` +
  `document.querySelector('#trainingPanel .tp-close')?.click();await wait(250);}`;

for (const s of job.shots) {
  if (!s.caption && s.note) s.caption = s.note;
  if (typeof s.pre === 'string') {
    const marker = 'T.setViewFirstDbg&&T.setViewFirstDbg(false); lights(true); await wait(300); };';
    if (s.pre.includes(marker)) {
      s.pre = s.pre.replace(marker, `${CLEAR_SNIPPET} ${marker}`);
    }
    if (s.out && s.out.includes('14-range-drill-hud')) {
      s.pre = s.pre.replace(
        "click('#rangeConsole [data-start]'); await wait(9000);",
        "click('#rangeConsole [data-start]'); for(let _i=0;_i<44;_i++){await wait(300); if(shown('#rangeDrillHud')&&document.querySelector('#rangeDrillHud .rd-numbers')) break;} await wait(400);",
      );
    }
  }
}

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

const receipt = {
  startedAt: new Date().toISOString(),
  sourceJob: 'Claude outputs/CH-1-menus/job-CH1-training-menus.json',
  backendRequested: 'webgl',
  changesAppliedInMemory: [
    'DisplayCamera (strip ?raf=1, renderer: webgl, onscreen: true) to bypass RTX 5080 WebGPU 0-draw-call stale Training canvas (GP-20164)',
    'reset(): cancel active #rangeDrillHud (Escape) and clear pending countdown/live zombies via #trainingPanel .tp-clear:not(.tp-clear-layout)',
    '14-range-drill-hud: poll up to 13.2s for active #rangeDrillHud .rd-numbers after clicking [data-start]',
    'sheet tile labels populated from shot.note while PNGs stay caption-free (top-left HEALTH HUD unobstructed)',
  ],
};

const engine = new DisplayCamera({
  training: true,
  onscreen: true,
  warm: 'none',
  renderer: 'webgl',
  size: '1920x1080',
});

try {
  await engine.open();
  receipt.mode = engine.mode;
  receipt.renderer = engine.renderer;
  receipt.backend = await engine.page.evaluate('TT.getRendererBackend()');
  assert.match(receipt.backend, /webgl/i, `Expected webgl backend, got ${receipt.backend}`);
  assert.match(receipt.renderer, /NVIDIA/i, `Expected NVIDIA hardware renderer, got ${receipt.renderer}`);

  const ready = await engine.page.waitFor(
    'TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
    { timeout: 90000 },
  );
  assert(ready, 'Training warm-up/blackout did not finish');
  console.log(`Training ready: ${receipt.mode}, ${receipt.backend}, ${receipt.renderer}`);

  await engine.page.send('Page.bringToFront');
  await engine.page.evaluate(`(() => {
    const originalAim = CamRig.aim;
    window.__ch1Proof = [];
    CamRig.aim = async (request) => {
      const result = await originalAim({ ...request, caption: '' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const render = TT.renderer?.info?.render || {};
      const vis = (sel) => {
        const e = document.querySelector(sel);
        return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      };
      window.__ch1Proof.push({
        out: request.out,
        note: request.note,
        drawCalls: render.calls ?? render.drawCalls ?? null,
        lightsOn: !!TT.trainingDbg?.lights?.().on,
        zombiesAlive: (TT.zombies || []).filter((z) => z.alive).length,
        countdown: vis('#trainingCountdown'),
        rangeConsole: vis('#rangeConsole'),
        rangeDrillHud: vis('#rangeDrillHud'),
        rangeDrillActive: !!document.querySelector('#rangeDrillHud .rd-numbers'),
        buildWheel: vis('#buildWheel') || !!document.querySelector('.build-wheel.show, #buildMenu.show, #buildWheel.show'),
      });
      return result;
    };
  })()`);

  receipt.result = await engine.run(jobReq(job));
  receipt.proof = await engine.page.evaluate('window.__ch1Proof');
  receipt.pageErrors = engine.page.errors;
  report(receipt.result);
  if (!receipt.result.ok) process.exitCode = 1;
} catch (err) {
  receipt.error = String(err && err.stack ? err.stack : err);
  console.error(receipt.error);
  process.exitCode = 1;
} finally {
  try {
    await engine.close();
  } finally {
    receipt.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  }
}
