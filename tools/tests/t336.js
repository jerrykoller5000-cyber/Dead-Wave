// t336 — CB-292 / J128: walk the Training Ground and audit every live mesh for floor
// penetration, then check the independent stations, targets and built fixtures for
// support and unwanted overlap. Named visual exceptions come from core/clip-exceptions.js.
(async () => {
  const T = window.TT, out = [], ok = (v, s) => out.push((v ? 'PASS ' : 'FAIL ') + s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(40); } return !!f(); };
  try {
    const {clipException} = await import(new URL((/\/tools\/tests\//.test(location.pathname) ? '../../' : './') + 'core/clip-exceptions.js', location.href).href);   // the suite's page lives in tools/tests/
    if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
    const name = document.getElementById('playerName'); if (name) name.value = 'CB-292';
    if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active), 'Training Ground opened');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000), 'entry blackout cleared before placement audit');
    const tg = T.trainingDbg.tg(), g = tg.group, floor = tg.floorY, H = T.THREE;
    g.updateMatrixWorld(true);
    const bounds = o => new H.Box3().setFromObject(o);
    const label = b => `${b.min.x.toFixed(2)},${b.min.y.toFixed(2)},${b.min.z.toFixed(2)}`;
    const meshes = []; g.traverse(o => { if (o.isMesh && o.geometry) meshes.push(o); });
    ok(meshes.length >= 250, `walk covers ${meshes.length} placed/decorative meshes (at least 250)`);
    const placed=g.children.filter(o=>o.isMesh||o.getObjectByProperty?.('isMesh',true));
    const badPlaced=placed.filter(o=>{const b=bounds(o);return ![b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].every(Number.isFinite);});
    ok(placed.length>=70&&!badPlaced.length, `${placed.length} placed assemblies have finite world bounds${badPlaced.length ? ': '+badPlaced.map(o=>o.name||'(unnamed)').join('; ') : ''}`);
    const exceptions = [], penetrations = [], invalid = [];
    for (const m of meshes) {
      const b = bounds(m), coords = [b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z];
      if (!coords.every(Number.isFinite)) { invalid.push(m.name || m.parent?.name || '(unnamed)'); continue; }
      const depth = floor - b.min.y;
      if (depth <= .0005) continue;
      let layer = m.name, pose = 'training:static';
      const size = new H.Vector3(); b.getSize(size);
      if (!layer && Math.abs(size.x-150)<.01 && Math.abs(size.z-150)<.01 && Math.abs(depth-.02)<.001) layer = 'training-outer-underlay';
      if (!layer && m.parent?.name === 'training-cutaway-north' && Math.abs(depth-.04)<.001) layer = 'training-passage-floor-slab';
      if (layer === 'training-impact-marks' || layer === 'training-char-marks') pose = 'training:effect';
      const allowed = clipException(layer, 'training-floor', pose, depth);
      if (allowed) exceptions.push(`${allowed.id} at ${label(b)} (${(depth*1000).toFixed(1)} mm)`);
      else penetrations.push(`${layer || m.parent?.name || '(unnamed)'} at ${label(b)} (${(depth*1000).toFixed(1)} mm; visible=${m.visible}; draw=${m.geometry.drawRange.count}; geo=${m.geometry.type}; size=${size.toArray().map(v=>v.toFixed(2)).join('/')} m)`);
    }
    ok(!invalid.length, `all ${meshes.length} mesh bounds finite${invalid.length ? ': '+invalid.join('; ') : ''}`);
    ok(!penetrations.length, `no visible mesh sunk below the walking floor beyond 0.5 mm${penetrations.length ? ': '+penetrations.join('; ') : ''}`);
    ok(exceptions.length === 5, `five named background/slab/effect exceptions: ${exceptions.join('; ')}`);
    const floorOverlays=meshes.map(m=>({m,b:bounds(m)})).filter(({b})=>b.min.y>floor+.0005&&b.min.y<floor+.03&&b.max.y-b.min.y<.0005);
    const raisedPaint=floorOverlays.filter(({m,b})=>{
      const mats=Array.isArray(m.material)?m.material:[m.material],gap=b.min.y-floor;
      return !mats.every(mat=>mat?.polygonOffset)||!clipException('training-floor-paint','training-floor','training:decal',gap);
    });
    ok(floorOverlays.length>=7&&!raisedPaint.length, 'floor paint: '+floorOverlays.length+' flat overlays within 2 mm and using polygonOffset'+(raisedPaint.length ? '; raised: '+raisedPaint.map(({m,b})=>(m.name||m.parent?.name||'(unnamed)')+' '+((b.min.y-floor)*1000).toFixed(1)+' mm').join('; ') : ''));

    // The direct floor contacts are independent fixtures; wall-mounted stations are
    // checked against their actual wall plane, not incorrectly called floating.
    for (const n of ['training-firing-bench','training-gate-frame','training-hqPanel','training-infirmary-fence','training-razor-perimeter']) {
      const o = g.getObjectByName(n), b = o && bounds(o), gap = b ? b.min.y-floor : NaN;
      ok(!!b && Math.abs(gap) <= .0005, `${n} on floor at ${b ? label(b) : 'missing'} (gap ${gap.toFixed(4)} m)`);
    }
    const overlap=(a,b)=>a&&b&&['x','y','z'].every(axis=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis])>.005);
    const bench=bounds(g.getObjectByName('training-firing-bench'));
    const monitor=g.getObjectByName('range-drill-monitor');
    ok(!!monitor&&overlap(bounds(monitor),bench),'range drill monitor mounted into the firing bench, not floating');
    const armory=g.getObjectByName('training-armory'),rack=g.getObjectByName('armoryRack');
    ok(!!armory&&!!rack&&overlap(bounds(rack),bounds(armory)),'Armory rack mounted in the wall station, not floating');
    for (const [n,wallX,face] of [['training-cif',8,'max'],['training-armory',8,'max'],['training-kiosk',8,'max'],['training-hqPanel',-44,'min'],['training-skullWindow',-44,'min'],['training-range-console',-8,'min']]) {
      const o = g.getObjectByName(n), b = o && bounds(o), gap = b ? b[face].x-wallX : NaN;
      ok(!!b && Math.abs(gap) <= .0005, `${n} seated on wall x=${wallX} at ${b ? label(b) : 'missing'} (face error ${gap.toFixed(4)} m)`);
    }
    const targetBases = tg.solids.filter(s => s.prop && !s.target && s.maxY-floor <= .201 && s.minY-floor >= -.0005);
    ok(targetBases.length === 5, `five target bases seated on the floor (${targetBases.length})`);
    tg.targets.slice(0,5).forEach((t,i) => {
      const base = targetBases.find(s => s.minX <= tg.origin.x+t.x && s.maxX >= tg.origin.x+t.x && s.minZ <= tg.origin.z+t.z && s.maxZ >= tg.origin.z+t.z);
      ok(!!base, `target ${i+1} at ${t.x.toFixed(1)},${t.z.toFixed(1)} has a grounded base`);
    });
    const independent = ['training-cif','training-kiosk','training-armory','training-hqPanel','training-skullWindow','training-range-console','training-gate-frame'].map(n => [n,g.getObjectByName(n)]).filter(x=>x[1]);
    for(let i=0;i<5;i++) independent.push([`target ${i+1}`,tg.targets[i].pivot.parent]);
    const overlaps=[];
    for(let i=0;i<independent.length;i++) for(let j=i+1;j<independent.length;j++) {
      const a=bounds(independent[i][1]),b=bounds(independent[j][1]);
      const d=[Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x),Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y),Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)];
      if(d.every(v=>v>.005)) overlaps.push(`${independent[i][0]} × ${independent[j][0]} at ${label(a)} (${d.map(v=>v.toFixed(3)).join('/')} m)`);
    }
    ok(!overlaps.length, `independent stations and targets clear each other${overlaps.length ? ': '+overlaps.join('; ') : ''}`);

    // A 2 m zigzag through both rooms samples each floor, then visits the actual
    // interaction fronts. Skip fixture footprints: walking through a cabinet is
    // a player collision check, not a ground-surface sample.
    let walked=0, holes=[];
    const regions = [[-7,7,-11,29],[-43,-9,-11,27]];
    for(const [x0,x1,z0,z1] of regions) for(let z=z0;z<=z1;z+=2) for(let x=x0;x<=x1;x+=2) {
      const wx=tg.origin.x+x,wz=tg.origin.z+z;
      const h=T.sampleHeight(wx,wz);walked++;
      if(!Number.isFinite(h)||Math.abs(h-floor)>.0005)holes.push(`${x},${z}: ${h}`);
    }
    for(const [k,s] of Object.entries(tg.stations)) {
      const h=T.sampleHeight(s.front.x,s.front.z);walked++;
      if(!Number.isFinite(h)||Math.abs(h-floor)>.0005)holes.push(`${k} front: ${h}`);
    }
    ok(walked>=300 && !holes.length, `${walked} grid/interaction samples on solid Training floor${holes.length ? ': '+holes.join('; ') : ''}`);
  } catch(e) { ok(false, 't336 threw: '+String(e.stack||e).slice(0,700)); }
  return out.join('\n');
})()
