// t207 - CL-125 (Jerry's playthrough 1, 2026-10-06): the CIF's Gravewalker.
//  - He opens still (no turning until you ask: GP-138) with the whole of him in view; picking an item zooms to it
//    (the boots: you can see them now), a tab goes back to all of him.
//  - His arms hang at his sides as they do unarmed in the world, not held out in the gun hold.
//  - He wears what is bought: no helmet, no armour, no NVGs on a new run; the helmet and armour items are not offered
//    until bought; the NVGs show only on a worn helmet once they are bought.
//  - Once he has the insulated boots, the CIF offers their rubber colour, and the boots on him take it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; };
  const items = () => [...document.querySelectorAll('#cifItems button')].map((b) => b.dataset.cifItem);
  const vis = (k) => { const gp = T.cifDressDbg().preview?.userData.gearParts; return (gp?.[k] || []).some((o) => o.visible); };
  try {
    await startMatch(T, 'CifFigure');
    T.clearZombies(); T.setHp(100000);
    const own = T.getGearOwned();
    for (const k of Object.keys(own)) own[k] = false;
    T.openCIF();
    await until(() => !!T.cifDressDbg().preview, 8000);
    const D = T.cifDressDbg;
    ok(!!D().preview, 'the figure is built');
    ok(D().rotate === false, 'he opens still (rotation off)');
    const y0 = D().yaw; await wait(600);
    ok(Math.abs(D().yaw - y0) < 1e-6, 'and stays still (' + y0.toFixed(3) + ' -> ' + D().yaw.toFixed(3) + ')');
    ok(D().frame === 'full', 'the whole of him in view (' + D().frame + ', ' + D().view.h.toFixed(2) + ' m tall frame)');
    ok(D().view.h >= 1.95, 'the frame is 2 m tall: helmet to boots');
    const ud = D().preview.userData, U = D().UNARMED_ARMS;
    ok(Math.abs(ud.armLG.rotation.x - U.x) < 0.06 && Math.abs(ud.armRG.rotation.x - U.x) < 0.06, 'his arms hang at his sides (shoulders ' + ud.armLG.rotation.x.toFixed(2) + ', ' + ud.armRG.rotation.x.toFixed(2) + '; the gun hold is -0.85, -1.05)');
    // Nothing bought: no helmet, armour, NVGs; not offered either.
    click('[data-cif-tab="head"]'); await wait(100);
    ok(!items().includes('helmet'), 'the Head tab offers no helmet he has not bought (' + items().join(', ') + ')');
    ok(!vis('helmet') && !vis('nvg') && !vis('vest'), 'the figure wears no helmet, NVGs or armour');
    click('[data-cif-tab="kit"]'); await wait(100);
    ok(!items().includes('carrier') && !items().includes('pads'), 'the Kit tab offers no armour or pads (' + items().join(', ') + ')');
    // Bought: the helmet and the armour; the NVGs not yet.
    own.helmet = true; own.vest = true;
    click('[data-cif-tab="head"]'); await wait(100);
    ok(items().includes('helmet'), 'with the helmet bought, it is offered');
    click('[data-cif-item="helmet"]'); await wait(100);
    ok(vis('helmet') && vis('vest') && !vis('nvg'), 'he wears the helmet and armour, still no NVGs (not bought)');
    own.nvg = true;
    click('[data-cif-item="helmet"]'); await wait(100);
    ok(vis('nvg'), 'NVGs bought: they sit on the helmet');
    click('[data-cif-item="cap"]'); await wait(100);
    ok(!vis('helmet') && !vis('nvg'), 'picking the hat: the bare head, no NVGs floating');
    // The zoom.
    click('[data-cif-tab="body"]'); await wait(100);
    click('[data-cif-item="boots"]');
    await wait(900);
    ok(D().frame === 'feet' && D().view.y < 0.6 && D().view.h < 1.3, 'picking the boots zooms to them (centre ' + D().view.y.toFixed(2) + ' m, ' + D().view.h.toFixed(2) + ' m frame)');
    click('[data-cif-tab="head"]'); await wait(900);
    ok(D().frame === 'full' && D().view.h > 1.9, 'a tab: all of him again (' + D().view.h.toFixed(2) + ' m)');
    // The insulated boots' colour.
    click('[data-cif-tab="body"]'); await wait(50); click('[data-cif-item="boots"]'); await wait(100);
    ok(!document.querySelector('#cif [data-rubber]'), 'no rubber colours before he has the insulated boots');
    T.lightningDbg.wear(); T.lightningDbg.update(0.016);
    click('[data-cif-item="boots"]'); await wait(100);
    const rubber = [...document.querySelectorAll('#cif [data-rubber]')].map((b) => b.dataset.rubber);
    ok(rubber.length >= 3 && rubber.includes('yellow'), 'with them on, the CIF offers their rubber: ' + rubber.join(', '));
    click('#cif [data-rubber="olive"]'); await wait(100); T.lightningDbg.update(0.016);
    const mats = (T.marineWardrobe('boots') || []).filter((m) => m.userData && m.userData.dress === 'colour');
    ok(T.getWardrobe().items.boots.rubber === 'olive' && mats.length && mats.every((m) => m.color.getHex() === D().RUBBER_HEX.olive), 'olive picked: his boots are olive rubber');
    const pm = (D().preview.userData.wardrobe.boots?.mats || []).filter((m) => m.userData.dress === 'colour');
    ok(pm.length && pm.every((m) => m.color.getHex() === D().RUBBER_HEX.olive), 'and so are the figure\'s');
    click('#cif [data-rubber="yellow"]'); await wait(50);
    T.closeCIF();
    T.lightningDbg.reset();
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
