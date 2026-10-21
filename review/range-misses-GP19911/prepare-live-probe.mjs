import fs from 'node:fs';
const dir='review/range-misses-GP19911';let s=fs.readFileSync(dir+'/drill-probe.mjs','utf8');
s=s.replace("await E.page.evaluate(clock);await E.ev(`__step(2);", "await E.page.evaluate(clock);await E.ev(`await wait(100);__step(2);");
s=s.replace("['pistol','bullseye',0,'head'],", "['pistol','bullseye',0,'head'],['pistol','bullseye',2,'head'],");
s=s.replace("const t=T", "const t=T");
s=s.replace('/drill-baseline.json','/drill-live.json').replace('/wrong-zone-before.png','/wrong-zone-after.png');
// Photograph the actual live shoulder view while the floating contact label is alive.
s=s.replace("if(id==='bullseye'&&zone==='head')await E.run({cmd:'shot',live:true,ui:true,out:dir+'/wrong-zone-after.png'});", "if(id==='bullseye'&&zone==='head'&&lane===0){await E.ev('R.ui(true);__step(1);');await E.page.screenshot(dir+'/wrong-zone-after.png');}");
fs.writeFileSync(dir+'/drill-live.mjs',s);
