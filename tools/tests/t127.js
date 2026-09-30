// t127 - GB-112 (P-32): after an escape the guardian can catch him again, and each escape in a run takes
// more E presses: 5, then 8, then 12, then 16, and 16 after that. Every escape costs the same as the first
// (50 HP, the unbanked skulls) and publishes its own 'guardian-kick-free' receipt. One press short of the
// count still leaves him hauled. A new run starts back at 5.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && (detail.type === 'guardian-kick-free' || (detail.type === 'cave-guardian' && detail.phase === 'escape'))) ev.push(detail); });
  const key = (code) => document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'KeyE' ? 'e' : ' ', bubbles: true }));
  try {
    await startMatch(T, 'KickFreeAgain');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    await until(() => T.caveGrabReady(), 15000);
    const onAxis = (c, d) => ({ x: c.x + Math.sin(c.yaw) * d, z: c.z + Math.cos(c.yaw) * d });
    const placeFront = (c, d) => { const p = onAxis(c, d); T.player.position.set(p.x, T.sampleHeight(p.x, p.z), p.z); };
    let warned = false;
    const catchAt = async (ci) => {
      const c = T.POI.caves[ci];
      placeFront(c, 12); await wait(100);
      T.noteCaveMouthHit(ci);
      if (!warned) {
        warned = true;
        await until(() => { const st = T.getCavePokeState(), w = st.warning; return !!w && w.age > Math.max(st.grace || 0, st.eyesFor || 0) + 0.1; }, 15000);
        placeFront(c, 12); await wait(50); T.noteCaveMouthHit(ci);
      }
      await until(() => { const s = T.getScriptedKill(); return !!s && s.drag && s.dragT > 0.6; }, 45000);
      return T.getScriptedKill();
    };
    const nCaves = T.POI.caves.length;
    const want = [5, 8, 12, 16, 16];
    const receipts = new Set();
    for (let i = 0; i < want.length; i++) {
      T.setHp(80);
      const bag = T.getSkullBag(); bag.count = 3 + i; bag.value = 10 * (i + 1);
      const n0 = ev.length;
      const sk = await catchAt(i % nCaves);
      if (!sk || !sk.drag) { ok(false, 'catch ' + (i + 1) + ': no haul'); break; }
      const open = ev.slice(n0).find((e) => e.type === 'cave-guardian' && e.state === 'open');
      ok(!!open && open.need === want[i], 'catch ' + (i + 1) + ': the haul opens at ' + (open && open.need) + ' presses (want ' + want[i] + ')');
      for (let k = 0; k < want[i] - 1; k++) key('KeyE');
      ok(T.getScriptedKill() === sk && sk.kicks === want[i] - 1, 'catch ' + (i + 1) + ': ' + (want[i] - 1) + ' presses and he is still hauled');
      key('KeyE');
      await wait(100);
      const hp = T.getHp();
      const kf = ev.slice(n0).find((e) => e.type === 'guardian-kick-free');
      ok(!T.getScriptedKill() && hp > 0 && !T.getCine(), 'catch ' + (i + 1) + ': press ' + want[i] + ' frees him');
      ok(hp >= 29.9 && hp <= 31.5 && T.getSkullBag().count === 0, 'catch ' + (i + 1) + ': the same cost, 50 HP (80 -> ' + hp.toFixed(1) + ') and the bag');
      ok(!!kf && kf.lostCount === 3 + i && typeof kf.receiptId === 'string' && !receipts.has(kf.receiptId), 'catch ' + (i + 1) + ': its own receipt ' + (kf && kf.receiptId));
      if (kf) receipts.add(kf.receiptId);
      await wait(300);
    }
    // A new run: back to 5.
    T.resetGame();
    await startMatch(T, 'KickFreeAgain2');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace();
    await until(() => T.caveGrabReady(), 15000);
    warned = false;
    const n1 = ev.length;
    const sk = await catchAt(0);
    const open = ev.slice(n1).find((e) => e.type === 'cave-guardian' && e.state === 'open');
    ok(!!sk && !!open && open.need === 5, 'a new run opens at 5 again (' + (open && open.need) + ')');
    key('Space');
    await wait(200);
    ok(T.getHp() === 0 && T.getDeathCause() === 'caveguard', 'Space still skips to the death: ' + T.getDeathCause());
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
