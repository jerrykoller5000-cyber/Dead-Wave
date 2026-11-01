(() => {
  const s = TT.treeBatchStats();
  return {
    trees: s.trees, live: s.live, batched: s.batched, instances: s.instances, underN: s.underN,
    flushes: s.flushes, skips: s.skips, calls: s.calls, understory: s.understory,
    frameMs: s.frameMsAvg
  };
})()
