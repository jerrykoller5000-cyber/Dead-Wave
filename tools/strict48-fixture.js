// tools/strict48-fixture.js (CB-369, Claude 2): the strict 48-near-brute fixture, as ChatGPT 2 wrote it for GT-20140
// (review/GT-20140/brute48-standard-camera-fixture-v3.js, unchanged below this header). tools/bench.mjs --fixture runs it in
// the page after a Hunt starts: 48 standing brutes on a level patch in the standard camera's view, a fixed seed, noon.
(async()=>{
 const T=TT,G=T.THREE;T.clearZombies();T.runDevCommand('godmode');T.setShotView(null);
 const x=-140,z=0,floor=T.sampleHeight(x,z);T.player.position.set(x,floor,z);
 await new Promise(resolve=>setTimeout(resolve,1800));T.camera.updateMatrixWorld(true);T.clearZombies();if(T.zombies.some(z=>z.alive))throw Error("Clean48 fixture required");
 const camera=T.camera,positions=[],ray=new G.Vector3();
 for(let row=0;row<6;row++)for(let col=0;col<8;col++){
  ray.set((col-3.5)/3.5*.60,.05-row*.11,.5).unproject(camera).sub(camera.position).normalize();
  if(ray.y>=-1e-5)throw Error('Standard game camera must see the ground fixture');
  const t=(floor-camera.position.y)/ray.y;if(t<=0||t>80)throw Error('Bounded standard-view ground intersection required');
  positions.push(camera.position.clone().addScaledVector(ray,t));
 }
 const minX=Math.min(x,...positions.map(p=>p.x)),maxX=Math.max(x,...positions.map(p=>p.x)),minZ=Math.min(z,...positions.map(p=>p.z)),maxZ=Math.max(z,...positions.map(p=>p.z));
 T.levelGroundRect(minX-5,minZ-5,maxX+5,maxZ+5,floor,6);
 let seed=2011148;const random=Math.random;
 Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 try{for(const p of positions){const a=T.spawnZombie(p.x,p.z,'brute',true,true);if(!a)throw Error('Missing brute48');a.riseT=0;a.hp=1e6;a.attackCd=999;a.speed=a.baseSpeed=0;}}
 finally{Math.random=random;}
 T.setWorldTime(.5);T.resetPerf();
 return{count:T.zombies.filter(a=>a.alive).length,originalGraceRetained:true,types:T.zombies.map(a=>a.typeKey),rootPositions:T.zombies.map(a=>a.mesh.position.toArray()),camera:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray(),qaFlatGround:{minX,minZ,maxX,maxZ,floor},scope:'48actual native Brutes projected into the UNCHANGED standard game-camera lower/middle viewport. Deterministic birth/grid, speed0, NORMAL original RAF/AI/body/cloth loop; no manual bone pose, forced nearLOD or offscreen shortcut. QA levelGroundRect as original t330; not a world-source edit. Main draw/frustum/LOD counts at end are mandatory; not normal horde mix.'};
})()
