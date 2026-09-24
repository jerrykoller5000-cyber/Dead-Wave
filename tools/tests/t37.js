(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
  const inp = document.getElementById('playerName');
  const modeSelect = () => document.getElementById('modeSelect');
  const waitUntil = async (pred, tries, step) => {
    for (let i = 0; i < tries; i++) {
      if (pred()) return true;
      await wait(step);
    }
    return false;
  };
  // Play is a no-op while the insertion camera flies (~9s). Cash drops and death
  // cine also only tick after that branch ends.
  const waitDeployDone = () => waitUntil(() => !document.body.classList.contains('deploying'), 140, 100);

  const startMatch = async (name) => {
    if (!(await waitUntil(() => modeSelect().classList.contains('show'), 80, 100))) {
      ok(false, 'menu before ' + name);
      return false;
    }
    if (!(await waitDeployDone())) {
      ok(false, 'deploy clear before ' + name);
      return false;
    }
    inp.value = name;
    document.getElementById('modeHunt').click();
    if (!(await waitUntil(() => T.getPhase && T.getPhase() === 'prep', 100, 100))) {
      ok(false, 'prep for ' + name);
      return false;
    }
    if (!(await waitDeployDone())) {
      ok(false, 'insertion ended for ' + name);
      return false;
    }
    const tx = 22, tz = -18;
    for (let i = 0; i < 40; i++) {
      T.player.position.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(T.player.position.x - tx, T.player.position.z - tz) < 0.4) break;
    }
    return true;
  };

  const buryAndAgain = async () => {
    await waitUntil(() => T.getCine(), 60, 50);
    T.skipDeathCine();
    await waitUntil(() => {
      const c = T.getCine();
      return !c || c.panel || document.getElementById('win').classList.contains('show');
    }, 40, 50);
    document.getElementById('again').click();
    await waitUntil(() => modeSelect().classList.contains('show'), 80, 100);
    await waitDeployDone();
  };

  // HQ layout: the window sits in a bay, clear of every pier
  ok(Math.abs(T.HQ_WINDOW_FRONT.z + 2.2) < 1e-6 && Math.abs(T.KIOSK.z - 2.2) < 1e-6, 'window bay at z -2.2, kiosk bay at z 2.2');
  ok(T.house.mural && T.house.slitMat, 'mural on the wall, red slots glowing');

  if (!(await startMatch('Rip Test'))) return out.join('\n');

  // skulls blink and sit in a ring of light
  const p = T.player.position;
  const z = T.spawnZombie(p.x + 7, p.z + 7, 'demon', true); z.cashDrop = 20;
  T.killZombie(z, true, { kind: 'bullet', dir: { x: 0, z: 1 } });
  const d = T.cashDrops.find(c => c.skull);
  ok(d && d.ring && d.ring.parent, 'dropped skull has a ground ring');
  let lo = 9, hi = 0;
  for (let i = 0; i < 40; i++) {
    await wait(30);
    const e = d.mesh.children[0].children[0].material.emissiveIntensity;
    lo = Math.min(lo, e); hi = Math.max(hi, e);
  }
  ok(hi > 1.5 && lo < 0.5, 'and flashes (' + lo.toFixed(2) + ' .. ' + hi.toFixed(2) + ')');
  p.set(d.mesh.position.x, p.y, d.mesh.position.z); await wait(250);
  ok(!d.ring, 'ring goes with it when picked up');

  // rip
  T.runDevCommand('rip');
  await wait(200);
  ok(!!T.getCine() && T.getHp() === 0, 'console "rip": dead on the spot, burial begins');
  await buryAndAgain();

  for (let i = 0; i < 5; i++) {
    const name = 'Marine ' + (i + 2);
    if (!(await startMatch(name))) return out.join('\n');
    T.damagePlayer(9999);
    await buryAndAgain();
  }

  const graves = T.session.graves;
  ok(graves.length === 6 && graves.every(r => r.kind === 'grave' && r.mound.visible), 'six filled plots, all still filled');
  ok(!T.zombies.some(z => z.typeKey === 'fallen'), 'no zombie marine');

  if (!(await startMatch('Swimmer'))) return out.join('\n');
  T.damagePlayer(9999);
  let c = T.getCine();
  ok(!!c && c.rec.kind === 'lake', 'no plot left: the lake');
  ok(document.getElementById('winTitle').textContent === 'Rest easy, Swimmer' && document.querySelectorAll('#winMsg .st').length === 4, 'title: ' + document.getElementById('winTitle').textContent);

  for (let i = 0; i < 80; i++) {
    await wait(100);
    c = T.getCine();
    if (c && c.setup && c.splashPt) break;
  }
  ok(c && c.splashPt && T.waterDepthAt(c.splashPt.x, c.splashPt.z) > 0.4, 'the throw lands in the water');

  for (let i = 0; i < 120; i++) {
    await wait(100);
    const cap = document.querySelector('#cine .cap');
    if (cap && /No plot left for Swimmer/.test(cap.textContent)) break;
  }
  ok(/No plot left for Swimmer/.test(document.querySelector('#cine .cap').textContent), 'caption kept');

  for (let i = 0; i < 80; i++) {
    await wait(100);
    if (document.getElementById('win').classList.contains('show')) break;
  }
  const win = document.getElementById('win');
  ok(win.classList.contains('show') && win.classList.contains('lake') && win.querySelectorAll('.surfaceFx .drip').length === 9, 'panel rises out of the water (ripples, drips)');
  const cs = getComputedStyle(win.querySelector('.card'));
  const an = ['h2', 'p', 'button'].map(q => getComputedStyle(win.querySelector(q)).animationName);
  ok(cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) && an.join() === 'dwRise,dwRise,dwRiseBtn', 'no panel: the words and button rise on their own (' + an.join(', ') + ')');
  ok(win.querySelector('.card .surfaceFx') && getComputedStyle(document.querySelector('#cine .skip')).display === 'none', 'ripples under the words; skip hint gone');

  document.getElementById('again').click(); await wait(250);
  ok(!win.classList.contains('lake') && !win.querySelector('.surfaceFx'), 'cleared for the next run');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
