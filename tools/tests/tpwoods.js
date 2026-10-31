// tprobe-woods - CL-287 (D-103): a read of the valley's layout for the woods plan (no checks): the sites, the trees,
// the trails and the ground's height on a 4 m grid, as INFO JSON lines.
(async () => {
  const T = window.TT; const out = [];
  try {
    await startMatch(T, 'Woods');
    const r1 = (v) => Math.round(v * 10) / 10;
    const P = T.POI, pts = (a) => (a || []).filter(Boolean).map((p) => ({ x: r1(p.x), z: r1(p.z), style: p.style || p.kind || undefined }));
    const poi = { campsites: pts(P.campsites), cabins: pts(P.cabins), tower: P.tower && pts([P.tower])[0], graveyard: P.graveyard && pts([P.graveyard])[0],
      dock: P.dock && pts([P.dock])[0], bridges: pts(P.bridges), sheds: pts(P.sheds), wrecks: pts(P.wrecks), mast: P.mast && pts([P.mast])[0], caves: pts(P.caves) };
    out.push('INFO POI ' + JSON.stringify(poi));
    const op = T.getObjectiveProps ? T.getObjectiveProps() : T.objectiveProps;
    const sites = {}; if (op && op.props) for (const [k, v] of Object.entries(op.props)) if (v && v.centre) sites[k] = { x: r1(v.centre.x), z: r1(v.centre.z) };
    out.push('INFO SITES ' + JSON.stringify(sites));
    const trees = (T.trees || []).filter((t) => t.alive !== false).map((t) => [r1(t.x), r1(t.z), r1(t.scale || 1), r1(t.canopyRadius || 0), r1(t.canopyBottom || 0), r1(t.canopyTop || 0)]);
    out.push('INFO TREES ' + JSON.stringify(trees));
    const paths = (T.PATHS || []).map((pl) => (pl.points || pl).map((p) => [r1(p.x), r1(p.z)]));
    out.push('INFO PATHS ' + JSON.stringify(paths));
    const rocks = (T.rocks || []).filter((r) => r.alive !== false && r.x != null).map((r) => [r1(r.x), r1(r.z), r1(r.radius || r.r || 1)]);
    out.push('INFO ROCKS ' + JSON.stringify(rocks));
    const H = []; for (let z = -232; z <= 232; z += 4) { const row = []; for (let x = -232; x <= 232; x += 4) row.push(r1(T.sampleHeight(x, z))); H.push(row); }
    out.push('INFO HEIGHTS ' + JSON.stringify(H));
    const W = []; for (let z = -232; z <= 232; z += 4) { const row = []; for (let x = -232; x <= 232; x += 4) row.push(T.waterDepthAt(x, z) > 0.05 ? 1 : 0); W.push(row.join('')); }
    out.push('INFO WATER ' + JSON.stringify(W));
    const hp = T.historyProps || {}; out.push('INFO HIST ' + JSON.stringify({ pikeHide: hp.pikeHide ? { x: r1(hp.pikeHide.x), z: r1(hp.pikeHide.z) } : null }));
    out.push('PASS probe read');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
