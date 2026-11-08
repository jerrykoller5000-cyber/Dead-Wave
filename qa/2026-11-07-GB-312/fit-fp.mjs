// qa/2026-11-07-GB-312/fit-fp.mjs - GB-312 (CL-310/313/314 + GB-153): finger fit on FP view gun/hands for m4, aa12, sniper, ak, shotgun.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'fit'); fs.mkdirSync(OUT, { recursive: true });
const WEAPONS = (process.env.GB312_WEAPONS || 'm4,aa12,sniper,ak,shotgun').split(',');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const fitPage = fs.readFileSync(path.join(ROOT, 'handoffs', '2026-10-09-grokbot-GB-153', 'fit-page.js'), 'utf8');
let code = 0; const all = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  await page.evaluate(`(async () => { const T = TT; await startMatch(T, 'GB312fit'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons(); T.setWorldTime?.(0.42); return 1; })()`, 600000);
  await page.evaluate(fitPage);
  await page.evaluate(`(() => { const T = TT, THREE = T.THREE || window.THREE, V = () => new THREE.Vector3();
    window.__handsSD.trisNear = (objs, c, R) => { const out = [], a = V(), b = V(), d = V(), e1 = V(), e2 = V(), n = V(); let flips = 0;
      for (const root of objs) root.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        for (let x = o; x; x = x.parent) { if (!x.visible) return; if (x === root) break; }
        o.updateMatrixWorld(true); const flip = o.matrixWorld.determinant() < 0 ? -1 : 1; if (flip < 0) flips++;
        const P = o.geometry.attributes.position, I = o.geometry.index, N = I ? I.count : P.count, mw = o.matrixWorld;
        for (let k = 0; k + 2 < N; k += 3) { const i0 = I ? I.getX(k) : k, i1 = I ? I.getX(k + 1) : k + 1, i2 = I ? I.getX(k + 2) : k + 2;
          a.fromBufferAttribute(P, i0).applyMatrix4(mw); b.fromBufferAttribute(P, i1).applyMatrix4(mw); d.fromBufferAttribute(P, i2).applyMatrix4(mw);
          const cx = (a.x + b.x + d.x) / 3, cy = (a.y + b.y + d.y) / 3, cz = (a.z + b.z + d.z) / 3, rr = Math.max(a.distanceTo(b), b.distanceTo(d), d.distanceTo(a));
          if (Math.hypot(cx - c.x, cy - c.y, cz - c.z) > R + rr) continue;
          n.crossVectors(e1.subVectors(b, a), e2.subVectors(d, a)); const L = n.length(); if (L < 1e-12) continue; n.multiplyScalar(flip / L);
          out.push([a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z, n.x, n.y, n.z]); } });
      window.__flips = flips; return out; }; return 1; })()`);
  const sel = (w, fp) => page.evaluate(`(async () => { const T = TT, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await wait(150); }
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0); T.setViewFirstDbg(${fp}); await wait(3500); return T.getCurrentWeapon(); })()`, 600000);
  for (const w of WEAPONS) {
    const got = await sel(w, true);
    const r = await page.evaluate(`(async () => {
      const T = TT, THREE = T.THREE || window.THREE, v = T.viewmodelDbg(), SD = window.__handsSD;
      const HG = await import('/studio/hand-grips.js?' + Date.now());
      if (!v || !v.gun || !v.arms) return { err: 'no viewmodel gun/arms' };
      const root = v.gun.root; root.updateMatrixWorld(true);
      const out = { weapon: '${w}', handPlace: v.info && v.info.handPlace };
      const SWING = { r: -0.3, l: -0.15 };
      for (const side of ['r', 'l']) {
        const rig = v.arms[side] && v.arms[side].rig; if (!rig || !rig.skins || !rig.skins[0]) { out[side] = { err: 'no rig' }; continue; }
        const sk = rig.skins[0], mesh = sk.mesh;
        const cur = JSON.parse(JSON.stringify(rig.pose || {}));
        const pts = (segs) => { mesh.updateMatrixWorld(true); const P = mesh.geometry.attributes.position, o = [], q = new THREE.Vector3();
          for (let i = 0; i < P.count; i += 2) if (!segs || segs.includes(sk.seg[i])) { q.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld); o.push([q.x, q.y, q.z]); } return o; };
        const palm = pts([0]); const c = new THREE.Vector3(); for (const p of palm) c.add(new THREE.Vector3(p[0], p[1], p[2])); c.divideScalar(Math.max(1, palm.length));
        const tris = SD.trisNear([root], c, 0.16);
        const segOf = (i) => (i < 4 ? [1 + i * 3, 2 + i * 3, 3 + i * 3] : [13, 14]);
        const minD = (i) => { let mn = Infinity; for (const p of pts(segOf(i))) mn = Math.min(mn, SD.sdSet(p[0], p[1], p[2], tris)); return mn; };
        rig.set(cur).update(true);
        const before = [0, 1, 2, 3, 4].map((i) => +minD(i).toFixed(4));
        const palmD = (() => { let mn = Infinity; for (const p of palm) mn = Math.min(mn, SD.sdSet(p[0], p[1], p[2], tris)); return +mn.toFixed(4); })();
        const pose = HG.gripPose(HG.FIST); for (let i = 0; i < 4; i++) pose.f[i] = HG.digit(0); pose.t = [0, SWING[side], 0];
        const entry = { f: [0, 0, 0, 0], t: [0, SWING[side]] }, near = [], dists = [];
        const evalDigit = (i, cc) => { if (i < 4) pose.f[i] = HG.digit(cc); else { pose.t[0] = cc; pose.t[1] = SWING[side]; pose.t[2] = cc * 0.6; } rig.set(pose).update(true); return minD(i); };
        for (let i = 0; i < 5; i++) {
          const max = 1.45, scan = [];
          for (let cc = max; cc >= -1e-9; cc -= 0.05) scan.push([Math.max(0, cc), evalDigit(i, Math.max(0, cc))]);
          const d0 = scan[scan.length - 1][1], thr = Math.min(-0.003, d0 - 0.0015);
          let pick = scan.find(([, d]) => d >= thr), tag;
          if (pick) { const k = scan.indexOf(pick);
            if (k > 0) { let lo = pick[0], hi = scan[k - 1][0]; for (let j = 0; j < 6; j++) { const mid = (lo + hi) / 2; if (evalDigit(i, mid) >= thr) lo = mid; else hi = mid; } pick = [lo, evalDigit(i, lo)]; }
            tag = pick[1] <= 0.004 ? (d0 < -0.003 ? 'touch(root in)' : 'touch') : 'free';
          } else { pick = scan.reduce((b, x) => (x[1] > b[1] ? x : b)); tag = 'clip'; }
          let cc = pick[0]; if (tag === 'free') cc = i < 4 ? HG.FIST.f[i] : HG.FIST.t[0];
          const d = evalDigit(i, cc);
          if (i < 4) entry.f[i] = +cc.toFixed(3); else entry.t[0] = +cc.toFixed(3);
          dists.push(+d.toFixed(4)); near.push(tag);
        }
        const fitted = HG.gripPose({ f: entry.f, t: [entry.t[0], SWING[side]] });
        rig.set(cur).update(true);
        out[side] = { tris: tris.length, flips: window.__flips, palmD, curPose: cur, before, entry, near, dists, pose: JSON.parse(JSON.stringify(fitted)) };
      }
      return out;
    })()`, 600000);
    r.selected = got; all[w] = r; console.log(w, 'l.before', JSON.stringify(r.l && r.l.before), 'l.dists', JSON.stringify(r.l && r.l.dists), 'l.near', JSON.stringify(r.l && r.l.near), 'l.entry', JSON.stringify(r.l && r.l.entry));
  }
  all.pageErrors = (page.errors || []).slice(0, 5);
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
fs.writeFileSync(path.join(OUT, process.env.GB312_OUT || 'fit-fp.json'), JSON.stringify(all, null, 1));
await browser.close?.(); server.close?.();
process.exit(code);