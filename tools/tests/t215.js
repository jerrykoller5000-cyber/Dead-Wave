// t215 - CL-132 (Jerry, 2026-10-07: "whats the deal with all these alien like symbols?"): no mojibake. On 2026-10-06
//  index.html was once read as Windows-1252 and saved back as UTF-8, so every non-ASCII character became two or three
//  (· became "Â·", × "Ã—", — "â€”", and those again on a second pass). The HUD showed them. This reads index.html and
//  every script and stylesheet the game loaded and fails on any such pair, then checks the HUD lines that showed them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // A UTF-8 lead byte read as Windows-1252 (Â Ã â Î Ï ...) followed by what a continuation byte reads as. Written with
  // escapes so this file never trips itself.
  const CONT = '\\u0080-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013\\u2014\\u2018-\\u201E\\u2020-\\u2022\\u2026\\u2030\\u2039\\u203A\\u20AC\\u2122';
  const MOJI = new RegExp('[\\u00C2-\\u00DF][' + CONT + ']|[\\u00E0-\\u00EF][' + CONT + ']{2}', 'g');
  const scan = (name, text) => { const bad = []; for (const m of text.matchAll(MOJI)) { const line = text.slice(0, m.index).split('\n').length; bad.push(name + ':' + line + ' ' + JSON.stringify(text.slice(Math.max(0, m.index - 12), m.index + 12))); } return bad; };
  try {
    await startMatch(T, 'Moji');
    await wait(300);
    const base = location.origin + '/';
    const names = new Set(['index.html']);
    for (const e of performance.getEntriesByType('resource')) {
      if (!e.name.startsWith(base)) continue;
      const p = e.name.slice(base.length).split(/[?#]/)[0];
      if (/^(ui|core|game|world|studio|life)\/.+\.(js|mjs|css|json)$/.test(p) && !/\.test\.mjs$/.test(p)) names.add(p);
    }
    let bad = [], read = 0;
    for (const n of names) {
      const r = await fetch(base + n); if (!r.ok) continue;
      read++; bad = bad.concat(scan(n, await r.text()));
    }
    ok(read >= 10, 'read index.html and the scripts and styles the game loaded (' + read + ' files)');
    ok(bad.length === 0, 'no broken characters in them' + (bad.length ? ' (' + bad.length + ', first: ' + bad.slice(0, 4).join(' | ') + ')' : ''));
    // The HUD lines Jerry saw.
    const txt = (id) => { const el = document.getElementById(id); return el ? el.textContent : ''; };
    const hud = ['timeLine', 'tacticalLine', 'grenadeChips', 'ammoDetail', 'hpNum'].map((id) => [id, txt(id)]);
    const hudBad = hud.filter(([, t]) => MOJI.test(t) || (MOJI.lastIndex = 0, false));
    MOJI.lastIndex = 0;
    ok(hudBad.length === 0, 'the HUD reads clean: ' + hud.map(([id, t]) => id + ' "' + t.slice(0, 40) + '"').join(', '));
    ok(/·/.test(txt('tacticalLine')) && /×/.test(txt('grenadeChips')), 'and shows its dots and times signs (' + txt('tacticalLine') + ' / ' + txt('grenadeChips') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
