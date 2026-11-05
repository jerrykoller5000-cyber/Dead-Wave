const fs = require('fs'); let t = fs.readFileSync('tools/tests/t80.js', 'utf8'); const n0 = t.length;
const rep = (a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a); t = t.replace(a, b); };
rep("const t0 = T.getSimTime(), wall0 = Date.now();\n      while (T.getSimTime() - t0 < secs", "const t0 = T.getSimTime(), wall0 = Date.now(); s.path = []; let nxS = 0; s.dbg = 'flankSide ' + zz.flankSide + ' tactics ' + zz.tactics;\n      while (T.getSimTime() - t0 < secs");
rep("s.minD = Math.min(s.minD, d); s.endD = d;", "s.minD = Math.min(s.minD, d); s.endD = d; { const g = T.getSimTime() - t0; if (g >= nxS) { nxS += 1; s.path.push(g.toFixed(1) + ':' + (q.x - hx).toFixed(1) + ',' + (q.z - hz).toFixed(1) + (zz.unstickT > 0 ? 'U' : '') + (zz.spitWind > 0 ? 'W' : '')); } }");
rep("const bMoved =", "out.push('INFO spitter ' + b.dbg + ' | ' + b.path.join(' '));\n    const bMoved =");
fs.writeFileSync('tools/tests/tgb255b.js', t); console.log('ok', n0, t.length);