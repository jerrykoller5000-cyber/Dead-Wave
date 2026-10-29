import fs from 'fs';
// patch12 (GB-245, the uzi): the hip path's gun orientation also reads the reload's own tip, so a gun that never takes
// the shoulder path can pitch its magwell up to him. tip defaults to 0, so every other gun is unchanged; the reach clamp
// is not touched (rotation about the grip adds no reach).
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) throw new Error('BOM at start');
const crIn = s.split('\r\n').length - 1;
const before = Buffer.byteLength(s, 'utf8');
function rep(a, b, label) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(label + ': expected 1, found ' + n);
  s = s.replace(a, () => b);
  console.log('ok ' + label);
}
rep(
  "          _hE.set(reloadMountOff.rx - 0.5 * dipR + recoilKick.rx * mainKick, reloadMountOff.ry + recoilKick.ry * mainKick, reloadMountOff.rz + recoilKick.rz * mainKick);",
  "          // GB-245: the reload's own muzzle-down tip turns the grip about the anchor, which lifts a magwell that sits under the\n" +
  "          // grip (the uzi's magazine is in the grip) up to his eye without asking the arm for more reach. tip is 0 unless a\n" +
  "          // gun's entry sets it, so every other gun's orientation is unchanged.\n" +
  "          const _rlt = viewFirst && fpReloadLiftW > 0 ? (fpReloadSet().tip || 0) * fpReloadLiftW : 0;\n" +
  "          _hE.set(reloadMountOff.rx + _rlt - 0.5 * dipR + recoilKick.rx * mainKick, reloadMountOff.ry + recoilKick.ry * mainKick, reloadMountOff.rz + recoilKick.rz * mainKick);",
  'hip path tip');
if (/^\uFEFF/.test(s)) throw new Error('BOM written');
if (s.split('\r\n').length - 1 !== crIn) throw new Error('CRLF count changed');
fs.writeFileSync(p, s, 'utf8');
console.log('written ' + before + ' -> ' + Buffer.byteLength(s, 'utf8'));
