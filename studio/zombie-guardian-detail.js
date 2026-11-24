// GP-162: detailed surfaces for the existing articulated guardian skeleton.
// Every piece belongs to an existing joint; grasp points and pose transforms stay intact.
export function sculptGuardian(A,T,g,kind){
  const R=g.userData.rig,cave=kind!=='guardian';
  const stoneHosts=[];let caveStoneSkull=null;
  const stoneHost=(role,mesh)=>{if(cave)stoneHosts.push({role,mesh});return mesh;};
  const {mat,egg,rock,box,rod,path,spike,rag,loft,ribbon}=A;
  const skin=mat(cave?0x4b4436:0xc8c7b2,false,0,cave?'root':'skin');
  const shadow=mat(cave?0x27291f:0x777b67,false,0,cave?'root':'skin');
  const tendon=mat(cave?0x73614a:0xa8ab92,false,0,cave?'root':'skin');
  const plate=mat(cave?0xb1b0a1:0xe1dfc6,false,0,cave?'stone':'bone');
  const edge=mat(cave?0x7c8274:0xb6bda1,false,0,cave?'stone':'bone');
  const moss=mat(0x4a5d32,false,0,'root'),lichen=mat(0x7b8149,false,0,'root');
  const claw=mat(cave?0x25251e:0x5b6249,false,0,'bone');
  const mouth=mat(cave?0x6a5d4a:0x241a18,false,0,cave?'root':'wet'),gum=mat(cave?0x494331:0x5e4f41,false,0,'wet');
  const teeth=mat(cave?0xc8bb8b:0xe3d9b6,false,0,'bone');
  const eye=mat(0x74a18d,true,0,'wet');
  eye.emissiveIntensity=.9;eye.userData.baseEmissive=.9; // D-89: the same pale-green point as the dead.

  // Bundled cords wind across the host joint without making independent moving parts.
  const cords=(p,x,y,z,length,count=3,width=.025,flip=1)=>{
    for(let i=0;i<count;i++){
      const dx=(i-(count-1)/2)*width*1.65;
      if(cave&&p===R.chest){
        const side=Math.sign(x)||1;
        chestRoot(i%2?tendon:skin,[[side*(.29+i*.025),.20-i*.02,0],[side*(.26+i*.020),.07-i*.025,0],
          [side*(.19+i*.020),-.10-i*.015,0],[side*(.13+i*.015),-.25,0]],width*1.65*(i%2?.85:1));
      }else path(p,i%2?tendon:skin,[[x+dx,y,z],[x+dx+flip*.03,y-length*.28,z+.022],
        [x-dx*.35+flip*.035,y-length*.63,z-.007],[x+dx*.55,y-length,z+.018]],width*(i%2?.78:1));
    }
  };
  const weed=(p,x,y,z,length,lean=1)=>{
    ribbon(p,moss,[[x,y,z],[x+.035*lean,y-length*.3,z+.018],
      [x-.023*lean,y-length*.66,z-.018],[x+.024*lean,y-length,z+.028]],.034);
    ribbon(p,lichen,[[x+.024,y-.035,z],[x+.047*lean,y-length*.40,z+.025],
      [x+.020*lean,y-length*.77,z-.003]],.019);
  };
  const talon=(p,a,b,c,r=.034)=>{
    A.sweep(p,claw,[a,b,c],r,0);
  };
  // Step1b: broad roots grow along our own chest triangles, instead of bridging air like loose straps.
  // Only three/four control points of EXISTING paths move; side count/topology/material/count stay exact.
  const chestRoot=(material,points,width)=>{
    const hosts=R.chest.children.filter(m=>m.isMesh&&m.material===skin&&m.position.x===0&&m.position.y===.015&&m.position.z===.23);
    if(hosts.length!==1)throw Error('Unique own chest core for seated roots');
    const host=hosts[0],ray=new T.Raycaster(),direction=new T.Vector3(0,0,-1),origin=new T.Vector3();
    g.updateMatrixWorld(true);direction.transformDirection(R.chest.matrixWorld);
    const seated=points.map(([x,y])=>{
      origin.set(x,y,2);R.chest.localToWorld(origin);ray.set(origin,direction);
      const hit=ray.intersectObject(host,false)[0];if(!hit)throw Error('Every chest-root guide must hit own skin triangle');
      const p=R.chest.worldToLocal(hit.point.clone());p.z+=width*.30;return p.toArray();
    });
    const m=path(R.chest,material,seated,width);m.userData.gp20153SeatedRoot={points:seated.length,source:'Own existing chest core triangles only; no reference mesh',sameTopology:true};return m;
  };
  const onChest=(pts,w)=>onEgg(pts,w,[0,.015,.23],[.47,.36,.415]);
  const onEgg=(pts,w,c,r)=>pts.map(([x,y,z])=>{const d=[x-c[0],y-c[1],z-c[2]];
    const k=1/Math.hypot(d[0]/r[0],d[1]/r[1],d[2]/r[2]),L=Math.hypot(d[0]*k,d[1]*k,d[2]*k)||1,o=w*.3/L;
    return d.map((v,i)=>c[i]+v*k*(1+o));});
  const wrapPlate=(p,m,y,angle,rx,rz,w,h,d,tilt=0)=>{
    const o=rock(p,m,Math.sin(angle)*rx,y,Math.cos(angle)*rz,w,h,d,tilt);
    o.rotation.y=angle;return o;
  };

  // Continuous chest and pelvis volumes establish muscle beneath plates and tendons.
  egg(R.pelvis,skin,0,-.025,0,.63,.47,.54);
  if(!cave)egg(R.pelvis,skin,0,.10,.16,.56,.36,.5);   // D-242 guardian P1 #6 (Q1): the pelvis met the belly in a shelf; a lower-belly mass bridges them
  stoneHost('spine1',egg(R.spine1,skin,0,.035,.09,.55,.51,.53));
  stoneHost('spine2',egg(R.spine2,skin,0,.045,.13,.65,.57,.59));
  stoneHost('chest',egg(R.chest,skin,0,.015,.23,.94,.72,.83));
  egg(R.chest,shadow,0,-.235,.26,.58,.20,.58);
  egg(R.chest,skin,0,.205,.27,1.31,.38,.53);
  if(cave)egg(R.neck,tendon,0,-.04,.2,.32,.25,.48);else egg(R.neck,tendon,0,-.015,.21,.36,.31,.54);   // D-242 caveguard P1 #9 (Q1): its round neck stood up behind the short stone skull (a ball); smaller and lower
  // Seat the rear jaw basket against the throat without filling the open maw.
  // These neck-local roots remain behind the hinged jaw as it opens.
  for(const side of [-1,1]){
    if(cave)egg(R.neck,tendon,side*.12,-.2,.27,.16,.22,.26,side*.12);else egg(R.neck,skin,side*.13,-.16,.41,.18,.26,.30,side*.12);   // D-242 caveguard P1 #1 (Q4): two bark balls sat inside its open maw (its skull is shorter); now behind the jaw
    // D-242 caveguard P1 #1: its basket roots go back with the bark (they stood as two stone posts in the throat)
    path(R.neck,cave?edge:plate,cave?[[side*.16,-.29,.2],[side*.18,-.22,.31],[side*.17,-.14,.38]]:[[side*.16,-.29,.32],[side*.18,-.20,.47],
      [side*.17,-.10,.56]],.047,.020);
  }
  // The quadruped pose exposes the underside: an inset sternum breaks up the old ball.
  if(!cave)egg(R.chest,edge,0,-.33,.26,.18,.09,.5);   // D-242 guardian P1 #2 (Q4): was a faceted rock: from the front a hex plug in the chest; now a smooth keel
  for(const p of [R.spine1,R.spine2])for(const side of [-1,1]){
    egg(p,cave?tendon:skin,side*.17,-.06,.10,.22,.41,.50,-side*.18);
    path(p,cave?tendon:edge,[[side*.12,-.20,-.13],[side*.245,-.15,.03],
      [side*.23,-.09,.22],[side*.12,-.025,.34]],cave?.036:.026);
    // GP155: cave waist stays bark; main stone growth is on the dorsal hosts.
  }
  for(const side of [-1,1]){
    // Pectoral and scapular masses overlap the existing shoulder socket.
    egg(R.chest,skin,side*.285,.085,.46,.49,.47,.34,side*.20);   // D-242 caveguard P1 #2 (Q4): near-black on the cave kind: two holes in the chest; now bark
    if(cave)egg(R.chest,skin,side*.30,.19,.04,.46,.32,.5,-side*.27);else egg(R.chest,plate,side*.31,.23,.05,.51,.25,.57,-side*.27);   // D-242 caveguard P1 #7 (Q1): flat saucers standing off the upper back; rounder and lower, a shoulder blade
    path(R.neck,tendon,[[side*.12,.08,.04],[side*.14,-.06,.23],[side*.12,-.09,.43]],.043);
    for(let i=0;i<4;i++){
      const z=.015+i*.15;
      if(cave)chestRoot(tendon,[[side*(.31-.03*i),.13-.08*i,0],[side*(.35-.04*i),.04-.08*i,0],
        [side*(.28-.035*i),-.05-.07*i,0],[side*(.18-.025*i),-.10-.065*i,0]],.047);
      // D-242 guardian P1 #1 (Q5): the rib arcs stood 2-4 cm off the chest (loose rods); each guide point now sits on the
      // chest core's surface (its egg: centre 0,.015,.23, radii .47,.36,.415), raised by a third of the rod's width.
      else path(R.chest,edge,onChest([[side*.28,.16,z],[side*.45,.035,z+.055],[side*.42,-.19,z+.072],[side*.26,-.31,z+.035]],.038),.038);
    }
    if(cave){
      // The caveguard's front splinters root into the chest instead of
      // standing ahead of its sternum in the walking side profile.
      cords(R.chest,side*.20,.30,.47,.60,3,.035,side);
      chestRoot(skin,[[side*.37,.16,0],[side*.34,.01,0],
        [side*.245,-.14,0],[side*.15,-.25,0]],.075);
      // GP155: no small chest tiles over the seated root bundles.
      chestRoot(tendon,[[side*.16,-.18,0],[side*.13,-.25,0],
        [side*.07,-.31,0]],.045);
      weed(R.chest,side*.42,.24,.04,.64+side*.10,side);
      weed(R.chest,side*.25,.02,.57,.3,side);   // D-242 caveguard P1 #10 (Q5): the front moss hung .2 m below the chest in the air (straws in the front view); it stays on the chest now
    }else{
      path(R.chest,plate,[[side*.05,.34,.19],[side*.32,.36,.22],[side*.56,.19,.30]],.058);
      path(R.chest,tendon,onEgg([[side*.10,-.24,.48],[side*.20,-.12,.58],[side*.36,.16,.51]],.027,[side*.285,.085,.46],[.245,.235,.17]),.027);   // D-242 guardian P1 #7 (Q5): its top end stood in the air over the pec; now on the pec
      egg(R.chest,skin,side*.21,-.205,.31,.32,.25,.51,side*.27);
      path(R.chest,plate,[[side*.035,-.34,.03],[side*.16,-.35,.14],
        [side*.25,-.27,.28],[side*.28,-.18,.43]],.033);
      weed(R.chest,side*.43,.25,.04,.36,side);
    }
  }

  // Separate overlapping plates expose the spine; long thorns define the silhouette.
  const axial=[R.pelvis,R.spine1,R.spine2,R.chest];
  axial.forEach((p,i)=>{
    const y=i===3?.34:.20;
    for(const side of [-1,1]){
      if(!cave||i===0)rock(p,cave?edge:plate,side*(.16+i*.018),y,.085,.34+i*.02,.18,.32,side*.30);
      if(cave&&i===0){
        path(p,tendon,[[side*.035,y+.04,-.055],[side*.18,y-.10,.03],[side*.27,y-.19,.15]],.042);
        weed(p,side*.3,y-.015,-.12,.31+i*.045,side);   // D-242 caveguard P1 #6 (Q4): the lichen hung inside the pelvis (seating test); out on its flank now
      }else if(!cave){
        path(p,edge,[[side*.05,y-.07,-.10],[side*.22,y-.08,-.02],[side*.30,y-.12,.10]],.036);
      }
    }
    const peak=(cave?.36:.29)+i*.085;
    if(!cave||i===0){
      rock(p,plate,0,y+(i===2?.09:.025),.07,.22,.17,.29,-.06);
      rod(p,plate,[0,y,.05],[.025,y+peak*.59,-.06],cave?.112:.090,cave?.071:.048,7);
      spike(p,cave?edge:plate,[.025,y+peak*.55,-.05],[.035,y+peak,-.19],cave?.076:.052);
    }
  });

  // A shorter fractured stone skull contrasts with the ivory sentinel's long muzzle.
  if(cave){
    caveStoneSkull=makeCaveGuardStoneSkull(A,T,g,R,{plate:edge,edge,moss,shadow},eye);
  }else{
    egg(R.head,skin,0,.065,.105,.57,.36,.48);
    // Low beveled plates form the muzzle, leaving the dark maw and eye array dominant.
    box(R.head,plate,0,-.013,.49,.405,.135,.69);
    box(R.head,edge,0,.182,.28,.54,.115,.34);   // D-242 guardian P1 #9 (Q1): .66 wide on a .57 skull: a brim shelf past both temples
    box(R.head,plate,0,.057,.64,.225,.095,.31);
    box(R.head,shadow,0,.102,.635,.133,.012,.186);
    box(R.head,plate,0,-.032,.827,.355,.11,.085);
    for(const side of [-1,1])rock(R.head,plate,side*.171,-.022,.71,.135,.15,.31,-side*.19);
    for(const side of [-1,1]){
      rock(R.head,plate,side*.252,.012,.27,.18,.245,.34,side*.23);
      path(R.head,skin,[[side*.20,-.015,.31],[side*.21,-.09,.54],[side*.175,-.09,.82]],.035);
      path(R.head,tendon,[[side*.26,.08,.15],[side*.25,-.07,.34],[side*.18,-.14,.50]],.034);
      rock(R.head,plate,side*.24,.185,.10,.23,.12,.34,-side*.3);
      weed(R.head,side*.32,.11,.20,.26,side);
    }
    // Dark inset panel beneath the four sensor lights, framed by an ivory brow.
    box(R.head,shadow,0,.09,.427,.39,.10,.034);
    path(R.head,plate,[[-.29,.185,.31],[-.13,.20,.41],[.13,.20,.41],[.29,.185,.31]],.034);
  }

  // Curved mandibular edges, fleshy lining and opposing teeth surround a real opening.
  const upperZ=cave?.53:.845,jawZ=cave?.57:.795,jawDepth=cave?.50:.73;
  egg(R.head,mouth,0,cave?-.118:-.105,cave?.32:.48,.35,.062,jawDepth);   // D-242 caveguard P1 #3 (Q4): 75% inside the stone skull; 13 mm lower it shows as the roof of the maw
  if(!cave)egg(R.jaw,mouth,0,-.02,.40,.33,.062,jawDepth*.95);
  if(cave)makeCaveGuardStoneJaw(A,T,R,edge,mouth);
  else{
    egg(R.jaw,edge,0,-.075,.40,.39,.10,jawDepth);
    // D-242 guardian P1 #3 (Q1): the rim's back ends ran 7 cm past the jaw to the hinge: loose rods under the cheeks when it
    // opened. They now end on the jaw.
    path(R.jaw,plate,[[-.1,-.05,.1],[-.205,-.065,jawZ*.66],
      [-.17,-.06,jawZ],[0,-.075,jawZ+.032],[.17,-.06,jawZ],[.205,-.065,jawZ*.66],[.1,-.05,.1]],.034);
  }
  const lowerGumX=cave?.27:.175,lowerGumBack=cave?.26:.17,lowerGumY=cave?-.014:.006;
  path(R.jaw,gum,[[-lowerGumBack,lowerGumY,.13],[-lowerGumX,lowerGumY,jawZ-.06],[0,cave?lowerGumY:.004,jawZ+.002+(cave?.03:0)],
    [lowerGumX,lowerGumY,jawZ-.06],[lowerGumBack,lowerGumY,.13]],cave?.008:.018);
  { const gy=cave?-.024:0;   // D-242 caveguard P1 #4 (Q4): the upper gum line was 95% inside the stone skull; lowered 24 mm to show at the tooth roots
  path(R.head,gum,[[-.18,-.095+gy,.24],[-.205,-.095+gy,upperZ-.07],[0,-.105+gy,upperZ],
    [.205,-.095+gy,upperZ-.07],[.18,-.095+gy,.24]],.021); }
  if(!cave){
    egg(R.jaw,gum,0,.012,.40,.15,.055,.48);
    path(R.jaw,tendon,[[0,-.11,.16],[0,-.12,.47],[0,-.09,.74]],.022);
  }
  for(let i=0;i<9;i++){
    const big=i===0||i===8,x=cave&&big?Math.sign(i-4)*.20:(i-4)*.043,len=big?(cave?.13:.21)+(i%3)*.012:cave?.046+(i%2)*.009:.086+(i%3)*.012;
    const z=upperZ-Math.abs(x)*.23;
    spike(R.head,teeth,[x,-.096,z],[x*.94,-.096-len,z+.016],big?(cave?.036:.032):.019);
    const lowerX=cave&&big?Math.sign(x)*.27:x;
    // Cave tooth roots seat into the stone U; no separate protruding gum balls.
    const lowerAdvance=cave&&!big?.012+.03*Math.sqrt(Math.max(0,1-(x/.22)**2)):0;
    const lowerRootZ=jawZ-Math.abs(lowerX)*.16+lowerAdvance,lowerTipZ=cave?lowerRootZ+.018:jawZ+.018-Math.abs(lowerX)*.16;
    spike(R.jaw,teeth,[lowerX,cave?-.012:.01,lowerRootZ],
      [lowerX*(cave&&big?.97:.93),.01+(big?(cave?.20:.15):.066)+(i%2)*.018,lowerTipZ],big?(cave?.030:.028):.017);
  }
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const z=(cave?.39:.68)-j*(cave?.075:.14);
    spike(R.head,teeth,[side*.20,-.105,z],[side*.178,-.205+(j%2)*.025,z+.018],.022);
    const lowerSideX=cave?.27:.173,lowerSideTipX=cave?.26:.152,lowerSideZ=z+(cave?.10:0);
    spike(R.jaw,teeth,[side*lowerSideX,cave?-.012:.006,lowerSideZ-.028],[side*lowerSideTipX,.091,lowerSideZ-.006],.019);
  }
  R.eyes=[];
  if(cave)R.eyes.push(...caveStoneSkull.eyes);
  else for(const side of [-1,1]){
    const x=side*(cave?.148:.18),z=cave?.42:.448,y=cave?.067:.160;
    egg(R.head,shadow,x,y,z-.012,.146,.113,.045);
    const e=egg(R.head,eye,x,y,z+(cave?.022:.019),cave?.081:.075,.063,.038);
    e.castShadow=false;R.eyes.push(e);
    if(!cave){
      egg(R.head,shadow,side*.080,.222,.439,.076,.069,.035);
      const small=egg(R.head,eye,side*.080,.222,.460,.046,.040,.027);
      small.castShadow=false;R.eyes.push(small);
    }
  }

  for(const side of [-1,1]){
    const S=side<0?'L':'R',sh=R['shoulder'+S],el=R['elbow'+S],wr=R['wrist'+S];
    const hip=R['hip'+S],kn=R['knee'+S],ank=R['ankle'+S];
    // Tapering cross sections avoid the old stack of equal capsules at every joint.
    stoneHost('shoulder'+S,loft(sh,skin,[[.09,.18,.16,0],[-.07,.23,.22,.008],[-.30,.20,.18,.015],
      [-.64,.16,.14,.02],[-.94,.115,.12,0],[-1.09,.12,.115,0]],10));
    stoneHost('forearm'+S,loft(el,cave?shadow:skin,[[.07,.12,.12,0],[-.11,.145,.13,.018],[-.38,.16,.13,.035],
      [-.68,.12,.105,.025],[-.99,.09,.088,.005],[-1.18,.105,.10,0]],10));
    egg(sh,cave?tendon:skin,-side*.045,-.31,.065,.26,.58,.27,-side*.11);
    egg(el,cave?tendon:skin,side*.018,-.34,.055,.22,.51,.22,side*.09);
    // A fleshy hinge buries both end caps throughout the elbow bend.
    egg(el,skin,0,0,0,.25,.27,.25);
    egg(el,edge,0,-.015,-.055,.26,.19,.22);
    if(cave){
      // GP155: one raised stone field on each original shoulder and forearm.
      cords(sh,-side*.03,-.12,-.185,.91,4,.034,side);   // D-242 caveguard P1 #5 (Q4): the raised cords were 80-90% inside the shoulder (seating test); on its surface now
      cords(el,side*.035,-.04,-.10,1.05,4,.031,-side);
      // Moss is a colour on the actual upper stone faces; no floating leaf ribbons.
    }else{
      egg(sh,plate,side*.075,-.04,.035,.43,.34,.39,-side*.23);
      egg(el,plate,-side*.035,-.48,.127,.22,.78,.11,side*.045);
      // Long irregular bone rails give the back/side of each forearm a readable ridge.
      for(const a of [Math.PI*.52,Math.PI,Math.PI*1.48]){
        const rail=loft(el,plate,[[-.10,.022,.014,.129],[-.26,.080,.045,.150],
          [-.57,.061,.041,.129],[-.87,.036,.028,.107],[-1.08,.013,.012,.095]],7);
        rail.rotation.y=a;
        wrapPlate(sh,plate,-.085,a,.19,.17,.26,.35,.105,-side*.13);
        wrapPlate(sh,edge,-.40,a,.17,.145,.15,.46,.065,side*.12);
      }
      path(el,shadow,[[side*.125,-.08,-.035],[side*.153,-.36,-.051],
        [side*.11,-.78,-.047],[side*.072,-1.10,-.035]],.016);
      path(sh,edge,[[side*.13,-.20,.135],[side*.085,-.58,.135],[side*.026,-1.04,.088]],.034);
      path(sh,tendon,[[-side*.085,-.05,-.10],[-side*.13,-.49,-.11],[-side*.06,-1.025,-.06]],.026);
      cords(el,0,-.23,.134,.84,3,.020,side);
      for(let j=0;j<3;j++){
        const z=-.12+j*.16;
        spike(sh,plate,[side*.11,.03,z],[side*(.34-j*.035),.38-j*.065,z-.08],.069-j*.010);
      }
      weed(el,side*.08,-.52,-.10,.39,side);
    }
    // Broad knuckles bridge the wrist to articulated fingers without covering the grip.
    // Continuous wrist heel into palm: the forearm no longer ends at a flat disk.
    // D-242 guardian P1 #10 (Q1): the wrist loft stood out of the forearm (a flat ring step round the wrist).
    // Its top now tapers up inside the forearm, so the two surfaces cross smoothly.
    loft(wr,skin,[[.15,.084,.08,0],[.07,.097,.094,-.003],[.025,.108,.105,-.005],[-.04,.18,.17,.065],[-.105,.14,.13,.085]],12);   // D-242 caveguard P1 #8: the same wrist taper
    for(let f=0;f<4;f++){
      const x=(f-1.5)*.082;
      path(wr,cave?tendon:edge,[[x*.45,.016,-.065],[x,.025,.072],[x,-.01,.20]],.019);
    }
    const fingers=R['fingers'+S];
    fingers.forEach((fin,f)=>{
      const tip=fin.userData.tip,len=tip.position.z/.55;
      egg(fin,cave?edge:plate,0,.006,.018,.083,.073,.095);
      rod(fin,skin,[0,0,.007],[0,0,len*.55],.036,.026,7);
      path(fin,cave?tendon:edge,[[0,.026,.01],[0,.035,len*.26],[0,.026,len*.53]],.012);
      egg(tip,cave?plate:edge,0,.004,.016,.063,.060,.073);
      rod(tip,skin,[0,0,.01],[0,0,len*.35],.027,.019,7);
      talon(tip,[0,0,len*.29],[0,-.016,len*.47],[0,-.068,len*.68],.027);
      if(cave&&f%2===0)path(fin,tendon,[[-.025,0,.02],[.019,.025,len*.24],[-.012,.024,len*.47]],.010);
    });
    const th=R['thumb'+S];
    const thumbRoot=rod(th,skin,[0,0,0],[0,0,.16],.038,.027,7);
    // D191: the native thumb pivot is outside the palm; extend only its existing
    // skin root into the palm. Distal thumb, controls and every index stay exact.
    g.updateMatrixWorld(true);thumbRoot.updateMatrixWorld(true);
    const rootSource=thumbRoot.geometry,rootP=rootSource.attributes.position;
    const rootCount=Array.isArray(rootSource.parameters)?34:46;
    if(rootP.count!==rootCount||rootSource.index?.count!==84)throw Error('Original thumb cylinder topology required');
    const rootGeometry=rootSource.clone(),rootNext=rootGeometry.attributes.position;
    const palmAnchor=wr.localToWorld(new T.Vector3(side*.10,-.055,.10));
    thumbRoot.worldToLocal(palmAnchor);
    const rootDelta=palmAnchor.clone().sub(new T.Vector3(0,-.08,0));let rooted=0;
    for(let i=0;i<rootNext.count;i++)if(rootP.getY(i)<0){
      const v=new T.Vector3().fromBufferAttribute(rootP,i).add(rootDelta);
      rootNext.setXYZ(i,v.x,v.y,v.z);rooted++;
    }
    if(rooted!==rootCount/2)throw Error('Only original thumb basal ring and cap required');
    rootGeometry.computeVertexNormals();rootGeometry.computeBoundingBox();rootGeometry.computeBoundingSphere();
    thumbRoot.geometry=rootGeometry;
    egg(th,plate,0,.017,.038,.072,.043,.084);
    talon(th.userData.tip,[0,0,0],[0,-.012,.075],[0,-.068,.145],.030);

    // Short powerful hind legs retain the exact foot reach of the pose/IK rig.
    loft(hip,skin,[[.08,.155,.17,.015],[-.13,.22,.21,.025],[-.37,.20,.18,.030],
      [-.60,.13,.135,.01],[-.76,.12,.12,0]],10);
    stoneHost('knee'+S,loft(kn,skin,[[.05,.12,.13,0],[-.15,.145,.14,-.006],[-.34,.12,.13,-.026],
      [-.54,.087,.095,0],[-.68,.10,.10,0]],9));
    egg(hip,cave?shadow:skin,-side*.045,-.27,-.085,.31,.50,.29,side*.13);
    if(!cave)egg(kn,plate,0,-.025,.105,.22,.18,.10);
    if(cave){
      // GP155: exposed Body7 thigh roots lead into a single broad knee stone.
      cords(hip,0,-.10,-.15,.61,3,.030,side);
      cords(kn,0,-.04,-.18,.57,3,.024,-side);
      weed(hip,side*.11,-.15,-.085,.43,side);
    }else{
      egg(hip,plate,side*.02,-.24,.27,.235,.42,.105,-side*.18);
      rock(hip,edge,-side*.11,-.28,-.13,.20,.39,.12,side*.15);
      path(kn,plate,[[side*.07,-.09,-.12],[side*.075,-.33,-.13],[side*.04,-.58,-.085]],.027);   // D-242 guardian P1 #5 (Q5): seated on the calf (stood off its back)
      path(kn,edge,[[0,-.10,.11],[.02,-.32,.13],[0,-.61,.071]],.031);
      path(hip,tendon,[[side*.17,-.10,.105],[side*.14,-.41,.11],[side*.09,-.70,.06]],.024);   // D-242 guardian P1 #4 (Q5): the thigh tendon stood in the air beside the thigh; now on it
    }
    // Ankle socket tapers into the broad planted foot and embedded talon roots.
    // D-242 guardian P1 #8 (Q1): as at the wrist, the ankle's top ring stood out of the shin's end (a ring step); it now
    // tapers up inside the shin.
    loft(ank,skin,cave?[[.10,.094,.095],[.015,.112,.14,.06],[-.055,.14,.21,.13],[-.115,.10,.16,.13]]:[[.14,.074,.075],[.07,.087,.09,.01],[.015,.112,.14,.06],[-.055,.14,.21,.13],[-.115,.10,.16,.13]],12);
    if(cave)rock(ank,plate,0,-.005,.055,.28,.14,.29,side*.12);
    for(let j=0;j<3;j++){
      const x=(j-1)*.087;
      rod(ank,cave?tendon:edge,[x*.75,-.025,.14],[x,-.04,.33],.039,.027,7);
      talon(ank,[x,-.045,.29],[x*1.08,-.057,.40],[x*1.13,-.10,.49],.031);
    }
    talon(ank,[0,-.025,-.04],[0,-.035,-.12],[0,-.09,-.18],.028);
  }
  R.eyeMat=eye;
  shapeGuardianPelvisBody7(T,g);
  if(cave){
    shapeCaveGuardRootStep1(T,g); // GP153 approved continuous roots remain.
    shapeCaveGuardStoneStep2(A,T,g,stoneHosts,{plate,edge,moss,lichen,tendon});
  }
  return eye;
}

// GT-20111 / Director scoped Body7 landing: original pelvis and two proximal thigh meshes.
// Keep the original topology, UVs, materials, controls and every rig/grip transform.
function shapeGuardianPelvisBody7(T,g){
 const R=g.userData.rig;
 const candidates=R.pelvis.children.filter(m=>m.isMesh&&m.name==='concept-surface'&&m.position.x===0&&m.position.y===-.025&&m.position.z===0&&Math.abs(m.scale.x-.315)<1e-12&&Math.abs(m.scale.y-.235)<1e-12&&Math.abs(m.scale.z-.27)<1e-12);
 if(candidates.length!==1)throw Error('Unique original pelvic skin egg required');
 const pelvis=candidates[0],P=pelvis.geometry.attributes.position;
 if(P.count!==45)throw Error('Original8x4 pelvis sphere required');
 const geo=pelvis.geometry.clone(),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);
  const q=Math.min(1,Math.max(0,y/Math.SQRT1_2)),upper=q*q*(3-2*q);
  // Broad low iliac basin, original narrow upper waist; avoid a swollen rear shelf.
  const cx=r>1e-9?Math.sign(x)*Math.pow(Math.abs(x/r),.83)*r:0;
  const cz=r>1e-9?Math.sign(z)*Math.pow(Math.abs(z/r),.83)*r:0;
  // Lower the lateral upper iliac crest beneath the ORIGINAL cord; central waist stays high to cover its basal cap.
  const lateral=Math.min(1,Math.abs(x)/Math.SQRT1_2),crestDrop=.050*upper*lateral;
  p.setXYZ(i,cx*(.94/.63)*(1-.28*upper),y*(.50/.47)-crestDrop/.235,cz*(.58/.54)*(1-.08*upper));
 }
 geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();pelvis.geometry=geo;pelvis.userData.gtGuardianBody7='pelvis';
 for(const side of ['L','R']){
  const hip=R['hip'+side];
  const list=hip.children.filter(m=>m.isMesh&&m.name==='concept-surface'&&m.material===pelvis.material&&m.geometry.attributes.position.count===50&&m.geometry.index?.count===288);
  if(list.length!==1)throw Error('Unique original6x8 proximal thigh skin '+side+' required');
  const m=list[0];if(m.position.lengthSq()!==0||m.rotation.x||m.rotation.y||m.rotation.z||m.scale.x!==1||m.scale.y!==1||m.scale.z!==1)throw Error('Original identity thigh mesh transform required');
  const next=m.geometry.clone(),p=next.attributes.position,ys=[];
  for(let ring=0;ring<6;ring++){
   const y=p.getY(ring*8);ys.push(y);
   if(y<=-.13+1e-7)continue;
   const t=Math.min(1,(y+.13)/.21),smooth=t*t*(3-2*t);
   let cz=0;for(let k=0;k<8;k++)cz+=p.getZ(ring*8+k)/8;
   for(let k=0;k<8;k++){const i=ring*8+k;p.setXYZ(i,p.getX(i)-(side==='L'?-1:1)*.056*smooth,p.getY(i),cz+(p.getZ(i)-cz)*(1+(.175/.17-1)*smooth));}
  }
  if(Math.abs(ys[0]+.76)>1e-6||Math.abs(ys[5]-.08)>1e-6)throw Error('Expected original native thigh span');
  next.computeVertexNormals();next.computeBoundingBox();next.computeBoundingSphere();m.geometry=next;m.userData.gtGuardianBody7='proximal-thigh-'+side;
 }
 g.userData.gtGuardianBody={version:7,foundation:'LIVE approved-thumb model; three frozen Body7 masses only',changedMeshes:3,addedTriangles:0,scope:'PRIVATE primary hypothesis7 after Body5 dot rejection: restore Body3 upperwidth, lower ONLY lateral upper pelvic ring up to5cm beneath original bonecord while central pole and lower hemisphere remain exact; proximal thigh upperrings5.6cm medially after exact Body6 rightcap1.52372mm residual to keep topcaps enclosed. Original cord/rig untouched. No addedtri. Lower four thigh rings and both cap centres exact. All object transforms, topology/indices/UV, materials, rig/pivots/grips/LIVE heads/palettes/thumbs and other parts exact. Original near9k budget remains RED; not landing/whole-contact/motion proof.'};
}

 
// GP-20153 / D203 STEP1 REVIEW: shape the existing surfaces in each original joint frame.
// A common continuous point map carries the existing bark AND its stone seats together;
// no detached garnish, new surface, new bone, moved pivot, material or pose/range changes.
function shapeCaveGuardRootStep1(T,g){
 const R=g.userData.rig,rows=[
  {joint:R.spine1,role:'lower narrow root waist',map:(p)=>{p.x*=.83;p.z=.10+(p.z-.10)*.90;}},
  {joint:R.spine2,role:'upper root waist',map:(p)=>{p.x*=.90;p.z=.13+(p.z-.13)*.91;}},
  {joint:R.chest,role:'V ribcage',map:(p)=>{
   const u=Math.max(0,Math.min(1,(p.y+.30)/.50)),w=u*u*(3-2*u);
   p.x*=.68+.32*w;p.z=.23+(p.z-.23)*(.83+.07*w);
  }},
  ...['L','R'].map(side=>({joint:R['elbow'+side],role:'twisted broad root forearm '+side,map:(p)=>{
   const t=Math.max(0,Math.min(1,(-p.y-.04)/1.06)),w=Math.sin(Math.PI*t)**2;
   const a=Math.atan2(p.z-.018,p.x),s=1+.27*w+.055*w*Math.cos(4*a+1.35*t);
   const x=p.x*s,z=(p.z-.018)*s,twist=(side==='L'?-1:1)*.10*w,c=Math.cos(twist),n=Math.sin(twist);
   p.x=x*c-z*n;p.z=.018+x*n+z*c;
  }}))
 ],v=new T.Vector3(),inverse=new T.Matrix4();let meshes=0,vertices=0;
 for(const row of rows)for(const m of row.joint.children){
  if(!m.isMesh||!m.geometry?.attributes.position)continue;
  m.updateMatrix();inverse.copy(m.matrix).invert();const src=m.geometry,next=src.clone(),p=next.attributes.position;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrix);row.map(v);v.applyMatrix4(inverse);if(!v.toArray().every(Number.isFinite))throw Error('Finite root profile required');p.setXYZ(i,v.x,v.y,v.z);}
  next.computeVertexNormals();next.computeBoundingBox();next.computeBoundingSphere();m.geometry=next;
  m.userData.gp20153Root={step:1,role:row.role};meshes++;vertices+=p.count;
 }
 g.userData.gp20153Root={step:1,meshes,vertices,scope:'Existing5 joint-local surface sets only: narrower lower torso/V chest, broad twisted forearm root envelope with original wrist/elbow ends. Common map keeps original stone seats with bark; no addedtri/material/RNG/rig/pivot/pose/range. Body7 pelvis and proximal thighs, head/jaw, fingers/thumbs/feet/sole geometry and all motion unchanged. Review only; new larger plates/skull/spikes/claw action later D203 steps.'};
}


// GP155 / D203 STEP2 REVIEW: primary stone grows out of OWN continuous host
// vertices. There is no second stone shell, buried back face or floating moss.
// The original joint frames and end rings remain; all new dimensions are authored
// here from our own ring mesh, never measured from a reference model.
function shapeCaveGuardStoneStep2(A,T,g,hosts,palette){
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 const white=A.mat(0xffffff,false,0,'stone');white.vertexColors=true;
 const bark=A.mat(0xffffff,false,0,'root');bark.vertexColors=true;
 const pos=new T.Vector3(),inverse=new T.Matrix4(),rows=[];
 for(const {role,mesh}of hosts){
  const original=mesh.geometry,geo=role.startsWith('shoulder')?refineCaveGuardHost(T,original):original.clone(),P=geo.attributes.position;
  const side=role.endsWith('L')?-1:1,baseColor=mesh.material.color.clone(),weights=[];
  mesh.updateMatrix();inverse.copy(mesh.matrix).invert();const before=[];
  for(let i=0;i<P.count;i++){
   pos.fromBufferAttribute(P,i).applyMatrix4(mesh.matrix);before.push(pos.toArray());let w=0;
   if(role.startsWith('shoulder')){
    const centerZ=.012,r=Math.hypot(pos.x,pos.z-centerZ)||1;
    const face=(side*pos.x*.75+(pos.z-centerZ)*.45)/r;
    w=smooth((pos.y+.42)/.30)*smooth((face+.12)/.55);
    const lift=.070*w;pos.x+=side*lift*.72;pos.z+=lift*.50;
    if(pos.y>-.12)pos.y+=.06*w*smooth((side*pos.x-.08)/.13);
    const angle=Math.atan2(pos.z-centerZ,side*pos.x),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    const tips=[[-.88,.28],[0,.40],[.88,.30]],crown=tips.reduce((v,[a,h])=>v+h*Math.exp(-((wrap(angle-a)/.27)**2)),0)*smooth((pos.y+.31)/.31);
    pos.y+=crown;pos.x+=side*crown*.36;pos.z+=Math.sin(angle)*crown*.18;
   }else if(role.startsWith('forearm')){
    const r=Math.hypot(pos.x,pos.z-.018)||1,face=((pos.z-.018)*.8+side*pos.x*.35)/r;
    w=smooth((-pos.y-.10)/.15)*smooth((pos.y+1.02)/.18)*smooth((face+.08)/.6);
    const lift=.045*w;pos.x+=pos.x/r*lift;pos.z+=(pos.z-.018)/r*lift;
   }else if(role.startsWith('knee')){
    const r=Math.hypot(pos.x,pos.z)||1;
    w=smooth((pos.y+.34)/.18)*smooth((.10-pos.y)/.12)*smooth((pos.z/r-.05)/.65);
    pos.z+=.075*w;pos.x*=1+.12*w;
   }else{
    const cfg={spine1:{z:.10,y:.04,peak:.95},spine2:{z:.13,y:.06,peak:1.08},chest:{z:.23,y:.10,peak:1.35}}[role];
    if(!cfg)throw Error('Named own stone host required');
    w=smooth((cfg.z-pos.z-.025)/.17)*smooth((pos.y-cfg.y)/.13)*smooth(1-Math.abs(pos.x)/(role==='chest'?.22:.16));
    pos.y+=(cfg.peak-pos.y)*w;pos.z-=.065*w;
   }
   // Bark is a shallow positive ridge in the existing host surface, fading
   // through shared stone boundaries and limb end rings. It adds no root rods.
   if(!role.startsWith('knee')){const z0=role==='chest'?.23:role==='spine2'?.13:role==='spine1'?.10:.018,dx=pos.x,dz=pos.z-z0,r=Math.hypot(dx,dz)||1,a=Math.atan2(dz,dx),limb=role.startsWith('shoulder')||role.startsWith('forearm'),t=clamp((-pos.y+.09)/1.18),end=limb?Math.sin(Math.PI*t)**2:1,fade=1-smooth(w/.22),fiber=(.5+.5*Math.cos(3*a+pos.y*1.6+Math.sin(2*a)*.5))**2,lift=(limb?.055:.100)*fiber*end*fade*smooth(r/.12);pos.x+=dx/r*lift;pos.z+=dz/r*lift;}
   if(!pos.toArray().every(Number.isFinite))throw Error('Finite authored stone field required');
   pos.applyMatrix4(inverse);P.setXYZ(i,pos.x,pos.y,pos.z);weights.push(w);
  }
  geo.setAttribute('gp20155StoneWeight',new T.Float32BufferAttribute(weights,1));geo.computeVertexNormals();
  const flat=geo.index?geo.toNonIndexed():geo;const F=flat.attributes.position,W=flat.attributes.gp20155StoneWeight,N=flat.attributes.normal,colors=[];
  let stoneFaces=0,mossFaces=0;const rootIndices=[],stoneIndices=[];const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<F.count;i+=3){
   a.fromBufferAttribute(F,i).applyMatrix4(mesh.matrix);b.fromBufferAttribute(F,i+1).applyMatrix4(mesh.matrix);c.fromBufferAttribute(F,i+2).applyMatrix4(mesh.matrix);
   normal.crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();const weight=(W.getX(i)+W.getX(i+1)+W.getX(i+2))/3;
   const limb=role.startsWith('shoulder')||role.startsWith('forearm')||role.startsWith('knee');
   const dampSide=side*(a.x+b.x+c.x)/3>.015;
   const stone=weight>.18,upper=normal.y>.24&&weight>.24&&(limb?(dampSide||role.startsWith('shoulder')):(a.x+b.x+c.x)<.12);
   (stone?stoneIndices:rootIndices).push(i,i+1,i+2);
   const mid=a.clone().add(b).add(c).multiplyScalar(1/3),z0=role==='chest'?.23:role==='spine2'?.13:role==='spine1'?.10:.018,fiber=(.5+.5*Math.cos(3*Math.atan2(mid.z-z0,mid.x)+mid.y*1.6+Math.sin(2*Math.atan2(mid.z-z0,mid.x))*.5))**2;
   let color=baseColor.clone().multiplyScalar(.78).lerp(palette.tendon.color,.08+.75*fiber);if(stone){stoneFaces++;color=upper?palette.moss.color:weight<.42?palette.edge.color:palette.plate.color;if(upper)mossFaces++;}
   const localNormal=stone?normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(inverse)).normalize():null;
   for(let j=0;j<3;j++){colors.push(color.r,color.g,color.b);if(stone)N.setXYZ(i+j,localNormal.x,localNormal.y,localNormal.z);}
  }
  flat.deleteAttribute('gp20155StoneWeight');flat.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  // Partition the SAME manifold surface by material. Positions on its border
  // are shared exactly; neither region has a buried shell or a back face.
  // Root triangles keep root UVs; stone/moss triangles get stone UVs through
  // the existing batcher, so bark stripes cannot run across the stone.
  const subset=ids=>{const out=new T.BufferGeometry();for(const [name,attribute]of Object.entries(flat.attributes)){const values=[];for(const i of ids)for(let k=0;k<attribute.itemSize;k++)values.push(attribute.array[i*attribute.itemSize+k]);out.setAttribute(name,new T.BufferAttribute(new attribute.array.constructor(values),attribute.itemSize));}out.computeBoundingBox();out.computeBoundingSphere();return out;};
  mesh.geometry=subset(rootIndices);mesh.material=bark;
  const cap=A.put(mesh.parent,subset(stoneIndices),white);cap.position.copy(mesh.position);cap.quaternion.copy(mesh.quaternion);cap.scale.copy(mesh.scale);
  cap.userData.gp20155StoneBoundary='Exact shared vertices with own retained root surface; no second shell';
  rows.push({role,sourceVertices:P.count,triangles:F.count/3,stoneFaces,mossFaces,policy:'One continuous own host, shared boundary; no stone/skin shell intersection or moss decal'});
 }
 g.userData.gp20155StoneStep2={version:14,primaryStoneFields:hosts.length,rows,scope:'D203 step2 REVIEW: nine continuous mossy stone fields, lower flatter skull/heavy brow/recessed eyes and nasal cavity, deeper closed U jaw/larger staggered fangs and three integral posterior skull spines. Guardian, Body7 pelvis/proximal thighs, soles/hands/thumbs and all rig/binds/poses/limits unchanged. No finished-asset/contact/performance acceptance.'};
}

// GP155 own low-poly stone skull, built from authored rings. Eye lenses REPLACE
// the corresponding skull surface polygons and share their boundary, rather
// than floating in front of a painted socket. No reference geometry is used.
function makeCaveGuardStoneSkull(A,T,g,R,palette,eyeMaterial){
 const rows=[[-.12,.23,.25,.30],[-.08,.245,.25,.30],[0,.245,.25,.21],[.07,.275,.27,.18],[.14,.29,.28,.16],[.185,.265,.26,.13],[.205,.245,.24,.105],[.265,.190,.205,.055],[.295,.12,.14,.025]],n=24;
 const vertices=[],faces=[],stone=[],stoneColors=[],eyes=[{x:-.148,y:.067,rx:.080,ry:.067,lensRx:.029,lensRy:.022,parts:[]},{x:.148,y:.067,rx:.080,ry:.067,lensRx:.029,lensRy:.022,parts:[]}],holes=[...eyes,{x:0,y:-.030,rx:.033,ry:.044,isNose:true,parts:[]}];
 const V=(x,y,z)=>new T.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,x));
 for(const [y,rx,rz,cz]of rows)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2,c=Math.cos(a),front=y<.025&&c>0?Math.sqrt(c):c,p=V(Math.sin(a)*rx,y,cz+front*rz);
  // Lower maxilla supports the upper gum/teeth; the occipital base seats
  // the ORIGINAL jaw hinge, without changing that hinge or adding a shell.
  if(c<0&&y<.025)p.z-=.10*(-c)*Math.max(0,Math.min(1,(.025-y)/.105));
  if(Math.cos(a)>.15){
   if(y===.14)p.y+=.050*Math.exp(-(((Math.abs(p.x)-.148)/.095)**2))-.063*Math.exp(-((p.x/.070)**2));
   if(y===.185||y===.205){const notch=Math.exp(-((p.x/.068)**2));p.y-=(y===.185?.035:.018)*notch;p.z-=.018*notch;}
   const socket=eyes.reduce((sum,e)=>sum+Math.exp(-(((p.x-e.x)/.078)**2+((p.y-e.y)/.050)**2)),0);
   p.z-=.061*socket;
   p.z+=.075*eyes.reduce((sum,e)=>sum+Math.exp(-(((p.x-e.x)/.105)**2+((y-.142)/.055)**2)),0);
   // Two integral orbital arches and a central channel, Z-only: preserve the proven XY eye-hole rings.
   const arches=eyes.reduce((sum,e)=>sum+Math.exp(-(((p.x-e.x)/.105)**2)),0)*Math.exp(-(((y-.155)/.045)**2));
   p.z+=.085*arches-.085*Math.exp(-((p.x/.045)**2+((y-.175)/.075)**2));
   const bridge=Math.exp(-((p.x/.047)**2+((p.y-.112)/.065)**2));p.z+=.012*bridge;
   const nasal=Math.exp(-((p.x/.041)**2+((p.y+.016)/.036)**2));p.z-=.038*nasal;
  }
  // Three posterior top-ring vertices grow rooted crown thorns from the SAME closed skull.
  if(y===.295){if(j===n/2){p.y=.48;p.z-=.06;}else if(j===n*3/8||j===n*5/8){p.y=.365;p.x*=1.12;p.z-=.025;}}
  vertices.push(p);
 }
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=a+n,d=b+n;faces.push([a,b,c],[b,d,c]);}
 const bottom=vertices.push(V(0,-.13,.27))-1,top=vertices.push(V(0,.325,.045))-1;
 for(let i=0;i<n;i++){faces.push([bottom,(i+1)%n,i]);const a=(rows.length-1)*n+i,b=(rows.length-1)*n+(i+1)%n;faces.push([top,a,b]);}
 const area=poly=>{let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y;}return a*.5;};
 const side=(p,a,b)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
 const split=(poly,a,b)=>{const inside=[],outside=[];for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],dp=side(p,a,b),dq=side(q,a,b);
  if(dp>=-1e-12)inside.push(p);if(dp<=1e-12)outside.push(p);
  if((dp>1e-12&&dq< -1e-12)||(dp< -1e-12&&dq>1e-12)){const x=p.clone().lerp(q,dp/(dp-dq));inside.push(x);outside.push(x);}
 }return{inside,outside};};
 for(const e of holes)e.rim=Array.from({length:12},(_,j)=>V(e.x+Math.cos(j/12*Math.PI*2)*e.rx,e.y+Math.sin(j/12*Math.PI*2)*e.ry,0));
 const subtract=(poly,e)=>{if(e.rim.some((a,i)=>poly.every(p=>side(p,a,e.rim[(i+1)%e.rim.length])< -1e-12)))return{outside:[poly],inside:null};const outside=[];let inside=poly;for(let i=0;i<e.rim.length&&inside.length>=3;i++){const q=split(inside,e.rim[i],e.rim[(i+1)%e.rim.length]);if(q.outside.length>=3&&Math.abs(area(q.outside))>1e-13)outside.push(q.outside);inside=q.inside;}return{outside,inside:inside.length>=3&&Math.abs(area(inside))>1e-13?inside:null};};
 const frontFaces=faces.map(ids=>ids.map(i=>vertices[i])).filter(p=>V(0,0,0).crossVectors(p[1].clone().sub(p[0]),p[2].clone().sub(p[0])).z>1e-10);
 const frontAt=(x,y,triangles=frontFaces)=>{let z=-Infinity;for(const p of triangles){const den=(p[1].y-p[2].y)*(p[0].x-p[2].x)+(p[2].x-p[1].x)*(p[0].y-p[2].y);if(Math.abs(den)<1e-12)continue;const a=((p[1].y-p[2].y)*(x-p[2].x)+(p[2].x-p[1].x)*(y-p[2].y))/den,b=((p[2].y-p[0].y)*(x-p[2].x)+(p[0].x-p[2].x)*(y-p[2].y))/den,c=1-a-b;if(Math.min(a,b,c)>=-1e-9)z=Math.max(z,a*p[0].z+b*p[1].z+c*p[2].z);}if(!Number.isFinite(z))throw Error('Own skull front triangle required');return z;};
 let clippedFaces=0;
 const triangle=(target,a,b,c)=>{if(V(0,0,0).crossVectors(b.clone().sub(a),c.clone().sub(a)).lengthSq()<1e-20)return false;for(const p of[a,b,c])target.push(p.x,p.y,p.z);return true;};
 const emitStone=poly=>{for(let i=1;i<poly.length-1;i++){
  const a=poly[0],b=poly[i],c=poly[i+1],normal=V(0,0,0).crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize(),mid=a.clone().add(b).add(c).multiplyScalar(1/3);
  let color=palette.plate.color;
  if(normal.y>.25&&mid.y>.115&&mid.z<.30&&(mid.x<.11||mid.z<.035))color=palette.moss.color;
  else if(mid.y<-.065)color=palette.edge.color;
  // The recessed bridge separates two orbital stone arches, with a dark grey stone cleft rather than a continuous pale visor.
  if(mid.z>.25&&Math.abs(mid.x)<.065&&mid.y>.095&&mid.y<.24)color=palette.plate.color.clone().lerp(palette.shadow.color,.70);
  if(triangle(stone,a,b,c))for(let k=0;k<3;k++)stoneColors.push(color.r,color.g,color.b);
 }};
 for(const ids of faces){const poly=ids.map(i=>vertices[i]),normal=V(0,0,0).crossVectors(poly[1].clone().sub(poly[0]),poly[2].clone().sub(poly[0]));let remaining=[poly];
  if(normal.z>1e-10)for(const e of holes){const next=[];for(const p of remaining){const s=subtract(p,e);next.push(...s.outside);if(s.inside){e.parts.push(s.inside);clippedFaces++;}}remaining=next;}
  for(const p of remaining)emitStone(p);
 }
 // The orbit/nasal opening is genuinely recessed geometry, not a dark
 // pattern on a visor. It replaces the outer face, joins the unchanged rim,
 // then its small inner eye surface is replaced by the luminous lens.
 const depthAt=(p,rim,cx,cy)=>{let d=1;for(let i=0;i<rim.length;i++)d=Math.min(d,side(p,rim[i],rim[(i+1)%rim.length])/side(V(cx,cy,0),rim[i],rim[(i+1)%rim.length]));return clamp(d);};
 const smooth=x=>x*x*(3-2*x);
 const emitSocket=poly=>{for(let i=1;i<poly.length-1;i++)if(triangle(stone,poly[0],poly[i],poly[i+1]))for(let k=0;k<3;k++)stoneColors.push(palette.shadow.color.r,palette.shadow.color.g,palette.shadow.color.b);};
 for(const e of holes){
  const outer=e.rim,source=e.parts,socketTriangles=[],depress=p=>p.clone().add(V(0,0,-(e.isNose?.065:.075)*smooth(depthAt(p,outer,e.x,e.y))));
  // A hole centre can lie ON a shared source edge (the nasal centreline).
  // It must be a shared boundary vertex, never an off-plane fan centre:
  // otherwise both faces emit a duplicate internal curtain after recession.
  const pool=[],addPoint=p=>{if(!pool.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1e-10))pool.push(V(p.x,p.y,frontAt(p.x,p.y)));};
  for(const poly of source)for(let i=0;i<poly.length;i++){addPoint(poly[i]);addPoint(poly[i].clone().lerp(poly[(i+1)%poly.length],.5));}
  addPoint(V(e.x,e.y,0));
  const refined=source.map(poly=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(l2<1e-20)continue;const cuts=pool.map(p=>({p,t:((p.x-a.x)*dx+(p.y-a.y)*dy)/l2})).filter(({p,t})=>t>=-1e-10&&t<1-1e-10&&Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<1e-10).sort((a,b)=>a.t-b.t);for(const{p}of cuts)if(!out.length||out.at(-1).distanceTo(p)>1e-10)out.push(p.clone());}return out;}).filter(p=>p.length>=3);
  for(const poly of refined){let center=poly.reduce((p,q)=>p.add(q),V(0,0,0)).multiplyScalar(1/poly.length);const sign=Math.sign(area(poly));if(poly.every((p,i)=>side(V(e.x,e.y,0),p,poly[(i+1)%poly.length])*sign>1e-12))center=V(e.x,e.y,frontAt(e.x,e.y));for(let i=0;i<poly.length;i++){const t=[depress(center),depress(poly[i]),depress(poly[(i+1)%poly.length])];if(V(0,0,0).crossVectors(t[1].clone().sub(t[0]),t[2].clone().sub(t[0])).lengthSq()>1e-20)socketTriangles.push(t);}}
  if(e.isNose){for(const t of socketTriangles)emitSocket(t);continue;}
  const inner={x:e.x,y:e.y,rx:e.lensRx,ry:e.lensRy};inner.rim=Array.from({length:12},(_,j)=>V(e.x+Math.cos(j/12*Math.PI*2)*inner.rx,e.y+Math.sin(j/12*Math.PI*2)*inner.ry,0));
  const lensParts=[];for(const t of socketTriangles){const q=subtract(t,inner);for(const p of q.outside)emitSocket(p);if(q.inside)lensParts.push(q.inside);}
  e.parts=lensParts;e.rim=inner.rim;e.rx=inner.rx;e.ry=inner.ry;e.socketTriangles=socketTriangles;
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(stone,3));geo.setAttribute('color',new T.Float32BufferAttribute(stoneColors,3));geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
 const material=A.mat(0xffffff,false,0,'stone');material.vertexColors=true;const skull=A.put(R.head,geo,material);
 const eyeMeshes=[],records=[];
 for(const e of eyes){if(!e.parts.length)throw Error('Every eye must replace an actual skull surface region');const positions=[],anchor=V(e.x,e.y,frontAt(e.x,e.y,e.socketTriangles)+.009);let boundary=0;
  const depth=p=>{let d=1;for(let i=0;i<e.rim.length;i++){const a=e.rim[i],b=e.rim[(i+1)%e.rim.length];d=Math.min(d,side(p,a,b)/side(V(e.x,e.y,0),a,b));}return clamp(d);};
  const lens=p=>{const d=depth(p);if(d<1e-8)boundary++;return p.clone().add(V(0,0,.009*d*d)).sub(anchor);};
  for(const poly of e.parts){let center=poly.reduce((p,q)=>p.add(q),V(0,0,0)).multiplyScalar(1/poly.length);const sign=Math.sign(area(poly));if(poly.every((p,i)=>side(V(e.x,e.y,0),p,poly[(i+1)%poly.length])*sign>=-1e-10))center=V(e.x,e.y,frontAt(e.x,e.y,e.socketTriangles));
   for(let i=0;i<poly.length;i++)triangle(positions,lens(center),lens(poly[i]),lens(poly[(i+1)%poly.length]));
  }
  const eyeGeo=new T.BufferGeometry();eyeGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));eyeGeo.computeVertexNormals();eyeGeo.computeBoundingBox();eyeGeo.computeBoundingSphere();const eye=A.put(R.head,eyeGeo,eyeMaterial,anchor.x,anchor.y,anchor.z);eye.castShadow=false;eye.userData.gp20155LensMask={x:e.x,y:e.y,rx:e.rx,ry:e.ry,segments:12};eyeMeshes.push(eye);records.push({center:anchor.toArray(),triangles:positions.length/9,clippedPolygons:e.parts.length,sharedBoundarySamples:boundary,policy:'Lens replaces original front polygons; zero displacement at shared skull rim, no floating globe or socket decal'});
 }
 g.userData.gp20155Skull={version:14,source:'Own authored24-sided9-ring skull, faceted maxilla/brow/cranium and actual sunken socket/nasal fields; no reference geometry',stoneTriangles:stone.length/9,clippedFaces,eyes:records,scope:'Head surfaces and eye centres only; original head/neck/jaw bone frames/ranges/hits unchanged, gameplay gates pending'};
 return{skull,eyes:eyeMeshes};
}

// One closed stone U replaces the old cave jaw ellipsoid plus thin rim.
// Its inner edge stays behind the gum line; added mass grows down/outwards.
// Original jaw bone/hinge/limits stay; the lining now shares the closed basin.
function makeCaveGuardStoneJaw(A,T,R,material,mouthMaterial){
 const centres=[[-.165,0],[-.270,.145],[-.270,.36],[-.255,.49],[-.190,.585],[-.100,.620],[0,.63],[.100,.620],[.190,.585],[.255,.49],[.270,.36],[.270,.145],[.165,0]];
 const profile=[[-.018,-.008],[.025,-.008],[.050,-.025],[.060,-.065],[.045,-.120],[.020,-.156],[-.003,-.150],[-.020,-.110],[-.020,-.028]];
 const rings=[],pos=[],idx=[],floor=[];
 for(let j=0;j<centres.length;j++){const p=centres[j],a=centres[Math.max(0,j-1)],b=centres[Math.min(centres.length-1,j+1)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,taper=j===0||j===centres.length-1?.70:1;const ids=[];
  for(const[d,y]of profile){const rear=j===0||j===centres.length-1,depth=rear?.70:j===6?1.08:.91;ids.push(pos.length/3);pos.push(p[0]+nx*(rear||d<0?d:d*.75)*taper,y*depth+(rear?.035:0),p[1]+nz*(rear||d<0?d:d*.75)*taper);}rings.push(ids);
 }
 const n=profile.length;
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){if(i===6)continue;const a=rings[j][i],b=rings[j][(i+1)%n],c=rings[j+1][i],d=rings[j+1][(i+1)%n];idx.push(a,b,c,b,d,c);}
 for(const[j,flip]of[[0,true],[rings.length-1,false]]){const ring=rings[j],center=pos.length/3,p=centres[j];pos.push(p[0],-.037,p[1]);for(let i=0;i<n;i++){const a=ring[i],b=ring[(i+1)%n];idx.push(center,...(flip?[b,a]:[a,b]));}}
 // Replace the former separate oval lining with a closed deep basin. Its top
 // stays below the existing upper fang tips; the original U and all teeth,
 // hinges, limits and end caps are retained. Stone and lining share exact edges.
 const innerTop=[],innerBottom=[];
 for(let j=0;j<rings.length;j++){const p=rings[j][7]*3,x=pos[p]*.94,z=.35+(pos[p+2]-.35)*.94;innerTop.push(pos.length/3);pos.push(x,-.1605,z);innerBottom.push(pos.length/3);pos.push(x,-.1665,z);}
 const top=pos.length/3;pos.push(0,-.1605,.35);const bottom=pos.length/3;pos.push(0,-.1665,.35);
 for(let j=0;j<rings.length;j++){const k=(j+1)%rings.length,a=rings[j][7],b=rings[k][7],c=innerTop[j],d=innerTop[k];floor.push(a,b,c,b,d,c,top,c,d);const e=rings[j][6],f=rings[k][6],h=innerBottom[j],i=innerBottom[k];idx.push(e,h,f,f,h,i,bottom,i,h);}
 const last=rings.length-1;idx.push(rings[0][6],rings[0][7],rings[last][6],rings[last][6],rings[0][7],rings[last][7]);
 const floorGeo=new T.BufferGeometry();floorGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));floorGeo.setIndex(floor);const lining=floorGeo.toNonIndexed();lining.computeVertexNormals();lining.computeBoundingBox();lining.computeBoundingSphere();A.put(R.jaw,lining,mouthMaterial).userData.gp20155Basin='Continuous shared-rim oral floor; replaces former oval, no separate floating disc';
 const indexed=new T.BufferGeometry();indexed.setAttribute('position',new T.Float32BufferAttribute(pos,3));indexed.setIndex(idx);const geo=indexed.toNonIndexed();geo.computeVertexNormals();
 // Per-face planar stone UVs retain BOTH dimensions on upright walls.
 // The general fallback picked XZ for this U and collapsed vertical Y,
 // stretching stone fractures into the rejected vertical stripes.
 const P=geo.attributes.position,N=geo.attributes.normal,uv=[];for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),nx=Math.abs(N.getX(i)),ny=Math.abs(N.getY(i)),nz=Math.abs(N.getZ(i));uv.push(ny>=nx&&ny>=nz?x+0.5:nz>=nx?x+0.5:z+0.15,ny>=nx&&ny>=nz?z+0.15:y+0.5);}
 geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=A.put(R.jaw,geo,material);mesh.userData.gp20155Mandible={policy:'Single closed U prism, no ellipsoid/rim double shell; mass grows down/out, same jaw bone frame',rings:centres.length};
 return mesh;
}


// Midpoint subdivision of OWN host triangles; shared original attributes are
// interpolated together and never separated into overlapping sculpted shells.
function refineCaveGuardHost(T,source){
 const g=source.clone(),names=Object.keys(g.attributes),values=Object.fromEntries(names.map(k=>[k,Array.from(g.attributes[k].array)])),indices=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),cache=new Map(),out=[];
 const midpoint=(a,b)=>{const key=a<b?a+':'+b:b+':'+a;if(cache.has(key))return cache.get(key);const id=values.position.length/3;for(const k of names){const n=g.attributes[k].itemSize;for(let j=0;j<n;j++)values[k].push((values[k][a*n+j]+values[k][b*n+j])/2);}cache.set(key,id);return id;};
 for(let i=0;i<indices.length;i+=3){const[a,b,c]=indices.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);out.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
 for(const k of names)g.setAttribute(k,new T.BufferAttribute(new source.attributes[k].array.constructor(values[k]),source.attributes[k].itemSize));g.setIndex(out);return g;
}
