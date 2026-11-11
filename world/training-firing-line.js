// GP-19907: fixed firing bench, open shot slot and overhead containment mesh.
// Geometry is local to the training ground; solids use its world origin.
import {bakeStatic} from './bake.js';
export const FIRING_LINE = Object.freeze({front:.18,back:.82,top:.86,gapTop:2.15,postWidth:.075});
export function buildFiringLine(T,{root,origin,range,height,box,std,keep,steel,steelLight,hazard}) {
 const F=FIRING_LINE,w=range.maxX-range.minX,cx=(range.minX+range.maxX)/2,z=(F.front+F.back)/2;
 const group=new T.Group();group.name='training-firing-bench';root.add(group);
 const panel=std({color:0x39463e,roughness:.82,metalness:.3});
 const rubber=std({color:0x202725,roughness:.94,metalness:.02});
 const wire=std({color:0x79877f,roughness:.7,metalness:.55,side:T.DoubleSide});
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
 const halfP=F.postWidth/2,fenceZ=F.back-.075,plateH=.035,ceilRailY=height-plateH-.0325;
 const posts=[range.minX+halfP,-4.5,-1.5,1.5,4.5,range.maxX-halfP].filter(x=>x>=range.minX&&x<=range.maxX);
 for(let i=0;i<posts.length;i++){
  const x=posts[i],isLeft=i===0,isRight=i===posts.length-1,isEnd=isLeft||isRight;
  const plateW=isEnd?.14:.23,plateX=isLeft?range.minX+plateW/2:isRight?range.maxX-plateW/2:x;
  if(isEnd){
   addBox(plateW,plateH,.19,steelLight,plateX,plateH/2,fenceZ);
   addBox(F.postWidth,worktopBot-plateH,F.postWidth,steel,x,(plateH+worktopBot)/2,fenceZ);
   addBox(F.postWidth,(height-plateH)-F.top,F.postWidth,steel,x,(F.top+height-plateH)/2,fenceZ);
  }else{
   const pBot=F.gapTop-.0325,pTop=height-plateH;
   addBox(F.postWidth,pTop-pBot,F.postWidth,steel,x,(pBot+pTop)/2,fenceZ);
  }
  addBox(plateW,plateH,.21,steelLight,plateX,height-plateH/2,fenceZ);
  const legX=isLeft?range.minX+.0325:isRight?range.maxX-.0325:x;
  addBox(.065,worktopBot,.065,steel,legX,worktopBot/2,F.front+.39);
  const bottom=isEnd?0:F.gapTop;
  solid(x-halfP,x+halfP,bottom,height,fenceZ-halfP,fenceZ+halfP,{firingFrame:true});
 }
 for(let i=0;i<posts.length-1;i++){
  const x0=posts[i]+halfP,x1=posts[i+1]-halfP,bw=x1-x0,bcx=(x0+x1)/2;
  for(const y of [F.gapTop,ceilRailY])addBox(bw,.065,.065,steel,bcx,y,fenceZ);
 }
 addBox(w-2*F.postWidth,.06,.06,steel,cx,.27,fenceZ);
 // Geometric diamond mesh per clear bay: baked to one draw call, zero overlap with posts or rails.
 const low=F.gapTop+.0325+.006,high=ceilRailY-.0325-.006;
 for(let i=0;i<posts.length-1;i++){
  const bx0=posts[i]+halfP+.006,bx1=posts[i+1]-halfP-.006,bw=bx1-bx0;
  if(bw<=.02)continue;
  const positions=[];
  const ribbon=(x0,y0,x1,y1)=>{
   const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),sx=-dy/len*.0055,sy=dx/len*.0055;
   const q=[[x0+sx,y0+sy,fenceZ],[x1+sx,y1+sy,fenceZ],[x1-sx,y1-sy,fenceZ],[x0-sx,y0-sy,fenceZ]];
   for(const k of [0,1,2,0,2,3])positions.push(...q[k]);
  };
  for(const slope of [-1,1])for(let c=low-bw;c<=high+bw;c+=.32){
   const a=Math.max(0,slope===1?low-c:c-high),b=Math.min(bw,slope===1?high-c:c-low);
   if(b>a+.01)ribbon(bx0+a,slope*a+c,bx0+b,slope*b+c);
  }
  const geo=keep(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,wire);mesh.receiveShadow=true;group.add(mesh);
 }
 solid(range.minX,range.maxX,F.gapTop,height,fenceZ-.045,fenceZ+.045,{firingFence:true});
 bakeStatic(T,group);group.traverse(o=>{if(o.geometry&&o.userData.baked)keep(o.geometry);});
 return {group,solids,front:F.front,top:F.top,gapTop:F.gapTop};
}
