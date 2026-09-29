// t102 - CU-61 (Jerry direct): the CIF at the HQ swaps the marine's camo, free. E at the window
// opens it; every pattern is a button; a click repaints the shared uniform tile, costs nothing,
// and is remembered; E closes it. M81 Woodland (what he was built in) is the default.
// Claude 2026-09-29: Jerry's second sheet, 9 more patterns and 25 plain colours (49 in all).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const sample = () => { const cv = T.camoTex.image, d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; };
  try {
    try { localStorage.removeItem('tt_camo'); } catch (_) {}
    await startMatch(T, 'CIF');
    ok(T.getCamo() === 'm81', 'he starts in M81 Woodland');
    const p = T.player.position, f = T.HQ_CIF_FRONT;
    p.set(f.x, T.sampleHeight(f.x, f.z), f.z); await wait(200);
    ok(T.actionTarget() === 'cif', 'at the CIF, E means: open it');
    T.doAction(); await wait(50);
    const el = document.getElementById('cif'), list = document.getElementById('cifList');
    ok(T.isCIFOpen() && el.classList.contains('show') && T.getPhase && true, 'the CIF opens');
    const buttons = [...list.querySelectorAll('button[data-camo]')];
    ok(buttons.length === T.CAMO_KEYS.length && buttons.length === 49, 'every pattern and colour, 49 (' + buttons.length + ')');
    ok([...list.children].some((e) => e.classList.contains('cif-group')), 'the plain colours have their heading');
    ok(buttons.find((b) => b.dataset.camo === 'm81').classList.contains('on'), 'M81 is marked as worn');
    ok(document.getElementById('cifTitle').textContent.includes('CIF'), 'titled CIF');
    const bank0 = T.getBank(), before = sample();
    buttons.find((b) => b.dataset.camo === 'dcu').click(); await wait(50);
    ok(T.getCamo() === 'dcu' && sample() !== before, 'DCU repaints the uniform');
    ok(T.getBank() === bank0, 'and it is free ($' + bank0 + ' before and after)');
    ok(buttons.find((b) => b.dataset.camo === 'dcu').classList.contains('on') && !buttons.find((b) => b.dataset.camo === 'm81').classList.contains('on'), 'DCU is marked as worn');
    let saved = null; try { saved = localStorage.getItem('tt_camo'); } catch (_) {}
    ok(saved === 'dcu', 'remembered between runs (' + saved + ')');
    for (const k of T.CAMO_KEYS) { buttons.find((b) => b.dataset.camo === k).click(); }
    ok(T.getCamo() === T.CAMO_KEYS[T.CAMO_KEYS.length - 1] && T.getBank() === bank0, 'every pattern can be worn, all free');
    buttons.find((b) => b.dataset.camo === 'm81').click(); await wait(20);
    ok(T.getCamo() === 'm81' && sample() === before, 'back to M81: the original tile, pixel for pixel');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
    await wait(50);
    ok(!T.isCIFOpen() && !el.classList.contains('show'), 'E closes it');
    try { localStorage.removeItem('tt_camo'); } catch (_) {}
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
