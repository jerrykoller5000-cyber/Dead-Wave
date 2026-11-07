// query: hqwall=1&quarterwalls=1&shortcuts=1   (CL-304: the HQ ring, the quarter lines and the shortcuts are off by default, D-118)
// t321 - CU-213: a build stands in a clearing or a ring gap, and not in the
// woods or on the thicket. Placing one still closes that cell to the dead.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const yard = T.placeRefusalFor('wall', 4, 0);
    ok(yard == null, 'the yard takes a wall' + (yard ? ' (' + yard + ')' : ''));

    let gap = null;
    for (let i = 0; i < 180 && !gap; i++) {
      const a = i / 180 * Math.PI * 2;
      const x = Math.cos(a) * 60, z = Math.sin(a) * 60;
      if (T.wallBandsDbg.blocked(x, z, 0.4)) continue;
      if (T.pathWearAt(x, z) < 0.45) continue;
      const gx = Math.round(x / 2), gz = Math.round(z / 2);
      const why = T.placeRefusalFor('wall', gx, gz);
      if (why == null) gap = gx + ',' + gz;
    }
    ok(!!gap, 'a ring gap takes a wall' + (gap ? ' @' + gap : ''));

    let thick = null, sample = '';
    for (let gx = -40; gx <= 40 && !thick; gx++) for (let gz = -40; gz <= 40 && !thick; gz++) {
      const x = gx * 2, z = gz * 2;
      const r = Math.hypot(x, z);
      if (r < 56 || r > 64) continue;
      if (!T.wallBandsDbg.blocked(x, z, 0.2)) continue;
      const why = T.placeRefusalFor('wall', gx, gz);
      sample = gx + ',' + gz + ' ' + why;
      if (why && /thick/i.test(why)) thick = why;
    }
    ok(!!thick, 'the thicket refuses a wall' + (thick ? ' (' + thick + ')' : ' (saw ' + sample + ')'));

    let woods = null;
    for (const t of T.trees) {
      if (!t.alive || t.stump || t.falling) continue;
      if (Math.hypot(t.x, t.z) < 32) continue;
      if (Math.hypot(t.x - 42, t.z + 20) < 16) continue;
      const why = T.placeRefusalFor('wall', Math.round(t.x / 2), Math.round(t.z / 2));
      if (why && /thick/i.test(why)) { woods = why; break; }
    }
    ok(!!woods, 'the woods refuse a wall' + (woods ? ' (' + woods + ')' : ''));

    const built = T.placeBuildAt('wall', 4, 0);
    ok(!!built, 'the yard wall stood');
    T.updateFlowField(0, true);
    let closed = T.ffBlockedAt(8, 0) > 0;
    for (let i = 0; !closed && i < 20; i++) {
      await wait(100);
      const d = T.valleyDistAt(8, 0);
      closed = T.ffBlockedAt(8, 0) > 0 || (d != null && d > 1e8);
    }
    const around = T.valleyDistAt(14, 8);
    ok(closed, 'the field closes the cell he built on');
    ok(around != null && around < 1e8, 'the dead still have a way round it');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
