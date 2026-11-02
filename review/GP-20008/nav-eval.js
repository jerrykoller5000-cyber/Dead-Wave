(() => {
  const points = [
    ['hq', 0, 0], ['ne-gap', -50, 115], ['ne-out', -145, 148],
    ['nw-gap', 91.54, 69.7], ['nw-out', 145, 146],
    ['sw-gap', 68, -105], ['sw-out', 145, -147],
    ['se-shore', -57.2, -68.2], ['se-beyond', -66, -79],
  ];
  return points.map(([id,x,z]) => ({ id,x,z, blocked:TT.wallBandsDbg.blocked(x,z),
    dist:TT.valleyDistAt(x,z), wet:TT.waterDepthAt(x,z) }));
})()
