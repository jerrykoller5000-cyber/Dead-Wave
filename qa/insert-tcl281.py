from pathlib import Path
import os
src = Path(r"C:\Users\Zero\Desktop\Tiny Trek\tools\tests\tcl281.js")
t = src.read_text(encoding="utf-8")
mark = "    // a gun with no entry yet: the old first person. Stage 3 (shotgun, Breacher, revolver, sniper) has entries now. The launcher is stage 4.\n"
block = r'''    // CU-227 stage 3 (GP-20014). Rear points are game/sight-points.js after GB-259.
    // The sniper's view gun hides at full ADS (0.82); the sight is read on the way there.
    const stage3 = [
      ['shotgun', 'the shotgun', [0, 0.105, -0.25], [0, -0.088, -0.056], true],
      ['aa12', 'the Breacher', [0, 0.1807, -0.25], [0, -0.145, -0.166], true],
      ['revolver', 'the revolver', [0, 0.114, -0.05], [0, -0.07, -0.04], false],
      ['sniper', 'the sniper', [0, 0.140, -0.20], [0, -0.088, -0.117], true]
    ];
    for (const [key, label, rear, grip, stock] of stage3) {
      ok(await take(key), 'a ' + key + ' in hand');
      ok(await until(() => vm.info.active && vm.info.key === key && vm.info.raise > 0.99, 12000),
        label + ': the view gun is up (raise ' + (vm.info.raise == null ? '-' : vm.info.raise.toFixed(2)) + ')');
      const srcG = T.weaponMeshes[key], udG = srcG && srcG.userData;
      if (stock) {
        let inViewStock = false;
        if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') inViewStock = true; });
        ok(!!(udG && udG.fpStock && udG.fpStock.parent === srcG && udG.fpStock.name === 'fp-stock') && !inViewStock,
          label + ': the stock is one direct child, and the view copy leaves it out');
      }
      if (udG && udG.mag && udG.mag.parent === srcG) {
        ok(!!(vm.gun && vm.gun.mag && vm.gun.mag.parent === vm.gun.root), label + ': the view copy has the magazine');
      }
      if (udG && udG.work && udG.work.parent === srcG) {
        ok(!!(vm.gun && vm.gun.work && vm.gun.work.parent === vm.gun.root), label + ': the view copy has the work part');
      }
      await wait(400);
      const es1 = sockErr(A.r, wr.r), es2 = sockErr(A.l, wr.l);
      ok(es1 < 0.01 && es2 < 0.01, label + ': both wrists on their sockets (' + (es1 * 100).toFixed(2) + ', ' + (es2 * 100).toFixed(2) + ' cm)');
      const bs1 = bend(A.r), bs2 = bend(A.l);
      ok(bs1 <= wmax + 1e-3 && bs2 <= wmax + 1e-3, label + ': the wrists stay within VM.wristMax (' + bs1.toFixed(2) + ', ' + bs2.toFixed(2) + ')');
      const nearS = scanNear();
      ok(nearS.onScreen > 0 && nearS.minD > 0.015, label + ': nothing on screen in front of the near plane (nearest ' + (nearS.minD * 100).toFixed(1) + ' cm)');
      const nHipS = vm.ndc(gunAt(grip));
      ok(nHipS.x > 0 && nHipS.y < 0 && nHipS.d > 0.2, label + ': at the hip the grip is low and to the right (ndc ' + nHipS.x.toFixed(2) + ', ' + nHipS.y.toFixed(2) + ')');
      T.setZoomHeldDbg(true);
      let sawSight = null;
      const tAds = Date.now();
      while (Date.now() - tAds < 5000) {
        const ads = T.fpDbg().ads || 0;
        if (key === 'sniper' && ads > 0.4 && ads < 0.78 && !sawSight) sawSight = vm.ndc(gunAt(rear));
        if (ads > 0.99) break;
        await wait(40);
      }
      if (key === 'sniper') {
        ok(!vm.root.visible, label + ': full scope hides the view gun');
        ok(!!sawSight && Math.abs(sawSight.x) < 0.04 && Math.abs(sawSight.y) < 0.04,
          label + ': the scope axis was on the view on the way in (' + (sawSight ? sawSight.x.toFixed(3) + ', ' + sawSight.y.toFixed(3) : 'missed') + ')');
      } else {
        ok((T.fpDbg().ads || 0) > 0.99, label + ': down the sights');
        await wait(400);
        const nSs = vm.ndc(gunAt(rear));
        ok(Math.abs(nSs.x) < 0.02 && Math.abs(nSs.y) < 0.02, label + ': the rear sight on the view\'s centre (' + nSs.x.toFixed(3) + ', ' + nSs.y.toFixed(3) + ')');
      }
      T.setZoomHeldDbg(false);
      await until(() => (T.fpDbg().ads || 0) < 0.05, 9000);
      await wait(200);
      T.setAmmoDbg(key, 1);
      T.startReload();
      ok(await until(() => T.isReloading(), 3000), label + ': a reload starts');
      const placesS = new Set();
      const tRel = Date.now();
      while (T.isReloading() && Date.now() - tRel < 6000) { placesS.add(vm.info.handPlace); await wait(40); }
      ok(placesS.size > 1, label + ': the support hand leaves its hold (' + [...placesS].join(' ') + ')');
    }
'''
if mark not in t:
    raise SystemExit('mark missing')
if 'CU-227 stage 3' in t:
    raise SystemExit('already inserted')
t = t.replace(mark, block + mark, 1)
tmp = src.with_suffix('.js.tmp')
tmp.write_text(t, encoding='utf-8')
os.replace(tmp, src)
print('ok', src.stat().st_size)
