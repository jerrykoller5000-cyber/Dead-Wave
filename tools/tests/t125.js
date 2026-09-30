// t125 — CL-103 and CL-103b (Jerry 2026-09-29): the CIF and the Armory side by side on the HQ's east face, the wall opposite the
// kiosk and the skull window. E at the Armory's window during prep opens the Armory (GP-78's panel, inside the CIF
// overlay); at the CIF's window E still opens the CIF; the two windows are on the same wall, a couple of metres apart.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Armory');
    const a = T.HQ_ARMORY_FRONT, c = T.HQ_CIF_FRONT, K = T.KIOSK;
    ok(a.x > 5 && c.x > 5 && Math.abs(a.x - c.x) < 0.01, 'both on the east face (x ' + a.x + ', ' + c.x + ')');
    // CL-103b: each under one of the east face's red firing slits, at z = -3.3 and 3.3.
    ok(Math.abs(Math.abs(a.z) - 3.3) < 0.05 && Math.abs(Math.abs(c.z) - 3.3) < 0.05 && Math.sign(a.z) !== Math.sign(c.z), 'each under a red slit (z ' + c.z + ', ' + a.z + ')');
    ok(!K || K.x < 0, 'opposite the kiosk (kiosk x ' + (K ? K.x.toFixed(1) : '?') + ')');
    const p = T.player.position;
    p.set(a.x, T.sampleHeight(a.x, a.z), a.z); await wait(200);
    ok(T.getPhase() === 'prep' && T.actionTarget() === 'armory', 'at the Armory window in prep, E means: the Armory (' + T.actionTarget() + ')');
    T.doAction(); await wait(80);
    const panel = document.querySelector('#cif .armory, #cif [class*="armory"]');
    const cif = document.getElementById('cif'), card = cif.querySelector(':scope > .card');
    ok(T.isCIFOpen() && cif.classList.contains('armory-show'), 'the Armory panel opens');
    ok(card && getComputedStyle(card).display === 'none', 'the Armory alone: the CIF menu is not shown with it');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' })); await wait(80);
    ok(!T.isCIFOpen() && !cif.classList.contains('armory-only'), 'E closes it');
    T.doAction(); await wait(80);
    const done = [...document.querySelectorAll('#armoryPanel .armory-actions button')].pop();
    if (done) done.click(); await wait(80);
    ok(!T.isCIFOpen(), "the Armory's Done closes the window too");
    p.set(c.x, T.sampleHeight(c.x, c.z), c.z); await wait(200);
    ok(T.actionTarget() === 'cif', 'at the CIF window, E means the CIF');
    T.doAction(); await wait(80);
    const btn = document.getElementById('armoryOpen');
    ok(T.isCIFOpen() && !cif.classList.contains('armory-show') && getComputedStyle(card).display !== 'none' && (!btn || getComputedStyle(btn).display === 'none'), 'the CIF alone: camo, and no Armory button in it');
    T.closeCIF();
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()
