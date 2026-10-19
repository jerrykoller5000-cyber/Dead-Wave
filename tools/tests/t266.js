// t266 - CL-217 (D-82, docs/specs/day-missions.md §2): the ranger cache's day mission (game/ranger-cache.js).
// Jerry: "make sure players have to search but it is not insanely difficult." The rangers' lockbox has a keypad and
// three pictures on its lid; each digit is round their camp (the radio's channel, the search log's last day, the
// truck door's unit), and E — Look shows each one big. A wrong code flashes WRONG with no penalty; the right one opens it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type, code = 'KeyE', k = 'e') => document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
  const tap = async (code = 'KeyE', k = 'e') => { key('keydown', code, k); await wait(60); key('keyup', code, k); await wait(120); };
  const digit = (d) => tap('Digit' + d, String(d));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'RangerCache');
    T.clearZombies(); T.setHp(100000); T.runDevCommand('godmode');
    const D = T.rangerDbg, S = () => D.state(), R = D.ranger;
    await until(() => R.built, 4000);
    ok(R.built && !R.off, 'the mission is built (the rangers\' camp and truck are on the map)');
    const s = S();
    ok(s.code.length === 3 && s.code.every((d) => d >= 1 && d <= 9) && [...s.order].sort().join() === 'board,radio,truck', 'three digits 1-9 and an order of the three things: ' + s.order.join(' ') + ' = ' + s.code.join(''));
    const by = (src) => R.clues.filter((c) => c.source === src).length;
    ok(by('radio') === 1 && by('board') === 1 && by('truck') === 2, 'four places to look: the radio, the board, both doors');
    const truckG = T.scene.getObjectByName('ranger-truck');
    const lcd = truckG && truckG.getObjectByName('ranger-radio').children.find((o) => o.isMesh && o.geometry.type === 'PlaneGeometry');
    ok(!!(lcd && lcd.material.map), 'the radio\'s display is painted with its channel');
    ok(truckG && truckG.getObjectsByProperty('name', 'ranger-unit').length === 2, '"UNIT n" on both doors');
    ok(!!T.scene.getObjectByName('ranger-search-log') && R.log.visible, 'the search log is pinned on the board');
    ok(!!T.scene.getObjectByName('ranger-keypad') && !!T.scene.getObjectByName('ranger-lid-pictures'), 'the keypad and the lid\'s three pictures are on the lockbox');
    ok(D.locked(), 'the site is locked until the right digits go in');
    // The lockbox: its keypad.
    T.runDevCommand('site ranger'); await wait(150);
    ok(/lockbox/i.test(D.prompt() || ''), 'at the lockbox: "' + D.prompt() + '"');
    ok(D.reach() && D.reach().blockedBy === 'locked', 'the objectives cannot reach it (' + (D.reach() && D.reach().blockedBy) + ')');
    await tap();
    const el = document.getElementById('rangerPanel');
    ok(R.mode === 'keypad' && el && el.classList.contains('on'), 'E opens its keypad');
    ok(!!(el && el.querySelector('.strip img')) && /lockbox/i.test(el.querySelector('h3')?.textContent || ''), 'with the lid\'s pictures over the display');
    ok(!/code|clue/i.test(el ? el.textContent : ''), 'nothing on it says "code" or "clue": "' + (el ? el.textContent.replace(/\s+/g, ' ').trim() : '') + '"');
    const hp0 = T.getHp ? T.getHp() : null;
    const wrong = s.code.map((d) => (d % 9) + 1);
    for (const d of wrong) await digit(d);
    ok(R.flashKind === 'bad' && /WRONG/.test(el.querySelector('.lcd')?.textContent || ''), 'a wrong code flashes WRONG');
    ok(D.locked() && S().entry.length === 0 && (hp0 == null || T.getHp() === hp0), 'no penalty, still shut, the entry cleared');
    await tap();
    ok(!R.mode && !el.classList.contains('on'), 'E leaves the keypad');
    // The three things, each with E — Look.
    for (const [cmd, src] of [['site ranger radio', 'radio'], ['site ranger board', 'board'], ['site ranger door', 'truck']]) {
      T.runDevCommand(cmd); await wait(150);
      ok(/look/i.test(D.prompt() || ''), src + ': "' + D.prompt() + '"');
      await tap();
      const img = el.querySelector('.look img');
      ok(R.mode === 'look' && R.look && R.look.source === src && !!img && /^data:image\/png/.test(img.getAttribute('src') || ''), src + ': E shows it big');
      await tap();
      ok(!R.mode, src + ': E steps back');
    }
    // The right code.
    T.runDevCommand('site ranger'); await wait(150);
    await until(() => R.flash <= 0, 1500);
    await tap();
    for (const d of S().code) await digit(d);
    ok(R.flashKind === 'open' && /OPEN/.test(el.querySelector('.lcd')?.textContent || ''), 'the right code: OPEN');
    ok(await until(() => !R.mode, 2500), 'the keypad shuts by itself after');
    ok(!D.locked() && D.reach() && D.reach().blockedBy !== 'locked', 'the site is open to the objectives now (' + (D.reach() && D.reach().blockedBy) + ')');
    ok(!D.prompt(), 'and the lockbox says nothing of its own any more');
    ok(R.led.material.emissive.getHex() === 0x3dff6a, 'its lamp is green');
    // A new run deals new digits.
    const was = S().code.join('') + S().order.join('');
    let differs = false;
    for (let i = 0; i < 6 && !differs; i++) { D.cache.reset(); differs = S().code.join('') + S().order.join('') !== was; }
    ok(differs && D.locked(), 'reset deals new digits and shuts it');
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
