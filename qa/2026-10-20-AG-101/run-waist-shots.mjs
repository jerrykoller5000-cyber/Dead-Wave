import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-20-AG-101');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'],
});

try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
  } catch { /* ignore */ }

  await page.goto(`${server.origin}/index.html?inspect=marine`, { timeout: 240000 });
  await page.waitFor('Boolean(window.DWInspect && window.DWInspect.ready)', { timeout: 120000 });

  await page.evaluate(`(async () => {
    const I = window.DWInspect;
    await I.show('marine');
    if (I.marine && I.marine.weapon) I.marine.weapon('pistol');
  })()`, 60000);
  await sleep(400);

  const shots = [];
  const capturePose = async (setupExpr, tag, desc) => {
    const info = await page.evaluate(`(async () => {
      const I = window.DWInspect;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      ${setupExpr}
      await wait(350);
      let waistStats = null;
      const m = window.TT && window.TT.marine;
      const w = m && m.userData && m.userData.waist;
      if (w && w.mesh && w.mesh.geometry && w.mesh.geometry.attributes.normal) {
        w.bend && w.bend();
        const na = w.mesh.geometry.attributes.normal.array;
        const pa = w.mesh.geometry.attributes.position.array;
        let minLen = Infinity, maxLen = 0, nanCount = 0;
        for (let i = 0; i < na.length; i += 3) {
          const l = Math.sqrt(na[i]*na[i] + na[i+1]*na[i+1] + na[i+2]*na[i+2]);
          if (!Number.isFinite(l) || !Number.isFinite(pa[i])) nanCount++;
          else {
            if (l < minLen) minLen = l;
            if (l > maxLen) maxLen = l;
          }
        }
        waistStats = {
          ...(w.debug ? w.debug() : {}),
          minNormalLen: Number(minLen.toFixed(6)),
          maxNormalLen: Number(maxLen.toFixed(6)),
          nanCount,
        };
      }
      return { desc: ${JSON.stringify(desc)}, waistStats };
    })()`, 60000);
    const file = path.join(OUT_DIR, `${tag}.png`);
    await page.screenshot(file);
    shots.push({ tag, file: `qa/2026-10-20-AG-101/${tag}.png`, ...info });
  };

  await capturePose(
    `I.marine.stop(); I.view('torso'); I.view({ yaw: 25, pitch: 8, dist: 1.25 });`,
    '01-waist-idle-3quarter',
    'Idle torso/waist 3/4 view (pistol)'
  );
  await capturePose(
    `I.view('torso'); I.view({ yaw: 85, pitch: 6, dist: 1.25 });`,
    '02-waist-idle-side',
    'Idle torso/waist side view (pistol)'
  );
  await capturePose(
    `I.marine.hold('walk', 0.22); I.view('torso'); I.view({ yaw: 35, pitch: 8, dist: 1.3 });`,
    '03-waist-walk-phase22-3quarter',
    'Walk cycle phase 0.22 torso/waist 3/4 view'
  );
  await capturePose(
    `I.marine.hold('walk', 0.22); I.view('torso'); I.view({ yaw: 88, pitch: 6, dist: 1.3 });`,
    '04-waist-walk-phase22-side',
    'Walk cycle phase 0.22 torso/waist side view'
  );
  await capturePose(
    `I.marine.hold('walk', 0.72); I.view('torso'); I.view({ yaw: 35, pitch: 8, dist: 1.3 });`,
    '05-waist-walk-phase72-3quarter',
    'Walk cycle phase 0.72 torso/waist 3/4 view (opposite stride)'
  );
  await capturePose(
    `I.marine.hold('walk', null); I.marine.weapon('m4'); await I.marine.play('walk'); I.view('three');`,
    '06-waist-walk-live-m4',
    'Live walking with M4 full 3/4 view'
  );

  fs.writeFileSync(path.join(OUT_DIR, 'waist-summary.json'), JSON.stringify({ shots }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, shots }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
