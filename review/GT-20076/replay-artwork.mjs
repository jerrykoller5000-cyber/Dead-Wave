import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Only the selected local studio asset is supplied to this review page.

export async function originalDrumOptic(page,origin){
  const path='/studio/weapon-longarms.js';
  let source=await readFile(new URL('../../studio/weapon-longarms.js',import.meta.url),'utf8');
  for(const [now,prior] of [
    ['    seatDrumPlate(faceLayer(.137, .137, .065, .0675, gunBody, 32), sz);',
     '    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, drumBody, 32);'],
    ["  trimPanelBack(THREE, emitterCover, 1, .118, 'y');",'']
  ]){
    assert.equal(source.split(now).length,2);source=source.replace(now,prior);
  }
  return replayArtwork(page,origin,path,source);
}

export async function originalScopePlates(page,origin){
  const path='/studio/weapon-optics.js',source=await readFile(new URL('../..'+path,import.meta.url),'utf8');
  const now='    scopeSidePlate(root, side);';
  assert.equal(source.split(now).length,2);
  const verify=await replayArtwork(page,origin,path,source.replace(now,"    box(root, 'rail clamp jaw', alloy, [0.003, 0.012, 0.121], [side * 0.020, 0.007, 0]);"));
  return async()=>{
    const hash=await page.evaluate("import('/review/GT-20076/rank-visibility.mjs').then(async m=>(await import('/tools/tests/weapon-seating.js')).artworkFingerprint(m.currentModel(TT,'sniper')))");
    assert.equal(hash,'33dd3d44');verify();
  };
}

export async function originalFlamerMount(page,origin){
  const path='/studio/weapon-heavy.js',live=await readFile(new URL('../../studio/weapon-heavy.js',import.meta.url),'utf8');
  const start=live.indexOf('  const gripMount ='),end=live.indexOf('  K.box(0.04, 0.012, 0.05',start);
  assert(start>0&&end>start);
  let section=live.slice(start,end);
  for(const cut of ['fitFlamerMount(THREE, gripMount);',"trimPanelBack(THREE, rearGripBody, -1, .046, 'y');",
    'trimPanelBack(THREE, panel, sx, .018);','trimPanelBack(THREE, rib, sx, .0195);']){
    assert.equal(section.split(cut).length,2);section=section.replace(cut,'');
  }
  const served=await replayArtwork(page,origin,path,live.slice(0,start)+section+live.slice(end));
  return async()=>{
    const hash=await page.evaluate(`(async()=>{
      const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
      const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
      return artworkFingerprint(currentModel(TT,'flamer'));
    })()`);
    const prior=JSON.parse(await readFile(new URL('./catalog-fix-rotating-frame-swept/audit.json',import.meta.url),'utf8'));
    assert.equal(hash,prior.flamer.artworkFingerprint);served();
  };
}

export async function replayArtwork(page,origin,path,source) {
  assert(['/studio/weapon-heavy.js','/studio/weapon-longarms.js','/studio/weapon-sidearms.js','/studio/weapon-optics.js'].includes(path));
  const body=Buffer.from(source).toString('base64');
  let served=0;
  page.conn.onEvent(msg=>{
    if(msg.sessionId!==page.sessionId || msg.method!=='Fetch.requestPaused')return;
    const {requestId,request}=msg.params, url=new URL(request.url);
    assert.equal(url.origin,origin); assert.equal(url.pathname,path);
    served++;
    page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body})
      .catch(error=>page.errors.push(error.message));
  });
  await page.send('Fetch.enable',{patterns:[{urlPattern:origin+path+'*'}]});
  return ()=>assert.equal(served,1,'Expected a single replayed artwork module');
}

export async function originalSawCovers(page,origin) {
  const path='/studio/weapon-heavy.js';
  const source=await readFile(new URL('../../studio/weapon-heavy.js',import.meta.url),'utf8');
  const start=source.indexOf('    // The concealed bevel rings flatten against the backing.');
  const end=source.indexOf('    cover.geometry.computeBoundingSphere();',start);
  assert(start>0 && end>start);
  const baseline=source.slice(0,start)+source.slice(end+'    cover.geometry.computeBoundingSphere();'.length);
  const verifyServed=await replayArtwork(page,origin,path,baseline);
  return async ()=>{
    const hash=await page.evaluate(`(async()=>{
      const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
      const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
      return artworkFingerprint(currentModel(TT,'chainsaw'));
    })()`);
    assert.equal(hash,'5a077773','Expected original saw cover artwork');
    verifyServed();
  };
}

export async function originalWasp(page,origin) {
  const path='/studio/weapon-sidearms.js';
  let source=await readFile(new URL('../../studio/weapon-sidearms.js',import.meta.url),'utf8');
  for(const [now,old] of [
    ['        trimSlabBack(rib, 0, sx * receiverWidth / 2 - rib.position.x, sx);',''],
    ['  trimSlabBack(topCover, 1, receiverTop, 1);',''],
    ["  // Align the attachment graphic's last visible pixel with the shared effect anchor.\n  const effectGraphic = gun.userData.suppressor;\n  if (effectGraphic) {\n    const bounds = new THREE.Box3().setFromObject(effectGraphic, true);\n    const artDepth = bounds.max.z - effectGraphic.position.z;\n    const endpoint = gun.userData.muzzleBase.z + gun.userData.suppressorLen;\n    if (artDepth > 0) effectGraphic.scale.z = (endpoint - effectGraphic.position.z) / artDepth;\n  }","  // The Micro UZI's can seats at the barrel nut rather than at the exposed muzzle threads.\n  // Stretch it forward around the existing barrel: its front remains at the established suppressed muzzle.\n  if (gun.userData.suppressor) {\n    gun.userData.suppressor.position.z = 0.34;\n    gun.userData.suppressor.scale.z = 1.8;\n  }"]
  ]){
    assert.equal(source.split(now).length,2);source=source.replace(now,old);
  }
  return replayArtwork(page,origin,path,source);
}

export function originalSniperSource(live) {
  const current="  const cladding=new THREE.Mesh(squareCladding(THREE,rearRadius,.104,.005,rearFacets),gunBody);\n  cladding.position.set(0,.045,-.184);\n  cladding.castShadow=cladding.receiveShadow=true;\n  gun.add(cladding);";
  const original="  K.box(0.054, 0.054, 0.104, gunBody, 0, 0.045, -0.184, 0, 0, 0, null, 0.005);   // the rear bridge, the action's width";
  assert.equal(live.split(current).length,2,'Cannot identify current sniper cover');
  const marks='D.screw(gun, rearRadius, 0.035, z';
  assert.equal(live.split(marks).length,2);
  return live.replace(current,original).replace(marks,'D.screw(gun, 0.0259, 0.035, z');
}

export async function originalSniperCover(page,origin) {
  const path='/studio/weapon-longarms.js';
  const live=await readFile(new URL('../../studio/weapon-longarms.js',import.meta.url),'utf8');
  return replayArtwork(page,origin,path,originalSniperSource(live));
}


export async function originalWaspFurniture(page,origin) {
  const path='/studio/weapon-sidearms.js';
  const live=await readFile(new URL('../../studio/weapon-sidearms.js',import.meta.url),'utf8');
  const start=live.indexOf('  const foreEnd = K.slab('),end=live.indexOf('  for (const sx of [-1, 1]) for (const z of [.198, .324])',start);
  assert(start>0 && end>start);
  const original=`  K.slab([[.18, -.002], [.187, -.013], [.319, -.016], [.334, -.009], [.34, .001], [.34, .058], [.331, .067], [.185, .07], [.18, .061]], .08, gunPoly, {bevel:.016,segs:4});
  for(let j=0;j<12;j++){
    const z=.19+j*.012;
    const rib=K.slab([[z,-.007],[z+.003,-.007],[z+.003,.061],[z,.061]],.0808,gunDark,{bevel:.0015,segs:2});
    markPaintSurface(rib,'furniture');
  }
`;
  const trim='    trimSlabBack(lowerTrim, 0, sx * receiverWidth / 2 - lowerTrim.position.x, sx);';
  assert.equal(live.split(trim).length,2);
  const prior=(live.slice(0,start)+original+live.slice(end)).replace(trim,'');
  const served=await replayArtwork(page,origin,path,prior);
  return async()=>{
    const actual=await page.evaluate("import('/review/GT-20076/rank-visibility.mjs').then(async m=>(await import('/tools/tests/weapon-seating.js')).artworkFingerprint(m.currentModel(TT,'uzi')))");
    const baseline=JSON.parse(await readFile(new URL('./catalog-fix-revolver-walnut-fit/audit.json',import.meta.url),'utf8'));
    assert.equal(actual,baseline.uzi.artworkFingerprint);served();
  };
}

export async function originalSawFrontPlates(page,origin) {
  const path='/studio/weapon-heavy.js';
  const live=await readFile(new URL('../..'+path,import.meta.url),'utf8');
  const cut="    trimPanelBack(THREE, plate, 1, .11, 'z');";
  assert.equal(live.split(cut).length,2);
  const verifyServed=await replayArtwork(page,origin,path,live.replace(cut,''));
  return async()=>{
    const hash=await page.evaluate("import('/review/GT-20076/rank-visibility.mjs').then(async m=>(await import('/tools/tests/weapon-seating.js')).artworkFingerprint(m.currentModel(TT,'chainsaw')))");
    const baseline=JSON.parse(await readFile(new URL('./catalog-fix-heavy-outline-facets/audit.json',import.meta.url),'utf8'));
    assert.equal(hash,baseline.chainsaw.artworkFingerprint);
    verifyServed();
  };
}

export async function originalHandleWrist(page,origin) {
  const path='/studio/weapon-longarms.js';
  let source=await readFile(new URL('../..'+path,import.meta.url),'utf8');
  const edits=[
  [
    "  const band = gunBand([[-0.17, 0.09], [-0.153, 0.143], [-0.138, 0.151], [0.188, 0.151], [0.217, 0.13], [0.225, 0.09]], 0.009);\n  // End each foot at the central facet of the painted cover.\n  const crown = topCorner[1] + .045 * Math.cos(Math.PI / 28);\n  const handleOutline = [];\n  for (let i = 0; i < band.length; i++) {\n    const a = band[i], b = band[(i + 1) % band.length];\n    if (a[1] >= crown) handleOutline.push(a);\n    if ((a[1] < crown) !== (b[1] < crown)) {\n      const t = (crown - a[1]) / (b[1] - a[1]);\n      handleOutline.push([a[0] + t * (b[0] - a[0]), crown]);\n    }\n  }\n  const handle = K.slab(handleOutline, 0.04, gunDark, { bevel: 0.003 });",
    "  const handle = K.slab(gunBand([[-0.17, 0.09], [-0.153, 0.143], [-0.138, 0.151], [0.188, 0.151], [0.217, 0.13], [0.225, 0.09]], 0.009), 0.04, gunDark, { bevel: 0.003 });"
  ],
  [
    "  trimPanelBack(THREE, palm, -1, .052, 'y');",
    ""
  ],
  [
    "    trimPanelBack(THREE, cheek, sx, .024);\n    trimPanelBack(THREE, cheek, -1, .052, 'y');",
    ""
  ],
  [
    "  const wrist = K.slab([[-.239, .014], [-.026, .014], [-.026, -.04], [-.239, -.04]], .056, gunTan, { bevel: .006 });\n  trimPanelBack(THREE, wrist, 1, -.034, 'y');",
    "  K.slab([[-0.245, 0.014], [-0.026, 0.014], [-0.026, -0.04], [-0.245, -0.04]], 0.056, gunTan, { bevel: 0.006 });"
  ]
];
  for(const [current,old] of edits){
    assert.equal(source.split(current).length,2,'Expected the reviewed art change once');
    source=source.replace(current,old);
  }
  const served=await replayArtwork(page,origin,path,source);
  return async()=>{
    const hashes=await page.evaluate(`(async()=>{
      const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
      const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
      return ['aa12','sniper'].map(id=>artworkFingerprint(currentModel(TT,id)));
    })()`);
    const prior=JSON.parse(await readFile(new URL('./catalog-fix-front-plates/audit.json',import.meta.url),'utf8'));
    assert.deepEqual(hashes,[prior.aa12.artworkFingerprint,prior.sniper.artworkFingerprint]);served();
  };
}
