import fs from 'node:fs';const f=new URL('./views.json',import.meta.url),v=JSON.parse(fs.readFileSync(f));
v.find(x=>x.id==='below-door').camera="WS.isolate(WS.w.group.getObjectByName('rune-door'),{d:6,up:1})";
for(const [i,title]of [[0,'Barrow cairns'],[1,'Ash offering bowl'],[3,'Antler offering'],[4,'Carved offering stone']])if(!v.some(x=>x.id==='offering-'+i))v.push({id:'offering-'+i,title,group:'Caves and the first people',camera:`WS.isolate(TT.firstPeople.offerings.children[${i}],{d:1.6,up:.8})`,staged:true,isolated:true});
fs.writeFileSync(f,JSON.stringify(v,null,2));
