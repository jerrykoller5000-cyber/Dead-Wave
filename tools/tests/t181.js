// t181 - CL-114 (Jerry): a gun's camo is chosen in the Armory, not the CIF; the supply terminal sells only guns in stock
// tonight, and on the night one arrives a short card says it's new at the supply terminal.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(100); } return !!f(); };
  try {
    await startMatch(T, 'CamoStock');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    // --- the CIF: no Guns tab
    T.openCIF();
    const tabs = [...document.querySelectorAll('#cifTabs [data-cif-tab]')].map((b) => b.dataset.cifTab);
    ok(tabs.length > 0 && !tabs.includes('guns'), 'the CIF has no Guns tab (' + tabs.join(',') + ')');
    T.closeCIF();
    // --- the supply terminal on night 1: only the guns in stock
    const night = T.getDay ? T.getDay() : 1;
    T.openShop(true); T.setShopTabDbg && T.setShopTabDbg('weapons');
    let rows = [...document.querySelectorAll('#shopList [data-weapon]')].map((r) => r.dataset.weapon);
    ok(rows.length > 0 && rows.every((w) => T.getWeaponOwned()[w] || T.stockNoticeDbg.NIGHT[w] <= night), 'night ' + night + ': only stocked guns on the supply terminal (' + rows.join(',') + ')');
    ok(!/Arrives night/i.test(document.getElementById('shopList').textContent), 'no "Arrives night" rows');
    ok(!rows.includes('minigun'), 'the minigun (night 14) is not on the supply terminal');
    T.closeShop && T.closeShop();
    // --- the night the Uzi and shotgun arrive
    const D = T.stockNoticeDbg;
    ok(JSON.stringify(D.arrivals(2)) === JSON.stringify(D.arrivals(2).filter((w) => T.stockNoticeDbg.NIGHT[w] === 2)) && D.arrivals(2).length >= 1, 'night 2 brings ' + D.arrivals(2).join(','));
    ok(D.arrivals(1).length === 0, 'nothing is announced on the first night');
    D.setDay(2);
    T.openShop(true); T.setShopTabDbg && T.setShopTabDbg('weapons');
    rows = [...document.querySelectorAll('#shopList [data-weapon]')].map((r) => r.dataset.weapon);
    ok(D.arrivals(2).every((w) => rows.includes(w)), 'night 2: they are on the supply terminal now (' + rows.join(',') + ')');
    const uziRow = document.querySelector('#shopList [data-weapon="uzi"] .name');
    ok(!!uziRow && /new/i.test(uziRow.textContent), 'and marked new tonight (' + (uziRow && uziRow.textContent) + ')');
    T.closeShop && T.closeShop();
    D.queue(2);
    let st = D.state();
    ok(st.t > 0 && !st.visible, 'the notice waits for the dawn banner');
    D.tick(st.t + 0.01);
    st = D.state();
    const card = document.getElementById('stockNotice');
    ok(st.visible && card && !!card.querySelector('li[data-gun="uzi"]') && card.querySelectorAll('li').length === D.arrivals(2).length, 'then a short card names the new guns (' + (card && card.textContent) + ')');
    D.tick(5);
    ok(!D.state().visible, 'and goes away by itself');
    D.queue(3); D.tick(9);
    ok(D.state().shown.join() === D.arrivals(3).join(), 'night 3 announces its own (' + D.arrivals(3).join(',') + ')');
    D.setDay(1);
    // --- the Armory's workbench paints the gun
    T.addCash(1e6); T.grantAllWeapons();
    const F = T.armoryFinishDbg;
    const list = F.list('m4');
    // Camo unlocks live in the browser's storage, shared with tests running beside this one (t102 unlocks them all).
    const anyLocked = !!list && list.list.some((f) => f.locked);
    ok(list && list.list.length > 10 && list.list[0].key === '' && list.list.some((f) => !f.locked && f.key), 'the workbench offers factory and the camos (' + (list && list.list.length) + ', ' + (anyLocked ? 'some to earn' : 'all earned in this browser') + ')');
    const free = list.list.find((f) => !f.locked && f.key);
    T.setPhase && T.setPhase('prep');
    T.openCIF();
    document.getElementById('armoryOpen').click();
    const panel = document.getElementById('armoryPanel');
    T.armoryDbg.ui().bench('m4'); await wait(50);
    const sw = panel.querySelectorAll('.armory-finish .armory-swatch');
    ok(sw.length > 1 && [...sw].every((b) => !b.disabled), 'swatches on the M4\'s workbench, the ones to earn folded away (' + sw.length + ')');
    ok(!!panel.querySelector('.armory-swatch img[src^="data:image/png"]'), 'each painted from the real camo');
    panel.querySelector('.armory-swatch[data-finish="' + free.key + '"]').click(); await wait(50);
    ok(T.getWardrobe().guns.m4 === free.key, 'clicking one paints the M4 (' + free.key + ')');
    ok(panel.querySelector('.armory-swatch.on').dataset.finish === free.key, 'and it shows as chosen');
    const more = panel.querySelector('[data-finish-more]');
    if (anyLocked) {
      ok(!!more, 'a button shows the camos still to earn');
      more.click(); await wait(50);
      const lockedBtn = panel.querySelector('.armory-swatch.locked');
      ok(!!lockedBtn && lockedBtn.disabled, 'they show, locked');
      ok(F.paint('m4', lockedBtn.dataset.finish) === false && T.getWardrobe().guns.m4 === free.key, 'a locked camo can\'t be put on');
    } else ok(!more && panel.querySelectorAll('.armory-finish .armory-swatch').length === list.list.length, 'every camo earned: all on the bench, no button for more');
    ok(F.paint('m4', 'not-a-camo') === false && T.getWardrobe().guns.m4 === free.key, 'an unknown finish can\'t be put on');
    panel.querySelector('.armory-swatch[data-finish=""]').click(); await wait(50);
    ok(!T.getWardrobe().guns.m4, 'factory takes the camo off');
    ok(F.paint('pistol', free.key) && T.getWardrobe().guns.pistol === free.key, 'the hip pistol takes one too');
    panel.querySelector('.armory-actions button:last-child').click();
    T.closeCIF();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
