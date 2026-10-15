import {bakeStatic} from '../world/bake.js';
import {viewCrossesPlane} from '../world/training-cutaway.js';
import {createTrainingBlockers} from './training-infirmary.js';

export function isTrainingBorderCell(b,gx,gz) {
  return gx>=b.minGX&&gx<=b.maxGX&&gz>=b.minGZ&&gz<=b.maxGZ&&
    (gx===b.minGX||gx===b.maxGX||gz===b.minGZ||gz===b.maxGZ);
}
// Keep the portion of a border square outside the actual medical enclosure.
export function trainingBorderPaintRect(b,gx,gz,medical,inset=.035) {
  const h=b.grid/2;let x0=gx*b.grid+b.offset-h+inset,x1=x0+b.grid-2*inset,z0=gz*b.grid+b.offset-h+inset,z1=z0+b.grid-2*inset;
  if(medical&&x0<medical.maxX&&x1>medical.minX&&z0<medical.maxZ&&z1>medical.minZ) {
    if(gx===b.minGX)z0=Math.max(z0,medical.maxZ+inset);
    else if(gz===b.minGZ)x0=Math.max(x0,medical.maxX+inset);
    else return null;
  }
  return x1>x0+.01&&z1>z0+.01?{x0,x1,z0,z1}:null;
}
// Trim the mesh, rails and razor coils around the full pillar footprint. The
// continuous collision proxy still seals the pillar/fence joint.
export function trainingFenceSpans(s,columns,pad=.34) {
  const dx=s.x1-s.x0,dz=s.z1-s.z0,blocked=[];
  for(const c of columns){let lo=0,hi=1;
    for(const [a,d,min,max]of[[s.x0,dx,c.minX-pad,c.maxX+pad],[s.z0,dz,c.minZ-pad,c.maxZ+pad]]) {
      if(Math.abs(d)<1e-9){if(a<min||a>max){hi=-1;break;}}
      else {let p=(min-a)/d,q=(max-a)/d;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);}
    }
    if(hi>lo)blocked.push([lo,hi]);
  }
  blocked.sort((a,b)=>a[0]-b[0]);let at=0;const spans=[];
  const add=(lo,hi)=>{if((hi-lo)*Math.hypot(dx,dz)>.02)spans.push({...s,x0:s.x0+dx*lo,z0:s.z0+dz*lo,x1:s.x0+dx*hi,z1:s.z0+dz*hi});};
  for(const [lo,hi]of blocked){if(lo>at)add(at,lo);at=Math.max(at,hi);}if(at<1)add(at,1);return spans;
}
export function trainingRazorSpans(s,columns) {
  // A clean break aligned with each nearby wall pillar reads better from every
  // camera angle than coils crossing directly in front of the black steel.
  const alongZ=s.x0===s.x1&&(s.side==='west'||s.side==='east');
  const projected=alongZ?columns.filter(c=>Math.abs((c.minX+c.maxX)/2-s.x0)<2.5).map(c=>({...c,minX:s.x0-.01,maxX:s.x0+.01})):columns;
  return trainingFenceSpans(s,projected);
}
export function trainingPerimeterLayout(tg) {
  const b=tg.build,g=b.grid,o=b.offset,h=g/2;
  const room={minX:b.minGX*g+o-h,maxX:b.maxGX*g+o+h,minZ:b.minGZ*g+o-h,maxZ:b.maxGZ*g+o+h};
  const west=room.minX+g,east=room.maxX-g,south=room.minZ+g,north=room.maxZ-5*g;
  const medical={minX:tg.bed.centre.x-3.15,maxX:tg.bed.centre.x+4.55,minZ:tg.bed.centre.z-2,maxZ:tg.bed.centre.z+2.15};
  const segments=[];
  const add=(side,x0,z0,x1,z1)=>{if(Math.hypot(x1-x0,z1-z0)>.01)segments.push({side,x0,z0,x1,z1});};
  // Recesses preserve access to both wall stations; the reserved floor remains continuous.
  const gaps=[tg.stations.skullWindow,tg.stations.hqPanel].map(s=>[s.z-1.6,s.z+1.6]).sort((a,b)=>a[0]-b[0]);
  let at=medical.maxZ+g/4;
  add('west',room.minX,at,west,at);
  for(const [lo,hi] of gaps){add('west',west,at,west,lo);add('west',west,lo,room.minX,lo);add('west',room.minX,hi,west,hi);at=hi;}
  add('west',west,at,west,north);add('west',west,north,room.minX,north);
  const start=medical.maxX+g/4;
  add('south',start,room.minZ,start,south);add('south',start,south,east,south);
  const d=tg.securityDoor,lo=d.minZ-.5,hi=d.maxZ+.5;
  add('east',east,south,east,lo);add('east',east,lo,room.maxX,lo);
  add('east',room.maxX,hi,east,hi);add('east',east,hi,east,north);add('east',east,north,room.maxX,north);
  return {room,medical,segments};
}

export function createTrainingPerimeter(T,tg) {
  const layout=trainingPerimeterLayout(tg),height=2.35,top=2.83,floor=tg.floorY;
  const root=new T.Group();root.name='training-razor-perimeter';tg.group.add(root);root.updateWorldMatrix(true,true);
  const entries=[],owned=[],columns=tg.solids.filter(s=>s.column);
  const renderSpans=layout.segments.flatMap(s=>trainingFenceSpans(s,columns));
  for(const side of ['west','south','east']) {
    const group=new T.Group();group.name='training-perimeter-'+side;root.add(group);
    const frame=new T.MeshStandardMaterial({color:0x39453e,roughness:.78,metalness:.5});
    const wire=new T.MeshStandardMaterial({color:0x7c8980,roughness:.72,metalness:.55,side:T.DoubleSide});
    owned.push(frame,wire);const pos=[];
    const strip=(a,b,width,normal)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
      let v=new T.Vector3(dx,dy,dz).cross(new T.Vector3(...normal)).normalize().multiplyScalar(width/2);
      const q=[[a[0]+v.x,a[1]+v.y,a[2]+v.z],[b[0]+v.x,b[1]+v.y,b[2]+v.z],[b[0]-v.x,b[1]-v.y,b[2]-v.z],[a[0]-v.x,a[1]-v.y,a[2]-v.z]];
      for(const i of [0,1,2,0,2,3])pos.push(...q[i]);
    };
    for(const s of renderSpans.filter(s=>s.side===side)) {
      const dx=s.x1-s.x0,dz=s.z1-s.z0,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      const at=(u,y,v=0)=>[s.x0+ux*u-uz*v-tg.origin.x,y,s.z0+uz*u+ux*v-tg.origin.z];
      const box=(u,y,w,h,d)=>{const geo=new T.BoxGeometry(w,h,d);owned.push(geo);const m=new T.Mesh(geo,frame);m.position.fromArray(at(u,y));m.rotation.y=-Math.atan2(uz,ux);group.add(m);};
      const n=Math.ceil(len/2.5);for(let i=0;i<=n;i++){box(len*i/n,height/2,.075,height,.075);box(len*i/n,.025,.22,.04,.22);}
      for(const y of [.15,height-.08])box(len/2,y,len,.06,.06);
      const low=.22,high=height-.17;
      for(const slope of [-1,1])for(let c=-len-high;c<len+high;c+=.32){
        const a=Math.max(0,slope===1?low-c:c-high),b=Math.min(len,slope===1?high-c:c-low);
        if(b>a+.01)strip(at(a,slope*a+c),at(b,slope*b+c),.011,[-uz,0,ux]);
      }
      // Concertina razor ribbon, with pointed paired blades rather than barbed-wire crosses.
      for(const r of trainingRazorSpans(s,columns)) {
      const start=(r.x0-s.x0)*ux+(r.z0-s.z0)*uz,length=Math.hypot(r.x1-r.x0,r.z1-r.z0),steps=Math.ceil(length/.42)*16;
      for(let i=0;i<steps;i++){
        const u0=start+length*i/steps,u1=start+length*(i+1)/steps,a=u0/.42*Math.PI*2,b=u1/.42*Math.PI*2;
        const p=at(u0,height+.24+Math.sin(a)*.22,Math.cos(a)*.22),q=at(u1,height+.24+Math.sin(b)*.22,Math.cos(b)*.22);
        strip(p,q,.022,[-uz,0,ux]);
        if(i%4===0)for(const sign of [-1,1])strip(p,at(u0+.09,height+.24+Math.sin(a)*(.22+sign*.075),Math.cos(a)*(.22+sign*.075)),.045,[-uz,0,ux]);
      }
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.computeVertexNormals();owned.push(geo);group.add(new T.Mesh(geo,wire));
    bakeStatic(T,group);group.traverse(m=>{if(m.geometry)owned.push(m.geometry);});
    const box=new T.Box3().setFromObject(group);
    entries.push({group,frame,wire,axis:side==='south'?'z':'x',at:side==='south'?layout.room.minZ+tg.build.grid:side==='west'?layout.room.minX+tg.build.grid:layout.room.maxX-tg.build.grid,
      bounds:side==='south'?[['x',box.min.x,box.max.x],['y',floor,floor+top]]:[['z',box.min.z,box.max.z],['y',floor,floor+top]],opacity:1});
  }
  const solids=layout.segments.map(s=>({minX:Math.min(s.x0,s.x1)-.045,maxX:Math.max(s.x0,s.x1)+.045,minZ:Math.min(s.z0,s.z1)-.045,maxZ:Math.max(s.z0,s.z1)+.045,minY:floor,maxY:floor+top,metal:true,perimeterFence:true,perimeterSide:s.side}));
  tg.solids.push(...solids);const blocker=createTrainingBlockers(solids);let previous=new WeakMap();
  // Reuse the shell's camera-only query: faded wire must not catch the aim cursor.
  // The ordinary bullet, laser and body queries continue to hit the physical fence.
  const oldIgnore=tg.cutaway?.ignoreSolid;
  const ignore=s=>s.perimeterFence?entries.some(e=>e.group.name==='training-perimeter-'+s.perimeterSide&&e.opacity<.5):oldIgnore?.(s)||false;
  if(tg.cutaway)tg.cutaway.ignoreSolid=ignore;
  return {
    group:root,layout,solids,renderSpans,constrain:blocker.constrain,
    reset(){previous=new WeakMap();},
    keepZombie(z){const p=z.mesh?.position;if(!p)return;const from=previous.get(z)||p;const v=blocker.constrain(p,from,(z.radius||.42)+.06);p.x=v.x;p.z=v.z;previous.set(z,{x:p.x,y:p.y,z:p.z});},
    update(camera,focus,dt){for(const e of entries){const hide=viewCrossesPlane(camera,focus,e.axis,e.at,e.bounds,.12),want=hide?.08:1;e.opacity+=Math.sign(want-e.opacity)*Math.min(Math.abs(want-e.opacity),Math.max(0,dt)*6);for(const m of [e.frame,e.wire]){const transparent=e.opacity<.995;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=e.opacity;m.depthWrite=!transparent;}}},
    state:()=>entries.map(e=>({side:e.group.name,opacity:e.opacity})),
    dispose(){root.removeFromParent();if(tg.cutaway?.ignoreSolid===ignore)tg.cutaway.ignoreSolid=oldIgnore;for(const s of solids){const i=tg.solids.indexOf(s);if(i>=0)tg.solids.splice(i,1);}new Set(owned).forEach(o=>o.dispose());}
  };
}
