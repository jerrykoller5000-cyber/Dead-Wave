// Capture the native world-source batches which supply the live first-person materials and geometry.
function check(condition, message){if(!condition)throw Error(message);}

function nativeBatches(T,id){
  const vm=T.viewmodelDbg(),gun=vm.gun;
  check(vm.root.visible && vm.info.active && vm.info.key===id && gun.src===T.weaponMeshes[id],'Wrong native eye');
  const copies=new Map(gun.pairs);
  const paths=new Map();
  function walk(src,path){
    if(src.isMesh && copies.has(src))paths.set(path,{src,eye:copies.get(src)});
    src.children.forEach((c,i)=>walk(c,path+'/'+i));
  }
  walk(gun.src,'');
  return paths;
}

function attributes(geometry){
  return Object.fromEntries([...Object.entries(geometry.attributes),...(geometry.index?[['index',geometry.index]]:[])]);
}

function serialize(attr){
  check(!attr.isInterleavedBufferAttribute,'Unsupported interleaved artwork');
  const bytes=new Uint8Array(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength);
  let bits='';
  for(let i=0;i<bytes.length;i+=16384)bits+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return {type:attr.array.constructor.name,itemSize:attr.itemSize,normalized:attr.normalized,bytes:btoa(bits)};
}

async function describe(mesh,includeBuffers){
  const g=mesh.geometry;
  const channels={};
  for(const [name,attr] of Object.entries(attributes(g))){
    const digest=await crypto.subtle.digest('SHA-256',attr.array);
    channels[name]=[attr.itemSize,attr.normalized,Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')];
  }
  const mat=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const appearance=mat.map(m=>[m.type,m.name,m.color?.getHex(),m.userData.weaponFinishRole||'',m.map?.name||'',m.vertexColors,m.side]);
  return {name:mesh.name,channels,appearance,groups:g.groups,drawRange:[g.drawRange.start,Number.isFinite(g.drawRange.count)?g.drawRange.count:null],
    buffers:includeBuffers?Object.fromEntries(Object.entries(attributes(g)).map(([k,a])=>[k,serialize(a)])):undefined};
}

export async function snapshot(T,id,includeBuffers){
  const {currentModel}=await import('./rank-visibility.mjs');
  const {artworkFingerprint}=await import('../../tools/tests/weapon-seating.js');
  const fingerprint=artworkFingerprint(currentModel(T,id)),nodes={};
  for(const [path,{src}] of nativeBatches(T,id))nodes[path]=await describe(src,includeBuffers);
  return {fingerprint,nodes};
}

function restoreGeometry(G,description){
  const geometry=new G.BufferGeometry();
  for(const [name,a] of Object.entries(description.buffers)){
    const raw=atob(a.bytes),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    const types={Float32Array,Uint32Array,Uint16Array,Uint8Array,Int16Array,Int8Array};
    check(types[a.type],'Unknown artwork buffer type '+a.type);
    const attribute=new G.BufferAttribute(new types[a.type](bytes.buffer),a.itemSize,a.normalized);
    if(name==='index')geometry.setIndex(attribute);else geometry.setAttribute(name,attribute);
  }
  for(const group of description.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
  geometry.setDrawRange(description.drawRange[0],description.drawRange[1]??Infinity);
  geometry.computeBoundingSphere();
  return geometry;
}

function frames(n){
  return new Promise(done=>{
    const times=[];
    function frame(t){
      times.push(t);
      if(times.length>n)done(times.slice(1).map((v,i)=>v-times[i]));else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

export async function timeBatches(T,id,alternate,order,native='after'){
  const batches=nativeBatches(T,id), gun=T.viewmodelDbg().gun;
  const triangleCount=g=>(g.index?.count||g.attributes.position.count)/3;
  const swaps=[];
  for(const [path,description] of Object.entries(alternate)){
    const {src,eye}=batches.get(path),other=restoreGeometry(T.THREE,description);
    const roundTrip=await describe({...src,geometry:other},false);
    check(JSON.stringify(roundTrip.channels)===JSON.stringify(description.channels),'Buffer round-trip failed '+path);
    const swap={path,src,eye,before:native==='after'?other:src.geometry,after:native==='after'?src.geometry:other,draws:0,previous:eye.onBeforeRender};
    eye.onBeforeRender=function(...args){swap.draws++;return swap.previous.apply(this,args);};
    swaps.push(swap);
  }
  const geometry=swaps.map(s=>({path:s.path,node:s.src.name,parent:s.src.parent.name,priorTriangles:triangleCount(s.before),revisedTriangles:triangleCount(s.after)}));
  const seen={},rows=[];
  for(const version of order){
    for(const s of swaps)s.src.geometry=s[version];
    await frames(45);
    const vm=T.viewmodelDbg();
    check(vm.root.visible && vm.gun===gun && vm.info.active && vm.info.key===id,'Live eye copy changed');
    for(const s of swaps){
      check(triangleCount(s.eye.geometry)===triangleCount(s[version]),'Eye triangle mismatch '+s.path);
      s.draws=0;
    }
    const shapes=swaps.map(s=>s.eye.geometry.uuid);
    if(seen[version])check(shapes.every((x,i)=>x===seen[version][i]),'Unstable eye geometry');
    seen[version]=shapes;
    const ms=await frames(240),sorted=[...ms].sort((a,b)=>a-b);
    const drawCounts=swaps.map(s=>s.draws);
    if(!drawCounts.some(n=>n>0)){
      const paths=swaps.map(s=>{const list=[];for(let n=s.eye;n;n=n.parent)list.push([n.name,n.type,n.visible]);return {path:s.path,nodes:list};});
      throw Error('No changed native eye batch drew: '+JSON.stringify(paths));
    }
    rows.push({version,drawCounts,fps:1000*ms.length/ms.reduce((a,b)=>a+b,0),p95Ms:sorted[Math.floor(ms.length*.95)],p99Ms:sorted[Math.floor(ms.length*.99)],game:T.perfSnapshot(),ms});
  }
  check(seen.before.every((x,i)=>x!==seen.after[i]),'Eye failed to switch artwork');
  for(const s of swaps){s.src.geometry=s[native];s.eye.onBeforeRender=s.previous;}
  return {id,high:T.getGfx(),geometry,rows};
}
