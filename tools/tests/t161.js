// t161 - CL-76 (P-57, D-54): Fog Night. While night 14's wave is on, the mist closes in to about 30 m, with the
// goggles down or not; it rolls in and lifts over a few seconds, and at dawn (no fog night) the night's own view comes
// back. The night 14 plan carries the mod (GB-87), so a real Fog Night turns it on.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const F = T.fogNightDbg;
    const fog = () => T.getSceneFog();
    T.setWorldTime(0);                       // midnight
    F.force(false); for (let i = 0; i < 8; i++) F.apply(1); F.step(0);
    const plain = fog().far;
    ok(plain > 50, 'a plain night sees past ' + plain.toFixed(0) + ' m');
    F.force(true);
    F.apply(1); F.step(0);
    const mid = fog().far;
    ok(mid < plain && mid > F.FOG_NIGHT.FAR, 'it rolls in, not at once: ' + mid.toFixed(0) + ' m after 1 s');
    for (let i = 0; i < 8; i++) F.apply(1);
    F.step(0);
    ok(fog().far <= 35 && fog().near <= 8, 'Fog Night: about 30 m (' + fog().near.toFixed(0) + '-' + fog().far.toFixed(0) + ')');
    T.toggleNvgDbg(); F.step(0);
    ok(fog().far <= 35, 'goggles down: still about 30 m (' + fog().far.toFixed(0) + '): the NVG cuts the dark, not the mist');
    T.toggleNvgDbg(); F.step(0);
    F.force(false); for (let i = 0; i < 8; i++) F.apply(1); F.step(0);
    ok(Math.abs(fog().far - plain) < 1 && F.k() === 0, 'it lifts at dawn: back to ' + fog().far.toFixed(0) + ' m');
    F.force(null);
    ok(F.active() === false, 'no fog night on a plain day');
    ok(T.nightPlanFor(14).mod === 'fog' && T.nightPlanFor(13).mod !== 'fog', 'night 14 is the fog night (GB-87)');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
