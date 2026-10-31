import fs from 'node:fs';
const f = 'tools/tests/t111.js'; const s = fs.readFileSync(f, 'utf8');
const crlf = s.includes('\r\n'), bom = s.charCodeAt(0) === 0xfeff;
const from = "m.isMesh && m.visible !== false && m.geometry && m.geometry.attributes";
const to = "m.isMesh && !m.isSkinnedMesh && !m.userData.stump && (m.userData.skinSrc || m.visible !== false) && m.geometry && m.geometry.attributes";
const n = s.split(from).length - 1;
if (n !== 2) { console.log('expected 2 matches, found ' + n); process.exit(1); }
let t = s.split(from).join(to);
const note = "// GB-249 (2026-10-30): the head is read as the game reads it (headSurface): its rigid meshes and skin sources, which the real renderer hides behind the skinned mesh it draws.";
const anchor = "// Where a walking brute's head really is: the centre of its head, sampled while it walks at him.";
if (!t.includes(anchor)) { console.log('anchor missing'); process.exit(1); }
t = t.replace(anchor, anchor + (crlf ? '\r\n' : '\n') + '    ' + note);
fs.writeFileSync(f, t);
console.log('ok crlf=' + crlf + ' bom=' + bom + ' replaced ' + n);