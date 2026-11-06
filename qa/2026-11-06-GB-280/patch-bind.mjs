import fs from 'fs';
const p = 'combat/brute-getup.js';
let s = fs.readFileSync(p, 'utf8');
const bom = s.charCodeAt(0) === 0xFEFF;
if (bom) s = s.slice(1);
const crlf = s.includes('\r\n');
const nl = crlf ? '\r\n' : '\n';

const reRestore = /  out\.restore = \(\) => \{\r?\n    if \(!out\.overridden\) return;\r?\n    for \(const sg of segs\) \{ sg\.j\.quaternion\.copy\(sg\.saveQ\); if \(sg\.posI !== null\) sg\.j\.position\.copy\(sg\.saveP\); \}\r?\n    out\.overridden = false;\r?\n  \};/;
if (!reRestore.test(s)) {
  console.error('RESTORE_NOT_FOUND');
  const i = s.indexOf('out.restore');
  console.log(JSON.stringify(s.slice(i, i + 220)));
  process.exit(1);
}
const newRestore = [
  '  // Bind-local places for joints that pose() moves (the pelvis). GB-280: restore used to copy saveP from the',
  '  // start of the last pose, but T[pelvis] is that same hips.position, so each frame wrote hips.position += keyOffset',
  '  // and the hips walked to y -20 (fists-up skinned mess). Always put them back on the bind they had when the get-up',
  '  // was built; saveP is kept only as a record.',
  '  for (const sg of segs) if (sg.posI !== null) sg.bindP = sg.j.position.clone();',
  '',
  '  out.restore = () => {',
  '    if (!out.overridden) return;',
  '    for (const sg of segs) {',
  '      sg.j.quaternion.copy(sg.saveQ);',
  '      if (sg.posI !== null) sg.j.position.copy(sg.bindP);',
  '    }',
  '    out.overridden = false;',
  '  };'
].join(nl);
s = s.replace(reRestore, newRestore);

const rePose = /  out\.pose = \(u, hitH0\) => \{\r?\n    u = Math\.max\(0, Math\.min\(1, u\)\);\r?\n    mesh\.updateWorldMatrix\(true, true\);/;
if (!rePose.test(s)) { console.error('POSE_NOT_FOUND'); process.exit(1); }
const newPose = [
  '  out.pose = (u, hitH0) => {',
  '    u = Math.max(0, Math.min(1, u));',
  '    // GB-280: if the last restore was skipped, hips still hold the keyed place; put them on the bind before we read AB.',
  '    for (const sg of segs) if (sg.posI !== null) sg.j.position.copy(sg.bindP);',
  '    mesh.updateWorldMatrix(true, true);'
].join(nl);
s = s.replace(rePose, newPose);

if (!s.includes('sg.bindP')) { console.error('bindP missing'); process.exit(1); }
if (s.includes('sg.j.position.copy(sg.saveP)')) { console.error('old saveP restore still present'); process.exit(1); }
fs.writeFileSync(p, (bom ? '\uFEFF' : '') + s);
console.log('OK', { crlf, bom, bytes: fs.statSync(p).size, gb280: (s.match(/GB-280/g) || []).length });
