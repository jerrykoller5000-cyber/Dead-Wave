const L = await import('/home/claude/ce12/lib.mjs?t=' + Date.now());
function agg(profile) {
  const self = new Map(), sub = new Map();
  const walk = (n, stack) => {
    const cf = n.callFrame, key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
    const st = stack.concat([cf.functionName || '(anon)']);
    self.set(key, (self.get(key) || 0) + n.selfSize);
    for (const f of new Set(st)) sub.set(f, (sub.get(f) || 0) + n.selfSize);
    for (const c of n.children || []) walk(c, st);
  };
  walk(profile.head, []);
  const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, b]) => `${(b / 1024).toFixed(0)}KB ${n}`);
  return { selfTop: top(self, 30), subtree: ['holdWeapon', 'holdShoulderGun', 'holdHand', 'solveArmIK', 'clampBodyPose', 'heldWallPull', 'heldWallDistance', 'tryFire', 'poseHands', 'holdFreeShoulders', 'updateMarinePose', 'tick', 'renderFrame'].map((f) => `${f}: ${((sub.get(f) || 0) / 1024).toFixed(0)}KB`) };
}
export default async ({ page, ev, log }) => {
  await L.equip(ev, 'ak', { settle: 2 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  const out = {};
  for (const mode of ['idle', 'fire']) {
    await ev(() => { window.__refill = setInterval(() => { try { TT.setMagazinesDbg('ak', 30, [30, 30, 30]); } catch (e) {} }, 300); });
    const s0 = await ev(() => TT.getSimTime());
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: 2048 });
    if (mode === 'fire') await ev(() => TT.setMouseFireDbg(true));
    await ev(() => window.__sim(6));
    await ev(() => { TT.setMouseFireDbg(false); clearInterval(window.__refill); });
    const { profile } = await cdp.send('HeapProfiler.stopSampling');
    const s1 = await ev(() => TT.getSimTime());
    out[mode] = { simS: +(s1 - s0).toFixed(2), ...agg(profile) };
    log('alloc', mode, JSON.stringify(out[mode]).slice(0, 3000));
    await ev(() => window.__sim(1.5));
  }
  return out;
};
