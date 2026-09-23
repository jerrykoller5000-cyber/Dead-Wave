(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1200);
  T.unlockAllBuilds(); T.addCash(100000);
  const all = T.BUILD_PAGES.flatMap(p => p.keys);
  const missing = T.BUILD_ORDER.filter(k => all.indexOf(k) < 0);
  ok(missing.length === 0, 'every build item is on a page: missing ' + missing.join(','));
  ok(T.openWheel('build'), 'build wheel opens');
  let s = T.getWheelState(); const p0 = s.page;
  ok(s.keys.length > 0 && s.keys.every(k => T.BUILD_PAGES[p0].keys.indexOf(k) >= 0), 'ring shows only page ' + p0 + ': ' + s.keys.join(','));
  T.wheelTurnPage(1); s = T.getWheelState();
  ok(s.page === (p0 + 1) % 3 && s.keys.every(k => T.BUILD_PAGES[s.page].keys.indexOf(k) >= 0), 'scroll turns to page ' + s.page + ': ' + s.keys.join(','));
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3', key: '3', bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3', key: '3', bubbles: true }));
  s = T.getWheelState(); ok(s.page === 2, 'key 3 jumps to Turrets: ' + s.keys.join(','));
  const svg = document.body.innerHTML.indexOf('Turrets') >= 0; ok(svg, 'page tab labelled');
  return out.join('\n');
})()
