// t309 - CU-191 (Jerry's J29): the radio vault's roof and front are cut away so the third-person camera
// can see in. In first person he is standing in the room, so nothing is cut away. Third person still cuts it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.radioCuesDbg || !T.setViewFirstDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Radio vault');
    T.clearZombies && T.clearZombies();
    const L = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 8000) { const l = T.radioCuesDbg().locker; if (l && l.vault && l.insideAt) return l; await wait(50); } return null; })();
    ok(!!L, 'the radio vault is built');
    if (!L) return out.join('\n');
    const P = T.player.position;
    P.set(L.insideAt.x, L.insideAt.y + 0.05, L.insideAt.z);
    T.clearZombies();
    ok(await until(() => L.cutaway === true && L.vault.roof && !L.vault.roof.visible, 4000), 'third person inside: the roof and the front are cut away');
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().w > 0.9, 20000), 'first person (' + T.fpDbg().w.toFixed(2) + ')');
    ok(await until(() => L.cutaway === false && L.vault.roof.visible, 4000), 'first person inside: the walls stay (cutaway ' + L.cutaway + ', roof ' + (L.vault.roof && L.vault.roof.visible) + ')');
    T.setViewFirstDbg(false);
    ok(await until(() => L.cutaway === true && !L.vault.roof.visible, 8000), 'back to third person: cut away again');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't309 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    T.setViewFirstDbg && T.setViewFirstDbg(false);
  }
  return out.join('\n');
})()
