import fs from 'node:fs';
const inv=JSON.parse(fs.readFileSync(new URL('./inventory.json',import.meta.url))),v=[];
const add=(id,title,group,camera,extra={})=>v.push({id,title,group,camera,...extra});
for(const l of inv.landmarks){
 if(l.kind==='fence'&&l.i===13)continue; // HQ approach fence excluded with HQ.
 const names={campsite:l.campStyle+' camp',cabin:l.i===3?'Ruined aid station':'Burned supply house',tower:'Lookout tower',graveyard:'Parish cemetery',shed:['Repair shed','Food store','Generator shelter'][l.i-7],fence:'Broken fence '+(l.i-9),sign:'Warning sign '+(l.i-13),barrel:'Fuel drum '+(l.i-17)};
 const group=['campsite'].includes(l.kind)?'Camps and survivors':['cabin','graveyard'].includes(l.kind)?'Coldwater and later occupation':['fence','sign','barrel'].includes(l.kind)?'Everyday dressing':'Infrastructure and wrecks';
 add('site-'+l.i,names[l.kind]||l.kind,group,`(()=>{const l=TT.landmarks[${l.i}];return WS.frame(l.mesh,${l.kind==='campsite'?`{yaw:l.campYaw+.6,d:17,up:10}`:'{}'});})()`);
}
for(const key of ['dock','mast','bridges','wrecks']){
 const list=Array.isArray(inv.poi[key])?inv.poi[key]:[inv.poi[key]];
 list.forEach((p,i)=>add(key+'-'+i,({dock:'Lakeside dock and rowboat',mast:'Emergency relay mast',bridges:i===0?'East timber bridge':'West reinforced bridge',wrecks:i===0?'Medical convoy wreck':'Stripped utility wreck'})[key],'Infrastructure and wrecks',`WS.frame(TT.POI.${key}${Array.isArray(inv.poi[key])?'['+i+']':''}.mesh,${key==='mast'?'{d:24,up:6}':'{}'})`));
}
for(const c of inv.poi.caves)add('cave-'+c.theme,({root:'Root cave',shale:'Shale cave',iron:'Iron mine entrance',wet:'Wet cave',hill:'Hill barrow',chalk:'Marrow cave'})[c.theme],'Caves and the first people',`(()=>{const c=TT.POI.caves.find(c=>c.theme==='${c.theme}'),a=c.yaw;return {x:c.x+Math.sin(a)*20+Math.cos(a)*3,y:c.gy+10,z:c.z+Math.cos(a)*20-Math.sin(a)*3,tx:c.x,ty:c.gy+2,tz:c.z,fov:50};})()`);
const histTitles={'mine-timbers':'Old mine timber set','mine-bars-cut':'Cut mine bars','iron-below':'Discarded IRON BELOW boards','hikers-cache':'Hikers’ equipment at the mine',brass:'Spent brass at the fallen line','dropped-helmet':'Dropped PGB helmet','drag-marks':'Drag marks toward the caves','ranger-truck':'Stranded ranger pickup','cellar-hatch':'Trapper’s iron-lined cellar','trapper-post':'Protective horseshoes','leghold-traps':'Trapper’s leghold traps','coldwater-church':'Coldwater church shell','coldwater-foundation':'Coldwater house foundation','coldwater-chimney':'Standing chimney','iron-banded-grave':'Iron-banded burial','open-grave':'Grave opened from below','cordon-gate':'Cordon gate','trailhead-board':'Missing hikers’ trailhead board'};
for(const h of inv.history){
 if(h.name==='horseshoe')continue;
 const name=h.name,title=name.startsWith('survey-board:')?'PGB survey board — '+name.split(':')[1]:(histTitles[name]||name);
 const group=/coldwater|grave/.test(name)?'Coldwater and later occupation':/mine|iron-below|survey/.test(name)?'Caves and the first people':/ranger|trapper|cellar|hikers/.test(name)?'Camps and survivors':/cordon|trailhead/.test(name)?'The Cordon':'Evidence of the fall';
 add('history-'+h.i,title,group,`WS.frame(TT.historyProps.group.children[${h.i}],${name==='brass'?'{d:4,up:3}':name==='trapper-post'?'{yaw:0,d:3,up:.2}':name==='drag-marks'?'{d:24,up:20}':'{}'})`);
}
for(let i=0;i<4;i++)add('stone-'+i,i?'Standing glyph stone '+i:'Ring instruction stone','Caves and the first people',`WS.frame(${i?`TT.firstPeople.stones[${i-1}]`:'TT.firstPeople.ring'},{d:6,up:1.4})`);
add('barrow-offerings','Offerings at the barrow','Caves and the first people','WS.frame(TT.firstPeople.offerings,{d:12,up:5})');
add('marrow-seal','Carved Marrow seal','Caves and the first people','WS.frame(TT.firstPeople.door,{d:11,up:1})');
for(const [id,name] of [['rabbit-mound','Rabbit mound and bones'],['holy-reliquary','Holy grenade reliquary'],['insulated-boots','Insulated boots at the relay']])add(id,name,'Secrets and special props',`WS.frame(TT.scene.getObjectByName('${id}'),{d:${id==='rabbit-mound'?6:2.2},up:${id==='rabbit-mound'?2.4:1.3}})`);
for(let i=0;i<7;i++)add('objective-'+i,['Relay repair cabinet','Medical supplies cache','Ranger cache','Hikers’ cache','Trapper cache','Fuel depot','Wreck salvage cache'][i],'Objective props',`(()=>{const p=window.objectiveSitesFrom(TT.POI,TT.sampleHeight)[${i}],a=p.facing+Math.PI;return {x:p.x+Math.sin(a)*3.3,y:p.y+2.5,z:p.z+Math.cos(a)*3.3,tx:p.x,ty:p.y+.4,tz:p.z,fov:48};})()`);
add('lake','Lake and the Pit','Landscape',`(()=>{const p=TT.LAKE_HOLE;return{x:p.x+45,y:40,z:p.z+44,tx:p.x,ty:-4,tz:p.z,fov:58};})()`);
add('pit','The Pit and its eight-stone ring','Landscape',`(()=>{const p=TT.LAKE_HOLE;return{x:p.x+9,y:12,z:p.z+12,tx:p.x,ty:-9,tz:p.z,fov:52};})()`);
add('river-grate','River outlet and containment grate','The Cordon',`(()=>{const g=WSWorld.WALL_GATE,r=WSWorld.WALL_INNER_R,a=g.ang,p={x:Math.cos(a)*r,z:Math.sin(a)*r};return{x:p.x-Math.cos(a)*23-Math.sin(a)*6,y:TT.sampleHeight(p.x,p.z)+8,z:p.z-Math.sin(a)*23+Math.cos(a)*6,tx:p.x,ty:g.spring,tz:p.z,fov:55};})()`);
add('woodland','Woodland, rocks and ground cover','Landscape',`(()=>{const t=TT.trees.find(t=>Math.hypot(t.x,t.z)>90&&Math.hypot(t.x,t.z)<120);return{x:t.x+14,y:TT.sampleHeight(t.x,t.z)+11,z:t.z+15,tx:t.x,ty:TT.sampleHeight(t.x,t.z)+2,tz:t.z,fov:52};})()`);
fs.writeFileSync(new URL('./views.json',import.meta.url),JSON.stringify(v,null,2));console.log(v.length+' surface views');
