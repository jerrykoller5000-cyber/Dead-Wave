// t181 - CL-114 (Jerry): a gun's camo is chosen in the Armory, not the CIF. D-132: unowned guns stay on the
// gun shelf, later nights show a disabled Buy, and the night one arrives a short card says it's new.
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
    // --- the gun shelf: every unowned gun stays visible (D-132). A later night keeps Buy off.
    const night = T.getDay ? T.getDay() : 1;
    const offers = () => [...document.querySelectorAll('#armoryPanel [data-offer-gun]')];
    const openGunStore = () => {
      T.closeMenuDbg && T.closeMenuDbg('shop');
      T.closeMenuDbg && T.closeMenuDbg('armory');
      T.setPhase && T.setPhase('prep');
      T.addCash(5000);
      T.openMenuDbg('armory');
    };
    openGunStore();
    let rows = offers().map((r) => r.dataset.offerGun);
    ok(rows.length > 0 && rows.every((w) => !T.getWeaponOwned()[w]), 'night ' + night + ': the shelf lists guns he does not own (' + rows.join(',') + ')');
    ok(!/Arrives night/i.test(document.getElementById('armoryPanel').textContent), 'no "Arrives night" rows');
    const mini = document.querySelector('#armoryPanel [data-offer-gun="minigun"]');
    ok(!!mini && mini.querySelector('[data-buy-gun]').disabled && /night 14/i.test(mini.textContent), 'the minigun stays visible, and Buy waits for night 14');
    ok(offers().every((el) => {
      const due = T.stockNoticeDbg.NIGHT[el.dataset.offerGun], buy = el.querySelector('[data-buy-gun]');
      return due <= night ? !!buy && !buy.disabled : !!buy && buy.disabled && new RegExp('night ' + due, 'i').test(el.textContent);
    }), 'stocked guns can be bought; later guns show their night');
    T.closeMenuDbg && T.closeMenuDbg('shop');
    T.closeMenuDbg && T.closeMenuDbg('armory');
    // --- the night the Uzi and shotgun arrive
    const D = T.stockNoticeDbg;
    ok(JSON.stringify(D.arrivals(2)) === JSON.stringify(D.arrivals(2).filter((w) => T.stockNoticeDbg.NIGHT[w] === 2)) && D.arrivals(2).length >= 1, 'night 2 brings ' + D.arrivals(2).join(','));
    ok(D.arrivals(1).length === 0, 'nothing is announced on the first night');
    D.setDay(2);
    openGunStore();
    rows = offers().map((r) => r.dataset.offerGun);
    ok(D.arrivals(2).every((w) => rows.includes(w)), 'night 2: they are on the gun shelf (' + rows.join(',') + ')');
    ok(D.arrivals(2).every((w) => {
      const row = document.querySelector('#armoryPanel [data-offer-gun="' + w + '"]');
      const buy = row && row.querySelector('[data-buy-gun]');
      return !!buy && !buy.disabled && !/Available night/i.test(row.textContent);
    }), 'and they can be bought tonight');
    T.closeMenuDbg && T.closeMenuDbg('shop');
    T.closeMenuDbg && T.closeMenuDbg('armory');
    D.queue(2);
    let st = D.state();
    ok(st.t > 0 && !st.visible, 'the notice waits for the dawn banner');
    D.tick(st.t + 0.01);
    st = D.state();
    const card = document.getElementById('stockNotice');
    // CL-181 (Jerry: "a quick 'New unlocks in terminal'"): one line now; the guns ride along in data-guns.
    ok(st.visible && card && /new unlocks/i.test(card.textContent) && (card.dataset.guns || '').split(',').includes('uzi') && card.dataset.guns.split(',').length === D.arrivals(2).length, 'then one line says new guns are in (' + (card && card.textContent) + ', ' + (card && card.dataset.guns) + ')');
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
    const sw = panel.querySelectorAll('.armory-finish:not(.armory-laser) .armory-swatch');
    ok(sw.length > 1 && [...sw].every((b) => !b.disabled), 'swatches on the M4\'s workbench, the ones to earn folded away (' + sw.length + ')');
    const camoSw = [...sw].filter((b) => b.dataset.finish);
    const swatchSig = (b) => {
      const cv = b.querySelector('canvas'), img = b.querySelector('img[src^="data:image/png"]');
      let read = cv;
      if (!read && img && img.complete && img.naturalWidth > 0) {
        read = document.createElement('canvas'); read.width = img.naturalWidth; read.height = img.naturalHeight;
        read.getContext('2d').drawImage(img, 0, 0);
      }
      if (!read || !read.width || !read.height) return img && img.src.length > 200 ? img.src : null;
      const d = read.getContext('2d').getImageData(0, 0, read.width, read.height).data;
      let painted = false;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { painted = true; break; }
      if (!painted) return null;
      const pts = [];
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const x = Math.floor((sx + 0.5) * read.width / 4), y = Math.floor((sy + 0.5) * read.height / 4);
        const o = (y * read.width + x) * 4;
        pts.push(d[o] + ',' + d[o + 1] + ',' + d[o + 2]);
      }
      return pts.join(';');
    };
    const sigs = camoSw.map(swatchSig);
    ok(camoSw.length > 0 && sigs.every(Boolean) && new Set(sigs).size === camoSw.length, 'each painted from the real camo (' + camoSw.length + ' unique swatches)');
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
    } else ok(!more && panel.querySelectorAll('.armory-finish:not(.armory-laser) .armory-swatch').length === list.list.length, 'every camo earned: all on the bench, no button for more');
    ok(F.paint('m4', 'not-a-camo') === false && T.getWardrobe().guns.m4 === free.key, 'an unknown finish can\'t be put on');
    panel.querySelector('.armory-swatch[data-finish=""]').click(); await wait(50);
    ok(!T.getWardrobe().guns.m4, 'factory takes the camo off');
    ok(F.paint('pistol', free.key) && T.getWardrobe().guns.pistol === free.key, 'the hip pistol takes one too');
    panel.querySelector('.armory-actions button:last-child').click();
    T.closeCIF();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
