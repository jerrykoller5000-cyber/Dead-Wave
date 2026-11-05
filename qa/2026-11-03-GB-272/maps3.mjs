import fs from 'fs'; import readline from 'readline';
const rl = readline.createInterface({ input: fs.createReadStream(process.argv[2]), crlfDelay: Infinity });
const sites = {}; let url = {};
const sid = {};
for await (const l of rl) {
  if (l.startsWith('script-details,')) { const p = l.split(','); sid[p[1]] = p[2]; }
  if (!l.startsWith('map,Deprecate,')) continue;
  const p = l.split(',');
  const key = p[5] + '|' + p[6] + ':' + p[7];
  const o = sites[key] || (sites[key] = { n: 0, t0: Number(p[2]) }); o.n++;
}
const rows = Object.entries(sites).filter(([,o]) => o.n >= 20).sort((a,b)=>a[1].t0-b[1].t0);
console.log(JSON.stringify(rows.map(([k,o])=>[k,o.n,Math.round(o.t0/1e5)/10])));
