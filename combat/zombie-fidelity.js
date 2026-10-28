// GP-19922. Cosmetic surface tools only: deterministic, bone-local, batched by the
// existing concept pipeline. No animation state, hit rules or gameplay randomness.
export function zombieSurfaceTools(T, s, put) {
  const mesh=(p,m,pos,idx)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos.map(v=>v*s),3));g.setIndex(idx);g.computeVertexNormals();return put(p,g,m);};
  const sweep=(p,m,pts,r=.025,end=r/pts.length)=>{
    if(pts.length<2)return null;
    const curve=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),steps=Math.max(1,(pts.length-1)*2-1),sides=r>.06?8:6;
    const pos=[],idx=[],N=new T.Vector3(),B=new T.Vector3();
    for(let j=0;j<=steps;j++){
      const t=j/steps,P=curve.getPoint(t),D=curve.getTangent(t),radius=Math.max(.0002,r+(end-r)*t);
      if(!j)N.set(0,Math.abs(D.y)<.9?1:0,Math.abs(D.y)<.9?0:1).cross(D).normalize();
      else N.addScaledVector(D,-N.dot(D)).normalize();
      B.crossVectors(D,N).normalize();
      for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,V=P.clone().addScaledVector(N,Math.cos(a)*radius).addScaledVector(B,Math.sin(a)*radius);pos.push(V.x,V.y,V.z);
        if(j<steps){const x=j*sides+i,y=j*sides+(i+1)%sides;idx.push(x,y,x+sides,y,y+sides,x+sides);}}
    }
    for(const end of [0,steps]){const P=curve.getPoint(end/steps),c=pos.length/3;pos.push(P.x,P.y,P.z);for(let i=0;i<sides;i++){const a=end*sides+i,b=end*sides+(i+1)%sides;idx.push(c,...(end?[a,b]:[b,a]));}}
    return mesh(p,m,pos,idx);
  };
  const profile=(p,m,source,n=12)=>{
    // Match the demon's smooth flesh contours; keep stone/metal ridges deliberate.
    if(m.userData.surface==='skin'&&source.some(R=>Math.min(R[1],R[2])>=.05))n=Math.max(n,source.some(R=>Math.min(R[1],R[2])>=.1)?16:12);
    const rings=source[0][0]>source.at(-1)[0]?[...source].reverse():source;
    const value=(j,t,k)=>{
      const a=rings[Math.max(0,j-1)][k]||0,b=rings[j][k]||0,c=rings[j+1][k]||0,d=rings[Math.min(rings.length-1,j+2)][k]||0;
      const v=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
      // Monotone radii prevent folds at an elbow or a tiny cap.
      return k===1||k===2?Math.max(Math.min(b,c),Math.min(Math.max(b,c),v)):v;
    };
    const smooth=[];
    const peak=rings.reduce((best,R,j)=>R[1]*R[2]>rings[best][1]*rings[best][2]?j:best,0),bend=Math.min(rings.length-2,peak);
    for(let j=0;j<rings.length-1;j++)for(const t of j===bend&&n<=12?[0,.5]:[0])smooth.push([rings[j][0]+(rings[j+1][0]-rings[j][0])*t,...[1,2,3,4].map(k=>value(j,t,k))]);
    smooth.push(rings.at(-1));
    const pos=[],idx=[];
    for(const [y,rx,rz,cz=0,cx=0]of smooth)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pos.push(cx+Math.sin(a)*rx,y,cz+Math.cos(a)*rz);}
    for(let j=0;j<smooth.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;idx.push(a,b,a+n,b,b+n,a+n);}
    for(const end of [0,smooth.length-1]){const R=smooth[end],c=pos.length/3;pos.push(R[4]||0,R[0],R[3]||0);for(let i=0;i<n;i++){const a=end*n+i,b=end*n+(i+1)%n;idx.push(c,...(end?[a,b]:[b,a]));}}
    return mesh(p,m,pos,idx);
  };
  const plate=(p,m,rows,thickness=.018)=>{
    const pos=[],idx=[],n=10,count=rows.length*(n+1);
    for(const back of [false,true])for(const[y,w,z,wrap=.04]of rows)for(let i=0;i<=n;i++){const x=i/n*2-1;pos.push(x*w,y,z-wrap*x*x-(back?thickness:0));}
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,a+1,b,b,a+1,b+1,a+count,b+count,a+1+count,b+count,b+1+count,a+1+count);}
    const rim=[];for(let i=0;i<=n;i++)rim.push(i);for(let j=1;j<rows.length;j++)rim.push(j*(n+1)+n);for(let i=n-1;i>=0;i--)rim.push((rows.length-1)*(n+1)+i);for(let j=rows.length-2;j>0;j--)rim.push(j*(n+1));
    for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length];idx.push(a,a+count,b,b,a+count,b+count);}
    return mesh(p,m,pos,idx);
  };
  return {sweep,profile,plate};
}

export function refineZombieFace(A,T,g,s,k,M) {
  if(['spider','demon','guardian','caveguard'].includes(k))return;
  const {head,eyes}=g.userData,{skin,shadow,pale,wound,mouth,teeth}=M,keep=new Set(eyes);
  for(const m of [...head.children])if(m.isMesh&&!keep.has(m))m.removeFromParent();
  if(k==='screamer'){refineScreamerFace(A,g,M,s);return;}
  const heavy=k==='brute'||k==='colossus',scream=k==='screamer',w=heavy?.18:k==='bomber'?.17:.153;
  const faceRings=[[heavy?-.145:-.165,.055,.055,.018],[-.12,w*.60,.086,.006],[-.055,w*.85,.105,-.012],[.025,w,.135,-.023],[.10,w*.98,.137,-.028],[.167,w*.82,.111,-.032],[.205,w*.40,.065,-.033]];
  A.loft(head,skin,faceRings,12);
  // Project facial attachments onto the smoothed head instead of the old flat
  // front plane. A little overlap prevents a side-view slit at the octagonal loft.
  const front=(x,y)=>{
    let lo=faceRings[0],hi=faceRings.at(-1);
    for(let i=1;i<faceRings.length;i++)if(y<=faceRings[i][0]){lo=faceRings[i-1];hi=faceRings[i];break;}
    const t=Math.max(0,Math.min(1,(y-lo[0])/(hi[0]-lo[0]))),rx=lo[1]+(hi[1]-lo[1])*t,rz=lo[2]+(hi[2]-lo[2])*t,cz=lo[3]+(hi[3]-lo[3])*t;
    return cz+rz*Math.sqrt(Math.max(0,1-(x/rx)**2));
  };
  const onSkin=(pts,lift=0)=>pts.map(([x,y])=>[x,y,front(x,y)+lift]);
  for(const side of [-1,1]){
    A.egg(head,shadow,side*.085,.038,front(.085,.038)+.009,.105,.075,.026,-side*.17);
    A.path(head,pale,onSkin([[side*.026,.071],[side*.079,.091],[side*.137,.067]],.006),.013);
    // Cheek ridge merges into the jaw, replacing separate ball-shaped cheeks.
    A.path(head,skin,onSkin([[side*.135,.012],[side*.119,-.041],[side*.090,-.113]],.012),.022);
    if(!heavy)A.egg(head,skin,side*.065,-.108,front(.065,-.108)+.017,.085,.105,.160,-side*.17);
    A.egg(head,skin,side*(w+.004),-.003,-.019,.034,.079,.042,-side*.13);
    A.egg(head,shadow,side*(w+.016),-.003,.001,.010,.044,.014);
    A.path(head,wound,onSkin([[side*.13,.024],[side*.125,-.04],[side*.091,-.098]],.004),.004);
  }
  A.egg(head,skin,0,.006,front(0,.006)+(heavy?.019:-.004),.040,.093,heavy?.047:.080);
  // A recessed maxilla joins the small heads' nose and upper teeth to the loft.
  if(!heavy)A.egg(head,skin,0,-.055,front(0,-.055)-.015,.140,.095,.125);
  // The old black nostril beads hover below the small heads' nose wedge.
  if(heavy)for(const side of [-1,1])A.egg(head,mouth,side*.012,-.033,front(.012,-.033)+.005,.013,.009,.011);
  const mouthY=scream?-.175:-.104,mouthH=scream?.235:.065;
  const mouthZ=front(0,mouthY)+.023,jawY=scream?-.304:-.144,jawZ=front(0,jawY)+.045;
  const mouthDepth=heavy?.055:.079,mouthCenter=heavy?mouthZ:mouthZ-.012;
  const jawDepth=heavy?.103:.148,jawCenter=heavy?jawZ:jawZ-.0225;
  const mouthEdge=x=>mouthCenter+mouthDepth*.5*Math.sqrt(Math.max(0,1-(x/.087)**2));
  const jawEdge=x=>jawCenter+jawDepth*.5*Math.sqrt(Math.max(0,1-(x/.084)**2));
  A.egg(head,mouth,0,mouthY,mouthCenter,.174,mouthH,mouthDepth);
  for(const side of [-1,1])A.path(head,skin,heavy?[[side*.09,-.062,front(.09,-.062)+.01],[side*.083,-.125,jawEdge(.083)+.01],[side*.052,-.147,jawEdge(.052)+.01]]:[[side*.082,-.062,front(.082,-.062)+.006],[side*.074,-.112,front(.074,-.112)+.040],[side*.052,-.145,jawEdge(.052)-.002]],heavy?.016:.021);
  A.egg(head,skin,0,jawY,jawCenter,scream?.172:.168,.040,jawDepth);
  A.path(head,wound,onSkin([[-.077,-.066],[0,-.065],[.077,-.067]],.006),.007);
  A.path(head,wound,[[-.07,scream?-.283:-.132,jawEdge(.07)+.004],[0,scream?-.298:-.141,jawEdge(0)+.004],[.07,scream?-.283:-.132,jawEdge(.07)+.004]],.006);
  for(let i=0;i<8;i++){
    const x=(i-3.5)*.019,z=mouthEdge(x)+.004,lowerZ=jawEdge(x)+.004,long=i===1||i===6;
    A.spike(head,teeth,[x,-.07,z],[x*.96,-.089-(long?.012:0),z+.004],.008);
    A.spike(head,teeth,[x,scream?-.286:-.134,lowerZ-.005],[x*.96,scream?-.265:-.118,lowerZ],.007);
  }
  if(scream){const tongue=A.mat(0xae6671,false,0,'wet'),tip=A.mat(0xd89299,false,0,'wet');
    A.path(head,tongue,[[0,-.21,.165],[.012,-.30,.22],[.037,-.39,.30],[.025,-.435,.38],[-.015,-.40,.445]],.033);
    A.ribbon(head,tip,[[0,-.24,.20],[.017,-.32,.263],[.035,-.39,.33],[.023,-.43,.40],[-.015,-.40,.451]],.010);
  }
  for(const eye of eyes){eye.position.z=(front(eye.position.x/s,eye.position.y/s)+.018)*s;eye.scale.set(.62,.38,.40);}
}

// GP-19971: drawn cheeks, inward brow and an oval mouth instead of a hanging
// rectangular jaw. These three lower-jaw swatches survive batching as rigid-part
// markers; prepareScreamerAppearance reads them before applying the dark palette.
function refineScreamerFace(A,g,{skin,shadow,pale,wound,mouth,teeth},s){
  const {head,torso,eyes}=g.userData;
  const jawSkin=A.mat(0xb4a592),jawLip=A.mat(0x664036,false,0,'wet'),jawTeeth=A.mat(0xc7bd9f,false,0,'bone');
  A.loft(head,skin,[[-.105,.065,.055,-.006],[-.055,.112,.085,-.014],[.025,.149,.128,-.023],[.10,.145,.132,-.028],[.165,.119,.105,-.032],[.202,.061,.060,-.033]],12);
  for(const side of [-1,1]){
    A.egg(head,shadow,side*.081,.034,.123,.104,.064,.027,-side*.20);
    A.path(head,pale,[[side*.022,.058,.146],[side*.068,.080,.149],[side*.130,.064,.119]],.014);
    A.path(head,skin,[[side*.030,.023,.148],[side*.080,.004,.151],[side*.128,.027,.129]],.009);
    A.path(head,pale,[[side*.133,.010,.106],[side*.109,-.036,.134],[side*.087,-.100,.141]],.022);
    A.path(head,shadow,[[side*.036,-.030,.151],[side*.067,-.056,.151],[side*.079,-.115,.147]],.006);
    A.egg(head,skin,side*.151,-.003,-.018,.031,.070,.037,-side*.13);
    A.path(head,jawSkin,[[side*.112,-.083,.075],[side*.104,-.155,.102],[side*.056,-.204,.119]],.019);
    // Sternomastoid cords belong to the torso, never enlarge the head hit surface.
    A.path(torso,skin,[[side*.070,.513,.033],[side*.052,.442,.083],[side*.116,.373,.123]],.015);
  }
  A.egg(head,skin,0,.002,.142,.039,.084,.045);
  for(const side of [-1,1])A.egg(head,mouth,side*.013,-.031,.164,.014,.010,.011);
  A.egg(head,mouth,0,-.125,.128,.151,.148,.061);
  A.path(head,wound,[[-.071,-.080,.150],[-.041,-.063,.166],[0,-.059,.174],[.041,-.063,.166],[.071,-.080,.150]],.008);
  A.path(head,jawLip,[[-.070,-.171,.138],[-.045,-.194,.151],[0,-.204,.157],[.045,-.194,.151],[.070,-.171,.138]],.009);
  A.egg(head,jawSkin,0,-.207,.095,.141,.043,.099);
  for(let i=0;i<8;i++){
    const x=(i-3.5)*.017,z=.174-Math.abs(x)*.30,curve=Math.abs(x)*.16;
    A.spike(head,teeth,[x,-.066-curve,z],[x*.96,-.084-curve-(i===1||i===6?.006:0),z+.002],.007);
    A.spike(head,jawTeeth,[x,-.196+curve,z-.012],[x*.97,-.180+curve,z-.009],.006);
  }
  const tongue=A.mat(0xae6671,false,0,'wet'),tip=A.mat(0xd89299,false,0,'wet');
  // One wrong proportion, restrained: the short curl stays close to the chin.
  // No head-attached strip drags the measured head centre below its headshot slice.
  A.path(head,tongue,[[0,-.155,.162],[.006,-.194,.189],[.012,-.224,.204],[.003,-.243,.196]],.023);
  A.ribbon(head,tip,[[0,-.164,.184],[.007,-.197,.207],[.012,-.225,.218],[.003,-.241,.207]],.006);
  for(const eye of eyes){eye.position.z=.140*s;eye.scale.set(.57,.27,.37);}
}

export function refineHeavyArmor(A,T,g,s,k,M) {
  const u=g.userData,{steel,rust,hair,leather,wound,cloth}=M,metal=new Set([steel,rust]);
  // Preserve flesh, fingers and straps. Replace only the old scrap armor surfaces.
  for(const bone of [u.torso,u.head,u.armLG,u.armRG,u.armLG.userData.elbowG,u.armRG.userData.elbowG,u.legLG.userData.shinG,u.legRG.userData.shinG])
    for(const m of [...bone.children])if(m.isMesh&&!u.eyes.includes(m)&&(metal.has(m.material)||(bone===u.head||bone===u.torso)&&m.material===hair||m.material.emissive?.getHex()))m.removeFromParent();
  const fire=A.mat(k==='brute'?0xc3a253:0xff9127,k!=='brute',0,k==='brute'?'metal':'skin');
  A.plate(u.torso,steel,[[.115,.19,.225],[.17,.265,.256],[.29,.283,.263],[.38,.251,.244],[.418,.175,.205]],.026);
  const back=A.plate(u.torso,steel,[[.115,.19,.232],[.20,.265,.245],[.34,.27,.232],[.43,.20,.185]],.026);back.rotation.y=Math.PI;
  for(const side of [-1,1]){
    A.path(u.torso,rust,[[side*.19,.118,.21],[side*.26,.18,.223],[side*.277,.29,.225],[side*.244,.38,.212],[side*.175,.42,.173]],.008);
    for(let j=0;j<3;j++)A.egg(u.torso,rust,side*.245,.18+j*.085,.237,.018,.02,.009);
    const arm=side<0?u.armLG:u.armRG,el=arm.userData.elbowG,shin=(side<0?u.legLG:u.legRG).userData.shinG;
    A.loft(arm,steel,[[.008,.169,.165],[.06,.172,.16],[.11,.136,.13],[.14,.06,.065]],12);
    A.plate(el,steel,[[-.29,.06,.075],[-.24,.091,.106],[-.12,.113,.125],[-.065,.105,.118]],.018);
    A.plate(shin,steel,[[-.31,.065,.084],[-.23,.087,.112],[-.12,.102,.129],[-.005,.098,.118],[.045,.04,.095]],.021);
    for(let j=0;j<2;j++)A.path(el,leather,[[-.1,-.12-j*.105,.09],[0,-.12-j*.105,.134],[.1,-.12-j*.105,.09]],.012);
    if(k==='colossus')for(let j=0;j<2;j++)A.sweep(arm,rust,[[side*.06,.10,-.08+j*.16],[side*.135,.21,-.10+j*.18],[side*.18,.32,-.14+j*.2]],.043,0);
  }
  if(k==='brute'){
    const sign=A.mat(0x8e3027,false,.25,'metal');
    A.plate(u.torso,sign,[[.22,.24,.266],[.30,.27,.271]],.004);
    A.plate(u.torso,fire,[[.153,.224,.256],[.187,.253,.264]],.004);
    A.sweep(u.armLG,steel,[[-.07,.095,0],[-.18,.24,-.01],[-.29,.37,-.03]],.105,0);
  }else{
    // Keep the industrial hazard shield on the outer shoulder, clear of the face.
    const hazard=A.mat(0xc39648,false,.2,'metal');
    const shield=A.plate(u.armLG,hazard,[[-.14,.155,.165],[-.06,.195,.225],[.10,.19,.224],[.18,.13,.17]],.055);shield.position.x=-.20*s;
    for(let j=0;j<3;j++){const stripe=A.plate(u.armLG,hair,[[-.09,.014,.231],[.115,.014,.226]],.004);stripe.position.x=(-.33+j*.12)*s;stripe.rotation.z=-.25;}
    for(const x of [-.31,-.13])A.path(u.armLG,rust,[[x,.13,.10],[x-.02,.27,.06],[x+.07,.29,.06],[x+.09,.14,.10]],.014);
    for(let j=0;j<3;j++)A.plate(u.torso,steel,[[.145+j*.083,.19,.275],[.205+j*.083,.21,.274]],.008);
    for(let i=0;i<3;i++)A.egg(u.torso,fire,(i-1)*.105,.078,.21,.045,.077,.026);
    // A narrow brow follows the skull; no slab across the eye openings.
    A.path(u.head,steel,[[-.16,.11,.10],[-.08,.13,.14],[0,.13,.15],[.08,.13,.14],[.16,.11,.10]],.027);
  }
}
