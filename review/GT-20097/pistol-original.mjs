import assert from 'node:assert/strict';
export function pistolOriginal(source){
 const start=source.indexOf('  for (const side of [-1, 1]) {\n    W.serrations(slide,');
 const end=source.indexOf('  // GB-180: dovetailed sights.',start);
 assert(start>0&&end>start);
 const serrations=`  for (let i=0;i<8;i++) for(const sx of [-1,1]) K.slab([[-.128+i*.009,-.024],[-.123+i*.009,-.024],[-.123+i*.009,.016],[-.128+i*.009,.016]],.0014,gunDark,{x:sx*.0232,bevel:.0005,parent:slide});
  for(let i=0;i<5;i++) for(const sx of [-1,1]) K.slab([[.2+i*.009,-.022],[.205+i*.009,-.022],[.205+i*.009,.014],[.2+i*.009,.014]],.0014,gunDark,{x:sx*.0232,bevel:.0005,parent:slide});
  for(const sx of [-1,1]){
    D.ribs(slide,{x:sx*.023,y:-.004,z:-.0905,axis:'x',side:sx,along:'z',count:8,pitch:.009,w:.017,h:.0006,t:.0011,mat:D.mats.dark});
    D.ribs(slide,{x:sx*.023,y:-.004,z:.2245,axis:'x',side:sx,along:'z',count:5,pitch:.009,w:.015,h:.0006,t:.0011,mat:D.mats.dark});
  }
`;
 source=source.slice(0,start)+serrations+source.slice(end);
 const a=source.indexOf('  const takedown = K.group('),b=source.indexOf('  // Extractor claw',a);
 assert(a>0&&b>a);
 source=source.slice(0,a)+`  for(const sx of [-1,1]) K.slab([[-.009,-.0035],[.009,-.0035],[.009,.0035],[-.009,.0035]],.0016,ctx.gunMetal,{x:sx*.0228,y:-.018,z:.018,bevel:.0005});
  D.pin(gun,0,-.018,.018,{axis:'x',len:.0472,r:.0013,proud:.0008,caps:true});
`+source.slice(b);
 const c=source.indexOf('  for (const side of [-1, 1]) {',source.indexOf('// Grip-panel screws')),d=source.indexOf('  // J72:',c);
 assert(c>0&&d>c);
 source=source.slice(0,c)+`  for(const sx of [-1,1]){
    D.screw(gun,sx*.0271,-.052,-.018,{axis:'x',side:sx,r:.0025,head:.0009,kind:'slot'});
    D.screw(gun,sx*.0271,-.108,-.026,{axis:'x',side:sx,r:.0025,head:.0009,kind:'slot'});
  }
`+source.slice(d);
 return source.replace("  bindModelArtwork(gun, 'controls', 'takedown', takedown);",'').replace("  bindModelArtwork(gun, 'controls', 'extractor', extractor);",'');
}
