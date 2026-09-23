(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const inp = document.getElementById('playerName');
  const con = (cmd) => { const i = document.getElementById('devConsoleInput'); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '`' })); i.value = cmd; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })); };
  // HQ layout: the window sits in a bay, clear of every pier
  ok(Math.abs(T.HQ_WINDOW_FRONT.z + 2.2) < 1e-6 && Math.abs(T.KIOSK.z - 2.2) < 1e-6, 'window bay at z -2.2, kiosk bay at z 2.2');
  ok(T.house.mural && T.house.slitMat, 'mural on the wall, red slits glowing');
  inp.value = 'Rip Test'; document.getElementById('modeHunt').click(); await wait(900);
  // skulls blink and sit in a ring of light
  const p = T.player.position;
  const z = T.spawnZombie(p.x + 7, p.z + 7, 'demon', true); z.cashDrop = 20;
  T.killZombie(z, true, { kind: 'bullet', dir: { x: 0, z: 1 } });
  const d = T.cashDrops.find(c => c.skull);
  ok(d && d.ring && d.ring.parent, 'dropped skull has a ground ring');
  let lo = 9, hi = 0; for (let i = 0; i < 40; i++) { await wait(30); const e = d.mesh.children[0].children[0].material.emissiveIntensity; lo = Math.min(lo, e); hi = Math.max(hi, e); }
  ok(hi > 1.5 && lo < 0.5, 'and flashes (' + lo.toFixed(2) + ' .. ' + hi.toFixed(2) + ')');
  p.set(d.mesh.position.x, p.y, d.mesh.position.z); await wait(250);
  ok(!d.ring, 'ring goes with it when picked up');
  // rip
  T.runDevCommand ? T.runDevCommand('rip') : con('rip');
  await wait(200);
  ok(!!T.getCine() && T.getHp() === 0, 'console "rip": dead on the spot, burial begins');
  T.skipDeathCine(); await wait(200);
  document.getElementById('again').click(); await wait(250);
  const die = async (name) => {
    inp.value = name; document.getElementById('modeHunt').click(); await wait(700);
    T.damagePlayer(9999); await wait(100); T.skipDeathCine(); await wait(250);
    document.getElementById('again').click(); await wait(250);
  };
  for (let i = 0; i < 5; i++) await die('Marine ' + (i + 2));
  const graves = T.session.graves;
  ok(graves.length === 6 && graves.every(r => r.kind === 'grave' && r.mound.visible), 'six filled plots, all still filled');
  ok(!T.zombies.some(z => z.typeKey === 'fallen'), 'no zombie marine');
  inp.value = 'Swimmer'; document.getElementById('modeHunt').click(); await wait(700);
  T.damagePlayer(9999);
  const c = T.getCine();
  ok(c.rec.kind === 'lake', 'no plot left: the lake');
  ok(document.getElementById('winTitle').textContent === 'Rest easy, Swimmer' && document.querySelectorAll('#winMsg .st').length === 4, 'title: ' + document.getElementById('winTitle').textContent);
  await wait(3000);
  ok(T.waterDepthAt(c.splashPt.x, c.splashPt.z) > 0.4, 'the throw lands in the water');
  await wait(9500);
  ok(/No plot left for Swimmer/.test(document.querySelector('#cine .cap').textContent), 'caption kept');
  await wait(3000);
  const win = document.getElementById('win');
  ok(win.classList.contains('show') && win.classList.contains('lake') && win.querySelectorAll('.surfaceFx .drip').length === 9, 'panel rises out of the water (ripples, drips)');
  const cs = getComputedStyle(win.querySelector('.card'));
  const an = ['h2', 'p', 'button'].map(q => getComputedStyle(win.querySelector(q)).animationName);
  ok(cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) && an.join() === 'dwRise,dwRise,dwRiseBtn', 'no panel: the words and button rise on their own (' + an.join(', ') + ')');
  ok(win.querySelector('.card .surfaceFx') && getComputedStyle(document.querySelector('#cine .skip')).display === 'none', 'ripples under the words; skip hint gone');
  document.getElementById('again').click(); await wait(250);
  ok(!win.classList.contains('lake') && !win.querySelector('.surfaceFx'), 'cleared for the next run');
  return out.join('\n');
})()
