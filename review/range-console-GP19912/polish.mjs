import fs from 'node:fs';
function edit(p,changes){const s=fs.readFileSync(p,'utf8');let n=s;for(const[a,b]of changes){if(n.split(a).length!==2)throw Error('polish anchor '+a);n=n.replace(a,b);}if(fs.readFileSync(p,'utf8')!==s)throw Error('changed');fs.writeFileSync(p,n);}
edit('ui/range-console.js',[
 ['drillInstruction} from','drillInstruction,drillLaneOrder} from'],
 ["const available=drillWeapons(d).every(owned),order=(d.order||[0,1,2,3,4]).map(n=>n+1).join(' → ');","const available=drillWeapons(d).every(owned),order=drillLaneOrder(d);"],
 ["  return `<section class=\"rd-records\">","  if(d.startHolstered)cards.push(['draw',b.draw?b.draw.firstShot.toFixed(2)+'s':null]);\n  return `<section class=\"rd-records\">"],
 ["t('range.records.'+k)}</small>","t(d.continuous&&k==='accuracy'?'range.records.contact':'range.records.'+k)}</small>"],
 ["<li><b>${t('range.records.score')}: ${r.score}","<li><b>${t('range.records.runScore')}: ${r.score}"]
]);
edit('ui/strings.js',[
 ['Use {weapon}. Aim for {zone}. Land {hits} scoring hit(s) on each plate.','Use {weapon}. Aim for {zone}. Hits to clear each plate: {hits}.'],
 ['Clear {targets} plates','Plates to clear: {targets}'],
 ['Lane rotation: {order}','Lane order: {order}'],
 ['{time}s  ·  {accuracy}% accuracy','{time}s  ·  {accuracy}% {metric}'],
 ['  "range.guide.holster":','  "range.guide.anyZone": "any scoring zone",\n  "range.guide.groups": "follow the raised group",\n  "range.records.contact": "Best full-clear contact",\n  "range.records.runScore": "Score",\n  "range.guide.holster":']
]);
edit('ui/range-drills.css',[[".rd-best-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))",".rd-best-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr))"]]);
