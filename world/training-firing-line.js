// GP-19907: fixed firing bench, open shot slot and overhead containment mesh.
// Geometry is local to the training ground; solids use its world origin.
import {bakeStatic} from './bake.js';
import {chainLinkTexture,CHAIN_LINK_TILE} from '../game/training-perimeter.js';
import {getTrainingPBR,applyWorldUVByMaterial} from './training-textures.js';
export const FIRING_LINE = Object.freeze({front:.18,back:.82,top:.86,gapTop:2.15,postWidth:.075});
// CG-1 (D-218): the range ceiling (game/training-ceiling.js) has its deck underside 15 mm below the wall top and a
// supply duct along the +x wall (box .58 x .46 at x 7.12, its top on the deck). The frame now hangs from the deck's
// underside and frames an opening round the duct instead of running its top rail and mesh through it.
export const RANGE_CEILING_SEAT = Object.freeze({deckDrop:.015,duct:Object.freeze({minX:6.83,maxX:7.41,drop:.475}),
  pipe:Object.freeze({x:-7.25,drop:.16,r:.045})});   // CG-1: the sprinkler pipe (training-ceiling.js) crosses the screen here
export function buildFiringLine(T,{root,origin,range,height,box,std,keep,steel,steelLight,hazard}) {
 const F=FIRING_LINE,w=range.maxX-range.minX,cx=(range.minX+range.maxX)/2,z=(F.front+F.back)/2;
 const group=new T.Group();group.name='training-firing-bench';root.add(group);
 const pbr=getTrainingPBR(T);
 const panel=std(pbr?pbr.benchPanel.opts({color:0xffffff}):{color:0x39463e,roughness:.74,metalness:.12});   // AG-405: PBR powder-coated olive-slate steel
 const rubber=std(pbr?pbr.rubberCrumb.opts({color:0x353f3c,normalScale:.95}):{color:0x202725,roughness:.94,metalness:.02});
 // CG-1 (CF-20 #9, Director 00:35Z): the screen is the same 6 cm chain-link alpha pattern as the fences (was 32 cm strips).
 const linkTex=keep(chainLinkTexture(T));
 const wire=std({color:0x9aa8a0,roughness:.52,metalness:.68,side:T.DoubleSide,map:linkTex,transparent:true,alphaTest:.04});
 const addBox=(a,b,c,mat,x,y,at)=>box(a,b,c,mat,x,y,at,group);
 const worktopH=.07,worktopBot=F.top-worktopH,railH=.075,panelH=worktopBot-railH;
 const halfP=F.postWidth/2;
 // CG-7 s3 (CF-23 / D-240, Director's loan of the bench part): the bench at the guns' detail. Was five flat boxes (a rubber
 // slab, a green slab, a steel strip, a steel band, the hazard strip). Now, front to back: a rolled steel nosing angle
 // (the broom still rests on its corner, z 0.162 y 0.86), the hazard strip on its top leg, a ribbed rubber mat (top 0.86,
 // where the props stand), a steel deck and aprons under it, a back angle; below, the kick panel in five bays (raised
 // panels with two pressed ribs each, steel cover battens with hex bolts at the bay joints), a recessed steel toe plinth;
 // behind, the legs on bolted foot plates with a stretcher. Every edge has a 1-3 mm bevel. Same materials: the group
 // still bakes to the same draws. A round on it says what it hit (world/training-hitfx.js): rubber crumbs off the mat,
 // sparks and green paint flecks off the kick panel, sparks off the steel.
 const canExtrude=!!(T.Shape&&T.ExtrudeGeometry);
 const put=(geo,mat,x=0,y=0,zz=0,parent=group)=>{const m=new T.Mesh(keep(geo),mat);m.position.set(x,y,zz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 // a profile (an outline in the bench's z-y plane, [z, y] pairs) run along x from x0 to x1, its edges bevelled by bv
 const runX=(pts,x0,x1,mat,bv=.0015)=>{
  if(!canExtrude){let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(const [a,b] of pts){z0=Math.min(z0,a);z1=Math.max(z1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);}return addBox(x1-x0,y1-y0,z1-z0,mat,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2);}
  const s=new T.Shape();pts.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));
  const geo=new T.ExtrudeGeometry(s,{depth:Math.max(.001,x1-x0-2*bv),bevelEnabled:bv>0,bevelThickness:bv,bevelSize:bv,bevelSegments:1,curveSegments:2,steps:1});
  geo.rotateY(Math.PI/2);geo.translate(x0+bv,0,0);   // the shape's x becomes -z: build it with -z
  return put(geo,mat);
 };
 const prof=(pts)=>pts.map(([a,b])=>[-a,b]);   // [z, y] in the bench's frame -> the shape's frame (x = -z)
 // a plate w (x) by h (y), t thick (z), its front face at zf, bevelled bv (rounded corners rr)
 const plate=(pw,ph,t,mat,x,y,zf,bv=.0015,rr=.004)=>{
  if(!canExtrude)return addBox(pw,ph,t,mat,x,y,zf+t/2);
  const s=new T.Shape(),X=pw/2-bv,Y=ph/2-bv,r=Math.min(rr,X*.5,Y*.5);
  s.moveTo(-X+r,-Y);s.lineTo(X-r,-Y);s.quadraticCurveTo(X,-Y,X,-Y+r);s.lineTo(X,Y-r);s.quadraticCurveTo(X,Y,X-r,Y);
  s.lineTo(-X+r,Y);s.quadraticCurveTo(-X,Y,-X,Y-r);s.lineTo(-X,-Y+r);s.quadraticCurveTo(-X,-Y,-X+r,-Y);
  const geo=new T.ExtrudeGeometry(s,{depth:Math.max(.0005,t-2*bv),bevelEnabled:bv>0,bevelThickness:bv,bevelSize:bv,bevelSegments:1,curveSegments:2,steps:1});
  geo.translate(0,0,bv);return put(geo,mat,x,y,zf);
 };
 const bolt=(mat,x,y,zf,r=.0085,ax='z')=>{   // a hex bolt head (6 sides) with its washer, standing off a face
  const wsh=put(new T.CylinderGeometry(r*1.45,r*1.45,.0025,12),mat,x,y,zf);const hd=put(new T.CylinderGeometry(r,r,.006,6),mat,x,y,zf);
  if(ax==='z'){wsh.rotation.x=hd.rotation.x=Math.PI/2;wsh.position.z=zf-.00125;hd.position.z=zf-.0055;}
  else{wsh.position.y=y+.00125;hd.position.y=y+.0055;}
  return hd;
 };
 const x0=range.minX,x1=range.maxX,top=F.top,fr=F.front;
 // the nosing: a 3 mm steel angle, its outer corner rolled (r 4 mm), the front leg down to 0.775, the top leg 53 mm deep
 const nz=fr-.018,nt=.003,nr=.004,nb=.775,nd=.053;
 runX(prof([[nz,nb],[nz,top-nr],[nz+nr*.29,top-nr*.29],[nz+nr,top],[nz+nd,top],[nz+nd,top-nt-.0005],[nz+nt+.0005,top-nt-.0005],[nz+nt+.0005,nb]]),x0,x1,steelLight,.001);
 addBox(w,.012,.035,hazard,cx,F.top+.006,F.front+.0175);   // the hazard strip, on the nosing's top leg (unchanged)
 // the ribbed rubber mat, 10 mm, its long edges rounded; ribs 4 mm wide every 25 mm (the grooves 2.5 mm deep)
 { const m0=F.front+.035+.001,m1=F.back-.022,mt=.010,gd=.0025,pitch=.025,gw=.006,pts=[[m0,top-mt],[m0,top-.003],[m0+.003,top]];
   for(let zz=m0+.012;zz+gw<m1-.012;zz+=pitch){pts.push([zz,top],[zz+.0012,top-gd],[zz+gw-.0012,top-gd],[zz+gw,top]);}
   pts.push([m1-.003,top],[m1,top-.003],[m1,top-mt]);
   runX(prof(pts),x0+.004,x1-.004,rubber,.001); }
 // the deck plate under the mat (6 mm steel) and the two aprons (steel channels) it sits on
 addBox(w,.006,F.back-F.front-.04,steel,cx,top-.013,z);
 runX(prof([[fr,.79],[fr,top-.016],[fr+.05,top-.016],[fr+.05,top-.022],[fr+.006,top-.022],[fr+.006,.796],[fr+.05,.796],[fr+.05,.79]]),x0,x1,steel,.001);
 // the back angle: flush with the mat's top, its leg down the back
 runX(prof([[F.back-.022,top],[F.back,top],[F.back,.78],[F.back-.004,.78],[F.back-.004,top-.004],[F.back-.022,top-.004]]),x0,x1,steelLight,.001);
 // the kick panel: a backing sheet the full length (z fr+0.012 .. fr+0.075), raised bay panels proud of it, battens at the joints
 const bodyZ=fr+.012,bays=[x0+halfP,-4.5,-1.5,1.5,4.5,x1-halfP].filter(x=>x>=x0&&x<=x1);
 addBox(w,panelH+.005,.063,panel,cx,railH-.005+(panelH+.005)/2,bodyZ+.0315);
 for(let i=0;i<bays.length-1;i++){
  const a=i===0?x0:bays[i],b=i===bays.length-2?x1:bays[i+1],bx=(a+b)/2,pw=(b-a)-.1-(i===0?-.03:0)-(i===bays.length-2?-.03:0),py0=railH+.03,py1=nb-.02,ph=py1-py0;
  const pcx=bx+(i===0?-.015:0)+(i===bays.length-2?.015:0);
  plate(pw,ph,.012,panel,pcx,(py0+py1)/2,fr,.003,.012);                      // the raised panel, its edges rounded
  for(const ry of [py0+ph*.33,py0+ph*.67]){                                  // two pressed ribs along it
   const rib=put(new T.CylinderGeometry(.009,.009,pw-.06,10,1),panel,pcx,ry,fr+.002);rib.rotation.z=Math.PI/2;rib.scale.set(1,1,.6);
  }
 }
 for(let i=0;i<bays.length;i++){                                             // the cover battens and their bolts
  const bxx=i===0?x0+.03:i===bays.length-1?x1-.03:bays[i],bw=i===0||i===bays.length-1?.06:.07,by0=railH+.006,by1=nb-.004;
  plate(bw,by1-by0,.008,steel,bxx,(by0+by1)/2,fr-.008,.0015,.003);
  for(const by of [by0+.04,(by0+by1)/2,by1-.04])bolt(steelLight,bxx,by,fr-.008);
 }
 // the toe plinth, set back 25 mm (a shooter's toes go under the panel), its top edge bevelled. The extrude bevel grows the
 // outline by its 1 mm all round, so the profile starts 1 mm up: the bevelled bottom then sits on the floor (y 0), not
 // 1 mm into it (GP-20281 t336 hold).
 { const pb=.001; runX(prof([[fr+.025,pb],[fr+.025,railH-.006],[fr+.031,railH],[fr+.075,railH],[fr+.075,pb]]),x0,x1,steel,pb); }
 const solids=[],solid=(x0,x1,y0,y1,z0,z1,flags={})=>solids.push({minX:origin.x+x0,maxX:origin.x+x1,minY:origin.y+y0,maxY:origin.y+y1,minZ:origin.z+z0,maxZ:origin.z+z1,metal:true,firingLine:true,...flags});
 // CG-7 s3: the same one box; what a round knocks off it depends on the face it hits (world/training-hitfx.js kindOfHit):
 // the top behind the hazard strip is the rubber mat, the front below the nosing the painted kick panel, the rest steel.
 solid(range.minX,range.maxX,0,F.top,F.front,F.back,{fxUp:'rubber',fxUpMinZ:origin.z+F.front+.035,fxFace:'paint',fxFaceBelow:origin.y+nb});
 // Ceiling-hung posts stay above the slot; wall-end anchors sit flush inside [range.minX, range.maxX].
 const fenceZ=F.back-.075,plateH=.035,ceil=height-RANGE_CEILING_SEAT.deckDrop,ceilRailY=ceil-plateH-.0325;
 const posts=[range.minX+halfP,-4.5,-1.5,1.5,4.5,range.maxX-halfP].filter(x=>x>=range.minX&&x<=range.maxX);
 for(let i=0;i<posts.length;i++){
  const x=posts[i],isLeft=i===0,isRight=i===posts.length-1,isEnd=isLeft||isRight;
  const plateW=isEnd?.14:.23,plateX=isLeft?range.minX+plateW/2:isRight?range.maxX-plateW/2:x;
  if(isEnd){
   addBox(plateW,plateH,.19,steelLight,plateX,plateH/2,fenceZ);
   addBox(F.postWidth,worktopBot-plateH,F.postWidth,steel,x,(plateH+worktopBot)/2,fenceZ);
   addBox(F.postWidth,(ceil-plateH)-F.top,F.postWidth,steel,x,(F.top+ceil-plateH)/2,fenceZ);
  }else{
   const pBot=F.gapTop-.0325,pTop=ceil-plateH;
   addBox(F.postWidth,pTop-pBot,F.postWidth,steel,x,(pBot+pTop)/2,fenceZ);
  }
  addBox(plateW,plateH,.21,steelLight,plateX,ceil-plateH/2,fenceZ);
  const legX=isLeft?range.minX+.0325:isRight?range.maxX-.0325:x;
  // CG-7 s3: the leg (65 mm square tube) on a 12 mm foot plate with four anchor bolts, a cap plate under the deck
  const legZ=F.front+.39,ft=.012,legTop=top-.022;
  plate(.065,legTop-ft,.065,steel,legX,(ft+legTop)/2,legZ-.0325,.002,.006);
  { const fw=isEnd?.11:.15,fxx=isLeft?range.minX+fw/2:isRight?range.maxX-fw/2:legX;
    const fp=put(new T.BoxGeometry(fw,ft,.15),steel,fxx,ft/2,legZ);
    for(const ox of [-1,1])for(const oz of [-1,1]){const bxx=fxx+ox*(fw/2-.022);if(Math.abs(bxx-legX)>.04)bolt(steelLight,bxx,ft,legZ+oz*.053,.007,'y');} }

  const bottom=isEnd?0:F.gapTop;
  solid(x-halfP,x+halfP,bottom,height,fenceZ-halfP,fenceZ+halfP,{firingFrame:true});
 }
 // The duct opening: two studs either side of the duct, a header rail under it; the top rail stops at the studs.
 const duct=RANGE_CEILING_SEAT.duct,ductBot=ceil+RANGE_CEILING_SEAT.deckDrop-duct.drop,studL=duct.minX-.0375,studR=duct.maxX+.0375,headerY=ductBot-.0325-.004;
 const hasDuct=duct.minX>range.minX&&duct.maxX<range.maxX;
 const rail=(a,b,y)=>{if(b-a>.005)addBox(b-a,.065,.065,steel,(a+b)/2,y,fenceZ);};
 for(let i=0;i<posts.length-1;i++){
  const x0=posts[i]+halfP,x1=posts[i+1]-halfP;
  rail(x0,x1,F.gapTop);
  if(hasDuct&&x0<studL&&x1>studR){rail(x0,studL-.0325,ceilRailY);rail(studR+.0325,x1,ceilRailY);}
  else rail(x0,x1,ceilRailY);
 }
 if(hasDuct){
  for(const sx of [studL,studR])addBox(.065,(ceilRailY+.0325)-(headerY-.0325),.065,steel,sx,((ceilRailY+.0325)+(headerY-.0325))/2,fenceZ);
  rail(studL+.0325,studR-.0325,headerY);
 }
 addBox(w-2*F.postWidth,.06,.06,steel,cx,.27,fenceZ);
 // Chain-link fabric per clear bay (CG-1): baked to one draw call, zero overlap with posts or rails.
 const low=F.gapTop+.0325+.006,high=ceilRailY-.0325-.006;
 const rects=[];
 for(let i=0;i<posts.length-1;i++){
  const bx0=posts[i]+halfP+.006,bx1=posts[i+1]-halfP-.006;
  if(hasDuct&&bx0<studL&&bx1>studR){
   rects.push([bx0,studL-.0325-.006,high],[studL+.0325+.006,studR-.0325-.006,headerY-.0325-.006],[studR+.0325+.006,bx1,high]);
  }else rects.push([bx0,bx1,high]);
 }
 // CG-1 (CF-19 #49): the sprinkler pipe ran 3 cm through the mesh; the bay it crosses keeps a notch under it.
 const pipe=RANGE_CEILING_SEAT.pipe,pipeBot=height-pipe.drop-pipe.r-.006,pl=pipe.x-pipe.r-.03,pr=pipe.x+pipe.r+.03;
 for(let i=rects.length-1;i>=0;i--){const [a,b,top]=rects[i];if(a<pl&&b>pr&&top>pipeBot)rects.splice(i,1,[a,pl,top],[pl,pr,pipeBot],[pr,b,top]);}
 for(const [bx0,bx1,top] of rects){
  const bw=bx1-bx0;
  if(bw<=.02||top<=low+.02)continue;
  // one flat quad a clear rect, uv in metres / CHAIN_LINK_TILE (so the diamonds line up bay to bay)
  const q=[[bx0,low],[bx1,low],[bx1,top],[bx0,top]],positions=[],uvs=[];
  for(const k of [0,1,2,0,2,3]){positions.push(q[k][0],q[k][1],fenceZ);uvs.push(q[k][0]/CHAIN_LINK_TILE,q[k][1]/CHAIN_LINK_TILE);}
  const geo=keep(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,wire);mesh.receiveShadow=true;group.add(mesh);
 }
 solid(range.minX,range.maxX,F.gapTop,height,fenceZ-.045,fenceZ+.045,{firingFence:true});
 applyWorldUVByMaterial(group,new Map([[panel,2.2],[rubber,.5],[steel,1.0],[steelLight,.9]]));
 bakeStatic(T,group);group.traverse(o=>{if(o.geometry&&o.userData.baked)keep(o.geometry);});
 return {group,solids,front:F.front,top:F.top,gapTop:F.gapTop};
}
