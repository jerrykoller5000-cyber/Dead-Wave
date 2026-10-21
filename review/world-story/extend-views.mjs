import fs from 'node:fs';
const file=new URL('./views.json',import.meta.url),v=JSON.parse(fs.readFileSync(file));
const set=(id,camera)=>v.find(x=>x.id===id).camera=camera;
set('site-6','WS.frame(TT.landmarks[6].mesh,{yaw:2.8,d:20,up:14})');
set('history-10','WS.frame(TT.historyProps.group.children[10],{yaw:-.89,d:2,up:1.6})');
set('history-11','WS.frame(TT.historyProps.group.children[11],{yaw:1.8,d:10,up:9})');
set('history-12','WS.frame(TT.historyProps.group.children[12],{d:8,up:4})');
set('history-18','WS.frame(TT.historyProps.group.children[18],{yaw:2,d:1.1,up:2})');
set('history-21','WS.frame(TT.historyProps.group.children[21],{yaw:3.5,d:12,up:9})');
set('holy-reliquary',"WS.frame(TT.scene.getObjectByName('holy-reliquary'),{yaw:3.5,d:2,up:1.5})");
set('history-9','WS.frame(TT.historyProps.group.children[9],{yaw:3.5,d:1,up:7})');
const add=(id,title,group,camera,extra={})=>{if(!v.some(x=>x.id===id))v.push({id,title,group,camera,...extra});};
add('sandbags','Abandoned sandbag barricade','Evidence of the fall',`(()=>{const p=TT.POI.sandbags;return{x:p.x+12,y:TT.sampleHeight(p.x,p.z)+10,z:p.z-8,tx:p.x+3,ty:TT.sampleHeight(p.x,p.z)+.5,tz:p.z-3,fov:45};})()`);
add('heron','Heron extraction floatplane','Infrastructure and wrecks',`(()=>{const h=TT.getExtractionBoat(),p=h.group.position,a=h.group.rotation.y;return{x:p.x+Math.sin(a)*16-Math.cos(a)*9,y:p.y+5,z:p.z+Math.cos(a)*16+Math.sin(a)*9,tx:p.x,ty:p.y+2,tz:p.z,fov:55};})()`,{staged:true,setup:`(()=>{let h=TT.getExtractionBoat();if(h)h.reset();window.dispatchEvent(new CustomEvent('dw-game',{detail:{type:'extraction',phase:'due',day:20,runId:'story-review'}}));h=TT.getExtractionBoat();h.arrive();for(let i=0;i<300;i++)h.update(.1);})()`});
const setup=theme=>`(()=>{WS.saved=TT.scene.children.map(c=>[c,c.visible]);for(const [c]of WS.saved)if(!c.isLight)c.visible=false;WS.w=TT.buildWarren('${theme}',{origin:{x:0,y:260,z:0}});TT.scene.add(WS.w.group);WS.lights=[];for(const l of WS.w.lamps){const p=new WS.T.PointLight(0xffc488,6,16,1.2);p.position.set(l.x,l.y,l.z);TT.scene.add(p);WS.lights.push(p);}})()`;
const teardown=`(()=>{WS.w.dispose();for(const l of WS.lights)TT.scene.remove(l);for(const [c,visible]of WS.saved)c.visible=visible;})()`;
for(const t of ['root','shale','iron','wet','hill']){
 const camera=deep=>`(()=>{const w=WS.w,C=TT.HOLLOW.CELL,o=w.group.position,p=w.plan,c=p.cells[p.chambers[0]],x=o.x+c.i*C+C/2,z=o.z+c.j*C+C/2,t=${deep?'w.points.set':'{x,y:w.groundAt(x,z),z}'},e=${deep?'w.points.strongbox':'w.entry'},dx=t.x-e.x,dz=t.z-e.z,l=Math.hypot(dx,dz)||1,cam={x:t.x-dx/l*${deep?4.5:2.6},z:t.z-dz/l*${deep?4.5:2.6}};return{x:cam.x,y:(w.groundAt(cam.x,cam.z)??t.y)+1.7,z:cam.z,tx:t.x,ty:t.y+${deep?1.2:3.6},tz:t.z,fov:75};})()`;
 add('below-'+t,t[0].toUpperCase()+t.slice(1)+' warren: chamber and husks','Underground',camera(false),{staged:true,setup:setup(t),teardown});
 add('deep-'+t,t[0].toUpperCase()+t.slice(1)+' warren: Deep set piece','Underground',camera(true),{staged:true,setup:setup(t),teardown});
}
for(const [id,title,name]of [['crates','Dragged-down PGB supplies','fob-crates'],['door','Underground rune door','rune-door'],['box','Iron-bound strongbox','strongbox'],['breach','Broken iron barrier and hikers’ descent','iron-wall-cut']])add('below-'+id,title,'Underground',`WS.frame(WS.w.group.getObjectByName('${name}'),{d:${id==='breach'?5:4},up:1.4})`,{staged:true,setup:setup(id==='breach'?'iron':'root'),teardown});
const heartSetup=`(()=>{WS.saved=TT.scene.children.map(c=>[c,c.visible]);for(const [c]of WS.saved)if(!c.isLight)c.visible=false;WS.h=TT.buildHeart({origin:{x:0,y:300,z:0}});TT.scene.add(WS.h.group);WS.lights=[];for(const [color,intensity,p]of [[0x9eeeff,40,{x:WS.h.source.x,y:WS.h.source.y+4,z:WS.h.source.z}],[0xffd8a8,8,{x:WS.h.entry.x,y:WS.h.entry.y+2,z:WS.h.entry.z+4}]]){const l=new WS.T.PointLight(color,intensity,40,1.2);l.position.set(p.x,p.y,p.z);TT.scene.add(l);WS.lights.push(l);}})()`;
const heartDown=`(()=>{TT.scene.remove(WS.h.group);for(const l of WS.lights)TT.scene.remove(l);for(const [c,visible]of WS.saved)c.visible=visible;})()`;
add('heart-chamber','The Marrow: heart chamber','Underground',`(()=>{const h=WS.h;return{x:0,y:h.source.y+2.2,z:h.source.z-TT.HEART.R+1,tx:0,ty:h.source.y+4,tz:h.source.z+4,fov:75};})()`,{staged:true,setup:heartSetup,teardown:heartDown,worldTime:0});
add('heart-source','The heart and its supporting columns','Underground',`(()=>{const h=WS.h;return{x:h.source.x+7,y:h.source.y+2.5,z:h.source.z-6,tx:h.source.x,ty:h.source.y+1.5,tz:h.source.z,fov:65};})()`,{staged:true,setup:heartSetup,teardown:heartDown,worldTime:0});
fs.writeFileSync(file,JSON.stringify(v,null,2));console.log(v.length+' total views');
