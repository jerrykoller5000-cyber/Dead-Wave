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
 // A waist-high worktop over a closed kick panel: one continuous bench, not separate booths.
 addBox(w,.07,F.back-F.front,rubber,cx,F.top-.035,z);
 addBox(w,.72,.09,panel,cx,.405,F.front+.06);
 addBox(w,.075,.075,steel,cx,.055,F.front+.06);
 addBox(w,.05,.07,steelLight,cx,F.top-.025,F.front+.025);
 addBox(w,.025,.05,hazard,cx,F.top-.01,F.front+.055);
 const solids=[],solid=(x0,x1,y0,y1,z0,z1,flags={})=>solids.push({minX:origin.x+x0,maxX:origin.x+x1,minY:origin.y+y0,maxY:origin.y+y1,minZ:origin.z+z0,maxZ:origin.z+z1,metal:true,firingLine:true,...flags});
 solid(range.minX,range.maxX,0,F.top,F.front,F.back);
 // Ceiling-hung posts stay above the slot; only the wall-end anchors run full height.
 const posts=[range.minX,-4.5,-1.5,1.5,4.5,range.maxX].filter(x=>x>=range.minX&&x<=range.maxX);
 const fenceZ=F.back-.075;
 for(const x of posts){
  const bottom=x===range.minX||x===range.maxX?0:F.gapTop;
  addBox(F.postWidth,height-bottom,F.postWidth,steel,x,(height+bottom)/2,fenceZ);
  if(bottom===0)addBox(.22,.035,.23,steelLight,x,.018,fenceZ);
  addBox(.23,.035,.23,steelLight,x,height-.018,fenceZ);
  addBox(.065,.73,.065,steel,x,.365,F.front+.45);
  solid(x-F.postWidth/2,x+F.postWidth/2,bottom,height,fenceZ-F.postWidth/2,fenceZ+F.postWidth/2,{firingFrame:true});
 }
 for(const y of [F.gapTop,height-.065])addBox(w,.065,.065,steel,cx,y,fenceZ);
 addBox(w,.06,.06,steel,cx,.27,F.back-.06);
 // One geometric diamond mesh: no alpha blending or per-link draw calls.
 const positions=[],low=F.gapTop+.05,high=height-.1;
 const ribbon=(x0,y0,x1,y1)=>{
  const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),sx=-dy/len*.0055,sy=dx/len*.0055;
  const q=[[x0+sx,y0+sy,fenceZ],[x1+sx,y1+sy,fenceZ],[x1-sx,y1-sy,fenceZ],[x0-sx,y0-sy,fenceZ]];
  for(const i of [0,1,2,0,2,3])positions.push(...q[i]);
 };
 for(const slope of [-1,1])for(let c=low-w;c<=high+w;c+=.32){
  const a=Math.max(0,slope===1?low-c:c-high),b=Math.min(w,slope===1?high-c:c-low);
  if(b>a+.01)ribbon(range.minX+a,slope*a+c,range.minX+b,slope*b+c);
 }
 const geo=keep(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
 const mesh=new T.Mesh(geo,wire);mesh.receiveShadow=true;group.add(mesh);
 solid(range.minX,range.maxX,F.gapTop,height,fenceZ-.045,fenceZ+.045,{firingFence:true});
 bakeStatic(T,group);group.traverse(o=>{if(o.geometry&&o.userData.baked)keep(o.geometry);});
 return {group,solids,front:F.front,top:F.top,gapTop:F.gapTop};
}
