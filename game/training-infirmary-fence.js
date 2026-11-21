// GP-19893: a retracting enclosure on the two open sides of the medical bay.
import {bakeStatic} from '../world/bake.js';
import {createTrainingBlockers} from './training-infirmary.js';
import {chainLinkTexture,CHAIN_LINK_TILE} from './training-perimeter.js';

export const INFIRMARY_FENCE = Object.freeze({height:3, clearDistance:.6096, travel:.65});
export function createTrainingInfirmaryFence(T,tg,{onMotion=()=>{}}={}) {
  const {x,z}=tg.bed.centre, floor=tg.floorY, origin=tg.origin;
  const bay={minX:x-3.15,maxX:x+4.55,minZ:z-2,maxZ:z+2.15,minY:floor,maxY:floor+INFIRMARY_FENCE.height,exitFaces:['maxX','maxZ']};
  const root=new T.Group();root.name='training-infirmary-fence';root.position.set(x-origin.x,0,z-origin.z);tg.group.add(root);
  const panels=new T.Group();root.add(panels);
  const frame=new T.MeshStandardMaterial({color:0x39453e,roughness:.78,metalness:.5});
  // CG-1 (CF-20 #9, Director 00:35Z): the same 6 cm chain-link alpha pattern as the perimeter (it was 28 cm strips).
  const linkTex=chainLinkTexture(T);
  const wire=new T.MeshStandardMaterial({color:0x828d82,roughness:.72,metalness:.55,side:T.DoubleSide,map:linkTex,transparent:true,alphaTest:.04});
  const geometries=[];
  const box=(w,h,d,px,py,pz,parent=panels)=>{
    const geo=new T.BoxGeometry(w,h,d);geometries.push(geo);
    const m=new T.Mesh(geo,frame);m.position.set(px-x,py,pz-z);parent.add(m);return m;
  };
  // The south run seats against the existing steel corner post's front face;
  // that post is its anchor, so it needs no overlapping second post or plate.
  // CG-1 (AH-1 #6): the north run started 0.24 m off the west wall (a 20 cm slit past the bay's return panel); its first
  // post now stands on the wall's face.
  const sides=[{axis:'x',at:bay.maxX,lo:bay.minZ+.2175,hi:bay.maxZ},{axis:'z',at:bay.maxZ,lo:bay.minX+.045,hi:bay.maxX}];
  const plated=new Set();
  for(const s of sides) {
    const length=s.hi-s.lo,mid=(s.lo+s.hi)/2;
    const at=(u,v)=>s.axis==='x'?[s.at-x,v,Math.max(u+s.lo,s.lo)-z]:[u+s.lo-x,v,s.at-z];
    for(const u of [s.lo,s.hi]) {
      if(s.axis==='x'&&u===s.lo)continue;
      const px=s.axis==='x'?s.at:u,pz=s.axis==='x'?u:s.at;
      const key=`${px.toFixed(4)},${pz.toFixed(4)}`;
      if(plated.has(key))continue;
      plated.add(key);
      box(.09,INFIRMARY_FENCE.height,.09,px,INFIRMARY_FENCE.height/2,pz);
      box(.24,.035,.24,px,.0175,pz,root);
    }
    // CG-1: the rails' outer face flush with the posts' (.045 out), the fabric 1 mm outside them, between the rails:
    // one flat quad a side, uv in metres / CHAIN_LINK_TILE.
    const off=.0125,face=.046,railH=.075;
    for(const y of [.16,INFIRMARY_FENCE.height-.12]) box(s.axis==='x'?.065:length,railH,s.axis==='x'?length:.065,s.axis==='x'?s.at+off:mid,y,s.axis==='x'?mid:s.at+off);
    const low=.16+railH/2, high=INFIRMARY_FENCE.height-.12-railH/2, ua=s.axis==='x'?.11:0, ub=length;   // the x run's fabric starts clear of the bay's top header beam at the back wall
    const P=(u,v)=>s.axis==='x'?[s.at+face-x,v,u+s.lo-z]:[u+s.lo-x,v,s.at+face-z];
    const q=[P(ua,low),P(ub,low),P(ub,high),P(ua,high)],uv=[[ua,low],[ub,low],[ub,high],[ua,high]].map(([u,v])=>[u/CHAIN_LINK_TILE,v/CHAIN_LINK_TILE]);
    const pos=[],uvs=[];for(const i of [0,1,2,0,2,3]){pos.push(...q[i]);uvs.push(...uv[i]);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();geometries.push(geo);panels.add(new T.Mesh(geo,wire));
  }
  bakeStatic(T,panels);bakeStatic(T,root,{skip:o=>o===panels});
  const solids=sides.map(s=>({minX:s.axis==='x'?s.at-.06:s.lo,maxX:s.axis==='x'?s.at+.06:s.hi,minZ:s.axis==='z'?s.at-.06:s.lo,maxZ:s.axis==='z'?s.at+.06:s.hi,minY:floor,maxY:bay.maxY,prop:true,infirmaryFence:true}));
  const blocker=createTrainingBlockers([bay]);
  let raised=false,amount=0,awaitExit=false,previous=new WeakMap();
  const sync=()=>{panels.position.y=-(INFIRMARY_FENCE.height+.12)*(1-amount);panels.visible=amount>0;};
  function setRaised(on,audible=false) {
    if(raised===on)return;raised=on;
    for(const s of solids){const i=tg.solids.indexOf(s);if(on&&i<0)tg.solids.push(s);else if(!on&&i>=0)tg.solids.splice(i,1);}
    if(audible)onMotion(on);
  }
  const distance=p=>Math.hypot(Math.max(bay.minX-p.x,0,p.x-bay.maxX),Math.max(bay.minZ-p.z,0,p.z-bay.maxZ));
  const free=p=>({x:p.x,z:p.z,moved:false,blockX:false,blockZ:false});
  const api={
    group:root,bay,solids,
    reset(){awaitExit=false;previous=new WeakMap();setRaised(true);amount=1;sync();},
    lowerForRecovery(){awaitExit=true;setRaised(false,true);amount=0;previous=new WeakMap();sync();},
    update(dt,p,recovering=false){
      if(!Number.isFinite(dt)||dt<=0)return;
      if(awaitExit&&!recovering&&p&&Math.abs(p.y-floor)<2&&distance(p)>INFIRMARY_FENCE.clearDistance){awaitExit=false;setRaised(true,true);}
      const want=raised?1:0;amount+=Math.sign(want-amount)*Math.min(Math.abs(want-amount),dt/INFIRMARY_FENCE.travel);sync();
    },
    constrain(p,from=p,radius=.42){return raised?blocker.constrain(p,from,radius):free(p);},
    keepZombie(zombie){
      const p=zombie.mesh?.position;if(!p)return;
      const from=previous.get(zombie)||{x:p.x,y:p.y,z:p.z};
      const v=api.constrain(p,from,(zombie.radius||.42)+.06);p.x=v.x;p.z=v.z;
      previous.set(zombie,{x:p.x,y:p.y,z:p.z});
    },
    state:()=>({raised,amount,awaitExit}),
    dispose(){setRaised(false);root.removeFromParent();const all=new Set(geometries);root.traverse(m=>{if(m.geometry)all.add(m.geometry);});all.forEach(g=>g.dispose());frame.dispose();wire.dispose();linkTex.dispose();}
  };
  api.reset();return api;
}
