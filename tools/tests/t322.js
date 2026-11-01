// t322 - GB-266 (CL-289 iron, CL-287 W2; D-106): horseshoes hung over a ring gap close it to the dead only.
// The old man's lead gives four sets (the HUD count); E at a gap hangs one (the count goes down, a line on posts);
// the dead's field routes round it and a shambler from outside that gap comes in through another one, never across
// the iron; he walks through it; E takes it down (the count back up); a new run starts with none hung.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const hypot = Math.hypot;
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  try {
    if (!T.ironDbg || !T.utilityDbg || !T.wallBandsDbg) { ok(false, 'the iron hooks are there'); return out.join('\n'); }
    await startMatch(T, 'IronGap');
    T.clearZombies(); T.runDevCommand('godmode'); if (T.skipGrace) T.skipGrace();
    const I = T.ironDbg, U = T.utilityDbg;
    const hx = T.house.group.position.x, hz = T.house.group.position.z;
    const put = (x, z) => { T.player.position.set(x, T.sampleHeight(x, z), z); };
    const hud = () => { const el = document.getElementById('ironStat'), n = document.getElementById('ironCount'); return el && !el.hidden ? n.textContent : null; };
    ok(!!T.wallBandsDbg.on, 'the ring is on');
    U.on(true);
    const spots = I.spots().filter((s) => s.kind === 'ring');
    ok(spots.length >= 2, 'a spot over each opening in the ring (' + spots.length + ': ' + spots.map((s) => s.id + ' ' + (s.half * 2).toFixed(1) + ' m').join(', ') + ')');
    put(spots[0].x, spots[0].z); await wait(100);
    ok(I.target() === null && I.left() === 0, 'before the old man\'s lead there is nothing to hang');
    U.lead('oldman'); await wait(50);
    ok(I.left() === 4 && hud() === '4', 'the old man\'s lead gives four sets, on the HUD (' + I.left() + ', ' + hud() + ')');

    // Pick a gap with dry walkable ground outside it, on its own bearing.
    function dryOut(s) {
      const a0 = Math.atan2(s.z, s.x);
      for (const r of [84, 78, 92]) for (const da of [0, 0.06, -0.06, 0.12, -0.12]) {
        const x = Math.cos(a0 + da) * r, z = Math.sin(a0 + da) * r;
        if (T.waterDepthAt(x, z) > 0.3 || T.terrainSlope(x, z) > 0.62) continue;
        return { x, z };
      }
      return null;
    }
    const S = spots.find((s) => dryOut(s)) || spots[0];
    // The iron runs along the ring in short chords (segs): which side of the nearest one, and how far along the ring.
    const segNear = (s, x, z) => { let b = s.segs[0], bd = Infinity; for (const g of s.segs) { const d = hypot(x - g.x, z - g.z); if (d < bd) { bd = d; b = g; } } return b; };
    const sideOf = (s, x, z) => { const g = segNear(s, x, z); return (x - g.x) * -g.uz + (z - g.z) * g.ux; };
    const alongOf = (s, x, z) => { const d = Math.atan2(z, x) - Math.atan2(s.z, s.x); return Math.atan2(Math.sin(d), Math.cos(d)) * hypot(s.x, s.z); };
    const ra = Math.atan2(S.z, S.x), probe = { x: Math.cos(ra) * 66, z: Math.sin(ra) * 66 };
    const dist0 = T.valleyDistAt(probe.x, probe.z);

    // Hang, by E.
    put(S.x, S.z); await wait(150);
    ok(I.target() === S.id && /hang/i.test(I.prompt() || ''), 'at the gap the prompt says hang (' + I.prompt() + ')');
    ok(I.use() === true, 'E hangs a set');
    ok(I.left() === 3 && hud() === '3', 'the count goes down to 3 (' + I.left() + ', HUD ' + hud() + ')');
    ok(I.meshes() === 1 && I.blocks() > 3, 'a horseshoe line on posts and its blocked cells (' + I.meshes() + ' line, ' + I.blocks() + ' cells)');
    ok(/down/i.test(I.prompt() || ''), 'at hung iron the prompt says take it down (' + I.prompt() + ')');
    ok(I.read().hung.indexOf(S.id) >= 0, 'the run holds it (' + JSON.stringify(I.read()) + ')');
    // Take it down and hang it again: the count goes up and down.
    ok(I.use() === true && I.left() === 4 && hud() === '4' && I.meshes() === 0 && I.blocks() === 0, 'E takes it down: the count back to 4, the line gone');
    ok(I.use() === true && I.left() === 3 && I.meshes() === 1, 'and hangs it again (3 left)');

    // The dead's field routes round it.
    await until(() => { const d = T.valleyDistAt(probe.x, probe.z); return d != null && dist0 != null && d > dist0 + 4; }, 5000);
    const dist1 = T.valleyDistAt(probe.x, probe.z);
    ok(dist1 > dist0 + 4, 'outside the hung gap the way to the HQ is longer: round to another gap (' + (dist0 || 0).toFixed(1) + ' to ' + (dist1 === Infinity ? 'inf' : (dist1 || 0).toFixed(1)) + ' m)');
    // The push: a dead body on the line goes back to its own side; his resolver doesn't move him.
    const pOut = I.push(S.x + Math.cos(ra) * 0.1, S.z + Math.sin(ra) * 0.1, 0.35, S.x + Math.cos(ra) * 0.8, S.z + Math.sin(ra) * 0.8);
    ok(Math.abs(sideOf(S, pOut.x, pOut.z)) >= 0.59 && Math.sign(sideOf(S, pOut.x, pOut.z)) === Math.sign(sideOf(S, S.x + Math.cos(ra), S.z + Math.sin(ra))),
      'a dead body walking onto the line is pushed back out (' + sideOf(S, pOut.x, pOut.z).toFixed(2) + ' m off)');
    const pr = T.wallBandsDbg.resolve(S.x, S.z, 0.35);
    ok(hypot(pr.x - S.x, pr.z - S.z) < 1e-3, 'his collision does not see the iron');

    // A shambler from outside that gap comes in through another, never across the iron.
    put(hx, hz + 6); T.clearZombies();
    const from = dryOut(S);
    if (!from) ok(false, 'dry ground outside the hung gap');
    else {
      const z = T.spawnZombie(from.x, from.z, 'shambler', true, true);
      const t0 = T.getSimTime(), w0 = Date.now();
      let crossed = false, entry = null, lastSide = null, onLine = 0;
      while (T.getSimTime() - t0 < 90 && Date.now() - w0 < 60000) {
        await wait(80);
        if (!z.alive) break;
        const p = z.mesh.position, r = hypot(p.x - hx, p.z - hz);
        const sd = sideOf(S, p.x, p.z), al = Math.abs(alongOf(S, p.x, p.z));
        if (al < S.half) {
          if (lastSide != null && Math.sign(sd) !== Math.sign(lastSide) && Math.abs(sd) > 0.05) crossed = true;
          if (Math.abs(sd) < 0.5) onLine++;
          lastSide = sd;
        } else lastSide = null;
        if (entry == null && hypot(p.x, p.z) < 57) entry = { x: p.x, z: p.z };
        if (r < 52) break;
      }
      const p = z.mesh.position;
      const inside = hypot(p.x - hx, p.z - hz) < 52;
      const away = entry ? Math.abs(alongOf(S, entry.x, entry.z)) : 0;   // along the ring from the line's centre
      ok(inside, 'the shambler outside the hung gap still reaches the clearing (' + (T.getSimTime() - t0).toFixed(0) + ' s, r ' + hypot(p.x - hx, p.z - hz).toFixed(0) + ')');
      ok(!crossed && onLine === 0 && away > S.half, 'it came in through another gap, ' + away.toFixed(0) + ' m along the ring from the iron (its line ' + S.half.toFixed(1) + ' m each way; crossed ' + crossed + ', on the line ' + onLine + ')');
    }
    T.clearZombies();

    // He walks through it, on his own legs: W carries him across the hung line.
    put(hx, hz + 6); await wait(200);
    const a0 = { x: T.player.position.x, z: T.player.position.z };
    key('keydown', 'KeyW'); await wait(500); key('keyup', 'KeyW'); await wait(200);
    let dx = T.player.position.x - a0.x, dz = T.player.position.z - a0.z; const dl = hypot(dx, dz);
    if (dl < 0.3) ok(false, 'W moves him (' + dl.toFixed(2) + ' m)');
    else {
      dx /= dl; dz /= dl;
      // The hung gap he walks: the spot whose line he meets most square-on; hang there if it isn't S.
      let W = S, best = -1;
      for (const s of spots) { const c = Math.abs(dx * -s.uz + dz * s.ux); if (c > best) { best = c; W = s; } }
      if (W.id !== S.id) { I.down(S.id); I.hang(W.id); }
      const s0 = { x: W.x - dx * 2.2, z: W.z - dz * 2.2 };
      put(s0.x, s0.z); await wait(200);
      const side0 = sideOf(W, T.player.position.x, T.player.position.z);
      key('keydown', 'KeyW');
      const crossedHim = await until(() => Math.sign(sideOf(W, T.player.position.x, T.player.position.z)) !== Math.sign(side0)
        && Math.abs(sideOf(W, T.player.position.x, T.player.position.z)) > 0.8, 3000);
      key('keyup', 'KeyW');
      ok(crossedHim && I.read().hung.indexOf(W.id) >= 0, 'he walks through the hung gap (square-on ' + best.toFixed(2) + ', ' + sideOf(W, T.player.position.x, T.player.position.z).toFixed(2) + ' m past)');
    }

    // A new run: nothing hung, no lines, no blocked cells.
    const q = document.getElementById('quitConfirmBtn');
    if (q) {
      q.click(); await wait(800);
      await startMatch(T, 'IronGap2');
      ok(I.read().hung.length === 0 && I.meshes() === 0 && I.blocks() === 0, 'a new run starts with none hung (' + JSON.stringify(I.read()) + ', ' + I.meshes() + ' lines, ' + I.blocks() + ' cells)');
    } else ok(false, 'the quit button is there');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()