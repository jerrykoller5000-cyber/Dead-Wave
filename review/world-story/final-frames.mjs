import fs from 'node:fs';const f=new URL('./views.json',import.meta.url),v=JSON.parse(fs.readFileSync(f));
for(const [id,name,opts]of [['below-crates','fob-crates','{d:5,up:3,yaw:1.2}'],['below-door','rune-door','{d:6,up:1,yaw:0}']]){const x=v.find(v=>v.id===id);x.camera=`WS.isolate(WS.w.group.getObjectByName('${name}'),${opts})`;x.isolated=true;}
for(const [id,i,opts]of [['history-9',9,'{d:2,up:4}'],['history-10',10,'{d:1.5,up:1}']]){const x=v.find(v=>v.id===id);x.camera=`WS.isolate(TT.historyProps.group.children[${i}],${opts})`;x.isolated=true;x.staged=true;}
v.find(x=>x.id==='deep-root').camera=v.find(x=>x.id==='deep-root').camera.replace('ty:t.y+1.2','ty:t.y+5');
fs.writeFileSync(f,JSON.stringify(v,null,2));
