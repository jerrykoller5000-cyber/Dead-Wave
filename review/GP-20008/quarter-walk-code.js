(async () => {
  const T=TT, out=[], wait=ms=>new Promise(r=>setTimeout(r,ms));
  await startMatch(T,'QuarterWalk');
  T.runDevCommand('godmode');
  if(T.skipGrace) T.skipGrace();
  const cases=[
    {id:'NE',gap:[-50,115],normal:[-.707,-.707]},
    {id:'NW',gap:[91.54,69.7],normal:[-.917,.4]},
    {id:'SW',gap:[68,-105],normal:[.97,.25]},
    {id:'SE shore',start:[-55.25,-72.25],goal:[-61.5,-67.0]},
  ];
  for(const c of cases){
    T.clearZombies();
    const choices=c.gap?[8,7,6].map(d=>({start:[c.gap[0]-c.normal[0]*d,c.gap[1]-c.normal[1]*d],
      goal:[c.gap[0]+c.normal[0]*d,c.gap[1]+c.normal[1]*d]})):[{start:c.start,goal:c.goal}];
    const pair=choices.find(p=>T.waterDepthAt(...p.start)<=.05&&T.waterDepthAt(...p.goal)<=.05&&
      !T.wallBandsDbg.blocked(...p.start,.4)&&!T.wallBandsDbg.blocked(...p.goal,.4));
    if(!pair){out.push({id:c.id,pass:false,reason:'no dry starts on opposite sides'});continue;}
    const [sx,sz]=pair.start,[gx,gz]=pair.goal;
    T.player.position.set(gx,T.sampleHeight(gx,gz),gz);
    const z=T.spawnZombie(sx,sz,'shambler',true,true);
    if(!z){out.push({id:c.id,pass:false,reason:'spawn refused',pair});continue;}
    const dx=gx-sx,dz=gz-sz,len=Math.hypot(dx,dz)||1;
    const half=[(sx+gx)/2,(sz+gz)/2],toGoal=p=>(p.x-half[0])*dx+(p.z-half[1])*dz>0;
    const t0=T.getSimTime(),w0=Date.now();let crossed=false,clip=false,stuck=0;
    let old={x:sx,z:sz},lastMove=t0;
    while(T.getSimTime()-t0<55&&Date.now()-w0<35000){
      await wait(80);
      if(!z.alive)break;
      const p=z.mesh.position;
      if(T.wallBandsDbg.blocked(p.x,p.z,.05))clip=true;
      if(toGoal(p)){crossed=true;break;}
      if(Math.hypot(p.x-old.x,p.z-old.z)>.4){old={x:p.x,z:p.z};lastMove=T.getSimTime();}
      stuck=Math.max(stuck,T.getSimTime()-lastMove);
      if(stuck>4)break;
    }
    const p=z.mesh.position;
    out.push({id:c.id,pass:crossed&&!clip&&stuck<=4,start:pair.start,goal:pair.goal,
      end:[+p.x.toFixed(1),+p.z.toFixed(1)],sim:+(T.getSimTime()-t0).toFixed(1),
      real:+((Date.now()-w0)/1000).toFixed(1),crossed,clip,stuck:+stuck.toFixed(1)});
  }
  return out;
})()
