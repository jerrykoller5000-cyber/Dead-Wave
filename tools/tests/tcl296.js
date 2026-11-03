// query: gates=1&chaingates=1
// tcl296 - CL-296 (D-111 order 3; docs/specs/story-gates.md). Jerry, 1.2: "we are going to have to work on gating
// certain locations and making the player do something before accessing them." Under ?gates=1 the story places whose
// woods leave a way round their chain gate get a ring of stone with a gate on each of their own trails, opened by that
// chain gate's key. The world checks need the page flags: DW_TEST_QUERY="gates=1&chaingates=1" (until run-all reads a
// per-test query line); without them only the plan is checked.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'StoryGates');
    const D = T.storyGatesDbg;
    ok(!!D, 'TT.storyGatesDbg is there');
    if (!D) return out.join('\n');
    if (!D.on) {
      ok(D.rings().length === 0, 'off unless asked: no rings without ?gates=1 (' + D.rings().length + ')');
      out.push('INFO world checks skipped: run with DW_TEST_QUERY="gates=1&chaingates=1"');
      return out.join('\n');
    }
    const rings = D.rings();
    const names = rings.map((r) => r.place).sort().join(',');
    ok(['mast', 'hikers', 'rangers'].every((p) => names.split(',').includes(p)), 'rings for the mast, the hikers\' and the rangers\' camps (' + names + '; skipped ' + JSON.stringify(D.skipped()) + ')');
    const sites = (window.objectiveSitesFrom ? window.objectiveSitesFrom(T.POI, null) : []);
    const siteOf = { mast: 'objective:radio-repair', hikers: 'objective:hikers-cache', rangers: 'objective:ranger-cache', depot: 'objective:fuel-depot', convoy: 'objective:medical-convoy' };
    // Every other place stays outside every ring.
    const P = T.POI, places = [];
    for (const [k, v] of Object.entries(P)) { if (k === 'signs' || k === 'fences' || k === 'sandbags') continue; for (const p of (Array.isArray(v) ? v : [v])) if (p && Number.isFinite(p.x)) places.push({ k, x: p.x, z: p.z }); }
    const ownPoi = { depot: P.sheds && P.sheds[2], mast: P.mast, convoy: P.wrecks && P.wrecks[0], hikers: P.campsites && P.campsites[1], rangers: P.campsites && P.campsites[0] };
    for (const r of rings) out.push('INFO ring ' + r.place + ' at ' + r.cx.toFixed(1) + ', ' + r.cz.toFixed(1) + ' r ' + r.r + ' gates ' + JSON.stringify(r.gates.map((g) => [+g.x.toFixed(1), +g.z.toFixed(1)])) + ' solids ' + r.solids);
    for (const r of rings) {
      const s = sites.find((q) => q.id === siteOf[r.place]);
      ok(!!s && Math.hypot(s.x - r.cx, s.z - r.cz) < r.r - 3, r.place + ': its site inside the ring (r ' + r.r + ', site at ' + (s ? Math.hypot(s.x - r.cx, s.z - r.cz).toFixed(1) : '?') + ' m)');
      const own = ownPoi[r.place], inside = places.filter((p) => Math.hypot(p.x - r.cx, p.z - r.cz) < r.r + 4 && !(own && Math.hypot(p.x - own.x, p.z - own.z) < 0.5));
      ok(inside.length === 0, r.place + ': no other place inside or on the ring (' + JSON.stringify(inside) + ')');
      ok(r.gates.length >= 1 && r.solids > 50, r.place + ': a closed band with ' + r.gates.length + ' gate(s), ' + r.solids + ' solids');
      // Nothing scattered on the line: no trunk, rock or prop solid within the band and a pad.
      const on = (T.worldSolids || []).filter((q) => !q.wallBand && q.kind !== 'story-gate' && Math.abs(Math.hypot(q.x - r.cx, q.z - r.cz) - r.r) < r.width * 0.5 + (q.radius || 0) + 0.3);
      ok(on.length === 0, r.place + ': nothing standing in the wall (' + on.length + (on[0] ? ', e.g. ' + JSON.stringify(on.slice(0, 3).map((q) => ({ x: +q.x.toFixed(1), z: +q.z.toFixed(1), r: +(q.radius || 0).toFixed(2), kind: q.kind, lm: q.landmark && (q.landmark.name || q.landmark.kind || typeof q.landmark), h: +((q.y1 || 0) - (q.y0 || 0)).toFixed(1), i: (T.worldSolids || []).indexOf(q) }))) : '') + ')');
    }
    // Walk in: 24 bearings round each ring, from 5 m outside straight at the centre, through the game's own push.
    const walkIn = (r, a, from = 5, to = 5) => {
      let x = r.cx + Math.cos(a) * (r.r + from), z = r.cz + Math.sin(a) * (r.r + from);
      const tx = r.cx + Math.cos(a) * (r.r - to), tz = r.cz + Math.sin(a) * (r.r - to);
      for (let k = 0; k < 120; k++) {
        const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz); if (d < 0.05) break;
        const st = Math.min(0.15, d); const p = T.wallBandsDbg.resolve(x + dx / d * st, z + dz / d * st, 0.35); x = p.x; z = p.z;
      }
      return Math.hypot(x - r.cx, z - r.cz);
    };
    const gatesNow = D.gates();
    for (const r of rings) {
      let leaks = 0;
      for (let k = 0; k < 24; k++) {
        const a = k * Math.PI * 2 / 24, gx = r.cx + Math.cos(a) * r.r, gz = r.cz + Math.sin(a) * r.r;
        if (r.gates.some((g) => Math.hypot(g.x - gx, g.z - gz) < g.span + 3)) continue;   // the gate's own bearing
        if (walkIn(r, a) < r.r - 1) leaks++;
      }
      ok(leaks === 0, r.place + ': walking in at 24 bearings round the ring stops at the wall (' + leaks + ' got in)');
      const shut = gatesNow.filter((g) => g.place === r.place);
      ok(shut.length === r.gates.length && shut.every((g) => !g.open && g.solids > 3 && g.blocks > 3), r.place + ': its gates shut, solid, and blocked in the dead\'s field (' + JSON.stringify(shut.map((g) => [g.open, g.solids, g.blocks])) + ')');
      for (const g of r.gates) {
        const a = Math.atan2(g.z - r.cz, g.x - r.cx);
        ok(walkIn(r, a) > r.r - 0.5, r.place + ': the trail in stops at the shut gate (' + walkIn(r, a).toFixed(2) + ' m from the centre, ring ' + r.r + ')');
      }
      ok(D.shut(r.cx, r.cz) === true, r.place + ': inside counts as shut while the gate is locked (no guards, no bounty)');
      if (D.riseOk) { let bad = 0; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, rr = r.r * 0.6; if (D.riseOk(r.cx + Math.cos(a) * rr, r.cz + Math.sin(a) * rr)) bad++; } ok(bad === 0, r.place + ': nothing rises inside it at night while shut (AG-213; ' + bad + ' of 12 spots allowed)'); }
    }
    // The key opens it, here at the ring: give him the mast's key and press E at the gate.
    const mast = rings.find((r) => r.place === 'mast');
    if (mast) {
      const st = T.chainDbg.read(); st.keys['sato-key'] = 'held'; T.chainDbg.load(st);
      const g = mast.gates[0], a = Math.atan2(g.z - mast.cz, g.x - mast.cx);
      const pp = T.player.position; const ox = g.x + Math.cos(a) * 1.6, oz = g.z + Math.sin(a) * 1.6;
      pp.set(ox, T.sampleHeight(ox, oz), oz);
      await wait(300);
      ok(D.near() === 'mast', 'at the mast\'s gate: near() names it (' + D.near() + ')');
      const prompt = T.chainDbg.prompt();
      ok(/E/.test(String(prompt || '')), 'with Sato\'s key the prompt offers E (' + prompt + ')');
      T.chainDbg.use();
      const t0 = Date.now(); while (Date.now() - t0 < 8000 && !D.gates().filter((q) => q.place === 'mast').every((q) => q.w > 0.99)) await wait(200);
      const after = D.gates().filter((q) => q.place === 'mast');
      ok(T.chainDbg.read().gates['mast-yard'] === 'open', 'E at the ring opens the chain\'s mast-yard gate');
      ok(after.every((q) => q.open && q.solids === 0 && q.blocks === 0 && q.w > 0.99), 'the mast\'s gate swung open, its solids and field block gone (' + JSON.stringify(after.map((q) => [q.open, q.solids, q.blocks, +q.w.toFixed(2)])) + ')');
      ok(walkIn(mast, a) < mast.r - 4, 'the trail now goes in (' + walkIn(mast, a).toFixed(1) + ' m from the centre)');
      ok(D.shut(mast.cx, mast.cz) === false, 'inside the open ring is no longer shut');
      T.chainDbg.reset(); await wait(400);
      const back = D.gates().filter((q) => q.place === 'mast');
      ok(back.every((q) => !q.open && q.solids > 3 && q.blocks > 3), 'a run reset shuts it again (' + JSON.stringify(back.map((q) => [q.open, q.solids, q.blocks])) + ')');
      // Without the key: E says why and opens nothing.
      pp.set(ox, T.sampleHeight(ox, oz), oz); await wait(200);
      const p2 = T.chainDbg.prompt(); T.chainDbg.use(); await wait(300);
      ok(T.chainDbg.read().gates['mast-yard'] === 'locked' && !/^E/.test(String(p2 || '')), 'without the key it stays locked and says why (' + p2 + ')');
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
