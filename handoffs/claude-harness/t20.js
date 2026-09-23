(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const out = [];
  document.getElementById('modeHunt').click(); await wait(1200);
  T.devBaseBuild(); await wait(300);
  const bs = T.builds.filter(b => b.type === 'barricade');
  const e = new T.THREE.Euler();
  for (const b of bs.slice(0, 60)) {
    b.mesh.updateMatrixWorld(true);
    const q = new T.THREE.Quaternion(); b.mesh.getWorldQuaternion(q); e.setFromQuaternion(q, 'YXZ');
    out.push(b.gx + ',' + b.gz + ' ' + b.slot + ' L' + b.level + ' yaw ' + e.y.toFixed(2) + ' rx ' + e.x.toFixed(2) + ' rz ' + e.z.toFixed(2) + ' ch ' + b.mesh.children.length);
  }
  return out.join('\n');
})()
