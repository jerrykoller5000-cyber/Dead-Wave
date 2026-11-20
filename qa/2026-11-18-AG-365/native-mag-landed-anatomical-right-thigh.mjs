import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Crew slot required');
assert.equal(process.argv.length, 2, 'No CLI arguments accepted');

const R = 'review/GT-20124/';
const Q = 'qa/2026-11-18-AG-365/';
const out = Q + 'captures/';
const hash = (b) => createHash('md5').update(b).digest('hex');
const manifest = JSON.parse(await readFile(R + 'draft-package-v3-668e.json', 'utf8'));
for (const f of manifest.files) {
  assert.equal(hash(await readFile(f.target)), f.copyMD5, 'ActualLANDED target ' + f.target);
}

const prior = JSON.parse(await readFile(R + 'native-mag-short-ag-v1-668e/receipt.json', 'utf8'));
assert(prior.allPackageCornersInside && prior.matchedCameras);
const historicalBefore = prior.records.filter((r) => r.phase === 'before');
assert.equal(historicalBefore.length, 6);

const files = [
  ...new Set([
    ...manifest.files.flatMap((x) => [x.target, x.copy]),
    'game/leaper-motion.js',
    'tools/tests/fakethree.mjs',
    'studio/inspector/api.js',
    'studio/inspector/marine.js',
    R + 'native-mag-landed-stage-v2.js',
    R + 'native-mag-landed-ag-v2.mjs',
    R + 'pouch-components-v1.js',
    Q + 'native-mag-landed-anatomical-right-stage.js',
    Q + 'native-mag-landed-anatomical-right-thigh.mjs',
  ]),
];
const snap = async () => Object.fromEntries(await Promise.all(files.map(async (f) => [f, hash(await readFile(f))])));
const sources = await snap();
const save = (p, x) => writeFile(p, JSON.stringify(x, null, 2), { flag: 'wx' });

await mkdir(out, { recursive: true });
await save(out + 'sources-before.json', sources);
const server = await serve(process.cwd(), 0);
const records = [];
let browser, page;
const common = historicalBefore[0].commonCamera;
let last = null;

try {
  for (const phase of ['landed']) {
    const dir = out + phase + '/';
    await mkdir(dir, { recursive: true });
    // Actual production only: NO Fetch/module/package overrides.
    browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1200,1200'],
    });
    const p = (page = await browser.newPage({ width: 1200, height: 1200 }));
    await p.send('Page.bringToFront', {});
    await p.send('Page.setWebLifecycleState', { state: 'active' });
    await p.goto(server.origin + '/index.html?inspect&raf=timer', { timeout: 240000 });
    assert(await p.waitFor('(window.DWInspect&&DWInspect.ready)||!!window.DWInspectError', { timeout: 300000 }));
    assert.equal(await p.evaluate('window.DWInspectError||null'), null);
    await p.evaluate("dispatchEvent(new Event('resize'))");
    const setup = await p.evaluate(await readFile(Q + 'native-mag-landed-anatomical-right-stage.js', 'utf8'), 180000);
    await save(dir + 'setup.json', { setup, served: {} });
    assert(/webgpu/i.test(setup.backend));

    const specs = [
      { id: 'unarmed', move: 'stand', weapon: 'none' },
      { id: 'pistol', move: 'stand-armed', weapon: 'pistol' },
    ];
    for (const spec of specs) {
      last = { phase, pose: spec.id };
      const state = await p.evaluate('GT24Pose(' + JSON.stringify(spec) + ')', 180000);
      const view = 'anatomical-right-thigh';
      last = { phase, pose: spec.id, view };
      const row = await p.evaluate('GT24Frame(' + JSON.stringify(view) + ',' + JSON.stringify(common) + ')', 60000);
      assert.equal(row.anatomicalSideVerified, true, 'Anatomical right (-X) camera verification failed');
      const file = dir + spec.id + '-' + view + '.png';
      await p.screenshot(file);
      records.push({ phase, pose: spec.id, file, state, ...row });
      console.log('ANATOMICAL RIGHT THIGH FRAME ' + phase + ' ' + spec.id + ' ' + view + ' contained=' + row.all16Inside);

      // Information-only whole-InstancedMesh visibility delta diagnostic (includes vest slots)
      await p.evaluate('GT24.T.updateCarriedGear(0,false).mags.visible=false;GT24Draw()');
      const hidden = dir + spec.id + '-' + view + '-mag-hidden.png';
      await p.screenshot(hidden);
      await p.evaluate('GT24.T.updateCarriedGear(0,false).mags.visible=true;GT24Draw()');
      const differentPixels = Number(
        execFileSync(
          'python',
          [
            '-c',
            "from PIL import Image;import sys;A=Image.open(sys.argv[1]).convert('RGB');B=Image.open(sys.argv[2]).convert('RGB');print(sum(max(abs(x-y)for x,y in zip(a,b))>8 for a,b in zip(A.get_flattened_data(),B.get_flattened_data())))",
            file,
            hidden,
          ],
          { encoding: 'utf8', windowsHide: true },
        ).trim(),
      );
      await save(dir + spec.id + '-' + view + '-contained-mag-visibility.json', {
        differentPixels,
        actualAll16CornersInside: row.all16Inside,
        scope:
          'INFORMATION ONLY: same native H.render anatomical-right-thigh (-X) camera, the ENTIRE carried-magazine InstancedMesh visible versus hidden, including all active vest slots. Does not isolate belt slots or prove unrelated thigh gear clear.',
      });
      console.log('CONTAINED MAG PIXEL DELTA ' + spec.id + ' ' + differentPixels);

      if (spec.id === 'unarmed') {
        await save(dir + 'FIRST-CELL-PENDING.json', {
          file,
          containment: row.containment,
          orientationTelemetry: row.orientationTelemetry,
        });
        console.log('LOOK BARRIER ' + phase + ' GT20124 anatomical-right-thigh');
        let looked = false;
        for (let t = Date.now(); Date.now() - t < 180000; ) {
          try {
            looked = (await readFile(dir + 'FIRST-CELL-LOOKED.txt', 'utf8')).includes(
              'LOOKED ' + phase + ' GT20124 anatomical-right-thigh',
            );
          } catch (e) {
            if (e.code !== 'ENOENT') throw e;
          }
          if (looked) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
        assert(looked, 'Immediate actual image LOOK required');
      }
    }
    await save(dir + 'records.json', records.filter((r) => r.phase === phase));
    assert.deepEqual(p.errors, []);
    await browser.close();
    browser = null;
    page = null;
  }

  assert.equal(records.length, 2);
  for (const r of records) {
    assert.equal(r.view, 'anatomical-right-thigh');
    assert.deepEqual(r.commonCamera, common, 'commonCamera base reference must match');
    assert.equal(r.anatomicalSideVerified, true);
    assert(r.orientationTelemetry.cameraRelativeToCommon[0] < -0.5, 'Camera must be on -X anatomical right side');
  }
  assert.deepEqual(await snap(), sources);

  const failures = records
    .filter((r) => !r.all16Inside)
    .map((r) => ({
      pose: r.pose,
      view: r.view,
      instances: r.containment.filter((m) => !m.all8Inside).map((m) => m.instance),
    }));

  await save(out + 'receipt.json', {
    date: new Date().toISOString(),
    sources,
    sourceStable: true,
    frames: records.length,
    actualNormalNativeRender: true,
    publicHeldPresentation: true,
    noPackageURLOverrides: true,
    matchedHistoricalPrelandCameras: false,
    supplementaryUnmatchedSideViews: true,
    mirroredAzimuthFromHistoricalRightThigh: true,
    historicalCameraAzimuthCorrectionNote:
      'Historical AG-358/AG-364 right-thigh camera (+0.88, +1.6, +1.0 -> +0.112) framed anatomical LEFT (+X) of +Z-facing Marine. These NEW unmatched supplementary views mirror azimuth to (-0.88, +1.6, +1.0 -> -0.112) to capture actual anatomical RIGHT (-X relative Marine) thigh.',
    historicalReferenceReceipt: R + 'native-mag-landed-ag-v2/receipt.json',
    failures,
    allLandedCornersInside: !failures.length,
    records,
    scope:
      'Supplementary AG-365 actual anatomical RIGHT (-X relative Marine) thigh views (unarmed + pistol) on exact LANDED 72e543b4 six-file J164 production; no Fetch/package/source override. Public DWInspect.still(true) held presentation; strict 8-corner closed-pouch containment <=2um; vest 3 matrices exact and capacity 5 retained. Historical AG-364/AG-358 evidence preserved unchanged. Extra evidence only; no waiver of t184 0.15 rad red or full motion/clipping/perf.',
  });
  console.log('ANATOMICAL RIGHT THIGH CONTAINMENT ' + JSON.stringify({ failures }));
  assert.equal(failures.length, 0, 'Same all8corner actual closed pouch containment bar, both belt instances');
} catch (e) {
  await save(out + 'failure.json', {
    date: new Date().toISOString(),
    message: e.message,
    stack: e.stack,
    last,
    records,
    pageErrors: page?.errors,
  });
  throw e;
} finally {
  try {
    if (page) await page.evaluate('DWInspect.still(false)', 15000);
  } catch {}
  await browser?.close();
  await server.close();
}
