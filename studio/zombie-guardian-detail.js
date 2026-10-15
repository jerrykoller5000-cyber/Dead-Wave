// GP-162: detailed surfaces for the existing articulated guardian skeleton.
// Every piece belongs to an existing joint; grasp points and pose transforms stay intact.
export function sculptGuardian(A,T,g,kind){
  const R=g.userData.rig,cave=kind!=='guardian';
  const {mat,egg,rock,box,rod,path,spike,rag,loft,ribbon}=A;
  const skin=mat(cave?0x4b4436:0xc8c7b2,false,0,cave?'root':'skin');
  const shadow=mat(cave?0x27291f:0x777b67,false,0,cave?'root':'skin');
  const tendon=mat(cave?0x73614a:0xa8ab92,false,0,cave?'root':'skin');
  const plate=mat(cave?0xb1b0a1:0xe1dfc6,false,0,cave?'stone':'bone');
  const edge=mat(cave?0x7c8274:0xb6bda1,false,0,cave?'stone':'bone');
  const moss=mat(0x4a5d32,false,0,'root'),lichen=mat(0x7b8149,false,0,'root');
  const claw=mat(cave?0x25251e:0x5b6249,false,0,'bone');
  const mouth=mat(0x241a18,false,0,'wet'),gum=mat(cave?0x494331:0x5e4f41,false,0,'wet');
  const teeth=mat(cave?0xc8bb8b:0xe3d9b6,false,0,'bone');
  const eye=mat(cave?0xc9f0ff:0xf2ffd7,true,0,'wet');

  // Bundled cords wind across the host joint without making independent moving parts.
  const cords=(p,x,y,z,length,count=3,width=.025,flip=1)=>{
    for(let i=0;i<count;i++){
      const dx=(i-(count-1)/2)*width*1.65;
      path(p,i%2?tendon:skin,[[x+dx,y,z],[x+dx+flip*.03,y-length*.28,z+.022],
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
  const wrapPlate=(p,m,y,angle,rx,rz,w,h,d,tilt=0)=>{
    const o=rock(p,m,Math.sin(angle)*rx,y,Math.cos(angle)*rz,w,h,d,tilt);
    o.rotation.y=angle;return o;
  };

  // Continuous chest and pelvis volumes establish muscle beneath plates and tendons.
  egg(R.pelvis,skin,0,-.025,0,.63,.47,.54);
  egg(R.spine1,skin,0,.035,.09,.55,.51,.53);
  egg(R.spine2,skin,0,.045,.13,.65,.57,.59);
  egg(R.chest,skin,0,.015,.23,.94,.72,.83);
  egg(R.chest,shadow,0,-.235,.26,.58,.20,.58);
  egg(R.chest,skin,0,.205,.27,1.31,.38,.53);
  egg(R.neck,tendon,0,-.015,.21,.36,.31,.54);
  // The quadruped pose exposes the underside: an inset sternum breaks up the old ball.
  rock(R.chest,cave?plate:edge,0,-.325,.29,.23,.15,.58,.04);
  for(const p of [R.spine1,R.spine2])for(const side of [-1,1]){
    egg(p,cave?tendon:skin,side*.17,-.06,.10,.22,.41,.50,-side*.18);
    path(p,cave?tendon:edge,[[side*.12,-.20,-.13],[side*.245,-.15,.03],
      [side*.23,-.09,.22],[side*.12,-.025,.34]],cave?.036:.026);
    if(cave)rock(p,plate,side*.12,-.18,.16,.23,.14,.35,side*.28);
  }
  for(const side of [-1,1]){
    // Pectoral and scapular masses overlap the existing shoulder socket.
    egg(R.chest,cave?shadow:skin,side*.285,.085,.46,.49,.47,.34,side*.20);
    egg(R.chest,cave?skin:plate,side*.31,.23,.05,.51,.25,.57,-side*.27);
    path(R.neck,tendon,[[side*.12,.08,.04],[side*.14,-.06,.23],[side*.12,-.09,.43]],.043);
    for(let i=0;i<4;i++){
      const z=.015+i*.15;
      path(R.chest,cave?tendon:edge,[[side*.28,.16,z],[side*.45,.035,z+.055],
        [side*.42,-.19,z+.072],[side*.26,-.31,z+.035]],cave?.033:.038);
    }
    if(cave){
      cords(R.chest,side*.20,.30,.55,.72,3,.035,side);
      path(R.chest,skin,[[side*.08,.36,-.12],[side*.38,.19,-.05],
        [side*.43,-.08,.02],[side*.29,-.37,.16]],.056);
      rock(R.chest,plate,side*.26,.34,.31,.39,.24,.45,side*.32);
      rock(R.chest,edge,side*.40,-.02,.47,.31,.39,.16,-side*.19);
      rock(R.chest,plate,side*.24,-.16,.52,.26,.30,.16,side*.41);
      rock(R.chest,plate,side*.27,-.235,.22,.32,.23,.43,side*.24);
      rock(R.chest,edge,side*.20,-.30,.025,.25,.16,.29,-side*.18);
      path(R.chest,tendon,[[side*.08,-.36,.05],[side*.23,-.33,.23],
        [side*.30,-.28,.43]],.033);
      weed(R.chest,side*.42,.24,.04,.64+side*.10,side);
      weed(R.chest,side*.25,.02,.54,.47,side);
    }else{
      path(R.chest,plate,[[side*.05,.34,.19],[side*.32,.36,.22],[side*.56,.19,.30]],.058);
      path(R.chest,tendon,[[side*.10,-.24,.48],[side*.20,-.12,.58],[side*.36,.16,.51]],.027);
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
      rock(p,cave?edge:plate,side*(.16+i*.018),y,.085,.34+i*.02,.18,.32,side*.30);
      if(cave){
        path(p,tendon,[[side*.035,y+.04,-.055],[side*.18,y-.10,.03],[side*.27,y-.19,.15]],.042);
        weed(p,side*.19,y-.015,-.08,.31+i*.045,side);
      }else{
        path(p,edge,[[side*.05,y-.07,-.10],[side*.22,y-.08,-.02],[side*.30,y-.12,.10]],.036);
      }
    }
    const peak=(cave?.36:.29)+i*.085;
    rock(p,plate,0,y+.025,.07,.22,.17,.29,-.06);
    rod(p,plate,[0,y,.05],[.025,y+peak*.59,-.06],cave?.112:.090,cave?.071:.048,7);
    spike(p,cave?edge:plate,[.025,y+peak*.55,-.05],[.035,y+peak,-.19],cave?.076:.052);
    if(cave&&i>1)spike(p,plate,[.17,y,.04],[.20,y+peak*.69,-.01],.076);
  });

  // A shorter fractured stone skull contrasts with the ivory sentinel's long muzzle.
  if(cave){
    egg(R.head,shadow,0,.02,.20,.49,.36,.48);
    rock(R.head,plate,-.07,.125,.12,.47,.35,.47,-.19);
    rock(R.head,edge,.17,.11,.20,.24,.30,.32,.23);
    rock(R.head,plate,-.13,.13,.36,.29,.15,.25,-.12);
    rock(R.head,plate,.15,.13,.345,.26,.15,.22,.17);
    rock(R.head,plate,0,-.015,.36,.17,.24,.20,.11);
    for(const side of [-1,1]){
      rock(R.head,edge,side*.20,-.055,.31,.18,.26,.30,side*.32);
      path(R.head,shadow,[[side*.05,.25,.36],[side*.09,.18,.39],
        [side*.04,.115,.43],[side*.12,.07,.43]],.011);
      cords(R.head,side*.24,.10,.23,.36,2,.019,side);
      weed(R.head,side*.23,.18,.07,.42,side);
    }
    rock(R.head,edge,0,.24,.005,.20,.16,.24);
    spike(R.head,plate,[.025,.23,.005],[.075,.49,-.07],.062);
  }else{
    egg(R.head,skin,0,.065,.105,.57,.36,.48);
    // Low beveled plates form the muzzle, leaving the dark maw and eye array dominant.
    box(R.head,plate,0,-.013,.49,.405,.135,.69);
    box(R.head,edge,0,.182,.28,.66,.115,.34);
    box(R.head,plate,0,.057,.64,.225,.095,.31);
    box(R.head,shadow,0,.102,.635,.133,.012,.186);
    box(R.head,plate,0,-.032,.827,.355,.11,.085);
    for(const side of [-1,1])rock(R.head,plate,side*.171,-.022,.71,.135,.15,.31,-side*.19);
    for(const side of [-1,1]){
      rock(R.head,plate,side*.252,.012,.27,.18,.245,.34,side*.23);
      path(R.head,skin,[[side*.20,-.015,.31],[side*.21,-.09,.54],[side*.175,-.09,.82]],.035);
      path(R.head,tendon,[[side*.26,.08,.15],[side*.25,-.07,.34],[side*.18,-.14,.50]],.034);
      rock(R.head,plate,side*.24,.185,.10,.23,.12,.34,-side*.3);
      weed(R.head,side*.26,.11,.20,.26,side);
    }
    // Dark inset panel beneath the four sensor lights, framed by an ivory brow.
    box(R.head,shadow,0,.09,.427,.39,.10,.034);
    path(R.head,plate,[[-.29,.185,.31],[-.13,.20,.41],[.13,.20,.41],[.29,.185,.31]],.034);
  }

  // Curved mandibular edges, fleshy lining and opposing teeth surround a real opening.
  const upperZ=cave?.53:.845,jawZ=cave?.47:.795,jawDepth=cave?.40:.73;
  egg(R.head,mouth,0,-.105,cave?.32:.48,.35,.062,jawDepth);
  egg(R.jaw,mouth,0,-.02,cave?.24:.40,.33,.062,jawDepth*.95);
  egg(R.jaw,cave?skin:edge,0,-.075,cave?.24:.40,.39,.10,jawDepth);
  path(R.jaw,cave?edge:plate,[[-.165,-.04,.08],[-.205,-.065,jawZ*.66],
    [-.17,-.06,jawZ],[0,-.075,jawZ+.032],[.17,-.06,jawZ],[.205,-.065,jawZ*.66],[.165,-.04,.08]],.034);
  path(R.jaw,gum,[[-.17,.006,.13],[-.175,.006,jawZ-.06],[0,.004,jawZ+.002],
    [.175,.006,jawZ-.06],[.17,.006,.13]],.018);
  path(R.head,gum,[[-.18,-.095,.24],[-.205,-.095,upperZ-.07],[0,-.105,upperZ],
    [.205,-.095,upperZ-.07],[.18,-.095,.24]],.021);
  if(!cave){
    egg(R.jaw,gum,0,.012,.40,.15,.055,.48);
    path(R.jaw,tendon,[[0,-.11,.16],[0,-.12,.47],[0,-.09,.74]],.022);
  }
  for(let i=0;i<9;i++){
    const x=(i-4)*.043,big=i===0||i===8,len=(big?.21:.086)+(i%3)*.012;
    const z=upperZ-Math.abs(x)*.23;
    spike(R.head,teeth,[x,-.096,z],[x*.94,-.096-len,z+.016],big?.032:.019);
    spike(R.jaw,teeth,[x,.01,jawZ-Math.abs(x)*.16],
      [x*.93,.01+(big?.15:.066)+(i%2)*.018,jawZ+.018-Math.abs(x)*.16],big?.028:.017);
  }
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const z=(cave?.39:.68)-j*(cave?.075:.14);
    spike(R.head,teeth,[side*.20,-.105,z],[side*.178,-.205+(j%2)*.025,z+.018],.022);
    spike(R.jaw,teeth,[side*.173,.006,z-.028],[side*.152,.091,z-.006],.019);
  }
  R.eyes=[];
  for(const side of [-1,1]){
    const x=side*(cave?.148:.18),z=cave?.42:.448,y=cave?.067:.115;
    egg(R.head,shadow,x,y,z-.012,.146,.113,.045);
    const e=egg(R.head,eye,x,y,z+.022,cave?.081:.075,.063,.038);
    e.castShadow=false;R.eyes.push(e);
    if(!cave){
      egg(R.head,shadow,side*.080,.177,.439,.076,.069,.035);
      const small=egg(R.head,eye,side*.080,.177,.460,.046,.040,.027);
      small.castShadow=false;R.eyes.push(small);
    }
  }

  for(const side of [-1,1]){
    const S=side<0?'L':'R',sh=R['shoulder'+S],el=R['elbow'+S],wr=R['wrist'+S];
    const hip=R['hip'+S],kn=R['knee'+S],ank=R['ankle'+S];
    // Tapering cross sections avoid the old stack of equal capsules at every joint.
    loft(sh,skin,[[.09,.18,.16,0],[-.07,.23,.22,.008],[-.30,.20,.18,.015],
      [-.64,.16,.14,.02],[-.94,.115,.12,0],[-1.09,.12,.115,0]],10);
    loft(el,cave?shadow:skin,[[.07,.12,.12,0],[-.11,.145,.13,.018],[-.38,.16,.13,.035],
      [-.68,.12,.105,.025],[-.99,.09,.088,.005],[-1.18,.105,.10,0]],10);
    egg(sh,cave?tendon:skin,-side*.045,-.31,.065,.26,.58,.27,-side*.11);
    egg(el,cave?tendon:skin,side*.018,-.34,.055,.22,.51,.22,side*.09);
    // A fleshy hinge buries both end caps throughout the elbow bend.
    egg(el,skin,0,0,0,.25,.27,.25);
    egg(el,edge,0,-.015,-.055,.26,.19,.22);
    if(cave){
      rock(sh,plate,side*.04,-.045,.045,.50,.43,.47,side*.26);
      rock(sh,edge,-side*.05,-.33,.15,.32,.31,.16,-side*.29);
      rock(sh,plate,side*.08,-.71,.08,.25,.33,.25,side*.18);
      rock(el,plate,side*.02,-.30,.13,.34,.40,.18,-side*.22);
      rock(el,edge,-side*.045,-.63,.10,.26,.35,.17,side*.25);
      rock(el,plate,side*.055,-.91,.07,.23,.25,.17,-side*.19);
      // Plate coverage wraps around the turned IK limb; roots remain visible in seams.
      for(let j=0;j<3;j++){
        const a=Math.PI*(.48+j*.51),sign=j%2?1:-1;
        wrapPlate(sh,j===1?plate:edge,-.08+sign*.035,a,.19,.19,.31,.37,.12,sign*.20);
        wrapPlate(sh,plate,-.40+sign*.035,a+.09,.165,.15,.225,.33,.105,-sign*.17);
        wrapPlate(sh,j===1?edge:plate,-.76+sign*.03,a-.10,.116,.115,.18,.31,.088,sign*.16);
        wrapPlate(el,plate,-.26+sign*.035,a-.05,.135,.132,.245,.37,.11,sign*.21);
        wrapPlate(el,j===1?plate:edge,-.60+sign*.032,a+.12,.112,.104,.19,.32,.09,-sign*.19);
        wrapPlate(el,plate,-.92+sign*.027,a-.08,.09,.089,.16,.25,.075,sign*.13);
      }
      cords(sh,-side*.03,-.12,-.13,.91,4,.034,side);
      cords(el,side*.035,-.04,-.10,1.05,4,.031,-side);
      path(el,tendon,[[side*.12,-.02,.06],[-side*.11,-.41,.14],
        [side*.10,-.78,.11],[0,-1.10,.085]],.032);
      rock(sh,edge,side*.04,.145,-.035,.39,.18,.32,side*.31);
      spike(sh,plate,[side*.06,.18,-.04],[side*.19,.63+side*.07,-.10],.095);
      spike(sh,edge,[side*.17,.08,.10],[side*.41,.32,.10],.090);
      weed(sh,side*.14,.035,-.14,.60,side);
      weed(el,side*.12,-.38,-.08,.71,-side);
      weed(el,-side*.08,-.57,.14,.38,side);
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
    loft(wr,skin,[[.10,.095,.095,-.01],[.025,.108,.105,-.005],[-.04,.18,.17,.065],[-.105,.14,.13,.085]],12);
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
    rod(th,skin,[0,0,0],[0,0,.16],.038,.027,7);
    egg(th,plate,0,.017,.038,.072,.043,.084);
    talon(th.userData.tip,[0,0,0],[0,-.012,.075],[0,-.068,.145],.030);

    // Short powerful hind legs retain the exact foot reach of the pose/IK rig.
    loft(hip,skin,[[.08,.155,.17,.015],[-.13,.22,.21,.025],[-.37,.20,.18,.030],
      [-.60,.13,.135,.01],[-.76,.12,.12,0]],10);
    loft(kn,skin,[[.05,.12,.13,0],[-.15,.145,.14,-.006],[-.34,.12,.13,-.026],
      [-.54,.087,.095,0],[-.68,.10,.10,0]],9);
    egg(hip,cave?shadow:skin,-side*.045,-.27,-.085,.31,.50,.29,side*.13);
    egg(kn,plate,0,-.025,.105,.22,.18,.10);
    if(cave){
      rock(hip,plate,side*.035,-.26,.15,.29,.40,.19,-side*.19);
      rock(hip,edge,-side*.07,-.55,.055,.23,.22,.23,side*.22);
      rock(kn,plate,side*.02,-.25,.12,.25,.32,.16,side*.14);
      rock(kn,edge,-side*.025,-.51,.085,.22,.24,.13,-side*.19);
      for(const a of [Math.PI*.52,Math.PI,Math.PI*1.48]){
        wrapPlate(hip,plate,-.25,a,.18,.17,.25,.36,.11,side*.16);
        wrapPlate(hip,edge,-.56,a,.123,.12,.19,.25,.082,-side*.20);
        wrapPlate(kn,plate,-.28,a,.114,.12,.19,.34,.082,side*.12);
      }
      cords(hip,0,-.10,-.15,.61,3,.030,side);
      cords(kn,0,-.04,-.10,.57,3,.024,-side);
      weed(hip,side*.11,-.15,-.085,.43,side);
    }else{
      egg(hip,plate,side*.02,-.24,.15,.235,.42,.105,-side*.18);
      rock(hip,edge,-side*.11,-.28,-.13,.20,.39,.12,side*.15);
      path(kn,plate,[[side*.095,-.09,-.07],[side*.10,-.33,-.09],[side*.05,-.58,-.04]],.027);
      path(kn,edge,[[0,-.10,.11],[.02,-.32,.13],[0,-.61,.071]],.031);
      path(hip,tendon,[[side*.12,-.10,.105],[side*.13,-.41,.11],[side*.06,-.70,.07]],.024);
    }
    // Ankle socket tapers into the broad planted foot and embedded talon roots.
    loft(ank,skin,[[.10,.094,.095],[.015,.112,.14,.06],[-.055,.14,.21,.13],[-.115,.10,.16,.13]],12);
    if(cave)rock(ank,plate,0,-.005,.055,.28,.14,.29,side*.12);
    for(let j=0;j<3;j++){
      const x=(j-1)*.087;
      rod(ank,cave?tendon:edge,[x*.75,-.025,.14],[x,-.04,.33],.039,.027,7);
      talon(ank,[x,-.045,.29],[x*1.08,-.057,.40],[x*1.13,-.10,.49],.031);
    }
    talon(ank,[0,-.025,-.04],[0,-.035,-.12],[0,-.09,-.18],.028);
  }
  R.eyeMat=eye;
  return eye;
}
