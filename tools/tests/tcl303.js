// query: gates=1&chaingates=1
// tcl303 - CL-303 (D-116, Jerry 6 Nov): the story places' new locks and the straight line, behind ?gates=1. The depot and
// the rangers keep stone; the mast yard is chain link with wire on top and a gate grown over with vines that a blade
// cuts; the hikers' camp is a ring of trees with a crashed truck in its mouth that the convoy's winch drags clear. The
// chain runs in a line ("You cannot complete the one until you finish the other"): one lead at a time, each stamped done
// at the duty board before the next prints (the Grave Shift orders). The look is placeholder until AG-245/246/247.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'StoryLine');
    const D = T.storyGatesDbg, C = T.chainDbg, S = T.storyDbg;
    ok(!!(D && D.line && C && S), 'the hooks are there (storyGatesDbg.line, chainDbg, storyDbg)');
    if (!D || !D.on) { out.push('INFO world checks need ?gates=1&chaingates=1'); return out.join('\n'); }
    D.build();
    const rings = D.rings(), kind = Object.fromEntries(rings.map((r) => [r.place, r.kind]));
    out.push('INFO kinds ' + JSON.stringify(kind) + ' skipped ' + JSON.stringify(D.skipped()));
    ok(kind.mast === 'fence' && kind.hikers === 'trees' && kind.rangers === 'stone' && (!kind.depot || kind.depot === 'stone'),
      'the mast is a fence, the hikers\' camp trees, the rangers (and the depot) stone');
    const R = D.line.rules();
    ok(R.line === true && R.maxOpen === 1 && R.stamp === true && !Number.isFinite(R.fallbackDawns), 'the chain runs the line: one open, no fallback, stamped (' + JSON.stringify(R) + ')');
    // The tools lie where they belong, from the start.
    const mk = C.keyAt('machete'), wk = C.keyAt('winch');
    ok(!!mk && mk.state === 'ready' && mk.visible, 'the machete lies in the depot shed (' + JSON.stringify(mk) + ')');
    ok(!!wk && wk.state === 'ready' && wk.visible, 'the winch lies at the convoy (' + JSON.stringify(wk) + ')');
    const P = T.POI;
    if (mk && P.sheds && P.sheds[2]) ok(Math.hypot(mk.x - P.sheds[2].x, mk.z - P.sheds[2].z) < 20, 'the machete is at the depot (' + Math.hypot(mk.x - P.sheds[2].x, mk.z - P.sheds[2].z).toFixed(1) + ' m)');
    if (wk && P.wrecks && P.wrecks[0]) ok(Math.hypot(wk.x - P.wrecks[0].x, wk.z - P.wrecks[0].z) < 9, 'the winch is at the convoy (' + Math.hypot(wk.x - P.wrecks[0].x, wk.z - P.wrecks[0].z).toFixed(1) + ' m)');
    ok(C.keyAt('sato-key') === null && C.keyAt('chain-key') === null, 'no Sato\'s key and no glovebox key on the line');
    const walkIn = (r, a, from = 5, to = 5) => {
      let x = r.cx + Math.cos(a) * (r.r + from), z = r.cz + Math.sin(a) * (r.r + from);
      const tx = r.cx + Math.cos(a) * (r.r - to), tz = r.cz + Math.sin(a) * (r.r - to);
      for (let k = 0; k < 120; k++) {
        const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz); if (d < 0.05) break;
        const st = Math.min(0.15, d); const p = T.wallBandsDbg.resolve(x + dx / d * st, z + dz / d * st, 0.35); x = p.x; z = p.z;
      }
      return Math.hypot(x - r.cx, z - r.cz);
    };
    const hold = (keys) => { const st = C.read(); for (const k of keys) st.keys[k] = 'held'; C.load(st); };
    // The mast yard: the vines.
    const mast = rings.find((r) => r.place === 'mast');
    if (mast) {
      const g = mast.gates[0], a = Math.atan2(g.z - mast.cz, g.x - mast.cx);
      let st = D.line.gate('mast');
      ok(st && !st.open && st.vines === true && st.why === 'no-key', 'the mast gate: shut, grown over, needs a blade (' + JSON.stringify(st) + ')');
      ok(/vine/i.test(D.line.why('mast')) && /blade/i.test(D.line.why('mast')), 'it says so: ' + D.line.why('mast'));
      ok(D.line.use('mast', 'gate') === false && !D.line.gate('mast').open, 'E without a blade does nothing');
      ok(walkIn(mast, a) > mast.r - 0.5, 'the trail in stops at the vines (' + walkIn(mast, a).toFixed(2) + ')');
      hold(['machete']);
      ok(/vines/i.test(String(D.line.prompt('mast', 'gate'))), 'with the machete the prompt offers the cut (' + D.line.prompt('mast', 'gate') + ')');
      D.line.use('mast', 'gate'); D.line.use('mast', 'gate');
      st = D.line.gate('mast');
      ok(st.chops === 2 && !st.open && st.vines, 'two chops: still shut (' + JSON.stringify(st) + ')');
      D.line.use('mast', 'gate');
      const t0 = Date.now(); while (Date.now() - t0 < 8000 && !D.gates().filter((q) => q.place === 'mast').every((q) => q.w > 0.99)) await wait(200);
      st = D.line.gate('mast');
      ok(st.open && st.vines === false && C.read().gates['mast-yard'] === 'open', 'the third chop: the vines fall and the gate opens (' + JSON.stringify(st) + ')');
      const gq = D.gates().filter((q) => q.place === 'mast');
      ok(gq.every((q) => q.solids === 0 && q.blocks === 0), 'its solids and field block gone');
      ok(walkIn(mast, a) < mast.r - 4, 'the trail now goes in (' + walkIn(mast, a).toFixed(1) + ')');
      C.reset(); await wait(500);
      st = D.line.gate('mast');
      ok(!st.open && st.vines === true && st.chops === 0, 'a run reset grows them back (' + JSON.stringify(st) + ')');
    }
    // The hikers' camp: the crashed truck and the winch.
    const hik = rings.find((r) => r.place === 'hikers');
    if (hik) {
      const g = hik.gates[0], a = Math.atan2(g.z - hik.cz, g.x - hik.cx);
      let st = D.line.gate('hikers');
      ok(st && !st.open && st.winch && st.winch.stage === 0 && st.why === 'no-key', 'the hikers\' mouth: the truck across it, no winch yet (' + JSON.stringify(st) + ')');
      ok(/truck/i.test(D.line.why('hikers')), 'it says so: ' + D.line.why('hikers'));
      ok(walkIn(hik, a) > hik.r - 0.5, 'the trail in stops at the truck (' + walkIn(hik, a).toFixed(2) + ')');
      let leaks = 0; for (let k = 0; k < 24; k++) { const b = k * Math.PI / 12; if (Math.abs(b - a) < 0.3) continue; if (walkIn(hik, b) < hik.r - 1) leaks++; }
      ok(leaks === 0, 'no way through the trees anywhere round (' + leaks + ' of the bearings got in)');
      const sp = D.line.spots('hikers');
      ok(!!sp && Math.hypot(sp.anchor.x - hik.cx, sp.anchor.z - hik.cz) > hik.r && Math.hypot(sp.remote.x - hik.cx, sp.remote.z - hik.cz) > hik.r, 'the anchor tree and the remote are outside the ring (' + JSON.stringify(sp) + ')');
      hold(['winch']);
      ok(D.line.use('hikers', 'tree') === false && D.line.gate('hikers').winch.stage === 0, 'the tree first does nothing: bolt it on first (' + D.line.why('hikers') + ')');
      ok(/bolt/i.test(String(D.line.prompt('hikers', 'truck'))), 'at the truck: ' + D.line.prompt('hikers', 'truck'));
      D.line.use('hikers', 'truck');
      ok(D.line.gate('hikers').winch.stage === 1, 'E at the truck: the winch is bolted on');
      D.line.use('hikers', 'tree');
      ok(D.line.gate('hikers').winch.stage === 2 && !D.line.gate('hikers').open, 'E at the tree: the line is tied off, still shut');
      D.line.hold('hikers', true);
      await wait(2500);
      const mid = D.line.gate('hikers');
      ok(mid.winch.t > 0.1 && mid.winch.t < 1 && !mid.open && mid.winch.called, 'holding at the remote: the truck creeps, and the noise calls the dead (' + JSON.stringify(mid.winch) + ')');
      D.line.hold('hikers', false); const t1 = D.line.gate('hikers').winch.t; await wait(800);
      ok(Math.abs(D.line.gate('hikers').winch.t - t1) < 0.02, 'let go: it stops');
      D.line.hold('hikers', true);
      const t0 = Date.now(); while (Date.now() - t0 < 30000 && !D.line.gate('hikers').open) await wait(250);   // 7 s of game time; the test page runs slower than real time
      D.line.hold('hikers', false);
      st = D.line.gate('hikers');
      ok(st.open && st.winch.t === 1 && st.rest === 3 && C.read().gates['trail-chain'] === 'open', 'held long enough: the truck lies clear and the way is open (' + JSON.stringify(st) + ')');
      ok(Math.abs(st.truck.yaw - Math.PI / 2) < 0.05 && Math.hypot(st.truck.x, st.truck.z) > 4, 'the truck turned along the trail, off to the side (' + JSON.stringify(st.truck) + ')');
      ok(D.gates().filter((q) => q.place === 'hikers').every((q) => q.solids === 0 && q.blocks === 0), 'the mouth\'s solids and field block gone');
      ok(walkIn(hik, a) < hik.r - 4, 'the trail now goes in (' + walkIn(hik, a).toFixed(1) + ')');
      C.reset(); await wait(500);
      st = D.line.gate('hikers');
      ok(!st.open && st.winch.stage === 0 && st.winch.t === 0 && st.rest === 0, 'a run reset puts the truck back (' + JSON.stringify(st) + ')');
    }
    // The line: nothing before its turn; a done lead waits for its stamp.
    const ch = S.chain;
    S.gate(true);
    hold(['ranger-gate-key', 'machete']);
    ok(D.line.gate('rangers') ? D.line.gate('rangers').why === 'not-yet' : true, 'with the story gate on, the rangers\' key in hand opens nothing before its turn (' + (D.line.gate('rangers') || {}).why + ')');
    ok(/not yet/i.test(String(D.line.why('mast'))), 'nor the mast\'s vines: ' + D.line.why('mast'));
    ch.dawn(2);
    ok(ch.read().open.join() === 'generator', 'day 2: the depot\'s order (' + ch.read().open.join() + ')');
    ok(ch.done('relay') === false, 'the mast can\'t be done before its turn');
    ch.done('generator');
    ok(D.line.due() === 'generator', 'the depot done: its order waits for the stamp');
    ch.dawn(3);
    ok(ch.stateOf('relay') === 'closed', 'unstamped: the next dawn prints nothing');
    ok(D.line.stamp() === true && D.line.due() === null && D.line.stamped('generator'), 'stamped at the duty board');
    ch.dawn(4);
    ok(ch.read().open.join() === 'relay', 'the dawn after the stamp: the mast\'s order (' + ch.read().open.join() + ')');
    ok(D.line.gate('mast').why !== 'not-yet', 'now the vines can be cut (' + D.line.gate('mast').why + ')');
    S.gate(false);
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
