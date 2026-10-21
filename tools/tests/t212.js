// t212 - GB-139 (GB-133 and GB-134's follow-up, GP-142's lines): build upgrades are findable and the hold-G throw is
//  told. While he places something else, a piece of his under the reticle with a tier he owns the plans for says it
//  can go up (build.message.upgradeAvailable, on the place banner). The first wall, door, gate, floor or turret he builds
//  shows tips.building.upgrade; the first time he holds G, tips.combat.grenadeHold. Each tip once per browser profile.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tips = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'tip-shown') tips.push(detail.id); });
  try {
    await startMatch(T, 'Tips139');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    ok(typeof T.tipOnce === 'function' && typeof T.upgradeAvailableHint === 'function' && typeof T.tipsDbg === 'function', 'hooks: tipOnce, upgradeAvailableHint, tipsDbg');
    T.tipsDbg().reset();
    T.unlockAllBuilds(); T.addCash(20000);
    const own = T.getUpgradeOwned(); for (const k of Object.keys(own)) delete own[k];
    // A free cell two over from him for a wall, and one beside it.
    const p = T.player.position, pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    let cell = null;
    for (let r = 2; r <= 4 && !cell; r++) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, 1], [-r, 1]]) {
      const cx = pgx + dx, cz = pgz + dz;
      if (!T.placeRefusalFor('wall', cx, cz) && !T.placeRefusalFor('wall', cx, cz + 1)) { cell = { cx, cz }; break; }
    }
    ok(!!cell, 'a free spot near him ' + JSON.stringify(cell));
    const aim = (x, y, z) => { T.setAimRay(x + 0.3, y + 14, z + 0.2, -0.3, -14, -0.2); };
    const aimCell = (cx, cz) => aim(T.gridCentre(cx), T.sampleHeight(T.gridCentre(cx), T.gridCentre(cz)), T.gridCentre(cz));
    const aimAt = (b, dy = 1.0) => { const m = T.thinBoxFor(b) || { cx: b.x, cz: b.z }; T.setAimRay(m.cx + 0.2, b.mesh.position.y + dy + 8, m.cz + 0.25, -0.2, -8, -0.25); };
    // (1) The first wall he builds: the upgrade tip, once.
    T.setPlaceMode('wall'); T.setBuildYaw(0);
    const n0 = T.builds.length;
    aimCell(cell.cx, cell.cz); T.updateGhostPreview(); T.tryPlace();
    ok(T.builds.length > n0, 'he builds a wall (' + (T.builds.length - n0) + ')');
    ok(tips.filter((t) => t === 'buildUpgrade').length === 1 && T.tipsDbg().seen.buildUpgrade === true, 'the first wall shows the upgrade tip');
    ok(/Fortify/.test(T.bigBannerText()) && /Building/.test(T.bigBannerText()), 'on the banner: ' + T.bigBannerText());
    aimCell(cell.cx, cell.cz + 1); T.updateGhostPreview(); T.tryPlace();
    ok(tips.filter((t) => t === 'buildUpgrade').length === 1, 'the second wall: not again');
    let raw = null; try { raw = JSON.parse(localStorage.getItem('dw.tips.v1')); } catch (e) {}
    ok(raw && raw.buildUpgrade === true, 'remembered in the profile (dw.tips.v1)');
    // (2) Placing something else with the reticle on that wall: no plans yet, nothing; with tier 1's plans, it says so.
    const w = T.builds.slice(n0).find((b) => b.type === 'wall');
    T.setPlaceMode('barricade');
    aimAt(w); T.updateGhostPreview(); await wait(300); aimAt(w); T.updateGhostPreview();
    ok(T.getUpgradeAvailHint() === '', 'no plans owned: no upgrade line ("' + T.getUpgradeAvailHint() + '")');
    T.buyUpgradeBlueprint('wall', 1);
    ok((own.wall | 0) === 1, 'tier 1 plans bought');
    await wait(300); aimAt(w); T.updateGhostPreview();
    const h = T.getUpgradeAvailHint();
    ok(/Reinforced wood wall/.test(h) && /Upgrade/.test(h), 'with the plans, on his wall: "' + h + '"');
    ok(T.placeBannerText().indexOf('Reinforced wood wall') >= 0, 'and it is on the place banner');
    aimCell(cell.cx + 3, cell.cz + 3); await wait(300); T.updateGhostPreview();
    ok(T.getUpgradeAvailHint() === '', 'off the wall: gone');
    T.setPlaceMode('upgrade'); aimAt(w); T.updateGhostPreview();
    ok(T.placeBannerText().indexOf('can upgrade') < 0, 'not with the Upgrade tool itself (it has its own line): ' + T.placeBannerText());
    ok(/Point at something you built/.test(T.upgradeHintFor ? T.upgradeHintFor(null) : 'Point at something you built'), 'the keyed "point at" line');
    T.setPlaceMode(null);
    await wait(200);
    // (3) The first time he holds G: the hold tip, once.
    const g0 = tips.filter((t) => t === 'grenadeHold').length;
    ok(g0 === 0, 'no grenade tip yet');
    ok(T.startGrenadeCharge() === true, 'G held');
    ok(tips.filter((t) => t === 'grenadeHold').length === 1 && /Hold G/.test(T.bigBannerText()), 'the hold tip: ' + T.bigBannerText());
    T.releaseGrenadeCharge();
    await wait(1700);
    T.startGrenadeCharge(); T.releaseGrenadeCharge();
    ok(tips.filter((t) => t === 'grenadeHold').length === 1, 'the next throw: not again');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();