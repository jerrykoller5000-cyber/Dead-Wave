// t173 - GB-119 (P-96): the true ending in the world. Once the ending has come (CL-111's rune finish unlocked), a
// rune-etched pistol lies on the dock planks by day; E beside it takes it: his pistol in the rune finish, in hand.
// On 'quest' { kind: 'ending' } every dead in the valley drops where it stands, with no pay.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = []; window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (d.type === 'rune-pistol') events.push(d); });
  const R = T.runePistolDbg;
  try {
    await startMatch(T, 'Rune');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    ok(!!R && !!R.spot(), 'the debug handle is there, and the dock has a spot for it');
    R.relock(); await wait(200);
    ok(!R.state().shown && !R.state().visible, 'before the true ending has ever come: no pistol on the dock');
    R.unlock(); await wait(250);
    const m = R.mesh(), s = R.spot();
    ok(!!m && R.state().shown && R.state().visible && events.some((e) => e.phase === 'shown'), "after it: by day it lies on the dock ('rune-pistol' shown)");
    ok(m && Math.hypot(m.position.x - s.x, m.position.z - s.z) < 0.01 && Math.abs(m.position.y - s.y) < 0.01, 'on the planks at the dock\'s middle');
    let etched = false; m && m.traverse((o) => { if (o.isMesh && o.material && o.material.map === R.runeTex()) etched = true; });
    ok(etched, 'its furniture is the rune finish');
    // E beside it.
    const p = T.player.position;
    p.set(s.x + 0.6, s.y, s.z); await wait(150);
    ok(R.inReach(), 'beside it, E is on it');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    await wait(150);
    document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    ok(R.state().taken && !R.state().visible && events.some((e) => e.phase === 'taken'), "E takes it: gone from the dock ('rune-pistol' taken)");
    const fur = T.getGunFurniture();
    ok(!!fur && !!fur.pistol && fur.pistol.length > 0 && fur.pistol.every((mt) => mt.map === R.runeTex()), 'his pistol wears the rune finish');
    ok(R.weapon() === 'pistol', 'and it is in his hand (' + R.weapon() + ')');
    await wait(200);
    ok(!R.state().visible, 'it stays taken');
    // The ending: every dead drops, unpaid.
    const zs = [];
    for (let k = 0; k < 4; k++) { const z = T.spawnZombie(p.x + 20 + k * 2, p.z + 8, 'shambler', true, true); if (z) zs.push(z); }
    const k0 = R.kills();
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'quest', kind: 'ending' } }));
    await wait(200);
    ok(zs.length === 4 && zs.every((z) => !z.alive), "on the quest's ending every dead drops where it stands");
    ok(R.kills() === k0, 'with no kills counted and no pay (' + k0 + ' -> ' + R.kills() + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { R && R.relock(); } catch (_) {}
  return out.join('\n');
})();
