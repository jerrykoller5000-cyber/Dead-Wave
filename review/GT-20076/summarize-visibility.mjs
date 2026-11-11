import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const folder=process.argv[2]??'visibility-final';
assert(['visibility','visibility-final'].includes(folder));
const ids=['pistol','revolver','uzi','m4','ak','aa12','shotgun','sniper','minigun','launcher','flamer','chainsaw'];
const root=new URL('./'+folder+'/',import.meta.url);
const records=await Promise.all(ids.map(async id=>JSON.parse(await readFile(new URL(id+'/rank.json',root),'utf8'))));
const all=[],summary=[];
for(const r of records) {
  assert.equal(r.rows.length,r.rawPairs);
  const peak=Math.max(...r.rows.map(p=>p.peakPixels)), enclosed=r.rows.filter(p=>p.enclosed).length;
  summary.push({model:r.id,raw:r.rawPairs,screen:r.screenCandidates,enclosed,unresolved:r.rawPairs-r.screenCandidates-enclosed,peak});
  for(const p of r.rows) if(p.peakPixels>0) {
    const [view,point]=Object.entries(p.views).sort((a,b)=>b[1].pixels-a[1].pixels)[0];
    all.push({model:r.id,pair:p.index,view,pixels:p.peakPixels,at:point.at,a:p.a,b:p.b});
  }
}
summary.sort((a,b)=>b.peak-a.peak);
all.sort((a,b)=>b.pixels-a.pixels);
const totals=Object.fromEntries(['raw','screen','enclosed','unresolved'].map(k=>[k,summary.reduce((s,r)=>s+r[k],0)]));
const lines=['Raw catalog overlaps, ordered by largest projected crossing for each model. Distinct screen pixels on the most exposed view.',
  folder==='visibility'?'Preliminary photo-mask pass. Only some models had the enclosure proof during this run. Use visibility-final for enclosure totals.':'Reference and actual posed display surface depths agree at each accepted neighboring pixel.','',
  ...summary.map(s=>s.model+' | '+s.raw+' raw | '+s.screen+' screen candidates | '+s.enclosed+' proved entirely enclosed | '+s.unresolved+' other unresolved | peak '+s.peak+' px'),
  '',JSON.stringify(totals),'','Largest screen crossings across all twelve models:',...all.slice(0,30).map(r=>r.model+' pair '+r.pair+' | '+r.view+' | '+r.pixels+' px at '+r.at.join(',')),
  '','A screen crossing is a review candidate. An enclosure still needs a named, bounded, justified rule. Neither result removes a strict failure by itself.'];
await writeFile(new URL('ranked.txt',root),lines.join('\n')+'\n');
await writeFile(new URL('ranked.json',root),JSON.stringify({summary,totals,candidates:all},null,2)+'\n');
console.log(lines.slice(0,16).join('\n'));
