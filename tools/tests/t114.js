// t114 - GB-111 (P-120): dw-game 'enemy-first-seen' { kind } once a run per kind, the first time one comes within
// 60 m of the marine. None while it is further out; one when it comes in; never a second for the same kind (another
// of it closer in, or the same one staying near); a new kind gets its own.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const seen = []; window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (d.type === 'enemy-first-seen') seen.push(d); });
  try {
    await startMatch(T, 'FirstSeen');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    await wait(200);
    const had = T.getFirstSeenDbg().kinds;
    const fresh = ['demon', 'screamer', 'leaper', 'military', 'spider', 'brute', 'feral', 'drowned'].filter((k) => had.indexOf(k) < 0);
    ok(T.FIRST_SEEN_R === 60 && fresh.length >= 2, 'two kinds not seen yet this run: ' + fresh.slice(0, 2).join(', ') + ' (seen: ' + had.join(', ') + ')');
    const [A, B] = fresh;
    const P = T.player.position;
    const hold = (z) => { z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 1e6; return z; };
    const n0 = seen.length;
    const a1 = hold(T.spawnZombie(P.x + 75, P.z, A, true, true));
    await wait(500);
    ok(seen.filter((d) => d.kind === A).length === 0, 'a ' + A + ' 75 m out: no event');
    a1.mesh.position.x = P.x + 50;
    const got = await until(() => seen.some((d) => d.kind === A), 2000);
    const ev = seen.find((d) => d.kind === A);
    ok(got && ev && ev.kind === A && typeof ev.day === 'number' && ev.runId != null, 'it comes to 50 m: one enemy-first-seen { kind: ' + (ev && ev.kind) + ', day ' + (ev && ev.day) + ' }');
    hold(T.spawnZombie(P.x - 20, P.z, A, true, true));
    await wait(600);
    ok(seen.filter((d) => d.kind === A).length === 1, 'a second ' + A + ' at 20 m and the first staying near: still one (' + seen.filter((d) => d.kind === A).length + ')');
    hold(T.spawnZombie(P.x, P.z + 30, B, true, true));
    await until(() => seen.some((d) => d.kind === B), 2000);
    await wait(300);
    ok(seen.filter((d) => d.kind === B).length === 1, 'a ' + B + ' at 30 m gets its own, once');
    const kinds = seen.slice(n0).map((d) => d.kind);
    ok(new Set(kinds).size === kinds.length, 'no kind twice: ' + kinds.join(', '));
    ok(T.getFirstSeenDbg().kinds.indexOf(A) >= 0 && T.getFirstSeenDbg().kinds.indexOf(B) >= 0, 'both are on the run\'s list');
    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
