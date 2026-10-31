// GB-248 edit 2: the feral's lunge pose only while it is in the horde (its timers tick in the horde block).
import fs from 'node:fs';
const s = fs.readFileSync('index.html', 'utf8');
const a = "if (z.typeKey === 'feral' && !z.farLod && !z.crawling";
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('count ' + n);
fs.writeFileSync('index.html', s.replace(a, "if (z.typeKey === 'feral' && z.hz && !z.farLod && !z.crawling"), 'utf8');
console.log('ok');
