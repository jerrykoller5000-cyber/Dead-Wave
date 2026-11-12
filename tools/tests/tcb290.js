// tcb290 - CB-290 (J126 rule 3, D-138): the arms' half for the long guns and the minigun: the held gun and both arms stay out of a wall, a door, a crate
// and a station he stands, crouches, walks and sprints up to (tools/tests/arms-clip.js).
(async () => {
  const T = window.TT, out = [], ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const { armsClip } = await import(new URL('./tools/tests/arms-clip.js', location.origin + '/').href);
    await armsClip(T, ['minigun', 'm4', 'ak', 'aa12', 'sniper', 'launcher'], ok, out);
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()
