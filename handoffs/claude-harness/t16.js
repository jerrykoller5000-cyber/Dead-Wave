(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1200);
  const r = T.devBaseBuild();
  return r.n + '\n' + r.failed.join('\n');
})()
