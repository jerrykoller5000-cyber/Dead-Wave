// qa/2026-10-27-AG-137/verify-ag137.mjs
// AG-137:
// 1. Run tools/sweep/sweep.js in --prep mode on the RTX 5080 WebGPU renderer and verify camp-trapper has 0 overlaps & 0 reach findings.
// 2. Capture 4-light (noon, overcast, dusk, night) + 3P/1P gameplay screenshots of the trapper's yard and cellar.
// 3. Inspect all 15 'hill-ring' findings (c.hillSolids, CL-256) across cave-1 (4), cave-3 (6), cave-4 (4), and cave-6 (1)
//    from 3P gameplay and 1P cameras, measuring local slope (°), dh, rise2_3m, and what DH values do to the ring.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-27-AG-137');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PAGE = `.sweep-ag137-${process.pid}.html`;
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const tag = '\n  <script type="module">\n    import * as THREE from \'three\';';
  if (!html.includes(tag)) {
    console.error('verify-ag137: game module tag not found');
    process.exit(2);
  }
  const patch = `<script type="module">import * as S from 'three'; const add = S.Object3D.prototype.add; S.Object3D.prototype.add = function (...o) { if (this.isScene) { const st = new Error().stack; for (const c of o) if (c && c.userData && !c.userData.sweepSite) c.userData.sweepSite = st; } return add.apply(this, o); };</script>`;
  fs.writeFileSync(path.join(ROOT, PAGE), html.replace(tag, patch + tag));
}
process.on('exit', () => {
  try { fs.unlinkSync(path.join(ROOT, PAGE)); } catch { /* gone */ }
});

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
});
const page = await browser.newPage({ width: 1280, height: 720 });

try {
  const t0 = Date.now();
  const url = `${server.origin}/${PAGE}?debug=1&cull=0&raf=timer`;
  console.log(`verify-ag137: loading ${url}`);
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) {
    throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
  }
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8'));

  // Start match and wait for insertion flight to finish so camera/marine are free:
  await page.evaluate(`startMatch(window.TT, 'Sweep').then(() => true)`, 900000);
  console.log(`verify-ag137: match ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 1. Run tools/sweep/sweep.js in-page:
  const sweepPath = path.join(OUT_DIR, 'sweep-prep.json');
  const sweepSrc = fs.readFileSync(path.join(ROOT, 'tools', 'sweep', 'sweep.js'), 'utf8');
  const rawSweep = await page.evaluate(sweepSrc, 900000);
  const sweepResult = typeof rawSweep === 'string' ? JSON.parse(rawSweep) : rawSweep;
  fs.writeFileSync(sweepPath, JSON.stringify(sweepResult, null, 2));

  const campTrapperFindings = (sweepResult.findings || []).filter((f) => f.place === 'camp-trapper');
  const campTrapperOverlaps = campTrapperFindings.filter((f) => f.kind === 'overlap');
  const campTrapperReach = campTrapperFindings.filter((f) => f.kind === 'reach');
  const trapperSpecific = (sweepResult.findings || []).filter((f) => /trapper|cellar|leghold|horseshoe/i.test(f.msg));
  console.log('=== CAMP-TRAPPER SWEEP SUMMARY ===');
  console.log('Total camp-trapper findings:', campTrapperFindings.length);
  console.log('camp-trapper overlaps:', campTrapperOverlaps.length);
  console.log('camp-trapper reach:', campTrapperReach.length);
  console.log('trapper/cellar/leghold/horseshoe findings anywhere:', trapperSpecific.length);
  for (const f of campTrapperFindings) {
    console.log(`  [${f.kind}] sev=${f.sev}: ${f.msg}`);
  }

  // Hide HUD/UI overlays for clean world screenshots:
  await page.evaluate(`(() => {
    const c = [...document.querySelectorAll('canvas')]
      .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (!c) return false;
    const keep = new Set();
    for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const child of document.body.children) {
      if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
    }
    return true;
  })()`);

  const snap = async (filename, setupExpr) => {
    const meta = await page.evaluate(`(async () => {
      const T = window.TT;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      if (T.marine) T.marine.visible = true;
      const res = await (${setupExpr})();
      for (let i = 0; i < 6; i++) {
        if (T.stepFrame) T.stepFrame(1 / 60);
        if (T.renderFrame) T.renderFrame();
      }
      await wait(80);
      return res;
    })()`);
    const outPath = path.join(OUT_DIR, filename);
    await page.screenshot(outPath);
    console.log(`saved ${filename}`);
    return meta;
  };

  // 2. Capture camp-trapper 4-light + 3P/1P gameplay shots:
  const lights = [
    ['noon', 0.48, false],
    ['overcast', 0.42, true],
    ['dusk', 0.76, false],
    ['night', 0.02, false]
  ];
  for (const [lname, wtime, overcast] of lights) {
    await snap(`trapper-yard-${lname}.png`, `() => {
      const T = window.TT, tr = T.trapperDbg.trapper;
      T.trapperDbg.syncCellar(false);
      T.weather.raining = ${overcast};
      T.weather.intensity = ${overcast ? 0.65 : 0};
      T.setWorldTime(${wtime});
      const p = tr.toWorld(0, 9.6);
      const py = T.sampleHeight(p.x, p.z);
      T.player.position.set(p.x, py, p.z);
      const look = tr.toWorld(0, 2.0);
      const cam = tr.toWorld(-0.15, 13.0);
      const cy = T.sampleHeight(cam.x, cam.z);
      T.setAimYawDbg(Math.atan2(look.x - p.x, look.z - p.z));
      T.setShotView({ x: cam.x, y: cy + 3.5, z: cam.z, tx: look.x, ty: tr.cy0 + 0.55, tz: look.z, fov: 52 });
    }`);
  }

  // Reset weather & noon light:
  await page.evaluate(`(() => {
    const T = window.TT;
    T.weather.raining = false;
    T.weather.intensity = 0;
    T.setWorldTime(0.48);
  })()`);

  // 3P at the bulkhead (shut doors + objective:trapper-cache on right stone plinth):
  await snap('trapper-bulkhead-shut-3p.png', `() => {
    const T = window.TT, tr = T.trapperDbg.trapper;
    T.trapperDbg.syncCellar(false);
    const p = tr.toWorld(-0.25, 1.44);
    const py = T.sampleHeight(p.x, p.z);
    T.player.position.set(p.x, py, p.z);
    const bulk = tr.toWorld(0.15, -0.85);
    const cam = tr.toWorld(-0.85, 5.2);
    T.setAimYawDbg(Math.atan2(bulk.x - p.x, bulk.z - p.z));
    T.setShotView({ x: cam.x, y: tr.cy0 + 3.2, z: cam.z, tx: bulk.x, ty: tr.cy0 + 0.20, tz: bulk.z, fov: 48 });
  }`);

  // 3P at the bulkhead (open doors + stairwell descending + cache on right plinth):
  await snap('trapper-bulkhead-open-3p.png', `() => {
    const T = window.TT, tr = T.trapperDbg.trapper;
    T.trapperDbg.syncCellar(true);
    const p = tr.toWorld(-0.35, 1.10);
    const py = T.sampleHeight(p.x, p.z);
    T.player.position.set(p.x, py, p.z);
    const bulk = tr.toWorld(0.10, -1.25);
    const cam = tr.toWorld(-0.65, 4.4);
    T.setAimYawDbg(Math.atan2(bulk.x - p.x, bulk.z - p.z));
    T.setShotView({ x: cam.x, y: tr.cy0 + 3.1, z: cam.z, tx: bulk.x, ty: tr.cy0 - 0.35, tz: bulk.z, fov: 48 });
  }`);

  // 3P yard gate flanks showing trapper-post (with horseshoes) and leghold-traps outside the flared wing fence:
  await snap('trapper-gate-props-3p.png', `() => {
    const T = window.TT, tr = T.trapperDbg.trapper;
    T.trapperDbg.syncCellar(false);
    const p = tr.toWorld(0, 10.6);
    const py = T.sampleHeight(p.x, p.z);
    T.player.position.set(p.x, py, p.z);
    const look = tr.toWorld(0, 8.8);
    const cam = tr.toWorld(0, 14.8);
    const cy = T.sampleHeight(cam.x, cam.z);
    T.setAimYawDbg(Math.atan2(look.x - p.x, look.z - p.z));
    T.setShotView({ x: cam.x, y: cy + 3.2, z: cam.z, tx: look.x, ty: tr.cy0 + 0.85, tz: look.z, fov: 54 });
  }`);

  // 1P inside cellar looking at Okafor's bunk, iron-lined walls, nailed horseshoes, and skylight grate:
  await snap('trapper-cellar-interior-1p.png', `() => {
    const T = window.TT, tr = T.trapperDbg.trapper;
    T.trapperDbg.syncCellar(true);
    const eye = tr.toWorld(0.35, -2.55);
    const look = tr.toWorld(-0.45, -4.55);
    const behind = tr.toWorld(0.85, -1.55);
    T.player.position.set(behind.x, tr.cy0 - 2.15, behind.z);
    T.trapperDbg.update(0.016);
    if (tr.cellarRoofCap) tr.cellarRoofCap.visible = true;
    if (T.marine) T.marine.visible = false;
    T.setShotView({ x: eye.x, y: tr.cy0 - 2.15 + 1.52, z: eye.z, tx: look.x, ty: tr.cy0 - 2.15 + 1.15, tz: look.z, fov: 68 });
  }`);

  // 3. Inspect the exact 15 'hill-ring' findings from sweepResult:
  const hillRingFindings = (sweepResult.findings || []).filter((f) => f.kind === 'hill-ring');
  console.log(`\n=== ANALYZING ${hillRingFindings.length} HILL-RING SOLIDS ===`);

  const hillReport = await page.evaluate(`((flaggedList) => {
    const T = window.TT;
    const caves = T.POI.caves || [];
    const HF_EXTENT = 240, HF_N = 481, HF_SPACING = (HF_EXTENT * 2) / (HF_N - 1);

    // Helper: compute max rise within r = 2.3m (same as sweep.js line 316)
    const calcRise23 = (wx, wz, sr = 0.8) => {
      const g0 = T.sampleHeight(wx, wz);
      let rise = 0;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, r = sr + 1.5;
        rise = Math.max(rise, T.sampleHeight(wx + Math.cos(a) * r, wz + Math.sin(a) * r) - g0);
      }
      return +rise.toFixed(2);
    };

    // Helper: sample capGrid dh at (wx, wz)
    const sampleCapDh = (c, wx, wz) => {
      const g2 = c.capGrid;
      if (!g2) return 0;
      const ii = Math.round((wx + HF_EXTENT) / HF_SPACING) - g2.i0;
      const jj = Math.round((wz + HF_EXTENT) / HF_SPACING) - g2.j0;
      if (ii < 0 || jj < 0 || ii >= g2.ni || jj >= g2.nj) return 0;
      return +(g2.dh[jj * g2.ni + ii] || 0).toFixed(2);
    };

    // Map every hillSolid back to its cave index:
    const solidEntries = [];
    for (let ci = 0; ci < caves.length; ci++) {
      const c = caves[ci];
      if (!c || !c.hillSolids) continue;
      for (let si = 0; si < c.hillSolids.length; si++) {
        const s = c.hillSolids[si];
        solidEntries.push({ ci, si, c, s });
      }
    }

    // Match each of the 15 flagged 'hill-ring' findings to its exact solid and cave:
    const flagged = flaggedList.map((f, idx) => {
      const [fx, fy, fz] = f.at;
      let best = null, bestD = Infinity;
      for (const e of solidEntries) {
        const d = Math.hypot(e.s.x - fx, e.s.z - fz);
        if (d < bestD) { bestD = d; best = e; }
      }
      const { ci, si, c, s } = best;
      const sr = s.radius ?? 0.8;
      // Vector outward from cave center (c.x, c.z) through solid (s.x, s.z):
      const dx = s.x - c.x, dz = s.z - c.z;
      const distFromCave = Math.hypot(dx, dz) || 1;
      const ux = dx / distFromCave, uz = dz / distFromCave;
      // Also compute local steepest uphill unit vector (gx, gz) at (s.x, s.z):
      const hxp = T.sampleHeight(s.x + 1.0, s.z), hxm = T.sampleHeight(s.x - 1.0, s.z);
      const hzp = T.sampleHeight(s.x, s.z + 1.0), hzm = T.sampleHeight(s.x, s.z - 1.0);
      const gxRaw = (hxp - hxm) * 0.5, gzRaw = (hzp - hzm) * 0.5;
      const gradMag = Math.hypot(gxRaw, gzRaw);
      const localGradSlopeDeg = +(Math.atan2(gradMag, 1.0) * 180 / Math.PI).toFixed(1);

      // Where the marine stops when walking radially inward toward the cave hill from outside:
      const stopDist = distFromCave + sr + 0.42;
      const stopX = c.x + ux * stopDist, stopZ = c.z + uz * stopDist;
      const stopY = T.sampleHeight(stopX, stopZ);
      const solidY = T.sampleHeight(s.x, s.z);
      const outsideY = T.sampleHeight(c.x + ux * (distFromCave + 6.0), c.z + uz * (distFromCave + 6.0));
      const crestY = T.sampleHeight(c.x + ux * Math.max(4, distFromCave - 6.0), c.z + uz * Math.max(4, distFromCave - 6.0));

      const radialSlopeAt = (dist) => {
        const yIn = T.sampleHeight(c.x + ux * (dist - 0.75), c.z + uz * (dist - 0.75));
        const yOut = T.sampleHeight(c.x + ux * (dist + 0.75), c.z + uz * (dist + 0.75));
        return +(Math.atan2(yIn - yOut, 1.5) * 180 / Math.PI).toFixed(1);
      };

      return {
        num: idx + 1,
        place: f.place,
        caveIdx: ci,
        caveLabel: 'cave-' + (ci + 1),
        caveTheme: c.theme || '',
        solidIdx: si,
        totalCaveSolids: c.hillSolids.length,
        x: +s.x.toFixed(2),
        z: +s.z.toFixed(2),
        r: +sr.toFixed(2),
        cx: +c.x.toFixed(2),
        cz: +c.z.toFixed(2),
        gy: +(c.gy ?? 0).toFixed(2),
        distFromCave: +distFromCave.toFixed(2),
        stopDist: +stopDist.toFixed(2),
        capDhAtSolid: sampleCapDh(c, s.x, s.z),
        capDhAtStop: sampleCapDh(c, stopX, stopZ),
        capDhInward2m: sampleCapDh(c, c.x + ux * (distFromCave - 2.0), c.z + uz * (distFromCave - 2.0)),
        rise23m: calcRise23(s.x, s.z, sr),
        outsideY: +outsideY.toFixed(2),
        stopY: +stopY.toFixed(2),
        solidY: +solidY.toFixed(2),
        crestY: +crestY.toFixed(2),
        dhAboveOutside: +(solidY - outsideY).toFixed(2),
        dhStopAboveOutside: +(stopY - outsideY).toFixed(2),
        dhCrestAboveSolid: +(crestY - solidY).toFixed(2),
        slopeStopDeg: radialSlopeAt(stopDist),
        slopeSolidDeg: radialSlopeAt(distFromCave),
        slopeInward2mDeg: radialSlopeAt(distFromCave - 2.0),
        slopeInward4mDeg: radialSlopeAt(distFromCave - 4.0),
        localGradSlopeDeg,
        stopX: +stopX.toFixed(2),
        stopZ: +stopZ.toFixed(2),
        ux: +ux.toFixed(4),
        uz: +uz.toFixed(4)
      };
    });

    // Also test what happens to each cave's hillSolids count and gentle-slope ('hill-ring' rise <= 1.2m) count
    // if DH in index.html:7886 is [0.9, 1.1, 1.25, 1.4, 1.6]:
    const dhSensitivity = {};
    for (const ci of [0, 2, 3, 5]) {
      const c = caves[ci];
      if (!c || !c.capGrid) continue;
      const g2 = c.capGrid;
      const cLabel = 'cave-' + (ci + 1);
      dhSensitivity[cLabel] = {};
      for (const DH of [0.9, 1.1, 1.25, 1.4, 1.6]) {
        const pts = [];
        for (let jj = 1; jj < g2.nj - 1; jj++) {
          for (let ii = 1; ii < g2.ni - 1; ii++) {
            const k = jj * g2.ni + ii;
            if (g2.dh[k] < DH) continue;
            if (g2.dh[k - 1] >= DH && g2.dh[k + 1] >= DH && g2.dh[k - g2.ni] >= DH && g2.dh[k + g2.ni] >= DH) continue;
            const wx = -HF_EXTENT + (g2.i0 + ii) * HF_SPACING, wz = -HF_EXTENT + (g2.j0 + jj) * HF_SPACING;
            pts.push([wx, wz]);
          }
        }
        const kept = [];
        for (const q of pts) {
          if (kept.every((o) => Math.hypot(o[0] - q[0], o[1] - q[1]) > 1.1)) kept.push(q);
        }
        let gentleCount = 0;
        for (const [wx, wz] of kept) {
          if (calcRise23(wx, wz, 0.8) <= 1.2) gentleCount++;
        }
        dhSensitivity[cLabel][DH] = { totalSolids: kept.length, gentleRiseLe12: gentleCount };
      }
    }

    const caveOverviews = [0, 2, 3, 5].map((ci) => {
      const c = caves[ci];
      return {
        caveIdx: ci,
        caveLabel: 'cave-' + (ci + 1),
        theme: (c && c.theme) || '',
        cx: +(c.x || 0).toFixed(2),
        cz: +(c.z || 0).toFixed(2),
        gy: +(c.gy ?? T.sampleHeight(c.x, c.z)).toFixed(2),
        totalHillSolids: c.hillSolids ? c.hillSolids.length : 0
      };
    });

    return { flagged, dhSensitivity, caveOverviews };
  })(${JSON.stringify(hillRingFindings)})`);

  fs.writeFileSync(path.join(OUT_DIR, 'hill-rings-report.json'), JSON.stringify(hillReport, null, 2));

  console.log('\n=== 15 FLAGGED HILL-RING SOLIDS TABLE ===');
  for (const s of hillReport.flagged) {
    console.log(
      `#${String(s.num).padStart(2, '0')} ${s.place.padEnd(13)} (${s.caveLabel}, ${s.caveTheme}) at (${s.x}, ${s.z}) | ` +
      `dist=${s.distFromCave}m stop=${s.stopDist}m | capDh=${s.capDhAtSolid}m (stop=${s.capDhAtStop}m, in2m=${s.capDhInward2m}m) | ` +
      `rise2.3m=${s.rise23m}m | dhCrest=${s.dhCrestAboveSolid}m | ` +
      `slopeStop=${s.slopeStopDeg}° slopeSolid=${s.slopeSolidDeg}° slopeIn2m=${s.slopeInward2mDeg}° slopeIn4m=${s.slopeInward4mDeg}° (grad=${s.localGradSlopeDeg}°)`
    );
  }
  console.log('\n=== DH SENSITIVITY (total ring solids vs gentle rise <= 1.2m) ===');
  console.log(JSON.stringify(hillReport.dhSensitivity, null, 2));

  // Capture oblique overview of each of the 4 caves:
  for (const co of hillReport.caveOverviews) {
    const caveFindings = hillReport.flagged.filter((f) => f.caveIdx === co.caveIdx);
    const avgUx = caveFindings.reduce((acc, f) => acc + f.ux, 0) / (caveFindings.length || 1);
    const avgUz = caveFindings.reduce((acc, f) => acc + f.uz, 0) / (caveFindings.length || 1);
    const len = Math.hypot(avgUx, avgUz) || 1;
    const ux = avgUx / len, uz = avgUz / len;
    await snap(`${co.caveLabel}-overview.png`, `() => {
      const T = window.TT;
      const cx = ${co.cx}, cz = ${co.cz}, gy = ${co.gy};
      const ux = ${ux.toFixed(4)}, uz = ${uz.toFixed(4)};
      const rx = -uz, rz = ux;
      const camX = cx + ux * 32 + rx * 14;
      const camZ = cz + uz * 32 + rz * 14;
      const camY = T.sampleHeight(camX, camZ) + 14.0;
      const pX = cx + ux * 19, pZ = cz + uz * 19;
      T.player.position.set(pX, T.sampleHeight(pX, pZ), pZ);
      T.setAimYawDbg(Math.atan2(-ux, -uz));
      T.setShotView({ x: camX, y: camY, z: camZ, tx: cx, ty: gy + 2.5, tz: cz, fov: 50 });
    }`);
  }

  // Capture 3P gameplay and 1P eye-level screenshots at each of the 15 flagged 'hill-ring' solids:
  for (const s of hillReport.flagged) {
    const numStr = String(s.num).padStart(2, '0');
    const tag = `hill-ring-${numStr}-${s.caveLabel}`;
    // 3P gameplay camera behind the marine stopped at (stopX, stopY, stopZ) facing inward toward the cave hill:
    await snap(`${tag}-3p.png`, `() => {
      const T = window.TT;
      const px = ${s.stopX}, py = ${s.stopY}, pz = ${s.stopZ};
      const ux = ${s.ux}, uz = ${s.uz};
      const fwdX = -ux, fwdZ = -uz;
      const yaw = Math.atan2(fwdX, fwdZ);
      T.player.position.set(px, py, pz);
      T.setAimYawDbg(yaw);
      const camX = px - fwdX * 9.2, camZ = pz - fwdZ * 9.2;
      const camY = Math.max(py + 5.0, T.sampleHeight(camX, camZ) + 1.4);
      const lookX = px + fwdX * 3.8, lookZ = pz + fwdZ * 3.8;
      const lookY = T.sampleHeight(lookX, lookZ) + 1.0;
      T.setShotView({ x: camX, y: camY, z: camZ, tx: lookX, ty: lookY, tz: lookZ, fov: 55 });
    }`);

    // 1P eye-level camera at (stopX, stopY + 1.62, stopZ) looking straight up the hill ahead:
    await snap(`${tag}-1p.png`, `() => {
      const T = window.TT;
      const px = ${s.stopX}, py = ${s.stopY}, pz = ${s.stopZ};
      const ux = ${s.ux}, uz = ${s.uz};
      const fwdX = -ux, fwdZ = -uz;
      const yaw = Math.atan2(fwdX, fwdZ);
      T.player.position.set(px - fwdX * 1.8, py, pz - fwdZ * 1.8);
      T.setAimYawDbg(yaw);
      if (T.marine) T.marine.visible = false;
      const eyeX = px, eyeY = py + 1.62, eyeZ = pz;
      const lookX = px + fwdX * 6.5, lookZ = pz + fwdZ * 6.5;
      const lookY = T.sampleHeight(lookX, lookZ) + 1.15;
      T.setShotView({ x: eyeX, y: eyeY, z: eyeZ, tx: lookX, ty: lookY, tz: lookZ, fov: 68 });
    }`);
  }

  console.log('verify-ag137: all captures complete.');
} finally {
  try { await page.send('Page.close', {}); } catch { /* gone */ }
  await browser.close?.();
  server.close?.();
}
