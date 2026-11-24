import {bakeStatic} from '../world/bake.js';
import {viewCrossesPlane} from '../world/training-cutaway.js';
import {createTrainingBlockers} from './training-infirmary.js';
import {getTrainingPBR,applyWorldUVByMaterial} from '../world/training-textures.js';

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
// CG-1: a wall solid cut back to its visible face (the solids reach 0.30 m into the room for the bodies).
export function trainingWallFace(w) {
  const f=w.surface;if(!f)return w;
  if(f.nx>0)return {...w,maxX:f.x};if(f.nx<0)return {...w,minX:f.x};
  if(f.nz>0)return {...w,maxZ:f.z};return {...w,minZ:f.z};
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
  // CG-1 (AH-1 #8): the intake's two mounted specimens reach 1.66 m each side of the window, so its recess is 2.05 m
  // each side (the returns stood in front of the skulls); the HQ panel keeps 1.6 m.
  const gaps=[[tg.stations.skullWindow,2.05],[tg.stations.hqPanel,1.6]].map(([s,w])=>[s.z-w,s.z+w]).sort((a,b)=>a[0]-b[0]);
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

// CG-1 (D-218, CF-20 #9): chain-link fabric as an alpha pattern, not strips: 6 cm diamonds of 5 mm wire, one tile
// = 4 x 4 diamonds = 0.24 m. The wire and razor share this material (one draw a side): the razor's strips sample one
// constant texel on a wire crossing, which is solid at every distance (no uv change across a triangle = the top mip).
export const CHAIN_LINK_TILE=.24;
export function chainLinkTexture(T,size=512,diamonds=4,wire=.0055) {
  // AG-405: 512px galvanized woven steel wire — cylindrical cross-section highlight + specular twist knots;
  // preserves exact wire crossing at CHAIN_LINK_SOLID_UV [1/8, 1/8] so razor ribbon stays 100% solid.
  const data=new Uint8Array(size*size*4),P=size/diamonds,half=wire/CHAIN_LINK_TILE*size/2;
  const wrap=v=>{v%=P;if(v<0)v+=P;return Math.min(v,P-v);};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=x+.5,py=y+.5;
    const dA=wrap(px+py)/Math.SQRT2,dB=wrap(px-py)/Math.SQRT2;
    const d=Math.min(dA,dB),a=Math.max(0,Math.min(1,half+.75-d));
    // Cylindrical highlight across wire radius + brighter zinc glint at wire crossings
    const core=Math.max(0,1-d/Math.max(1,half));
    const crossing=Math.max(0,1-Math.max(dA,dB)/Math.max(1.5,half*1.4));
    const grain=(((Math.imul(x,374761393)+Math.imul(y,668265263))>>>24)&31)/31-0.5;
    const lum=Math.max(135,Math.min(255,Math.round(182+core*56+crossing*26+grain*14)));
    const i=(y*size+x)*4;data[i]=lum;data[i+1]=Math.min(255,lum+3);data[i+2]=Math.min(255,lum+5);data[i+3]=Math.round(a*255);
  }
  const t=new T.DataTexture(data,size,size);
  if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;
  t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;
  return t;
}
export const CHAIN_LINK_SOLID_UV=[1/8,1/8];   // a crossing of the pattern's wires (32, 32 of 256)

export function createTrainingPerimeter(T,tg) {
  const layout=trainingPerimeterLayout(tg),height=2.35,top=2.83,floor=tg.floorY;
  const root=new T.Group();root.name='training-razor-perimeter';tg.group.add(root);root.updateWorldMatrix(true,true);
  const entries=[],owned=[],columns=tg.solids.filter(s=>s.column);
  // Keep the 30 cm concertina envelope and the 11 cm footplates clear of
  // shell walls, doorway trim/keypads and columns, including return ends.
  const keypads=(tg.securityDoor?.keypads||[]).map(k=>({minX:k.x-.07,maxX:k.x+.07,minZ:k.z-.08,maxZ:k.z+.08}));
  // CG-1 (D-218, Jerry: "fences not fully enclosed"): the drawn fence was trimmed 0.34 m round every wall SOLID, and
  // those reach 0.30 m into the room, so ten runs ended 0.64-0.91 m short of a wall or pillar. Now a run ends with its
  // post touching the wall face or the pillar's flange (a clamp at each touch, no foot plate there); keypads keep
  // their clearance and the razor coils still break cleanly at the pillars (trainingRazorSpans).
  // CF-21 (Jerry D-228, the flickering black line right of the keypad): a wall solid's face is its wall LINE, and the
  // build room's side of the shared x = -8 wall stands 4 mm in (CJ-1), so a post ending on the line put its back face on
  // the range's own tile plane (a 7.5 cm dark strip fighting the tile, seen from the range) and its clamps 7.5 mm through
  // it. A post now stops 5 mm short of a wall line (1 mm off the build room's face), and its clamps sit flush with its
  // wall side.
  const WALL_GAP=.005;
  const post=.075/2,near=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz)<1e-4;
  const faces=tg.solids.filter(s=>s.wall).map(trainingWallFace);
  const pillars=columns.map(c=>({...c,minX:c.minX-.05,maxX:c.maxX+.05}));   // the solid stops 5 cm inside the flange
  const renderSpans=layout.segments.flatMap(s=>trainingFenceSpans(s,keypads)
    .flatMap(q=>trainingFenceSpans(q,pillars,post)).flatMap(q=>trainingFenceSpans(q,faces,post+WALL_GAP))
    .map(q=>({...q,fixedA:!near(q.x0,q.z0,s.x0,s.z0),fixedB:!near(q.x1,q.z1,s.x1,s.z1)})));
  const pbr=getTrainingPBR(T);
  const linkTex=chainLinkTexture(T);owned.push(linkTex);
  for(const side of ['west','south','east']) {
    const group=new T.Group();group.name='training-perimeter-'+side;root.add(group);
    const frame=new T.MeshStandardMaterial(pbr?pbr.benchPanel.opts({color:0xa8b6ad,normalScale:.75}):{color:0x39453e,roughness:.78,metalness:.5});
    const wire=new T.MeshStandardMaterial({color:0x98a69e,roughness:.52,metalness:.68,side:T.DoubleSide,map:linkTex,transparent:true,alphaTest:.04});
    const frameFade=frame.clone(),wireFade=wire.clone();
    for(const m of [frameFade,wireFade]){m.transparent=true;m.depthWrite=false;m.opacity=.999;}
    owned.push(frame,wire,frameFade,wireFade);const pos=[],uvs=[];
    const strip=(a,b,width,normal)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
      let v=new T.Vector3(dx,dy,dz).cross(new T.Vector3(...normal)).normalize().multiplyScalar(width/2);
      const q=[[a[0]+v.x,a[1]+v.y,a[2]+v.z],[b[0]+v.x,b[1]+v.y,b[2]+v.z],[b[0]-v.x,b[1]-v.y,b[2]-v.z],[a[0]-v.x,a[1]-v.y,a[2]-v.z]];
      for(const i of [0,1,2,0,2,3])pos.push(...q[i]);
    };
    // Every vertex but the fabric's samples the solid texel: pad the uvs up to the positions before the fabric and at the end.
    const padUv=()=>{while(uvs.length/2<pos.length/3)uvs.push(...CHAIN_LINK_SOLID_UV);};
    const fabric=(q,uv)=>{padUv();for(const i of [0,1,2,0,2,3]){pos.push(...q[i]);uvs.push(...uv[i]);}};
    for(const s of renderSpans.filter(s=>s.side===side)) {
      const dx=s.x1-s.x0,dz=s.z1-s.z0,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      const at=(u,y,v=0)=>[s.x0+ux*u-uz*v-tg.origin.x,y,s.z0+uz*u+ux*v-tg.origin.z];
      const box=(u,y,w,h,d,v=0)=>{const geo=new T.BoxGeometry(w,h,d);owned.push(geo);const m=new T.Mesh(geo,frame);m.position.fromArray(at(u,y,v));m.rotation.y=-Math.atan2(uz,ux);group.add(m);};
      const n=Math.ceil(len/2.5);for(let i=0;i<=n;i++){
        const fixed=(i===0&&s.fixedA)||(i===n&&s.fixedB);box(len*i/n,height/2,.075,height,.075);
        if(!fixed)box(len*i/n,.02,.22,.04,.22);else for(const y of [.6,1.9])box(len*i/n+(i===0?.0075:-.0075),y,.09,.06,.14);   // CG-1: clamped to the wall/pillar
      }
      // CG-1: the fabric hangs 1 mm off the posts' and rails' face (v = 3.85 cm), between the two rails; it stops
      // at a clamped end's clamps. One flat quad a run, uv in metres / CHAIN_LINK_TILE (5-8 cm diamonds, J: CF-20 #9).
      const face=.0385,rail=.06,railV=.0075;for(const y of [.15,height-.08])box(len/2,y,len,rail,rail,railV);   // the rails' face flush with the posts'
      const low=.15+rail/2,high=height-.08-rail/2,ua=s.fixedA?.0525:0,ub=len-(s.fixedB?.0525:0);
      fabric([at(ua,low,face),at(ub,low,face),at(ub,high,face),at(ua,high,face)],
        [[ua,low],[ub,low],[ub,high],[ua,high]].map(([u,y])=>[u/CHAIN_LINK_TILE,y/CHAIN_LINK_TILE]));
      // CC-363 (D-218 P2, for Claude 7): a real concertina coil, 0.45 m across, sitting ON the top rail. The tape is a
      // radial blade ribbon around a round core wire (cross section: a flat blade + a crossing strip, so it reads from
      // every side), loops 0.22 m apart, paired barbs every 35 cm along the tape, a wire tie on every third
      // loop where it touches the rail. Still one baked wire draw per side.
      const R=.225,pitch=.22,seg=12,cy=height-.04+R,tape=.018,core=.006,barbEvery=3;
      for(const r of trainingRazorSpans(s,columns)) {
        const start=(r.x0-s.x0)*ux+(r.z0-s.z0)*uz,length=Math.hypot(r.x1-r.x0,r.z1-r.z0);
        const loops=Math.max(1,Math.round(length/pitch)),steps=loops*seg,k=Math.PI*2/seg;
        // the coil's ends stand off 6 cm so the end loop does not touch the pillar/wall
        const u0=start+.06,span=Math.max(.05,length-.12);
        const ring=(i)=>{const t=i/steps,ang=i*k,u=u0+span*t;return {u,ang,c:Math.cos(ang),sn:Math.sin(ang)};};
        for(let i=0;i<steps;i++){
          const A=ring(i),B=ring(i+1);
          const pa=at(A.u,cy+A.sn*R,A.c*R),pb=at(B.u,cy+B.sn*R,B.c*R);
          // radial direction (in world space) at each end: up*sin + side*cos, side = (-uz,0,ux)
          const radA=[-uz*A.c,A.sn,ux*A.c],radB=[-uz*B.c,B.sn,ux*B.c];
          // flat blade ribbon (width along the radius)
          const q=[[pa[0]+radA[0]*tape/2,pa[1]+radA[1]*tape/2,pa[2]+radA[2]*tape/2],[pb[0]+radB[0]*tape/2,pb[1]+radB[1]*tape/2,pb[2]+radB[2]*tape/2],
                   [pb[0]-radB[0]*tape/2,pb[1]-radB[1]*tape/2,pb[2]-radB[2]*tape/2],[pa[0]-radA[0]*tape/2,pa[1]-radA[1]*tape/2,pa[2]-radA[2]*tape/2]];
          for(const j of [0,1,2,0,2,3])pos.push(...q[j]);
          // the core wire seen edge-on to the ribbon: a strip whose width runs along the coil axis
          strip(pa,pb,core*2,[radA[0],radA[1],radA[2]]);
          // paired barbs: two small blades, one each side of the ribbon, raked forward along the tape
          if(i%barbEvery===0){
            const tx=pb[0]-pa[0],ty=pb[1]-pa[1],tz=pb[2]-pa[2],tl=Math.hypot(tx,ty,tz)||1;
            for(const sgn of [-1,1]){
              const o=[radA[0]*sgn*tape/2,radA[1]*sgn*tape/2,radA[2]*sgn*tape/2];
              const base0=[pa[0]+o[0],pa[1]+o[1],pa[2]+o[2]],base1=[pa[0]+o[0]+tx/tl*.012,pa[1]+o[1]+ty/tl*.012,pa[2]+o[2]+tz/tl*.012];
              const tip=[pa[0]+radA[0]*sgn*.032+tx/tl*.026,pa[1]+radA[1]*sgn*.032+ty/tl*.026,pa[2]+radA[2]*sgn*.032+tz/tl*.026];
              pos.push(...base0,...base1,...tip);
            }
          }
        }
        // wire ties: where each loop's bottom meets the top rail (ang = -PI/2), a short band round the rail
        for(let l=0;l<loops;l+=3){
          const u=u0+span*(l*seg+seg*.75)/steps,yb=cy-R;
          box(u,yb-.012,.012,.05,.075,railV);   // CG-1: round the rail (centred on railV)
        }
      }
    }
    padUv();
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();owned.push(geo);group.add(new T.Mesh(geo,wire));
    applyWorldUVByMaterial(group,new Map([[frame,1.0]]));
    bakeStatic(T,group);const frameMeshes=[],wireMeshes=[];
    group.traverse(m=>{if(m.geometry)owned.push(m.geometry);if(m.material===frame)frameMeshes.push(m);if(m.material===wire)wireMeshes.push(m);});
    const box=new T.Box3().setFromObject(group);
    entries.push({group,frame,wire,frameMeshes,wireMeshes,frameFade,wireFade,faded:false,axis:side==='south'?'z':'x',at:side==='south'?layout.room.minZ+tg.build.grid:side==='west'?layout.room.minX+tg.build.grid:layout.room.maxX-tg.build.grid,
      bounds:side==='south'?[['x',box.min.x,box.max.x],['y',floor,floor+top]]:[['z',box.min.z,box.max.z],['y',floor,floor+top]],opacity:1});
  }
  const setFaded=(e,fade)=>{
    if(e.faded===fade)return;
    e.faded=fade;
    for(const m of e.frameMeshes)m.material=fade?e.frameFade:e.frame;
    for(const m of e.wireMeshes)m.material=fade?e.wireFade:e.wire;
  };
  const solids=layout.segments.map(s=>({minX:Math.min(s.x0,s.x1)-.045,maxX:Math.max(s.x0,s.x1)+.045,minZ:Math.min(s.z0,s.z1)-.045,maxZ:Math.max(s.z0,s.z1)+.045,minY:floor,maxY:floor+top,metal:true,perimeterFence:true,perimeterSide:s.side}));
  tg.solids.push(...solids);const blocker=createTrainingBlockers(solids);let previous=new WeakMap();
  // Reuse the shell's camera-only query: faded wire must not catch the aim cursor.
  // The ordinary bullet, laser and body queries continue to hit the physical fence.
  const oldIgnore=tg.cutaway?.ignoreSolid;
  const entryBySide=new Map();
  for(const e of entries)entryBySide.set(e.group.name.slice('training-perimeter-'.length),e);
  const ignore=s=>{
    if(s.perimeterFence)return (entryBySide.get(s.perimeterSide)?.opacity??1)<.5;
    return oldIgnore?.(s)||false;
  };
  if(tg.cutaway)tg.cutaway.ignoreSolid=ignore;
  return {
    group:root,layout,solids,renderSpans,constrain:blocker.constrain,
    prepareWarmup(){const states=entries.map(e=>e.faded);for(const e of entries)setFaded(e,true);return ()=>entries.forEach((e,i)=>setFaded(e,states[i]));},
    reset(){previous=new WeakMap();},
    keepZombie(z){const p=z.mesh?.position;if(!p)return;const from=previous.get(z)||p;const v=blocker.constrain(p,from,(z.radius||.42)+.06);p.x=v.x;p.z=v.z;previous.set(z,{x:p.x,y:p.y,z:p.z});},
    update(camera,focus,dt){for(const e of entries){const hide=!focus?.noCutaway&&viewCrossesPlane(camera,focus,e.axis,e.at,e.bounds,.12),want=hide?.08:1;e.opacity+=Math.sign(want-e.opacity)*Math.min(Math.abs(want-e.opacity),Math.max(0,dt)*6);e.frameFade.opacity=e.wireFade.opacity=Math.min(e.opacity,.999);setFaded(e,e.opacity<.995);}},
    state:()=>entries.map(e=>({side:e.group.name,opacity:e.opacity})),
    dispose(){root.removeFromParent();if(tg.cutaway?.ignoreSolid===ignore)tg.cutaway.ignoreSolid=oldIgnore;for(const s of solids){const i=tg.solids.indexOf(s);if(i>=0)tg.solids.splice(i,1);}new Set(owned).forEach(o=>o.dispose());}
  };
}
