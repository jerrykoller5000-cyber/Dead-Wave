// GP-19870: shared wet-acid appearance. Hazard sampling, damage and lifetimes stay with the host.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};
const bell=v=>Math.exp(-v*v);
const bubbles=Array.from({length:11},(_,i)=>{const a=i*2.39996,r=.16+(i%4)*.16;return {x:Math.sin(a)*r,y:Math.cos(a)*r,r:.035+(i%3)*.012};});
export function acidTexel(u,v,kind='pool'){
 const x=u*2-1,y=v*2-1,a=Math.atan2(y,x),r=Math.hypot(x,y);
 const edge=kind==='trail'?.87+.045*Math.sin(v*Math.PI*2)+.025*Math.sin(v*Math.PI*6):.88+.045*Math.sin(a*5+.4)+.035*Math.sin(a*9)+.025*Math.sin(a*13+1.1);
 const d=kind==='trail'?Math.abs(x):r,mask=smooth((edge-d)/.075);
 if(mask===0)return [0,0,0,0];
 const grain=kind==='trail'?.5+.25*Math.sin(x*17+Math.sin(v*Math.PI*2)*2)+.17*Math.sin(x*31+Math.cos(v*Math.PI*2)*3):.5+.25*Math.sin(x*17+y*11)+.17*Math.sin(x*31-y*23);
 const rim=bell((d-edge+.09)/.065);
 // Broken soft reflections, not a bright uninterrupted stripe.
 const sheen=kind==='trail'?bell((x+.24+.08*Math.sin(v*Math.PI*2))/.065)*(.18+.16*Math.sin(v*Math.PI*2)**2):
  bell((y+.30+.14*x)/.05)*bell((x+.2)/.5)*.48;
 let foam=0;
 for(const b of bubbles){const dy=kind==='trail'?Math.min(Math.abs(y-b.y),2-Math.abs(y-b.y)):y-b.y;
  const br=Math.hypot(x-b.x,dy);foam=Math.max(foam,bell((br-b.r)/.013)*.34);}
 const light=sheen+foam;
 return [Math.round(clamp(46+grain*27+rim*43+light*145,0,255)),Math.round(clamp(78+grain*31+rim*46+light*125,0,255)),
  Math.round(clamp(10+grain*13+rim*13+light*79,0,255)),Math.round(mask*(.76+.08*grain)*255)];
}
export function makeAcidTexture(T,kind='pool',size=128){
 const pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)pixels.set(acidTexel(x/(size-1),y/(size-1),kind),(y*size+x)*4);
 const map=new T.DataTexture(pixels,size,size,T.RGBAFormat,T.UnsignedByteType);map.colorSpace=T.SRGBColorSpace;
 map.magFilter=map.minFilter=T.LinearFilter;map.needsUpdate=true;return map;
}
export function acidJoin(ax,az,bx,bz){
 const al=Math.hypot(ax,az)||1,bl=Math.hypot(bx,bz)||1;
 const an={x:-az/al,z:ax/al},bn={x:-bz/bl,z:bx/bl},l=Math.hypot(an.x+bn.x,an.z+bn.z);
 if(l<.15)return bn;
 const nx=(an.x+bn.x)/l,nz=(an.z+bn.z)/l,k=Math.min(1.4,1/Math.max(.2,nx*bn.x+nz*bn.z));
 return {x:nx*k,z:nz*k};
}
export function acidPoolAppearance(age,life,seed=0){
 const t=clamp(age/Math.max(.01,life)),fade=1-smooth((t-.3)/.7);
 return {opacity:(.78+.025*Math.sin(age*5+seed))*fade,scale:.94+.06*smooth(age/.16),dry:smooth(t)};
}
export function createSpitterAcid(T){
 let map,geo,serial=0;
 return {
  makePool(){map ||= makeAcidTexture(T);geo ||= new T.PlaneGeometry(3.4,3.4);
   const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:0xffffff,map,transparent:true,opacity:.78,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));m.name='spitter-acid-pool';m.material.userData.pooled=true;return m;},
  resetPool(m){m.userData.acidSeed=serial++%47;m.scale.setScalar(.94);m.material.color.setHex(0xffffff);m.material.opacity=.78;m.visible=true;},
  updatePool(m,age,life){const p=acidPoolAppearance(age,life,m.userData.acidSeed||0);m.material.opacity=p.opacity;m.scale.setScalar(p.scale);
   m.material.color.setRGB(1-p.dry*.26,1-p.dry*.2,1-p.dry*.28);}
 };
}

// GP-19871: age varies along the joined ribbon; erosion is anchored to the floor.
// Geometry and gameplay bounds stay fixed as its visible edges retreat.
export function acidTrailDissolveNode(N){
 const age=N.attribute('acidAge','float'),uv=N.attribute('uv','vec2'),p=N.positionWorld;
 const dry=N.smoothstep(.2,.96,age),width=N.mix(1,.28,dry);
 const edge=N.float(1).sub(N.smoothstep(width.sub(.18),width,uv.x.mul(2).sub(1).abs()));
 const grain=p.x.mul(8.3).add(p.z.mul(4.1)).sin().mul(.25)
  .add(p.z.mul(13.7).sub(p.x.mul(5.2)).sin().mul(.25)).add(.5);
 const dissolve=N.smoothstep(.42,.98,age).mul(.85).sub(.2);
 const islands=N.smoothstep(dissolve.sub(.18),dissolve.add(.18),grain);
 return edge.mul(islands).mul(N.float(1).sub(N.smoothstep(.2,1,age)));
}
