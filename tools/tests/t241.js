// t241 - CU-103: crouch in front of the parish cross. He is healed, he glows gold, and it works once this day.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: 'c', bubbles: true }));
  try {
    await startMatch(T, 'Chapel');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    const church = await (async () => { let c = null; const t0 = Date.now(); while (!c && Date.now() - t0 < 8000) { c = T.scene.getObjectByName('coldwater-church'); if (!c) await wait(50); } return c; })();
    ok(!!church, 'the parish church is standing');
    if (!church) return out.join('\n');
    const stand = (lx, lz) => {
      church.updateMatrixWorld(true);
      const v = T.player.position.clone();
      v.set(lx, 0, lz);
      church.localToWorld(v);
      T.player.position.set(v.x, T.sampleHeight(v.x, v.z), v.z);
    };
    const glow = () => T.scene.getObjectByName('chapel-glow');
    stand(8, 8);
    await wait(300);
    T.setHp(40);
    key('KeyC', true);
    await wait(180);
    ok(T.getHp() === 40, 'crouching away from the cross does not heal (' + T.getHp() + ')');
    key('KeyC', false);
    await wait(80);
    stand(0, -2.2);
    await until(() => T.player.position.y < 400, 500);
    await wait(250);
    T.setHp(40);
    key('KeyC', true);
    await wait(200);
    ok(T.getHp() > 40, 'in front of the cross, crouch heals him (' + T.getHp() + ')');
    ok(await until(() => { const m = glow(); return m && m.material.opacity > 0.15; }, 2000), 'he glows gold (' + (() => { const m = glow(); return m ? m.material.opacity.toFixed(2) : 'no mesh'; })() + ')');
    key('KeyC', false);
    await wait(80);
    T.setHp(40);
    key('KeyC', true);
    await wait(180);
    ok(T.getHp() === 40, 'once this day: a second crouch does not heal (' + T.getHp() + ')');
    key('KeyC', false);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC', bubbles: true })); } catch (_) {}
  return out.join('\n');
})()
