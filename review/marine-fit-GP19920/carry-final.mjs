import fs from 'node:fs';
function edit(p,fn){const s=fs.readFileSync(p,'utf8'),t=fn(s);if(fs.readFileSync(p,'utf8')!==s)throw Error('Concurrent edit: '+p);fs.writeFileSync(p,t);}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing anchor '+a);return s.replace(a,b);}
edit('index.html',s=>{
s=replace(s,'lower ? side * -.12 : side * .72','lower ? side * -.12 : 0');
s=replace(s,'const fit = lower && PACK_FIT[spot.kind]','const fit = lower && PACK_FIT[spot.fitKind || spot.kind]');
s=replace(s,'        rig.placeSecondary(rig.holsters[i],side,kind!==\'uzi\');','        rig.holsters[i].fitKind=kind;rig.pairs[i].fitKind=kind;\n        rig.placeSecondary(rig.holsters[i],side,kind!==\'uzi\');');
s=replace(s,'      fitMarineHelmetParts(THREE,gearParts.helmet,HEAD_PIVOT_Y);',`      fitMarineHelmetParts(THREE,gearParts.helmet,HEAD_PIVOT_Y);
      // A rigid rhino bracket joins the fitted shroud to the unchanged flip axis.
      gearParts.helmet.push(link(headG,[0,1.537-HEAD_PIVOT_Y,.166],[0,1.58-HEAD_PIVOT_Y,.1],.024,.018,nvgMat));`);
const a=s.indexOf('    function fitCarriedGuns(rig) {'),b=s.indexOf('    gunFurniture =',a);
if(a<0||b<0)throw Error('fit anchors');
s=s.slice(0,a)+`    function fitCarriedGuns(rig) {
      const band=!!rig.bandolier?.visible||!!rig.belt40?.visible;
      function station(h,cls){
        const kind=h.kind||h.fitKind||(cls==='hip'?'pistol':null);if(!kind)return;
        // Fit the empty shell to the same cached weapon when its owner draws it.
        const original=h.kind,empty=!h.gun;
        if(empty){const key='shell-fit:'+kind+'+'+gunLookKey(kind);
          let copy=rig.copies.get(key);if(!copy){copy=carryGunCopy(kind);if(copy)rig.copies.set(key,copy);}
          if(!copy)return;h.gun=copy;h.kind=kind;h.g.add(copy);
          if(cls==='holster')copy.rotation.z=(kind==='uzi'?1:-1)*(h.g.position.x>0?Math.PI/2:-Math.PI/2);
        }
        fitCarriedGun(h,cls,band);
        if(cls==='holster')clearCarryPack(THREE,h);
        if(kind!=='uzi')fitCarryHolster(THREE,h,leatherMat);
        if(empty){h.g.remove(h.gun);h.gun=null;h.kind=original;}
      }
      rig.slings.forEach(s=>{fitCarriedGun(s,'sling');clearCarryPack(THREE,s,true);fitWeaponSling(THREE,s,rig.slingVest,carryMats.mag);});
      for(const h of rig.holsters.concat(rig.pairs))station(h,'holster');
      for(const h of [rig.hip,rig.hipPair])station(h,'hip');
    }
`+s.slice(b);return s;
});
edit('ui/marine-face.js',s=>replace(s,'[1.253,.074,.097,.084],[1.272,.064,.111,.075]','[1.253,.080,.097,.084],[1.272,.077,.111,.080]'));
edit('studio/marine-body.js',s=>replace(s,"skinW,'forearm',24,'both',.88)","skinW,'forearm',24,'high',.88)"));
