// t257 — CL-204 (story.md §3, v3): the orders card at the drop. In his hand while he drops (from 0.7 s to 5.4 s of the
// insertion), the PGB's lines with the goal (Heron, night twenty); any key puts it away; gone when he lands.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const D = T.insertionDbg, el = D.ordersEl();
    ok(!!el && !el.classList.contains('show'), 'the card is there and hidden before the drop');
    let rig = D.begin();
    rig.update(0.2, 0.016);
    ok(!el.classList.contains('show'), 'not yet as the plane comes over');
    rig.update(1.0, 0.016);
    ok(el.classList.contains('show'), 'in his hand during the drop');
    const text = el.textContent;
    ok(/FIELD ORDERS/.test(text) && /night twenty/i.test(text) && /Heron/.test(text) && /relay/i.test(text), 'it says what the run is for: ' + text.slice(0, 90) + '…');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    ok(!el.classList.contains('show'), 'a key puts it away');
    rig.update(2.0, 0.016);
    ok(!el.classList.contains('show'), 'and it stays away');
    rig.finish();
    rig = D.begin();
    rig.update(1.0, 0.016); rig.update(5.6, 0.016);
    ok(!el.classList.contains('show'), 'on its own it goes by 5.4 s');
    rig.finish();
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
