(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms));
  await startMatch(T, 'TestMarine');
  const r = T.devBaseBuild();
  return r.n + '\n' + r.failed.join('\n');
})()
