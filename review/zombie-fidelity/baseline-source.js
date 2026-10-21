// GP-161: cosmetic meshes from review/zombie-types/GPT-Concepts. Joint transforms,
// hit logic and animation remain owned by the original rigs. No random/world state.
export const CONCEPT_TYPES = Object.freeze(['shambler','feral','brute','military','spitter','bomber','screamer','drowned','leaper','spider','colossus','demon','guardian','caveguard']);
const templates = new WeakMap();
function bones(u){
  const out={hips:u.hips,torso:u.torso,head:u.head};
  for(const S of ['L','R']){out['arm'+S]=u['arm'+S+'G'];out['elbow'+S]=out['arm'+S].userData.elbowG;out['leg'+S]=u['leg'+S+'G'];out['shin'+S]=out['leg'+S].userData.shinG;}
  (u.crawlLimbs||[]).forEach((l,i)=>{out['crawl'+i]=l.root;out['knee'+i]=l.knee;});return out;
}
function remember(T,g,key){
  const u=g.userData,materials=new Map(),copy=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
  const parts=[];for(const [bone,p]of Object.entries(bones(u)))for(const m of p.children)if(m.isMesh&&!u.eyes.includes(m)){
    parts.push({bone,geometry:m.geometry,material:copy(m.material),position:m.position.clone(),quaternion:m.quaternion.clone(),scale:m.scale.clone(),compacted:!!m.userData.compacted});
  }
  const tpl={parts,body:u.bodyMats.map(copy),pulse:u.pulseMats.map(copy),ember:u.emberMat?copy(u.emberMat):null,concept:{...u.concept},eyes:u.eyes.map(e=>({position:e.position.clone(),scale:e.scale.clone(),color:e.material.color.clone(),emissive:e.material.emissive.clone()}))};
  let map=templates.get(T);if(!map){map=new Map();templates.set(T,map);}map.set(key,tpl);
}
function restore(T,g,key,k){
  const tpl=templates.get(T)?.get(key);if(!tpl)return false;
  const u=g.userData,bs=bones(u),materials=new Map(),copy=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
  stripMeshes(g,new Set(u.eyes));
  for(const p of tpl.parts){const m=new T.Mesh(p.geometry,copy(p.material));m.position.copy(p.position);m.quaternion.copy(p.quaternion);m.scale.copy(p.scale);m.castShadow=true;m.userData.compacted=p.compacted;bs[p.bone].add(m);
    if(p.compacted){if(p.bone.startsWith('leg'))bs[p.bone].userData.thigh=m;if(p.bone.startsWith('arm'))bs[p.bone].userData.upper=m;if(p.bone==='torso')bs.torso.userData.bodyMat=m.material;}}
  tpl.eyes.forEach((e,i)=>{const eye=u.eyes[i];eye.position.copy(e.position);eye.scale.copy(e.scale);eye.material.color.copy(e.color);eye.material.emissive.copy(e.emissive);eye.material.emissiveIntensity=1.8;});
  u.bodyMats=tpl.body.map(copy);u.pulseMats=tpl.pulse.map(copy);if(tpl.ember)u.emberMat=copy(tpl.ember);u.concept={...tpl.concept};return true;
}

function sculpt(T, s, rbox) {
  const mats = [];
  const mat = (color, glow = false, metalness = 0) => {
    const m = new T.MeshStandardMaterial({color, roughness: glow ? .48 : .86, metalness,
      ...(glow ? {emissive:color, emissiveIntensity:1.5} : {})}); mats.push(m); return m;
  };
  const put = (p, geo, m, x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
    const o=new T.Mesh(geo,m);o.position.set(x*s,y*s,z*s);o.rotation.set(rx,ry,rz);
    o.castShadow=true;o.name='concept-surface';p.add(o);return o;
  };
  const egg = (p,m,x,y,z,w,h,d,rz=0) => {
    const geo=new T.SphereGeometry(1,8,6).toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();
    const o=put(p,geo,m,x,y,z,0,0,rz);o.scale.set(w*s/2,h*s/2,d*s/2);return o;
  };
  const rock = (p,m,x,y,z,w,h,d,rz=0) => {
    const o=put(p,new T.DodecahedronGeometry(1,0),m,x,y,z,.12,.3,rz);o.scale.set(w*s/2,h*s/2,d*s/2);return o;
  };
  const box = (p,m,x,y,z,w,h,d,rz=0) => put(p,rbox(w*s,h*s,d*s,Math.min(w,h,d)*s*.16),m,x,y,z,0,0,rz);
  const rod = (p,m,a,b,ra,rb=ra,n=6) => {
    const A=new T.Vector3(...a).multiplyScalar(s),B=new T.Vector3(...b).multiplyScalar(s),v=B.clone().sub(A);
    const o=put(p,new T.CylinderGeometry(rb*s,ra*s,v.length(),n,1),m);
    o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
  };
  const path = (p,m,pts,r=.025) => pts.slice(1).forEach((b,i)=>rod(p,m,pts[i],b,r*(1-i/pts.length),r*(1-(i+1)/pts.length)));
  const spike = (p,m,a,b,r=.035) => rod(p,m,a,b,r,0,5);
  const rag = (p,m,x,y,z,w,h,rz=0) => {
    // Explicit faces: the bundled extruder can return side walls without either cap.
    const pts=[[-w/2,0],[w/2,0],[w*.4,-h*.78],[w*.12,-h*.64],[-w*.04,-h],[-w*.3,-h*.8],[-w/2,-h*.87]],v=[];
    const tri=(a,b,c)=>{for(const p of [a,b,c])v.push(p[0]*s,p[1]*s,p[2]*s);};
    for(let i=1;i<pts.length-1;i++){tri([...pts[0],.008],[...pts[i+1],.008],[...pts[i],.008]);tri([...pts[0],0],[...pts[i],0],[...pts[i+1],0]);}
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];tri([...a,0],[...b,.008],[...b,0]);tri([...a,0],[...a,.008],[...b,.008]);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();
    return put(p,geo,m,x,y,z,0,0,rz);
  };
  return {mat,mats,put,egg,rock,box,rod,path,spike,rag};
}

function stripMeshes(root, keep = new Set()) {
  const dead=[];root.traverse(o=>{if(o.isMesh&&!keep.has(o))dead.push(o);});
  for(const o of dead)o.removeFromParent();
}

export function applyZombieConcept({THREE:T,g,typeKey:k,scale:s,rbox}) {
  if(!CONCEPT_TYPES.includes(k))return false;
  const cacheKey=k+':'+s;if(restore(T,g,cacheKey,k))return true;
  const u=g.userData, {hips,torso,head,armLG,armRG,legLG,legRG}=u;
  const A=sculpt(T,s,rbox),{mat,egg,rock,box,rod,path,spike,rag}=A;
  stripMeshes(g,new Set(u.eyes));
  const heavy=['brute','colossus','demon'].includes(k), acid=['spitter','bomber'].includes(k);
  const skin=mat(({shambler:0xaaa995,feral:0x9caa87,brute:0x805448,military:0x989b85,
    spitter:0x969b42,bomber:0x929f3b,screamer:0xc5b6a4,drowned:0x617a80,leaper:0xaaa8b0,
    spider:0xbabdb1,colossus:0x714237,demon:0x722e26,guardian:0xc3c6b3,caveguard:0x55584f})[k]);
  const shadow=mat(skin.color.clone().multiplyScalar(.49)), pale=mat(skin.color.clone().lerp(new T.Color(0xe6dfc8),.28));
  const wound=mat(0x52352f),mouth=mat(0x201b1b),teeth=mat(0xc8bea0),hair=mat(0x272b25),cloth=mat(0x373a34);
  const shirt=mat(0xbbb7a0),leather=mat(0x514332),steel=mat(0x3c403a,false,.35),rust=mat(0x805635,false,.2);
  const moss=mat(k==='drowned'?0x384e35:0x526032),glowColor=({screamer:0xf373ce,spider:0xef7ab7,drowned:0xb7edee,demon:0xff991c,colossus:0xffae3b,brute:0xff633c,guardian:0xeaffd2,caveguard:0xbfe9ff})[k]||0xcadd43;
  for(const e of u.eyes){e.material.color.set(glowColor);e.material.emissive.set(glowColor);e.material.emissiveIntensity=1.8;e.scale.set(.68,.45,.5);}
  u.pulseMats=[];
  const wide=heavy?.68:acid?.65:k==='screamer'?.35:k==='feral'||k==='leaper'?.4:.48;
  const deep=heavy?.4:acid?.48:.3;
  torso.userData.bodyMat=skin;u.bodyMats=[skin];
  egg(hips,cloth,0,.1,0,wide*.82,.28,deep*.87);
  egg(torso,skin,0,.21,0,wide,.54,deep);
  egg(torso,shadow,0,.06,.015,wide*.66,.3,deep*.82);
  for(const side of [-1,1]){
    egg(torso,pale,side*wide*.23,.36,.035,wide*.47,.21,deep*.9,side*.1);
    const arm=side<0?armLG:armRG,el=arm.userData.elbowG,leg=side<0?legLG:legRG,shin=leg.userData.shinG;
    const muscle=heavy?1.6:k==='feral'||k==='leaper'?1.08:.92;
    egg(arm,skin,0,-.01,0,.19*muscle,.21,.2*muscle);
    arm.userData.upper=egg(arm,skin,0,-.16,0,.155*muscle,.37,.17*muscle);
    egg(el,shadow,0,0,0,.14*muscle,.12,.15*muscle);
    egg(el,skin,0,-.15,0,.15*muscle,.34,.15*muscle);
    rod(el,pale,[-.018,-.03,.063],[.018,-.29,.042],.021,.014);
    egg(el,skin,0,-.345,.015,.15*muscle,.15,.1*muscle);
    for(let f=0;f<4;f++){
      const x=(f-1.5)*.031*muscle,len=(f===0||f===3)?.08:.11;
      path(el,skin,[[x,-.37,.025],[x,-.4-len*.45,.047],[x,-.4-len,.015]],.021*muscle);
      if(['feral','leaper','demon','guardian','caveguard'].includes(k))
        path(el,hair,[[x,-.4-len,.015],[x,-.44-len,.055],[x,-.49-len,.085]],.018);
    }
    path(el,skin,[[side*.065,-.33,.025],[side*.096,-.39,.065],[side*.066,-.43,.072]],.026);
    const legcloth=['military','shambler','feral','screamer','drowned'].includes(k);
    egg(leg,legcloth?cloth:skin,0,-.045,0,.175*(heavy?1.3:1),.21,.20);
    leg.userData.thigh=egg(leg,legcloth?cloth:skin,0,-.18,0,.19*(heavy?1.35:1),.4,.22*(heavy?1.2:1));
    egg(shin,pale,0,-.015,.03,.15,.13,.16);
    egg(shin,skin,0,-.18,0,.14*(heavy?1.35:1),.33,.16);
    rod(shin,shadow,[.02,-.06,.066],[.008,-.31,.052],.015,.01);
    const booted=!['feral','leaper','demon','guardian','caveguard'].includes(k);
    box(shin,booted?leather:skin,0,-.36,.038,.17*(heavy?1.35:1),.10,.25);
    if(booted){box(shin,hair,0,-.403,.04,.176*(heavy?1.35:1),.027,.263);box(shin,leather,0,-.275,0,.155,.16,.17);}
    else for(let f=0;f<3;f++)spike(shin,hair,[(f-1)*.055,-.37,.15],[(f-1)*.065,-.395,.245],.021);
    if(legcloth)for(let j=0;j<3;j++)rag(leg,cloth,(j-1)*.052,-.23,.104,.064,.1+(j%2)*.05,(j-1)*.15);
    // Torn muscle and mottling: surface chips, not floating decals.
    egg(arm,shadow,side*.042,-.16,.069*muscle,.05,.14,.018,-side*.35);
    egg(el,wound,-side*.028,-.16,.069*muscle,.043,.095,.018,side*.4);
  }
  const hw=heavy?.39:.32;
  egg(head,skin,0,.015,-.015,hw,.36,heavy?.35:.31);
  for(const side of [-1,1]){
    rock(head,pale,side*.115,-.045,.105,.105,.115,.12,side*.2);
    box(head,shadow,side*.088,.042,.144,.106,.081,.04,-side*.12);
    box(head,pale,side*.084,.095,.136,.128,.054,.067,side*.14);
    egg(head,skin,side*hw*.5,-.002,-.005,.065,.10,.059);
  }
  rock(head,pale,0,-.013,.156,.052,.095,.071);
  const scream=k==='screamer',jawH=scream?.26:.105;
  egg(head,mouth,0,-.11-(scream?.07:0),.14,.18,jawH,.067);
  egg(head,skin,0,scream?-.31:-.17,.06,.19,.07,.17);
  for(let i=0;i<6;i++){
    const x=(i-2.5)*.027;
    spike(head,teeth,[x,-.07,.181],[x,-.1-(i%2)*.012,.184],.012);
    spike(head,teeth,[x,scream?-.285:-.151,.178],[x,scream?-.252:-.128,.183],.011);
  }
  if(scream){const tongue=mat(0x9e626a);path(head,tongue,[[0,-.24,.19],[.015,-.33,.22],[.035,-.37,.24]],.025);}
  if(['shambler','feral','spitter','screamer','drowned'].includes(k)){
    egg(head,hair,0,.158,-.034,.32,.07,.27);
    for(let i=0;i<9;i++)spike(head,hair,[(i%3-1)*.10,.17,-.1+Math.floor(i/3)*.07],[(i%3-1)*.115,.19+(i%4)*.011,-.12+Math.floor(i/3)*.06],.034);
  }
  // Dirt patches follow the skin's contours and repeat deterministically per type.
  for(let i=0;i<5;i++)egg(head,i%2?shadow:pale,(i%3-1)*.077,-.03+Math.floor(i/3)*.15,-.148,.065,.067,.016,i*.8);

  if(['shambler','feral','screamer'].includes(k)){
    // Open neck and armholes make the tank read as cloth instead of a solid torso cube.
    box(torso,shirt,0,.22,.151,wide*.76,.23,.025);
    box(torso,shirt,0,.24,-.148,wide*.78,.3,.025);
    for(const side of [-1,1]){
      box(torso,shirt,side*wide*.32,.385,.11,.066,.19,.032,side*.08);
      box(torso,shirt,side*wide*.32,.395,-.10,.068,.17,.032,-side*.08);
      for(let j=0;j<3;j++)rag(torso,shirt,side*(.045+j*.052),.135,.17,.062,.08+((j+1)%3)*.035,side*.05);
    }
    egg(torso,shadow,.035,.23,.17,.078,.12,.01,.35);
    if(k==='feral')for(const side of [-1,1])box(torso,wound,side*.142,.37,.135,.035,.23,.022,side*.12);
    if(scream)for(let i=0;i<4;i++)for(const side of [-1,1])rod(torso,pale,[side*.03,.36-i*.057,.163],[side*(.12-i*.008),.33-i*.057,.146],.012,.009);
  }
  if(k==='military'){
    const olive=mat(0x4c5437),camLight=mat(0x79744b),camDark=mat(0x303c2a);
    egg(head,olive,0,.17,-.02,.36,.13,.32);box(head,olive,0,.176,.165,.33,.032,.2);
    egg(torso,olive,0,.25,0,.51,.51,.345);
    for(const side of [-1,1]){
      const arm=side<0?armLG:armRG,leg=side<0?legLG:legRG,shin=leg.userData.shinG;
      egg(arm,olive,0,-.08,0,.22,.24,.22);egg(leg,olive,0,-.19,0,.205,.39,.23);
      egg(shin,olive,0,-.10,0,.16,.25,.18);box(shin,steel,0,-.025,.092,.15,.14,.065);
      for(let j=0;j<4;j++){rock(arm,j%2?camDark:camLight,side*.05,-.02-j*.047,.089,.09,.055,.023,j*.7);rock(leg,j%2?camLight:camDark,(j%2-.5)*.075,-.055-j*.067,.105,.11,.067,.025,j*.8);}
      box(torso,leather,side*.185,.29,.186,.047,.41,.035,side*.04);
      for(let j=0;j<2;j++){box(torso,olive,side*(.048+j*.1),.14,.23,.084,.15,.08);box(torso,camLight,side*(.048+j*.1),.19,.276,.075,.021,.012);}
    }
    box(torso,olive,0,.3,.177,.36,.21,.06);box(torso,olive,0,.25,-.245,.36,.4,.14);
    box(torso,camDark,.14,.44,-.24,.1,.12,.075);rod(torso,hair,[.14,.48,-.24],[.14,.82,-.25],.01,.006);
    for(let i=0;i<5;i++)box(torso,camLight,0,.235+i*.027,.216,.30,.009,.009);
  }
  if(acid){
    const acidMat=mat(k==='bomber'?0xcbd550:0xadc14c),sac=mat(0xb3bd47),ooze=mat(0xc1df49,true);
    egg(torso,acidMat,0,.13,.095,k==='bomber'?.78:.64,k==='bomber'?.63:.59,k==='bomber'?.61:.51);
    for(let i=0;i<12;i++){
      const a=i*2.399,r=.12+(i%3)*.055,x=Math.cos(a)*r,y=.12+Math.sin(a)*r;
      egg(torso,i%3?shadow:sac,x,y,.34-Math.abs(x)*.15,.036+(i%3)*.014,.04+(i%2)*.02,.023);
    }
    if(k==='spitter'){
      for(const side of [-1,1]){box(torso,cloth,side*.245,.30,.17,.10,.36,.06,-side*.12);rag(torso,cloth,side*.25,.15,.19,.11,.18,-side*.1);}
      box(torso,cloth,0,.29,-.205,.50,.37,.045);
      for(let i=0;i<4;i++)path(head,ooze,[[(i-1.5)*.037,-.12,.185],[(i-1.5)*.04,-.24-(i%2)*.07,.20],[(i-1.5)*.03,-.29-(i%2)*.07,.17]],.009);
      path(torso,ooze,[[.04,.26,.349],[.02,.13,.36],[.05,-.12,.29]],.012);
    }else{
      // The existing fuse animation drives a belly material and a separate vein material.
      acidMat.emissive.setHex(0x758c21);acidMat.emissiveIntensity=.3;u.pulseMats=[acidMat,ooze];
      for(let i=0;i<8;i++){
        const side=i%2?1:-1;egg(torso,sac,side*(.13+(i%3)*.09),.35+Math.floor(i/2)*.055,-.20,.20+(i%2)*.035,.24,.22);
      }
      for(const side of [-1,1]){
        path(torso,ooze,[[side*.08,.39,.31],[side*.13,.27,.38],[side*.08,.15,.404],[side*.2,.03,.356],[side*.16,-.12,.28]],.009);
        path(torso,ooze,[[side*.13,.27,.38],[side*.27,.21,.333],[side*.31,.11,.29]],.008);
        box(torso,leather,side*.24,.35,.18,.05,.26,.035,side*.35);
      }
      for(let j=0;j<7;j++)rag(hips,leather,(j-3)*.067,.11,.245,.075,.18+(j%2)*.05);
    }
  }
  if(k==='drowned'){
    egg(torso,cloth,0,.24,0,.46,.46,.32);
    for(const side of [-1,1])box(torso,leather,side*.14,.25,.167,.032,.42,.025,side*.09);
    for(let i=0;i<4;i++)box(torso,rust,(i-1.5)*.085,.25,.196,.059,.23,.06);
    for(let i=0;i<9;i++){
      const side=i%2?1:-1,p=i<4?head:torso,x=side*(i<4?.13:.21),y=i<4?.19:.47,z=i<4?-.06:-.15;
      path(p,moss,[[x,y,z],[x+side*.025,y-.16,z+.01],[x-side*.028,y-.34-(i%3)*.08,z+.05]],.017);
    }
    for(let i=0;i<8;i++){
      const p=i<4?armLG:head,x=i<4?-.07:(i-5)*.045,y=i<4?-.05-(i%4)*.047:.09,z=i<4?.08:-.14;
      const b=A.put(p,new T.CylinderGeometry(.018*s,.027*s,.023*s,6),pale,x,y,z,Math.PI/2);
      egg(p,hair,x,y,z+.015,.017,.017,.009);
    }
  }
  if(k==='leaper'){
    for(let i=0;i<7;i++)spike(torso,pale,[0,.02+i*.065,-.135],[0,.06+i*.065,-.25-(i%2)*.045],.038);
    for(const side of [-1,1]){
      egg(side<0?armLG:armRG,pale,0,-.14,.01,.19,.3,.19);
      for(let i=0;i<4;i++)rod(torso,pale,[side*.04,.33-i*.065,.14],[side*.17,.29-i*.065,.10],.015,.009);
    }
    for(let j=0;j<5;j++)rag(hips,cloth,(j-2)*.06,.1,.135,.073,.20-(j%2)*.05);
  }
  if(heavy){
    const fire=mat(k==='brute'?0xc3a253:0xff9127,k!=='brute');
    if(k==='demon')u.emberMat=fire;
    const armor=k==='demon'?hair:steel;
    box(torso,armor,0,.29,.226,wide*.83,.34,.10);
    for(const side of [-1,1]){
      const arm=side<0?armLG:armRG,el=arm.userData.elbowG,shin=(side<0?legLG:legRG).userData.shinG;
      box(torso,leather,side*.265,.27,.23,.058,.47,.04,side*.12);
      box(torso,rust,side*.264,.34,.263,.083,.062,.024);
      rock(arm,armor,side*.04,.055,0,.34,.16,.36,-side*.2);
      box(el,armor,0,-.2,.117,.24,.20,.065,side*.1);
      for(let j=0;j<3;j++){box(shin,j%2?rust:armor,0,-.035-j*.092,.112,.205-j*.017,.12,.07,side*.04);box(el,leather,0,-.10-j*.06,.13,.24,.025,.02);}
      box(shin,armor,0,-.35,.065,.23,.1,.29);
      for(let j=0;j<3;j++)rag(hips,k==='brute'?wound:cloth,side*(.05+j*.065),.12,.20,.083,.24+(j%2)*.06,side*.1);
      if(k!=='brute')for(let j=0;j<3;j++)spike(arm,rust,[side*.06,.09,-.1+j*.09],[side*(.15+j*.015),.28+(j%2)*.1,-.16+j*.1],.047);
    }
    if(k==='brute'){
      box(torso,wound,0,.36,.284,.51,.07,.015);box(torso,fire,0,.155,.284,.49,.037,.015);
      spike(armLG,steel,[-.08,.06,0],[-.29,.37,-.03],.12);
      for(let i=0;i<6;i++)egg(torso,shadow,(i%2?1:-1)*(.16+(i%3)*.04),.08+Math.floor(i/2)*.13,-.2,.13,.16,.07);
    }else{
      for(let i=0;i<3;i++)box(torso,fire,(i-1)*.115,.078,.234,.06,.11,.025);
      box(head,armor,0,.105,.165,.36,.1,.075);box(head,armor,0,.175,0,.39,.09,.31);
      if(k==='colossus'){
        const hazard=mat(0xb97c31,false,.2);
        box(armLG,hazard,-.10,.15,0,.53,.19,.52,-.18);
        for(let j=0;j<3;j++)box(armLG,hair,-.27+j*.135,.245,.09,.049,.012,.34,-.18);
        for(const z of [-.13,.13])path(armLG,rust,[[-.28,.23,z],[-.28,.39,z],[-.05,.39,z],[-.05,.23,z]],.019);
        box(torso,rust,.025,.30,.285,.42,.24,.025,.08);
        for(let j=0;j<4;j++)box(torso,steel,(j-1.5)*.13,.32,-.25,.11,.4,.09,(j-1.5)*.06);
      }else{
        for(const side of [-1,1]){
          // Sweep out before curling up: the skull remains in its existing headshot band.
          const pts=[[side*.13,.13,-.03],[side*.30,.18,-.07],[side*.46,.29,-.12],[side*.43,.39,-.13],[side*.34,.43,-.11]];
          for(let j=0;j<4;j++)rod(head,j===3?teeth:rust,pts[j],pts[j+1],.075-j*.016,j===3?0:.059-j*.016,5);
          for(let j=0;j<4;j++)spike(torso,rust,[side*.2,.12+j*.09,-.18],[side*.28,.28+j*.10,-.39],.065);
        }
      }
    }
  }
  if(k==='guardian'||k==='caveguard'){
    const stone=k==='caveguard';
    for(const side of [-1,1]){rock(side<0?armLG:armRG,stone?pale:skin,0,-.12,.015,.28,.4,.26);rock(torso,pale,side*.24,.40,0,.27,.2,.29);}
    for(let j=0;j<5;j++)spike(torso,pale,[0,.08+j*.08,-.14],[0,.3+j*.10,-.33],.065);
    box(head,stone?pale:shadow,0,.15,.11,.39,.10,.2);
  }
  if(k==='spider')buildSpider(A,T,g,s);
  batchGlow(T,g);
  const keep=new Set([...u.eyes.map(e=>e.material),...A.mats.filter(m=>m.emissive.getHex()!==0)]);
  batchSurfaces(T,g,keep);u.bodyMats=g.userData.mats.filter(m=>!keep.has(m));
  // Track actual materials (old removed pulse materials must never flash detached meshes).
  u.concept={version:1,type:k,skin:skin.color.getHex(),eye:glowColor};
  remember(T,g,cacheKey);
  return true;
}

function batchGlow(T,g){
  const groups=[];g.traverse(o=>{if(o.isGroup)groups.push(o);});
  for(const p of groups){
    const byMaterial=new Map();
    for(const m of p.children)if(m.isMesh&&m.material.emissive?.getHex()){
      const a=byMaterial.get(m.material)||[];a.push(m);byMaterial.set(m.material,a);
    }
    for(const [mat,meshes] of byMaterial){
      // Eye meshes are animation references, and each has its own material.
      if(meshes.length<2)continue;
      const positions=[],normals=[];
      for(const m of meshes){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
        positions.push(...geo.getAttribute('position').array);normals.push(...geo.getAttribute('normal').array);geo.dispose();m.removeFromParent();}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
      const m=new T.Mesh(geo,mat);m.name='concept-glow';m.castShadow=true;p.add(m);
    }
  }
}

function buildSpider(A,T,g,s){
  const {mat,egg,rock,box,rod,spike,path}=A,u=g.userData,{torso,head}=u;
  // Strip the generic replacement, retaining the original eyes and all six limb joints.
  stripMeshes(g,new Set(u.eyes));
  const shell=mat(0xb9bcb1),edge=mat(0x8c9288),joint=mat(0x343b37),claw=mat(0x292e29),pink=mat(0xd77b9b);
  egg(torso,joint,0,.07,-.17,.66,.35,1.03);
  for(let i=0;i<5;i++){
    const z=.32-i*.205,w=.48+Math.sin(i/4*Math.PI)*.24;
    rock(torso,shell,0,.16,z,w,.27,.29);
    spike(torso,shell,[0,.23,z],[0,.40+(i%2)*.05,z-.09],.066);
    for(const side of [-1,1])egg(torso,edge,side*w*.35,.235,z,.071,.063,.068);
  }
  egg(head,shell,0,0,.01,.33,.24,.31);box(head,joint,0,.12,.07,.32,.061,.18);
  box(head,joint,0,-.08,.139,.20,.074,.039);
  for(const side of [-1,1]){
    egg(head,pink,side*.041,-.014,.174,.034,.027,.014);
    spike(head,shell,[side*.09,-.073,.16],[side*.075,-.19,.20],.031);
  }
  for(const e of u.eyes){e.position.set(Math.sign(e.position.x)*.103*s,.04*s,.145*s);e.scale.set(.8,.7,.7);}
  for(const limb of u.crawlLimbs||[]){
    const L1=limb.knee.position.y/s;
    // Existing lower joints encode the exact ground reach; recover it from the rest axis.
    const dir=new T.Vector3(0,1,0).applyQuaternion(limb.kneeQ).applyQuaternion(limb.baseQ);
    const upperY=new T.Vector3(0,L1,0).applyQuaternion(limb.baseQ).y;
    const L2=(.52+upperY-.05)/-dir.y;
    egg(limb.root,joint,0,0,0,.21,.21,.21);
    rod(limb.root,shell,[0,.04,0],[0,L1-.03,0],.10,.065);
    rod(limb.root,edge,[0,.08,.072],[0,L1-.05,.045],.026,.012);
    egg(limb.root,joint,0,L1,0,.19,.19,.19);
    rod(limb.knee,shell,[0,.05,0],[0,L2-.08,0],.082,.035);
    path(limb.knee,claw,[[0,L2-.1,0],[0,L2,.022],[0,L2+.035,.13],[0,L2+.028,.20]],.039);
  }
  torso.userData.bodyMat=shell;u.bodyMats=[shell];
}

// Same pose/IK skeleton; two deliberately different surface designs.
export function applyGuardianConcept({THREE:T,g,rbox,kind='caveguard'}){
  const R=g.userData.rig,A=sculpt(T,1,rbox),{mat,egg,rock,box,rod,path,spike,rag}=A;
  const cave=kind!=='guardian',skin=mat(cave?0x44473b:0xc9cdbb),shade=mat(cave?0x292e23:0x7b8472),
    plate=mat(cave?0x85897e:0xd9ddcb),moss=mat(0x55683b),claw=mat(0x30372b),mouth=mat(0x211c19),teeth=mat(0xd9d6bb),eye=mat(cave?0xc7efff:0xedffd4,true);
  stripMeshes(g);
  egg(R.pelvis,skin,0,0,0,.64,.43,.53);
  egg(R.spine1,skin,0,.025,.06,.52,.36,.43);egg(R.spine2,skin,0,.04,.08,.61,.42,.49);
  egg(R.chest,skin,0,.01,.21,.96,.69,.81);egg(R.chest,shade,0,-.23,.25,.71,.32,.66);
  egg(R.chest,skin,0,.22,.26,1.35,.33,.49);egg(R.neck,skin,0,.02,.20,.37,.31,.51);
  for(const p of [R.pelvis,R.spine1,R.spine2,R.chest]){
    for(const side of [-1,1]){
      rock(p,plate,side*.19,.21,.13,.36,.20,.34,side*.25);
      path(p,cave?shade:plate,[[side*.04,-.13,.05],[side*.25,-.1,.15],[side*.30,.10,.22]],.028);
      for(let j=0;j<2;j++)rag(p,moss,side*(.15+j*.075),.21,-.01,.055,.23+j*.08,side*.12);
    }
    spike(p,plate,[0,.19,0],[0,cave?.83:.58,-.16],cave?.15:.085);
  }
  // Rock skull for the cave dweller; a long open sensory maw for the pale sentinel.
  rock(R.head,plate,0,.075,.09,.55,.34,.49);
  rock(R.head,plate,0,.0,cave?.32:.50,.45,.24,cave?.39:.72);
  box(R.head,cave?plate:shade,0,.20,.28,cave?.55:.70,.13,.34);
  box(R.head,shade,0,cave?.01:.1,cave?.515:.69,.16,.085,.12);
  box(R.head,mouth,0,-.10,cave?.31:.49,.36,.048,cave?.38:.69);
  egg(R.jaw,skin,0,-.08,cave?.24:.40,.44,.14,cave?.44:.79);box(R.jaw,mouth,0,-.007,cave?.27:.45,.32,.038,cave?.35:.63);
  for(let i=0;i<9;i++){
    const x=(i-4)*.047,big=i===0||i===8;
    spike(R.head,teeth,[x,-.1,(cave?.51:.84)-Math.abs(x)*.18],[x,-.1-(big?.22:.10),(cave?.53:.86)-Math.abs(x)*.18],big?.035:.022);
    spike(R.jaw,teeth,[x,.01,(cave?.45:.80)-Math.abs(x)*.18],[x,big?.17:.09,(cave?.47:.82)-Math.abs(x)*.18],big?.029:.019);
  }
  R.eyes=[];for(const side of [-1,1]){
    box(R.head,shade,side*.19,.105,.42,.15,.093,.055);
    R.eyes.push(egg(R.head,eye,side*.19,.11,.455,.078,.046,.029));
    if(!cave)R.eyes.push(egg(R.head,eye,side*.095,.125,.465,.051,.035,.025));
    if(cave)path(R.head,shade,[[side*.08,.23,.32],[side*.04,.10,.40],[side*.12,.025,.50]],.013);
  }
  for(const side of [-1,1]){
    const S=side<0?'L':'R',sh=R['shoulder'+S],el=R['elbow'+S],wr=R['wrist'+S],hip=R['hip'+S],kn=R['knee'+S],ank=R['ankle'+S];
    egg(sh,skin,0,-.09,0,.41,.43,.42);egg(sh,skin,0,-.55,0,.32,1.07,.31);
    egg(el,shade,0,0,0,.30,.24,.30);egg(el,skin,0,-.56,0,cave?.29:.37,1.16,.29);
    rock(sh,plate,side*.06,-.1,.04,.46,.40,.43,side*.15);
    rock(el,plate,0,-.42,.11,cave?.37:.26,.70,.19,side*.07);
    for(let j=0;j<3;j++){
      path(sh,shade,[[(j-1)*.085,-.12,.14],[(j-1)*.09,-.47,.16],[(j-1)*.055,-1.02,.1]],.018);
      path(el,cave?shade:plate,[[(j-1)*.09,-.1,.12],[(j-1)*.10,-.62,.12],[(j-1)*.06,-1.12,.09]],.019);
      rag(el,moss,(j-1)*.08,-.42,-.1,.035,.30+j*.08,(j-1)*.17);
    }
    egg(wr,skin,0,-.04,.06,.35,.125,.31);
    for(const fin of R['fingers'+S]){
      const len=fin.userData.tip.position.z/.55;
      rod(fin,skin,[0,0,0],[0,0,len*.55],.035,.026);
      rod(fin.userData.tip,shade,[0,0,0],[0,0,len*.35],.026,.017);
      path(fin.userData.tip,claw,[[0,0,len*.30],[0,-.02,len*.48],[0,-.07,len*.68]],.027);
    }
    const th=R['thumb'+S];rod(th,skin,[0,0,0],[0,0,.16],.035,.025);spike(th.userData.tip,claw,[0,0,0],[0,-.06,.14],.03);
    egg(hip,skin,0,-.32,.015,.34,.77,.36);egg(kn,skin,0,-.30,0,.23,.67,.26);
    rock(hip,plate,0,-.30,.12,.27,.52,.19);rock(kn,plate,0,-.27,.1,.27,.46,.18);
    box(ank,skin,0,-.06,.14,.26,.12,.44);
    for(let j=0;j<3;j++)spike(ank,claw,[(j-1)*.09,-.06,.34],[(j-1)*.10,-.09,.5],.031);
    if(!cave)for(let j=0;j<2;j++)spike(sh,plate,[side*.1,.04,-.07+j*.17],[side*.31,.30,-.15+j*.22],.067);
  }
  R.eyeMat=eye;g.userData.mats=A.mats;g.userData.concept={version:1,type:kind};
  batchSurfaces(T,g,new Set([eye]));
}

// Guardians don't pass through the zombie compactor. Merge opaque surfaces per bone,
// preserving vertex colour and every articulated finger, jaw and eye.
function batchSurfaces(T,g,keep){
  const groups=[];g.traverse(o=>{if(o.isGroup)groups.push(o);});const mats=[];
  for(const p of groups){
    const meshes=p.children.filter(o=>o.isMesh&&!keep.has(o.material));if(!meshes.length)continue;
    const pos=[],norm=[],col=[];
    for(const o of meshes){o.updateMatrix();const src=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();src.applyMatrix4(o.matrix);
      const a=src.getAttribute('position'),n=src.getAttribute('normal'),c=o.material.color;
      for(let i=0;i<a.count;i++){pos.push(a.getX(i),a.getY(i),a.getZ(i));norm.push(n.getX(i),n.getY(i),n.getZ(i));col.push(c.r,c.g,c.b);}
      src.dispose();o.removeFromParent();
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));
    const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:meshes.reduce((a,m)=>a+(m.material.metalness||0),0)/meshes.length});mats.push(material);
    const m=new T.Mesh(geo,material);m.castShadow=true;m.name='concept-surface';m.userData.compacted=true;p.add(m);
    if(p.userData.thigh)p.userData.thigh=m;if(p.userData.upper)p.userData.upper=m;if(p.userData.bodyMat)p.userData.bodyMat=material;
  }
  g.userData.mats=[...mats,...keep];
}
