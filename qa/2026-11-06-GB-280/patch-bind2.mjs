import fs from 'fs';
const p = 'combat/brute-getup.js';
let s = fs.readFileSync(p, 'utf8');
const bom = s.charCodeAt(0) === 0xFEFF; if (bom) s = s.slice(1);
const crlf = s.includes('\r\n'); const nl = crlf ? '\r\n' : '\n';
if (!s.includes('sg.bindP')) { console.error('bindP missing - reapply needed'); process.exit(1); }

// Make restore update matrices after copying bind/save
const re = /  out\.restore = \(\) => \{\r?\n    if \(!out\.overridden\) return;\r?\n    for \(const sg of segs\) \{\r?\n      sg\.j\.quaternion\.copy\(sg\.saveQ\);\r?\n      if \(sg\.posI !== null\) sg\.j\.position\.copy\(sg\.bindP\);\r?\n    \}\r?\n    out\.overridden = false;\r?\n  \};/;
if (!re.test(s)) { console.error('restore block mismatch'); const i=s.indexOf('out.restore'); console.log(JSON.stringify(s.slice(i,i+350))); process.exit(1); }
const neu = [
  '  out.restore = () => {',
  '    if (!out.overridden) return;',
  '    for (const sg of segs) {',
  '      sg.j.quaternion.copy(sg.saveQ);',
  '      if (sg.posI !== null) sg.j.position.copy(sg.bindP);',
  '      sg.j.updateMatrix();',
  '    }',
  '    mesh.updateWorldMatrix(true, true);',
  '    out.overridden = false;',
  '  };'
].join(nl);
s = s.replace(re, neu);

// Also updateMatrix on bind reset in pose()
const re2 = /    \/\/ GB-280: if the last restore was skipped, hips still hold the keyed place; put them on the bind before we read AB\.\r?\n    for \(const sg of segs\) if \(sg\.posI !== null\) sg\.j\.position\.copy\(sg\.bindP\);\r?\n    mesh\.updateWorldMatrix\(true, true\);/;
if (!re2.test(s)) { console.error('pose bind reset mismatch'); process.exit(1); }
const neu2 = [
  '    // GB-280: if the last restore was skipped, hips still hold the keyed place; put them on the bind before we read AB.',
  '    for (const sg of segs) if (sg.posI !== null) { sg.j.position.copy(sg.bindP); sg.j.updateMatrix(); }',
  '    mesh.updateWorldMatrix(true, true);'
].join(nl);
s = s.replace(re2, neu2);

// Drop the temporary console.warn dbg if present (keep file clean)
s = s.replace(/\r?\n    \/\/ GB-280 dbg: catch hips drift\r?\n    if \(Math\.abs\(R\.pelvis\.position\.y\) > 2 \|\| Math\.abs\(R\.pelvis\.position\.z\) > 2\) \{\r?\n      const i = IDX\.pelvis \* 3;\r?\n      console\.warn\('GB280-hips', \{ u, b, pz, hips: R\.pelvis\.position\.toArray\(\), Tpel:\[T\[i\],T\[i\+1\],T\[i\+2\]\], Spel:\[S\[i\],S\[i\+1\],S\[i\+2\]\], mesh: mesh\.position\.toArray\(\), saveP: segs\[0\]\.saveP\.toArray\(\) \}\);\r?\n    \}/, '');

fs.writeFileSync(p, (bom ? '\uFEFF' : '') + s);
console.log('OK', fs.statSync(p).size, 'dbgLeft', s.includes('GB280-hips'));
