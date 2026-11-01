(() => {
  const P = TT.POI;
  const h = TT.hikersDbg();
  const camp = (i) => {
    const c = P.campsites[i];
    return c ? { x: +c.x.toFixed(1), z: +c.z.toFixed(1), style: c.style } : null;
  };
  const s = P.sheds[2];
  return {
    camps: [0, 1, 2].map(camp),
    depot: s ? { x: +s.x.toFixed(1), z: +s.z.toFixed(1) } : null,
    hikersTree: h && h.tree ? { x: +h.tree.x.toFixed(1), z: +h.tree.z.toFixed(1), river: h.river } : null
  };
})()
