import fs from 'fs'; import readline from 'readline';
const rl = readline.createInterface({ input: fs.createReadStream(process.argv[2]), crlfDelay: Infinity });
const deopts = []; const evCount = {}; const mapEv = [];
for await (const l of rl) {
  if (l.startsWith('code-deopt,') && l.includes('prototype chain')) deopts.push(Number(l.split(',')[1]));
  else if (l.startsWith('map,')) { const p = l.split(','); evCount[p[1]] = (evCount[p[1]]||0)+1; if (p[1] !== 'Transition' && p[1] !== 'ReplaceDescriptors' && p[1]!=='InitialMap' && p[1] !== 'NormalizeCached' && p[1] !== 'Normalize') mapEv.push([Number(p[2]), l.slice(0,260)]); else if (p[1]==='ReplaceDescriptors'||p[1]==='Normalize') mapEv.push([Number(p[2]), l.slice(0,260)]); }
}
console.log('events', JSON.stringify(evCount));
// bursts: group deopts by 1 s
const sec = {}; for (const t of deopts) { const s = Math.round(t/1e6); sec[s]=(sec[s]||0)+1; }
console.log('deopt chain per s', JSON.stringify(Object.entries(sec).filter(([,c])=>c>=8)));
fs.writeFileSync('qa/2026-11-03-GB-272/maps-events.json', JSON.stringify({deopts, mapEv}));
