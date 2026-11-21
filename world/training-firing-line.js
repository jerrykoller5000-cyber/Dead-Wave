// GP-19907: fixed firing bench, open shot slot and overhead containment mesh.
// Geometry is local to the training ground; solids use its world origin.
import {bakeStatic} from './bake.js';
import {chainLinkTexture,CHAIN_LINK_TILE} from '../game/training-perimeter.js';
export const FIRING_LINE = Object.freeze({front:.18,back:.82,top:.86,gapTop:2.15,postWidth:.075});
// CG-1 (D-218): the range ceiling (game/training-ceiling.js) has its deck underside 15 mm below the wall top and a
// supply duct along the +x wall (box .58 x .46 at x 7.12, its top on the deck). The frame now hangs from the deck's
// underside and frames an opening round the duct instead of running its top rail and mesh through it.
export const RANGE_CEILING_SEAT = Object.freeze({deckDrop:.015,duct:Object.freeze({minX:6.83,maxX:7.41,drop:.475}),
  pipe:Object.freeze({x:-7.25,drop:.16,r:.045})});   // CG-1: the sprinkler pipe (training-ceiling.js) crosses the screen here
export function buildFiringLine(T,{root,origin,range,height,box,std,keep,steel,steelLight,hazard}) {
 const F=FIRING_LINE,w=range.maxX-range.minX,cx=(range.minX+range.maxX)/2,z=(F.front+F.back)/2;
 const group=new T.Group();group.name='training-firing-bench';root.add(group);
 const panel=std({color:0x39463e,roughness:.82,metalness:.3});
 const rubber=std({color:0x202725,roughness:.94,metalness:.02});
 // CG-1 (CF-20 #9, Director 00:35Z): the screen is the same 6 cm chain-link alpha pattern as the fences (was 32 cm strips).
 const linkTex=keep(chainLinkTexture(T));
 const wire=std({color:0x79877f,roughness:.7,metalness:.55,side:T.DoubleSide,map:linkTex,transparent:true,alphaTest:.04});
 const addBox=(a,b,c,mat,x,y,at)=>box(a,b,c,mat,x,y,at,group);
 const worktopH=.07,worktopBot=F.top-worktopH,railH=.075,panelH=worktopBot-railH;
 // A waist-high worktop over a closed kick panel: one continuous bench, seated flush on y=0 with zero overlap.
 addBox(w,worktopH,F.back-F.front,rubber,cx,F.top-worktopH/2,z);
 addBox(w,panelH,.075,panel,cx,railH+panelH/2,F.front+.0375);
 addBox(w,railH,.075,steel,cx,railH/2,F.front+.0375);
 addBox(w,worktopH,.018,steelLight,cx,F.top-worktopH/2,F.front-.009);
 addBox(w,.012,.035,hazard,cx,F.top+.006,F.front+.0175);
 const solids=[],solid=(x0,x1,y0,y1,z0,z1,flags={})=>solids.push({minX:origin.x+x0,maxX:origin.x+x1,minY:origin.y+y0,maxY:origin.y+y1,minZ:origin.z+z0,maxZ:origin.z+z1,metal:true,firingLine:true,...flags});
 solid(range.minX,range.maxX,0,F.top,F.front,F.back);
 // Ceiling-hung posts stay above the slot; wall-end anchors sit flush inside [range.minX, range.maxX].
 const halfP=F.postWidth/2,fenceZ=F.back-.075,plateH=.035,ceil=height-RANGE_CEILING_SEAT.deckDrop,ceilRailY=ceil-plateH-.0325;
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
  addBox(.065,worktopBot,.065,steel,legX,worktopBot/2,F.front+.39);
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
 bakeStatic(T,group);group.traverse(o=>{if(o.geometry&&o.userData.baked)keep(o.geometry);});
 return {group,solids,front:F.front,top:F.top,gapTop:F.gapTop};
}
