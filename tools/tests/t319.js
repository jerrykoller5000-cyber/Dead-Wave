// t319 - CU-210: the valley field, seeded at the HQ, still has a way in once the
// thicket ring is up. A sealed ring would leave the outside at Infinity.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const v = T.flowField().valley;
    ok(!!(v && v.ready), 'the valley field is built (' + (v && v.n) + ' cells, ' + ((v && v.ms) || 0).toFixed(1) + ' ms)');
    ok(!!(T.wallBandsDbg && T.wallBandsDbg.on), 'the HQ ring is on');
    const hx = T.house.group.position.x, hz = T.house.group.position.z;
    const near = T.valleyDistAt(hx + 12, hz);
    ok(near != null && near < 40, 'the yard is close (' + near + ')');
    const pts = [[100, 0], [-100, 0], [0, 100], [0, -100]];
    let open = 0;
    const bits = [];
    for (const [x, z] of pts) {
      const d = T.valleyDistAt(hx + x, hz + z);
      const finite = d != null && d < 1e8;
      if (finite) open++;
      bits.push(x + ',' + z + '=' + (finite ? d.toFixed(0) : 'none'));
    }
    ok(open >= 3, 'routes through the ring (' + bits.join(' ') + ')');
    ok(open < 4 || near < T.valleyDistAt(hx + 100, hz), 'farther out costs more than the yard');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
