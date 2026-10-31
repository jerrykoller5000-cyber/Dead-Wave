// edit.mjs: GB-256's one-line edit to index.html (exact line, LF kept, no BOM).
import fs from 'node:fs';
const F = 'index.html';
const buf = fs.readFileSync(F);
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) throw new Error('BOM present');
const src = buf.toString('utf8');
const crlf = (src.match(/\r\n/g) || []).length;   // three were there before (lines 866, 28518, 31526): left as they are
const OLD = "        if (trainingHit && trainingHit.t * TRAINING.FAR <= groundT) {\n";
const NEW = "        if (trainingHit && !trainingHit.solid.floor && trainingHit.t * TRAINING.FAR <= groundT) {   // GB-256 (J31, J32): the floor is raycastTerrain's hit already; as a range hit too the tie flipped each frame between 'ground' (chest-raised aim) and 'training' (the floor), and the gun bounced ~6 deg\n";
const n = src.split(OLD).length - 1;
if (n !== 1) throw new Error('expected the line once, found ' + n);
const out = src.replace(OLD, NEW);
if ((out.match(/\r\n/g) || []).length !== crlf) throw new Error('line endings changed');
fs.writeFileSync(F, out);
console.log('edited: ' + (out.split('\n').findIndex((l) => l.includes('GB-256 (J31, J32)')) + 1));
