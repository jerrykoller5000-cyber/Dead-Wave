// GT-20076 / J128: assembled visible weapon meshes at their gameplay size, before static batching.
(async () => {
  const T = window.TT;
  const {auditWeapon,auditSling} = await import('/tools/tests/weapon-seating.js');
  const B = T.inspectHost().builders;
  const L = await import('/studio/weapon-longarms.js');
  const S = await import('/studio/weapon-sidearms.js');
  const H = await import('/studio/weapon-heavy.js');
  const K = await import('/studio/katana.js');
  const F = await import('/studio/frag-grenade.js');
  const {makeOptic} = await import('/studio/weapon-optics.js');
  const {buildHolyGrenade} = await import('/world/rabbit.js');
  const issuedM240=B.m240(false);
  const ctx = {...B.weaponContext(), M240_PIVOT:issuedM240.getObjectByName('m240-elev').position,
    finishGun:g=>g, mergeRigidMeshes:()=>{}};
  const sources=window.captureWeaponSources?new WeakMap():undefined;
  if(sources) {
    const makeKit=ctx.gunKit;
    ctx.gunKit=(...args)=>{
      const kit=makeKit(...args);
      return Object.fromEntries(Object.entries(kit).map(([key,fn])=>[key,(...values)=>{
        const o=fn(...values);
        if(o?.isObject3D) {
          const location=new Error().stack.split('\n').filter(s=>/studio\/(?:weapon-|gun-detail)/.test(s));
          sources.set(o,location.map(s=>s.match(/studio\/[^ )]+/)?.[0]).filter(Boolean).join(' '));
        }
        return o;
      }]));
    };
  }
  const {THREE} = ctx;

  const builds = {
    pistol: S.makePistolModel, revolver: S.makeRevolverModel, uzi: S.makeUziModel,
    m4: L.makeM4Model, ak: L.makeAkModel, aa12: L.makeAa12Model, shotgun: L.makeShotgunModel,
    sniper: L.makeSniperModel, minigun: H.makeMinigunModel, launcher: H.makeLauncherModel,
    flamer: H.makeFlamerModel, chainsaw: H.makeChainsawModel,
    knife: c=>S.makeKnifeModel(c).userData.knifeModel, machete: c=>S.makeKnifeModel(c).userData.macheteModel,
    katana: K.makeKatanaModel, 'katana-sheathed': K.makeSheathedKatana,
    m240: c=>H.makeM240Model(c,false), 'm240-folded': c=>H.makeM240Model(c,true),
    mortar: c=>H.makeMortarModel(c,null,false), 'mortar-collapsed': c=>H.makeMortarModel(c,null,true),
    'mortar-round': ()=>B.mortarRound(), 'frag-grenade': c=>F.makeFragGrenade({...c,r:0.05}),
    'holy-grenade': ()=>buildHolyGrenade(THREE), 'med-pen': ()=>B.medPen(),
    'rune-pistol': ()=>B.runePistol(), shovel: ()=>B.shovel()
  };
  const results = {}, lines = [];
  // Exercise the tolerance, designated support and depth rules independently of the art.
  {
    const scene=new THREE.Group();
    const block=(dims,x,y=0,z=0)=>{
      const piece=new THREE.Mesh(new THREE.BoxGeometry(...dims));
      piece.position.set(x,y,z); scene.add(piece); return piece;
    };
    const host=block([.04,.04,.04],0), part=block([.01,.01,.01],.02549);
    const check=(pass,title)=>lines.push((pass?'PASS ':'FAIL ')+'geometry fixture '+title);
    check(auditWeapon(scene).loose.length===0,'0.49 mm gap');
    part.position.x=.02551;
    check(auditWeapon(scene).loose.length===1,'0.51 mm gap');
    part.position.x=.035;
    block([.02,.004,.004],.025);
    check(auditWeapon(scene,{seats:[{part,host}]}).unseated.length===1,'wrong support despite connected assembly');
    scene.remove(scene.children[2]);
    part.position.x=.023;
    check(auditWeapon(scene,{seats:[{part,host,depth:.002}]}).overlaps.length===0,'two millimetre socket');
    part.position.x=.022;
    check(auditWeapon(scene,{seats:[{part,host,depth:.002}]}).overlaps.length===1,'overshot socket stop');
    scene.remove(host,part);
    block([.2,.006,.006],0);
    block([.006,.15,.006],.04,.034,.001);
    check(auditWeapon(scene).overlaps.length===1,'crossing edges with no corner inside');
    const batched=new THREE.BufferGeometry();
    batched.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, .01,0,0, 0,.01,0, .02,0,0, .03,0,0, .02,.01,0],3));
    check(auditWeapon(new THREE.Mesh(batched)).loose.length===1,'disconnected islands in one draw mesh');
  }
  function requiredSeats(gun) {
    const seats=[];
    function pair(group,name,host,localDepth=0) {
      const parts=group.children.filter(o=>o.name===name);
      const support=group.children.find(o=>o.name===host);
      if (!parts.length || !support) throw Error(group.name+' lost '+name+' or '+host);
      const scale=support.getWorldScale(new THREE.Vector3());
      const depth=localDepth*Math.min(scale.x,scale.y,scale.z)*1.8/1.655;
      for (const part of parts) seats.push({part,host:support,depth});
    }
    if(gun.getObjectByName('shovel grip bar')) {
      // The handle cheeks terminate at the exposed underside of the wooden bar.
      pair(gun,'shovel handle strap','shovel grip bar');
      // The cheeks terminate at y=.170 against the timber that starts at y=.160.
      pair(gun,'shovel handle strap','shovel shaft',.010);
      // The blade's top edge nests along the centreline of the rolled 6 mm lip.
      pair(gun,'shovel rolled tread','shovel blade',.006);
      pair(gun,'shovel socket','shovel shaft');
      pair(gun,'shovel backing plate','shovel blade');
    }
    gun.traverseVisible(o=>{
      if (o.name==='optic.rmr' || o.name==='top RMR') {
        for (const key of ['side brightness key','coin elevation adjuster','coin windage adjuster'])
          pair(o,key,'bottom battery compartment and forged base');
      }
      if (o.name==='optic.acog') {
        pair(o,'left clamp thumbscrew','TA51 clamp and interface studs');
        pair(o,'32 mm objective lens','squared front objective anti-glare bore');
        pair(o,'ocular lens','rubber eyepiece anti-glare bore');
      }
      if (o.name==='optic.prism') pair(o,'ocular lens','ocular and focus ring anti-glare bore');
      if (o.name==='laserLightUnit') {
        for (const which of ['light','laser']) {
          // PEQ-16 has a second pair of windows on the projecting face.
          const named=s=>o.children.filter(k=>k.name===which+s);
          const cavities=named('Cavity'), shoulders=named('BezelSeat');
          if (!cavities.length || cavities.length!==shoulders.length) throw Error('Missing '+which+' window seat');
          cavities.forEach((part,i)=>seats.push({part,host:shoulders[i]}));
        }
      }
    });
    return seats;
  }
  function check(id,g) {
    g.visible=true;
    const u=g.userData;
    const r=auditWeapon(g,{metresPerUnit:1.8/1.655,sources,seats:requiredSeats(g),ignore:[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)});
    r.metresPerLocalUnit=g.scale.toArray().map(s=>s*1.8/1.655);
    results[id]=r;
    const loose=r.loose.length, overlaps=r.overlaps.length;
    lines.push((r.parts>0 && !loose && !overlaps && !r.unseated.length?'PASS ':'FAIL ')+id+' ('+r.parts+' pieces, '+loose+' unsupported groups, '+r.unseated.length+' missing host contacts, '+overlaps+' pairs beyond their seating depth)');
    if(loose) lines.push('INFO '+id+' loose: '+JSON.stringify(r.loose.slice(0,2)));
    if(overlaps) lines.push('INFO '+id+' penetration: '+JSON.stringify(r.overlaps.slice(0,2)));
    window.weaponSeatProgress=id;
  }
  const bare = new Map();
  for(const [id,build] of Object.entries(builds)){
    const gun=build(ctx);
    if(T.weaponMeshes[id]) gun.scale.copy(T.weaponMeshes[id].scale);
    if(id==='rune-pistol') gun.scale.copy(T.weaponMeshes.pistol.scale);
    if(['knife','machete','katana'].includes(id)) {
      const held=T.knifeMesh();
      gun.scale.copy(held.userData[id+'Model'].scale).multiply(held.scale);
    }
    if(id==='m240' || id==='m240-folded') {
      const issued=issuedM240.userData.feedCover.getObjectByName('optic.acog');
      const optic=makeOptic('acog'); optic.position.copy(issued.position);
      gun.userData.feedCover.add(optic);
    }
    // The game equips the NX8 as standard, replacing the older builder's optic.
    if(id==='sniper'){
      const issued=T.weaponMeshes.sniper.getObjectByName('optic.nx8');
      const legacy=gun.getObjectByName('scope');
      if(!issued || !legacy) throw Error('missing issued or original sniper scope');
      legacy.visible=false;
      const scope=makeOptic('nx8'); scope.position.copy(issued.position); gun.add(scope);
    }
    check(id,gun);
    bare.set(id,gun);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  T.grantAllWeapons();
  T.modsOwnAllDbg();
  for (const [id,gun] of bare) {
    if (!T.weaponMeshes[id]) continue;
    const u=gun.userData;
    const mods=T.armoryDbg.mods(id);
    const offered=key=>mods.some(m=>m.id===key);
    if (offered('ext')) B.gunExtLook(gun,id,true);
    if (u.suppressor) B.gunSuppressor(gun,true);
    if (u.laserLightUnit) u.laserLightUnit.visible=true;
    if (offered('ext') || u.suppressor || u.laserLightUnit) check(id+'-equipped',gun);
    if (offered('heavy')) {
      if (offered('ext')) B.gunExtLook(gun,id,false);
      B.gunHeavyLook(gun,id,true);
      check(id+'-heavy',gun);
    }
    for (const kind of T.opticDbg.options[id]||[]) {
      if (T.opticDbg.fitted()[id]!==kind && !T.opticDbg.fit(id,kind)) throw Error('cannot fit '+id+' '+kind);
      const mount=T.cloneLean(T.weaponMeshes[id].userData.fittedOptic);
      const folded=mount.getObjectByName('optic.'+kind);
      if (!folded) throw Error('missing fitted optic '+id+' '+kind);
      const raw=makeOptic(kind);
      raw.position.copy(folded.position); raw.quaternion.copy(folded.quaternion); raw.scale.copy(folded.scale);
      const clamp=folded.parent; clamp.remove(folded); clamp.add(raw);
      if (u.defaultSight) u.defaultSight.visible=false;
      if (u.opticPlate) u.opticPlate.visible=true;
      if (u.opticRail) u.opticRail.visible=true;
      (id==='pistol'?u.slide:gun).add(mount);
      check(id+'-'+kind,gun);
      mount.parent.remove(mount);
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  // Use the game's carry preview. Both shoulders and vest states have distinct strap paths.
  window.DWOpening?.dismissForTesting?.();
  document.getElementById('playerName').value='WeaponSeating';
  document.getElementById('modeTraining').click();
  const deadline=performance.now()+30000;
  while(!T.trainingDbg.state().active && performance.now()<deadline) {
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!T.trainingDbg.state().active) throw Error('Training Ground did not open');
  T.grantAllWeapons();
  T.setViewFirstDbg(false);
  const marine=T.makeMarine(), slings={};
  for (const kind of ['m4','ak','aa12','shotgun','sniper','launcher','minigun','flamer','chainsaw']) {
    // A carried copy inherits the live weapon's visible pieces. Wait for the
    // normal equip transition before asking the preview rig to clone that gun.
    for(let n=0;n<16 && T.getCurrentWeapon()!==kind;n++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf(kind));
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    for(let n=0;n<30;n++) T.stepFrame(1/30);
    for (const vest of [false,true]) {
      const rig=T.carryPreview(marine,{loadout:{primary:[kind,kind],secondary:[null,null]},
        inHand:null,akimbo:false,vest,grenades:0});
      for (const [i,spot] of rig.slings.entries()) {
        const id=kind+'-'+('slot'+(i+1))+(vest?'-vest':'');
        let state;
        try {state=auditSling(spot,1.8/1.655);}
        catch(error) {
          slings[id]={error:error.message};
          lines.push('FAIL sling '+id+' '+error.message);
          continue;
        }
        slings[id]=state;
        const unsupported=state.ends.filter(e=>!e.gunContact || !e.webContact).length;
        lines.push((!unsupported && !state.overlaps.length?'PASS ':'FAIL ')+'sling '+id+
          ' ('+unsupported+' unsupported ends, '+state.overlaps.length+' penetrating pairs)');
      }
    }
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  window.weaponSlingAudit=slings;
  window.weaponSeatAudit=results;
  return lines.join('\n');
})();
