// GP-161: cosmetic meshes from review/zombie-types/GPT-Concepts. Joint transforms,
// hit logic and animation remain owned by the original rigs. No random/world state.
import {detailUV,detailMaterial} from './zombie-detail.js';
import {sculptGuardian} from './zombie-guardian-detail.js';
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
  const mat = (color, glow = false, metalness = 0, surface = 'skin') => {
    const m = new T.MeshStandardMaterial({color, roughness: glow ? .48 : .86, metalness,
      ...(glow ? {emissive:color, emissiveIntensity:1.5} : {})}); m.userData.surface=surface;mats.push(m); return m;
  };
  const put = (p, geo, m, x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
    const o=new T.Mesh(geo,m);o.position.set(x*s,y*s,z*s);o.rotation.set(rx,ry,rz);
    o.castShadow=true;o.name='concept-surface';p.add(o);return o;
  };
  const egg = (p,m,x,y,z,w,h,d,rz=0) => {
    const large=Math.min(w,h,d)>.12;
    const geo=new T.SphereGeometry(1,large?12:8,large?8:5);
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
  // Connected tapered masses replace stacked oval limbs. Rings stay in bone-local space.
  const loft=(p,m,rings,n=12)=>{
    if(rings[0][0]>rings[rings.length-1][0])rings=[...rings].reverse();
    const pos=[],uv=[],idx=[];
    for(let j=0;j<rings.length;j++)for(let i=0;i<=n;i++){
      const [y,rx,rz,cz=0,cx=0]=rings[j],a=i/n*Math.PI*2;
      pos.push((cx+Math.sin(a)*rx)*s,y*s,(cz+Math.cos(a)*rz)*s);uv.push(i/n,j/(rings.length-1));
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,a+1,b,b,a+1,b+1);}
    // All callers order rings bottom to top; cap both ends without leaving open sockets.
    for(const end of [0,rings.length-1]){const [y,, ,cz=0,cx=0]=rings[end],c=pos.length/3;pos.push(cx*s,y*s,cz*s);uv.push(.5,end?1:0);
      for(let i=0;i<n;i++){const a=end*(n+1)+i;if(end)idx.push(c,a,a+1);else idx.push(c,a+1,a);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return put(p,geo,m);
  };
  const ribbon=(p,m,pts,w=.025)=>{
    const pos=[],uv=[],idx=[];
    for(let i=0;i<pts.length;i++){const [x,y,z]=pts[i],rw=w*(1-i/(pts.length+1));pos.push((x-rw)*s,y*s,z*s,(x+rw)*s,y*s,(z+.005)*s);uv.push(0,i/(pts.length-1),1,i/(pts.length-1));if(i){const a=(i-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3,a+1,a+2,a,a+3,a+2,a+1);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);const flat=geo.toNonIndexed();flat.computeVertexNormals();return put(p,flat,m);
  };
  const rag = (p,m,x,y,z,w,h,rz=0) => {
    // Explicit faces: the bundled extruder can return side walls without either cap.
    const pts=[[-w/2,0],[w/2,0],[w*.4,-h*.78],[w*.12,-h*.64],[-w*.04,-h],[-w*.3,-h*.8],[-w/2,-h*.87]],v=[];
    const tri=(a,b,c)=>{for(const p of [a,b,c])v.push(p[0]*s,p[1]*s,p[2]*s);};
    for(let i=1;i<pts.length-1;i++){tri([...pts[0],.008],[...pts[i+1],.008],[...pts[i],.008]);tri([...pts[0],0],[...pts[i],0],[...pts[i+1],0]);}
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];tri([...a,0],[...b,.008],[...b,0]);tri([...a,0],[...a,.008],[...b,.008]);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();
    return put(p,geo,m,x,y,z,0,0,rz);
  };
  return {mat,mats,put,egg,rock,box,rod,path,spike,rag,loft,ribbon};
}

function stripMeshes(root, keep = new Set()) {
  const dead=[];root.traverse(o=>{if(o.isMesh&&!keep.has(o))dead.push(o);});
  for(const o of dead)o.removeFromParent();
}

export function applyZombieConcept({THREE:T,g,typeKey:k,scale:s,rbox}) {
  if(!CONCEPT_TYPES.includes(k))return false;
  const cacheKey=k+':'+s;if(restore(T,g,cacheKey,k))return true;
  const u=g.userData, {hips,torso,head,armLG,armRG,legLG,legRG}=u;
  const A=sculpt(T,s,rbox),{mat,egg,rock,box,rod,path,spike,rag,loft,ribbon}=A;
  stripMeshes(g,new Set(u.eyes));
  const heavy=['brute','colossus','demon'].includes(k), acid=['spitter','bomber'].includes(k);
  const skin=mat(({shambler:0xb4ad96,feral:0xa4a789,brute:0x985548,military:0xa5a08b,
    spitter:0xb0ab77,bomber:0x9fa54e,screamer:0xc5b6a4,drowned:0x729194,leaper:0xb2b0b2,
    spider:0xbabdb1,colossus:0x855245,demon:0x8b3e32,guardian:0xc3c6b3,caveguard:0x55584f})[k]);
  const shadow=mat(skin.color.clone().multiplyScalar(.49)), pale=mat(skin.color.clone().lerp(new T.Color(0xe6dfc8),.28));
  const wound=mat(0x674137,false,0,'wet'),mouth=mat(0x201b1b),teeth=mat(0xc8bea0,false,0,'bone'),hair=mat(0x27251f,false,0,'root'),cloth=mat(0x49473f,false,0,'cloth');
  const shirt=mat(0xc6bca5,false,0,'cloth'),leather=mat(0x594834,false,0,'leather'),steel=mat(0x494a43,false,.35,'metal'),rust=mat(0x996a43,false,.2,'metal');
  const moss=mat(k==='drowned'?0x384e35:0x526032,false,0,'root'),glowColor=({screamer:0xf373ce,spider:0xef7ab7,drowned:0xb7edee,demon:0xff991c,colossus:0xffae3b,brute:0xff4228,guardian:0xeaffd2,caveguard:0xbfe9ff})[k]||0xaffe4f;
  for(const e of u.eyes){e.material.color.set(glowColor);e.material.emissive.set(glowColor);e.material.emissiveIntensity=1.8;e.scale.set(.68,.45,.5);}
  u.pulseMats=[];
  const wide=heavy?.68:acid?.65:k==='screamer'?.35:k==='feral'||k==='leaper'?.4:.48;
  const deep=heavy?.4:acid?.48:.3;
  torso.userData.bodyMat=skin;u.bodyMats=[skin];
  egg(hips,cloth,0,.1,0,wide*.82,.28,deep*.87);
  loft(torso,skin,[[-.08,wide*.29,deep*.32],[.03,wide*.36,deep*.40],[.17,wide*.43,deep*.47],[.31,wide*.5,deep*.5],[.42,wide*.44,deep*.42],[.48,wide*.22,deep*.28],[.51,.064,.065]],12);
  // Trapezius and collarbone flow into the shoulders instead of exposing ball joints.
  for(const side of [-1,1]){
    egg(torso,skin,side*wide*.25,.425,-.015,wide*.51,.18,deep*.8,side*.27);
    path(torso,pale,[[side*.025,.455,.078],[side*.11,.435,.12],[side*wide*.39,.40,.08]],.019);
    egg(torso,skin,side*wide*.19,.27,-deep*.43,wide*.33,.30,.07,side*.3);
  }
  for(const side of [-1,1]){
    egg(torso,pale,side*wide*.23,.36,.035,wide*.47,.21,deep*.9,side*.1);
    const arm=side<0?armLG:armRG,el=arm.userData.elbowG,leg=side<0?legLG:legRG,shin=leg.userData.shinG;
    const muscle=heavy?1.6:k==='feral'||k==='leaper'?1.08:.92;
    arm.userData.upper=loft(arm,skin,[[-.355,.053*muscle,.06*muscle],[-.29,.06*muscle,.063*muscle],[-.20,.085*muscle,.095*muscle,.014],[-.10,.102*muscle,.104*muscle,.008],[0,.11*muscle,.103*muscle],[.08,.063*muscle,.075*muscle]],10);
    egg(el,skin,0,0,-.015,.14*muscle,.13,.15*muscle);
    loft(el,skin,[[-.34,.048*muscle,.044*muscle,.012],[-.28,.052*muscle,.054*muscle],[-.17,.077*muscle,.070*muscle,-.01],[-.07,.082*muscle,.075*muscle], [.025,.055*muscle,.061*muscle]],10);
    rod(el,pale,[-.018,-.03,.063],[.018,-.29,.042],.021,.014);
    egg(el,skin,0,-.354,.02,.15*muscle,.16,.10*muscle);
    for(let f=0;f<4;f++){
      const x=(f-1.5)*.031*muscle,len=(f===0||f===3)?.08:.11;
      path(el,skin,[[x,-.37,.025],[x,-.4-len*.45,.047],[x,-.4-len,.015]],.021*muscle);
      if(['feral','leaper','demon','screamer','guardian','caveguard'].includes(k))
        path(el,hair,[[x,-.4-len,.015],[x,-.47-len,.052],[x,-.50-len,.10],[x*.8,-.48-len,.13]],.018);
      else box(el,teeth,x,-.4-len,.030,.021,.032,.008);
      egg(el,pale,x,-.37,.056,.035,.037,.018);
    }
    path(el,skin,[[side*.065,-.33,.025],[side*.096,-.39,.065],[side*.066,-.43,.072]],.026);
    const legcloth=['military','shambler','feral','screamer','drowned'].includes(k);
    egg(leg,legcloth?cloth:skin,0,-.045,0,.175*(heavy?1.3:1),.21,.20);
    const lm=heavy?1.35:1;
    leg.userData.thigh=loft(leg,legcloth?cloth:skin,[[-.38,.067*lm,.067*lm,.01],[-.29,.080*lm,.10*lm],[-.13,.104*lm,.119*lm,-.01],[.02,.098*lm,.09*lm]],10);
    egg(shin,pale,0,-.015,.03,.15,.13,.16);
    loft(shin,skin,[[-.34,.048*lm,.051,.01],[-.23,.054*lm,.066,-.015],[-.12,.083*lm,.085,-.02],[-.045,.067*lm,.069],[.018,.063*lm,.07]],10);
    rod(shin,shadow,[.02,-.06,.066],[.008,-.31,.052],.015,.01);
    const booted=!['feral','leaper','demon','guardian','caveguard'].includes(k);
    egg(shin,booted?leather:skin,0,-.355,.043,.185*(heavy?1.35:1),.114,.278);
    if(booted){
      box(shin,hair,0,-.403,.04,.176*(heavy?1.35:1),.027,.263);
      loft(shin,leather,[[-.38,.083,.10,.045],[-.32,.077,.089,.005],[-.235,.078,.080],[ -.20,.066,.069]],9);
      egg(shin,leather,0,-.363,.116,.166*(heavy?1.35:1),.088,.136);
      for(let j=0;j<3;j++){path(shin,shadow,[[-.052,-.25-j*.036,.073],[.045,-.269-j*.036,.088]],.004);path(shin,pale,[[.047,-.25-j*.036,.073],[-.045,-.269-j*.036,.088]],.003);}
      for(const sign of [-1,1])path(shin,pale,[[sign*.065,-.374,-.055],[sign*.077,-.384,.065],[sign*.061,-.379,.160]],.003);
    }
    else for(let f=0;f<3;f++)spike(shin,hair,[(f-1)*.055,-.37,.15],[(f-1)*.065,-.395,.245],.021);
    if(legcloth)for(let j=0;j<3;j++)rag(leg,cloth,(j-1)*.052,-.23,.104,.064,.1+(j%2)*.05,(j-1)*.15);
    // Torn muscle and mottling: surface chips, not floating decals.
    egg(arm,shadow,side*.042,-.16,.069*muscle,.05,.14,.018,-side*.35);
    ribbon(el,wound,[[-side*.020,-.105,.074*muscle],[-side*.046,-.143,.075*muscle],[-side*.018,-.21,.066*muscle]],.017);
    path(el,pale,[[-side*.022,-.11,.078*muscle],[-side*.040,-.15,.079*muscle],[-side*.024,-.201,.071*muscle]],.004);
  }
  const hw=heavy?.39:.32;
  const snarl=k==='feral'||k==='leaper'||heavy;
  loft(head,skin,[[-.145,hw*.27,.072,-.025],[-.095,hw*.35,.098,-.03],[-.01,hw*.48,.133,-.02],[.075,hw*.50,.151,-.02],[.155,hw*.43,.130,-.035],[.205,hw*.22,.081,-.035]],12);
  for(const side of [-1,1]){
    egg(head,shadow,side*.088,.041,.139,.122,.103,.042,-side*.17);
    egg(head,pale,side*.089,.087,.140,.120,.030,.057,side*(snarl?.27:.14));
    egg(head,pale,side*.117,-.035,.116,.065,.073,.075,-side*.38);
    egg(head,shadow,side*.115,-.085,.104,.056,.070,.020,side*.3);
    path(head,skin,[[side*.122,-.065,.085],[side*.106,-.14,.106],[side*.078,-.172,.09]],.025);
    egg(head,skin,side*hw*.5,-.007,-.019,.051,.097,.056,side*.18);
    egg(head,shadow,side*(hw*.5+.013),-.005,.003,.029,.053,.016,side*.2);
    // Creased eyelids, lips and torn cheek edges surround the glow instead of flat blocks.
    path(head,skin,[[side*.033,.024,.15],[side*.082,-.005,.157],[side*.137,.018,.14]],.009);
    path(head,wound,[[side*.143,.065,.107],[side*.149,-.012,.105],[side*.113,-.08,.132]],.006);
  }
  egg(head,pale,0,.011,.153,.041,.108,.053);rock(head,skin,0,-.03,.177,.063,.040,.046);
  for(const side of [-1,1])egg(head,mouth,side*.019,-.042,.193,.018,.012,.012);
  const scream=k==='screamer',jawH=scream?.26:.105;
  egg(head,mouth,0,-.11-(scream?.07:0),.152,.19,jawH,.070);
  egg(head,skin,.004,scream?-.32:-.171,.085,.202,.062,.14);
  for(const side of [-1,1])path(head,skin,[[side*.103,-.065,.149],[side*(scream?.12:.1),scream?-.20:-.13,.158],[side*.065,scream?-.31:-.166,.155]],scream?.018:.012);
  path(head,wound,[[-.084,-.066,.172],[0,-.066,.194],[.087,-.073,.172]],.014);
  path(head,wound,[[-.079,scream?-.292:-.150,.17],[0,scream?-.307:-.161,.185],[.084,scream?-.29:-.146,.17]],.012);
  for(let i=0;i<8;i++){
    const x=(i-3.5)*.023,z=.193-Math.abs(x)*.15;
    if(i!==2||heavy)box(head,teeth,x,-.080-(i%3)*.004,z,.018,.027+(i%2)*.01,.014,(i-3)*.035);
    if(i!==6)spike(head,teeth,[x,scream?-.292:-.157,z-.004],[x,scream?-.257:-.132,z+.002],.009);
  }
  if(scream){const tongue=mat(0xae6671,false,0,'wet'),tip=mat(0xd89299,false,0,'wet');
    // Curl forward beneath the jaw without pulling the head's measured centre out
    // of its existing headshot slice (which includes every head-attached surface).
    path(head,tongue,[[0,-.21,.191],[.012,-.30,.235],[.037,-.39,.30],[.025,-.435,.38],[-.015,-.40,.445]],.036);
    ribbon(head,tip,[[0,-.24,.22],[.017,-.32,.273],[.035,-.39,.330],[.023,-.43,.40],[-.015,-.40,.451]],.013);
    for(const side of [-1,1])path(head,pale,[[side*.135,-.07,.085],[side*.11,-.24,.089],[side*.06,-.33,.06]],.020);
  }
  if(['shambler','feral','spitter','screamer','drowned'].includes(k)){
    egg(head,hair,-.032,.183,-.045,.24,.040,.23);
    for(let i=0;i<(scream?13:9);i++){
      const x=(i%4-1.5)*.060,z=-.105+Math.floor(i/4)*.071;
      hairLock(A,T,head,hair,s,[[x,.195,z],[x-.039,.217+(i%3)*.009,z+.04],[x-.062,.13-(i%3)*.015,z+.090]],.029+(i%3)*.005);
      if(scream&&i%3===0)hairLock(A,T,head,hair,s,[[x,.17,-.07],[x*1.4,.015,-.14],[x*1.2,-.17,-.1]],.025);
    }
  }
  // Dirt patches follow the skin's contours and repeat deterministically per type.
  for(let i=0;i<5;i++)egg(head,i%2?shadow:pale,(i%3-1)*.077,-.03+Math.floor(i/3)*.15,-.148,.065,.067,.016,i*.8);

  if(['shambler','feral','screamer'].includes(k)){
    buildTank(A,T,torso,s,wide,shirt,k);
    for(const side of [-1,1])path(torso,shirt,[[side*.035,.285,.164],[side*wide*.30,.34,.158],[side*wide*.39,.45,.095]],.013);
    rag(torso,wound,-wide*.39,.438,.073,.065,.14,-.25);
    if(k==='feral')for(const side of [-1,1])box(torso,wound,side*.142,.37,.135,.035,.23,.022,side*.12);
    if(scream)for(let i=0;i<4;i++)for(const side of [-1,1])path(torso,pale,[[side*.018,.35-i*.057,.161],[side*.10,.33-i*.057,.151],[side*(.14-i*.008),.295-i*.057,.105]],.012);
  }
  if(k==='military'){
    const olive=mat(0x626448,false,0,'cloth'),camLight=mat(0x8a805a,false,0,'cloth'),camDark=mat(0x3c4633,false,0,'cloth');
    loft(head,olive,[[.145,.171,.146,-.02],[.18,.18,.15,-.02],[.245,.17,.141,-.03],[.265,.15,.126,-.03]],12);
    box(head,camDark,0,.148,-.017,.35,.02,.28);box(head,olive,0,.154,.178,.33,.024,.19,-.06);
    box(head,camDark,0,.223,.127,.073,.040,.01);box(head,camLight,0,.226,.134,.053,.012,.008);
    for(let i=0;i<6;i++){const x=(i%3-1)*.099;rock(head,i%2?camDark:camLight,x,.202+(i%2)*.031,i<3?.136:-.157,.075,.04,.012,i*.6);}
    egg(torso,olive,0,.25,0,.51,.51,.345);
    for(const side of [-1,1]){
      const arm=side<0?armLG:armRG,leg=side<0?legLG:legRG,shin=leg.userData.shinG;
      egg(arm,olive,0,-.025,.006,.245,.32,.244);egg(leg,olive,0,-.19,0,.217,.41,.246);
      egg(shin,olive,0,-.10,0,.16,.25,.18);box(shin,steel,0,-.025,.092,.15,.14,.065);
      for(let j=0;j<4;j++){rock(arm,j%2?camDark:camLight,side*.05,-.02-j*.047,.089,.09,.055,.023,j*.7);rock(leg,j%2?camLight:camDark,(j%2-.5)*.075,-.055-j*.067,.105,.11,.067,.025,j*.8);}
      for(let j=0;j<4;j++){rock(arm,j%2?camLight:camDark,(j%2-.5)*.09,-.02-j*.047,-.087,.09,.053,.02,j*.7);rock(leg,j%2?camDark:camLight,(j%2-.5)*.10,-.06-j*.067,-.099,.115,.055,.021,j*.5);}
      for(let j=0;j<3;j++)rag(arm,olive,(j-1)*.057,-.135,.092,.059,.07+(j%2)*.025,side*.2);
      box(torso,leather,side*.185,.29,.186,.047,.41,.035,side*.04);
      for(let j=0;j<2;j++){box(torso,olive,side*(.048+j*.1),.14,.23,.084,.15,.08);box(torso,camLight,side*(.048+j*.1),.19,.276,.075,.021,.012);}
      box(torso,camDark,side*.206,.08,.139,.081,.16,.075,side*.13);
      box(torso,steel,side*.185,.34,.213,.063,.048,.02);
      box(leg,olive,side*.105,-.135,.005,.06,.14,.14);
      const el=arm.userData.elbowG;egg(el,leather,0,-.365,.035,.14,.135,.086);box(el,camDark,0,-.31,.042,.149,.028,.085);
      for(let j=0;j<3;j++)path(shin,camLight,[[-.052,-.24-j*.037,.09],[.050,-.25-j*.037,.093]],.005);
    }
    box(torso,olive,0,.3,.177,.36,.21,.06);box(torso,olive,0,.25,-.245,.36,.4,.14);
    box(torso,camDark,.14,.44,-.24,.1,.12,.075);rod(torso,hair,[.14,.48,-.24],[.14,.82,-.25],.01,.006);
    for(let i=0;i<5;i++)box(torso,camLight,0,.235+i*.027,.216,.30,.009,.009);
    for(let i=0;i<8;i++){const x=(i%3-1)*.12,y=.10+Math.floor(i/3)*.13;rock(torso,i%2?camDark:camLight,x,y,-.32,.13,.073,.012,i*.5);}
    box(torso,camLight,-.076,.357,.221,.10,.046,.013);box(torso,wound,-.059,.349,.230,.041,.014,.006);
    box(torso,hair,.123,.382,.220,.067,.104,.030);for(let j=0;j<3;j++)box(torso,steel,.123,.406-j*.019,.240,.04,.005,.008);
    path(torso,hair,[[.123,.43,.215],[.21,.455,.14],[.22,.37,.0],[.15,.46,-.21]],.009);
  }
  if(acid){
    const acidMat=mat(k==='bomber'?0xb5b757:0xb8b18b,false,0,'wet'),sac=mat(0xc4c573,false,0,'wet'),ooze=mat(0xb6cb38,true);
    if(k==='bomber')egg(torso,acidMat,0,.095,.12,.83,.72,.67);
    else loft(torso,acidMat,[[-.20,.11,.11,.13],[-.13,.245,.21,.14],[0,.325,.262,.10],[.15,.312,.246,.08],[.32,.23,.185,.055],[.43,.15,.12,.015]],16);
    for(let i=0;i<12;i++){
      const a=i*2.399,r=.12+(i%3)*.055,x=Math.cos(a)*r,y=.12+Math.sin(a)*r;
      egg(torso,i%3?shadow:sac,x,y,.34-Math.abs(x)*.15,.036+(i%3)*.014,.04+(i%2)*.02,.023);
      if(k==='spitter'&&i%3===0){egg(torso,wound,x,y,.357-Math.abs(x)*.15,.047,.043,.012);egg(torso,mouth,x,y,.365-Math.abs(x)*.15,.023,.025,.008);}
    }
    if(k==='spitter'){
      for(const side of [-1,1]){box(torso,cloth,side*.245,.30,.17,.10,.36,.06,-side*.12);rag(torso,cloth,side*.25,.15,.19,.11,.18,-side*.1);}
      box(torso,cloth,0,.29,-.205,.50,.37,.045);for(let j=0;j<5;j++)rag(torso,cloth,(j-2)*.075,.14,-.23,.09,.15+(j%3)*.024,(j-2)*.05);
      for(const side of [-1,1]){path(torso,wound,[[side*.06,.43,.13],[side*.16,.39,.19],[side*.24,.27,.18]],.025);rag(torso,cloth,side*.24,.42,.196,.072,.18,-side*.25);}
      for(let i=0;i<4;i++)path(head,ooze,[[(i-1.5)*.037,-.12,.185],[(i-1.5)*.04,-.24-(i%2)*.07,.20],[(i-1.5)*.03,-.29-(i%2)*.07,.17]],.009);
      path(torso,ooze,[[.04,.26,.307],[.02,.13,.342],[.05,-.02,.36],[.045,-.17,.315],[.015,-.24,.20]],.009);
    }else{
      // The existing fuse animation drives a belly material and a separate vein material.
      acidMat.emissive.setHex(0x758c21);acidMat.emissiveIntensity=.3;u.pulseMats=[acidMat,ooze];
      for(let i=0;i<8;i++){
        const side=i%2?1:-1,sz=.15+(i%3)*.065;egg(torso,shadow,side*(.13+(i%3)*.09),.35+Math.floor(i/2)*.055,-.20,sz+.027,sz+.04,sz+.03);egg(torso,sac,side*(.13+(i%3)*.09),.37+Math.floor(i/2)*.055,-.22,sz,sz*1.08,sz);egg(torso,acidMat,side*(.13+(i%3)*.09),.42+Math.floor(i/2)*.055,-.26,sz*.58,sz*.45,sz*.58);
      }
      for(const side of [-1,1]){
        const fissure=[[side*.08,.39,.31],[side*.13,.27,.40],[side*.08,.15,.454],[side*.2,.03,.414],[side*.16,-.12,.345]];path(torso,wound,fissure,.020);path(torso,ooze,fissure.map(([x,y,z])=>[x,y,z+.009]),.008);
        path(torso,ooze,[[side*.13,.27,.38],[side*.27,.21,.333],[side*.31,.11,.29]],.008);
        box(torso,leather,side*.24,.35,.18,.05,.26,.035,side*.35);
      }
      for(let j=0;j<7;j++)rag(hips,leather,(j-3)*.067,.11,.245,.075,.18+(j%2)*.05);
    }
  }
  if(k==='drowned'){
    egg(torso,cloth,0,.24,0,.46,.46,.32);
    for(const side of [-1,1])box(torso,leather,side*.14,.25,.167,.032,.42,.025,side*.09);
    for(let i=0;i<4;i++){box(torso,rust,0,.37-i*.072,.196,.278,.052,.069,(i%2?1:-1)*.03);for(const side of [-1,1])egg(torso,steel,side*.107,.37-i*.072,.233,.022,.022,.009);}
    for(let i=0;i<9;i++){
      const side=i%2?1:-1,p=i<4?head:torso,x=side*(i<4?.13:.21),y=i<4?.19:.47,z=i<4?-.06:-.15;
      path(p,moss,[[x,y,z],[x+side*.025,y-.16,z+.01],[x-side*.028,y-.34-(i%3)*.08,z+.05]],.017);
    }
    for(let i=0;i<8;i++){
      const p=i<4?armLG:head,x=i<4?-.07:(i-5)*.045,y=i<4?-.05-(i%4)*.047:.09,z=i<4?.08:-.14;
      const b=A.put(p,new T.CylinderGeometry(.018*s,.027*s,.023*s,6),pale,x,y,z,Math.PI/2);
      egg(p,hair,x,y,z+.015,.017,.017,.009);
    }
    for(let i=0;i<7;i++){
      const x=(i-3)*.061,y=.47-(i%3)*.065;path(torso,moss,[[x,y,-.13],[x+.032,y-.15,-.20],[x-.024,y-.34,-.185],[x+.013,y-.51,-.15]],.012);
      ribbon(torso,moss,[[x,y,-.15],[x+.05,y-.19,-.22],[x-.017,y-.38,-.195],[x+.028,y-.52,-.158]],.023);
    }
    for(let i=0;i<5;i++)rag(torso,cloth,(i-2)*.064,.055,-.153,.056,.12+(i%2)*.05,i*.1);
  }
  if(k==='leaper'){
    for(let i=0;i<7;i++)spike(torso,pale,[0,.02+i*.065,-.135],[0,.06+i*.065,-.25-(i%2)*.045],.038);
    for(const side of [-1,1]){
      egg(side<0?armLG:armRG,pale,0,-.14,.01,.19,.3,.19);
      for(let i=0;i<4;i++)rod(torso,pale,[side*.04,.33-i*.065,.14],[side*.17,.29-i*.065,.10],.015,.009);
    }
    for(let j=0;j<5;j++)rag(hips,wound,(j-2)*.06,.1,.135,.073,.20-(j%2)*.05);
    for(let i=0;i<6;i++){egg(torso,wound,0,.07+i*.062,-.147,.09,.073,.022);egg(torso,pale,0,.07+i*.062,-.17,.07,.044,.054);}
    for(const side of [-1,1])path(torso,shadow,[[side*.18,.4,-.07],[side*.10,.24,-.14],[side*.07,.03,-.11]],.014);
  }
  if(heavy){
    const fire=mat(k==='brute'?0xc3a253:0xff9127,k!=='brute');
    if(k==='demon')u.emberMat=fire;
    const armor=k==='demon'?hair:steel;
    box(torso,armor,0,.29,.226,wide*.83,.34,.10);
    box(torso,rust,0,.458,.280,wide*.86,.025,.022);box(torso,rust,0,.123,.280,wide*.86,.026,.022);
    for(const side of [-1,1]){
      box(torso,rust,side*wide*.405,.29,.28,.025,.30,.024);
      for(let i=0;i<3;i++)egg(torso,steel,side*wide*.40,.17+i*.11,.30,.023,.024,.014);
      egg(torso,skin,side*.19,.475,-.04,.29,.20,.24,side*.35);
      const arm=side<0?armLG:armRG;egg(arm,pale,side*.075,-.16,.025,.17,.27,.18,side*.25);
      for(let j=0;j<3;j++)path(arm,wound,[[side*.075,-.04-j*.04,.16],[side*.11,-.12-j*.045,.13],[side*.08,-.19-j*.04,.12]],.009);
    }
    for(const side of [-1,1]){
      const arm=side<0?armLG:armRG,el=arm.userData.elbowG,shin=(side<0?legLG:legRG).userData.shinG;
      box(torso,leather,side*.265,.27,.23,.058,.47,.04,side*.12);
      box(torso,rust,side*.264,.34,.263,.083,.062,.024);
      box(torso,hair,side*.264,.341,.28,.047,.029,.009);box(torso,rust,side*.263,.341,.289,.007,.041,.008);
      rock(arm,armor,side*.04,.055,0,.34,.16,.36,-side*.2);
      box(el,armor,0,-.2,.117,.24,.20,.065,side*.1);
      for(let j=0;j<3;j++){box(shin,j%2?rust:armor,0,-.035-j*.092,.112,.205-j*.017,.12,.07,side*.04);box(el,leather,0,-.10-j*.06,.13,.24,.025,.02);}
      for(let j=0;j<3;j++)for(const sign of [-1,1]){egg(el,steel,sign*.087,-.10-j*.06,.151,.017,.018,.011);egg(shin,rust,sign*.071,-.047-j*.092,.151,.018,.019,.011);}
      box(shin,armor,0,-.35,.065,.23,.1,.29);
      for(let j=0;j<3;j++)rag(hips,k==='brute'?wound:cloth,side*(.05+j*.065),.12,.20,.083,.24+(j%2)*.06,side*.1);
      if(k!=='brute')for(let j=0;j<3;j++)spike(arm,rust,[side*.06,.09,-.1+j*.09],[side*(.15+j*.015),.28+(j%2)*.1,-.16+j*.1],.047);
    }
    if(k==='brute'){
      const redPaint=mat(0x8e3027,false,.25,'metal');fire.userData.surface='metal';
      box(torso,redPaint,0,.255,.284,.51,.13,.015);box(torso,fire,0,.155,.284,.49,.049,.015);
      spike(armLG,steel,[-.08,.06,0],[-.29,.37,-.03],.12);
      for(let i=0;i<6;i++)egg(torso,shadow,(i%2?1:-1)*(.16+(i%3)*.04),.08+Math.floor(i/2)*.13,-.2,.13,.16,.07);
      box(torso,steel,0,.29,-.223,.52,.33,.09,-.06);
      for(const side of [-1,1]){path(torso,leather,[[side*.24,.48,.16],[side*.27,.51,-.04],[side*.25,.43,-.25],[side*.22,.11,-.267]],.039);box(torso,rust,side*.21,.35,-.281,.04,.045,.019);}
      for(let j=0;j<7;j++)rock(head,skin,(j%3-1)*.09,.10+Math.floor(j/3)*.04,-.06+(j%2)*.10,.077,.07,.07,j*.8);
      for(let i=0;i<5;i++)box(head,steel,(i-2)*.04,-.145,.159,.032,.062,.026,(i-2)*.08);
    }else{
      for(let i=0;i<3;i++)box(torso,fire,(i-1)*.115,.078,.234,.06,.11,.025);
      box(head,armor,0,.105,.165,.36,.1,.075);box(head,armor,0,.175,0,.39,.09,.31);
      if(k==='colossus'){
        const hazard=mat(0xc39648,false,.2,'metal');
        box(armLG,steel,-.10,.105,0,.52,.38,.32,-.18);box(armLG,hazard,-.10,.12,.19,.53,.39,.10,-.18);
        for(let j=0;j<3;j++)box(armLG,hair,-.265+j*.145,.14,.25,.048,.29,.011,-.45);
        for(const x of [-.23,-.02])path(armLG,rust,[[x,.29,.1],[x-.025,.45,.07],[x+.072,.47,.07],[x+.093,.30,.1]],.019);
        for(const x of [-.31,.10])for(const y of [-.035,.27])egg(armLG,steel,x,y,.255,.029,.030,.012);
        for(let j=0;j<3;j++)box(torso,j%2?rust:steel,.025,.18+j*.081,.29+j*.014,.42-(j%2)*.05,.10,.037,(j%2?1:-1)*.065);
        for(let j=0;j<4;j++)box(torso,steel,(j-1.5)*.13,.32,-.25,.11,.4,.09,(j-1.5)*.06);
        for(const side of [-1,1]){
          const leg=side<0?legLG:legRG;for(let j=0;j<2;j++)box(leg,rust,0,-.09-j*.11,.119,.20,.14,.07,side*.09);
          path(torso,hair,[[side*.22,.42,-.26],[side*.29,.29,-.29],[side*.21,.04,-.26]],.021);
        }
      }else{
        for(const side of [-1,1]){
          // Sweep out before curling up: the skull remains in its existing headshot band.
          const pts=[[side*.13,.13,-.03],[side*.30,.18,-.07],[side*.46,.29,-.12],[side*.43,.39,-.13],[side*.34,.43,-.11]];
          for(let j=0;j<4;j++)rod(head,j>=2?teeth:hair,pts[j],pts[j+1],.084-j*.018,j===3?0:.066-j*.018,7);
          for(let j=0;j<2;j++)egg(head,rust,side*(.17+j*.068),.145+j*.022,-.038-j*.02,.10-j*.02,.088-j*.016,.085-j*.01);
          for(let j=0;j<4;j++)spike(torso,rust,[side*.2,.12+j*.09,-.18],[side*.28,.28+j*.10,-.39],.065);
          const crack=[[side*.025,.12,.292],[side*.079,.225,.301],[side*.146,.305,.301],[side*.24,.42,.289]];
          path(torso,mouth,crack,.032);path(torso,fire,crack.map(([x,y,z])=>[x,y,z+.012]),.014);
          path(torso,fire,[[side*.09,.23,.315],[side*.205,.24,.308],[side*.267,.29,.30]],.009);
          path(torso,fire,[[side*.045,.155,-.23],[side*.115,.27,-.244],[side*.18,.43,-.20]],.009);
          rock(torso,rust,side*.185,.22,.265,.18,.19,.095,side*.2);
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
  // The pulsing belly remains emissive, but still needs its stretched wet skin.
  if(k==='bomber'){
    const belly=u.pulseMats[0];Object.assign(belly,detailMaterial(T));
    g.traverse(o=>{if(o.isMesh&&o.material===belly)o.geometry.setAttribute('uv',new T.Float32BufferAttribute(detailUV(T,o.geometry,'wet'),2));});
  }
  batchGlow(T,g);
  const keep=new Set([...u.eyes.map(e=>e.material),...A.mats.filter(m=>m.emissive.getHex()!==0)]);
  batchSurfaces(T,g,keep);u.bodyMats=g.userData.mats.filter(m=>!keep.has(m));
  // Track actual materials (old removed pulse materials must never flash detached meshes).
  u.concept={version:2,type:k,skin:skin.color.getHex(),eye:glowColor};
  remember(T,g,cacheKey);
  return true;
}

function hairLock(A,T,p,m,s,points,width){
  const verts=[],uv=[],idx=[];
  for(let i=0;i<points.length;i++){
    const [x,y,z]=points[i],w=width*(1-i/(points.length-1));
    verts.push((x-w)*s,y*s,z*s,x*s,(y+.012)*s,(z+.008)*s,(x+w)*s,y*s,z*s);
    uv.push(0,i/(points.length-1),.5,i/(points.length-1),1,i/(points.length-1));
    if(i){const a=(i-1)*3;for(let j=0;j<2;j++){idx.push(a+j,a+j+3,a+j+1,a+j+1,a+j+3,a+j+4);idx.push(a+j+1,a+j+3,a+j,a+j+4,a+j+3,a+j+1);}}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);const flat=geo.toNonIndexed();flat.computeVertexNormals();A.put(p,flat,m);
}

function buildTank(A,T,torso,s,wide,shirt,k){
  const pos=[],uv=[],n=24,rows=5;
  const vertex=(j,i)=>{
    const a=i/n*Math.PI*2,xn=Math.sin(a),zn=Math.cos(a),front=zn>0;
    const top=front?.28+.17*Math.pow(Math.abs(xn),.8):.36+.09*Math.abs(xn);
    const hem=.055+Math.sin(i*3.1)*.027+(i%4===0?.038:0),t=j/rows;
    const y=hem+(top-hem)*t,rx=wide*(.367+.133*Math.sin(t*Math.PI*.73));
    const fold=.005*Math.sin(i*2.9+j*.8),z=zn*(.168+.022*Math.sin(t*Math.PI))+fold;
    return [xn*rx*s,y*s,z*s];
  };
  const tri=(a,b,c,ta,tb,tc)=>{pos.push(...a,...b,...c);uv.push(...ta,...tb,...tc);};
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
    // Open tears reveal actual skin/ribs. Offset the damage instead of repeating a hem fringe.
    if((j===0&&(i%5===1||i===14))||(j===1&&(i===2||i===17))||(k==='screamer'&&j<3&&(i===0||i===23||i===11)))continue;
    const a=vertex(j,i),b=vertex(j,i+1),c=vertex(j+1,i),d=vertex(j+1,i+1);
    const ta=[i/n,j/rows],tb=[(i+1)/n,j/rows],tc=[i/n,(j+1)/rows],td=[(i+1)/n,(j+1)/rows];
    tri(a,b,c,ta,tb,tc);tri(b,d,c,tb,td,tc);tri(c,b,a,tc,tb,ta);tri(c,d,b,tc,td,tb);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();A.put(torso,geo,shirt);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    A.rag(torso,shirt,Math.sin(a)*wide*.33,.075,Math.cos(a)*.148,.042,.06+(i%3)*.027,Math.sin(a)*.25);
  }
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
      const positions=[],normals=[],uv=[];
      for(const m of meshes){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
        positions.push(...geo.getAttribute('position').array);normals.push(...geo.getAttribute('normal').array);
        const tex=geo.getAttribute('uv');if(tex)uv.push(...tex.array);else for(let i=0;i<geo.getAttribute('position').count;i++)uv.push(0,0);
        geo.dispose();m.removeFromParent();}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
      if(mat.map)geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      const m=new T.Mesh(geo,mat);m.name='concept-glow';m.castShadow=true;p.add(m);
    }
  }
}

function buildSpider(A,T,g,s){
  const {mat,egg,rock,box,rod,spike,path}=A,u=g.userData,{torso,head}=u;
  // Strip the generic replacement, retaining the original eyes and all six limb joints.
  stripMeshes(g,new Set(u.eyes));
  const shell=mat(0xc5c8b9,false,0,'bone'),edge=mat(0x929b8a,false,0,'bone'),joint=mat(0x41423a,false,0,'root'),claw=mat(0x292e29,false,0,'bone'),pink=mat(0xd77b9b,false,0,'wet');
  egg(torso,joint,0,.07,-.17,.66,.35,1.03);
  for(let i=0;i<5;i++){
    const z=.32-i*.205,w=.48+Math.sin(i/4*Math.PI)*.24;
    rock(torso,shell,0,.16,z,w,.27,.29);
    spike(torso,shell,[0,.23,z],[0,.40+(i%2)*.05,z-.09],.066);
    for(const side of [-1,1])egg(torso,edge,side*w*.35,.235,z,.071,.063,.068);
    path(torso,joint,[[0,.295,z+.095],[0,.31,z],[0,.29,z-.095]],.009);
    for(const side of [-1,1]){rock(torso,edge,side*w*.36,.12,z-.025,w*.26,.20,.235,-side*.35);spike(torso,shell,[side*w*.42,.15,z],[side*w*.55,.17,z-.13],.042);}
  }
  egg(head,shell,0,0,.01,.33,.24,.31);box(head,joint,0,.12,.07,.32,.061,.18);
  box(head,joint,0,-.08,.139,.20,.074,.039);
  for(const side of [-1,1]){
    egg(head,pink,side*.041,-.014,.174,.034,.027,.014);
    rock(head,edge,side*.137,-.025,.065,.14,.16,.17,side*.3);
    path(head,shell,[[side*.10,-.064,.155],[side*.15,-.14,.196],[side*.11,-.205,.24]],.037);
    path(head,claw,[[side*.11,-.205,.24],[side*.055,-.19,.29],[side*.037,-.12,.28]],.024);
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
    for(let i=0;i<3;i++){
      const a=.06+i*(L1-.1)/3,b=Math.min(L1-.035,a+(L1-.1)/3+.035);
      rod(limb.root,i%2?shell:edge,[0,a,0],[0,b,0],.114-i*.014,.095-i*.012,7);
      spike(limb.root,shell,[.065,a+.025,0],[.15,a+.07,-.07],.033);
    }
    rod(limb.knee,shell,[0,.05,0],[0,L2-.08,0],.082,.035);
    for(let i=0;i<2;i++){const a=.045+i*(L2-.12)/2;rod(limb.knee,i?edge:shell,[0,a,0],[0,a+(L2-.12)/2,0],.093-i*.027,.073-i*.026,7);}
    path(limb.knee,claw,[[0,L2-.1,0],[0,L2,.022],[0,L2+.035,.13],[0,L2+.028,.20]],.039);
  }
  torso.userData.bodyMat=shell;u.bodyMats=[shell];
}

// Same pose/IK skeleton; two deliberately different surface designs.
export function applyGuardianConcept({THREE:T,g,rbox,kind='caveguard'}){
  const A=sculpt(T,1,rbox);stripMeshes(g);
  const eye=sculptGuardian(A,T,g,kind);
  g.userData.mats=A.mats;g.userData.concept={version:2,type:kind};
  batchSurfaces(T,g,new Set([eye]));
}

// Guardians don't pass through the zombie compactor. Merge opaque surfaces per bone,
// preserving vertex colour and every articulated finger, jaw and eye.
function batchSurfaces(T,g,keep){
  const groups=[];g.traverse(o=>{if(o.isGroup)groups.push(o);});const mats=[];
  for(const p of groups){
    const meshes=p.children.filter(o=>o.isMesh&&!keep.has(o.material));if(!meshes.length)continue;
    const pos=[],norm=[],col=[],uv=[];
    for(const o of meshes){o.updateMatrix();const src=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();src.applyMatrix4(o.matrix);
      const mapped=detailUV(T,src,o.material.userData.surface||'skin');uv.push(...mapped);
      const a=src.getAttribute('position'),n=src.getAttribute('normal'),c=o.material.color;
      for(let i=0;i<a.count;i++){pos.push(a.getX(i),a.getY(i),a.getZ(i));norm.push(n.getX(i),n.getY(i),n.getZ(i));col.push(c.r,c.g,c.b);}
      src.dispose();o.removeFromParent();
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,...detailMaterial(T)});mats.push(material);
    const m=new T.Mesh(geo,material);m.castShadow=true;m.name='concept-surface';m.userData.compacted=true;p.add(m);
    if(p.userData.thigh)p.userData.thigh=m;if(p.userData.upper)p.userData.upper=m;if(p.userData.bodyMat)p.userData.bodyMat=material;
  }
  g.userData.mats=[...mats,...keep];
}
