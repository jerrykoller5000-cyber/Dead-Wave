import fs from 'node:fs';
const dir='review/GP-20136/',path=dir+'index-candidate.html',source=fs.readFileSync(path,'utf8'),nl=source.includes('\r\n')?'\r\n':'\n';let s=source;const edits=[],norm=x=>x.replace(/\r?\n/g,nl);
function edit(a,b,count=1){a=norm(a);b=norm(b);if(s.split(a).length!==count+1)throw Error('anchor '+a.slice(0,80));s=s.split(a).join(b);edits.push({a,b,count,area:'reload-counts: Director approval pending'});}
edit('      if (!entry || !entry.spare.length) return false;\n      let best = 0;',`      if (!entry) return false;
      if (isLooseRoundWeapon(w)) {
        if (spareMagazineRounds(magazineStore, w) <= 0) return false;
        for (let h = 0; h < (dual ? 2 : 1); h++) if (entry.loaded[h] && entry.loaded[h].rounds < entry.size) return true;
        return false;
      }
      if (!entry.spare.length) return false;
      let best = 0;`);
edit('isMagazineWeapon(currentWeapon) ? !magazineStore[currentWeapon]?.spare.length : reserveOf(currentWeapon) <= 0','isMagazineWeapon(currentWeapon) ? spareMagazineRounds(magazineStore, currentWeapon) <= 0 : reserveOf(currentWeapon) <= 0',2);
edit('reloadWeapon === currentWeapon && isMagazineWeapon(currentWeapon) && !reloadDrop','reloadWeapon === currentWeapon && isMagazineWeapon(currentWeapon) && !isLooseRoundWeapon(currentWeapon) && !reloadDrop');
edit("Math.min(6, Math.max(0, ...((magazineStore.revolver && magazineStore.revolver.spare) || []).map((m) => m.rounds | 0)))","Math.min(6, Math.max(0, (ammoByWeapon.revolver | 0) + spareMagazineRounds(magazineStore, 'revolver')))");
edit("        // GB-137: R pockets the old magazine with its rounds and the fullest one goes in. The revolver's empties fall,\n        // and its live rounds go back into a loader (a part-full one); only a double tap dumps the cylinder outright.","        // Magazines retain their old swap/drop behavior. A revolver keeps live rounds and\n        // tops up its cylinders from one loose-round pool, including an akimbo pair.");
const metaPath=dir+'index-candidate-patches.json',metaSource=fs.readFileSync(metaPath,'utf8'),meta=JSON.parse(metaSource);meta.edits.push(...edits);meta.scope='Review-only integration; reload count-loan and fast-R choice awaiting Director; no production edits';if(fs.readFileSync(path,'utf8')!==source||fs.readFileSync(metaPath,'utf8')!==metaSource)throw Error('candidate changed');fs.writeFileSync(path+'.tmp',s);fs.renameSync(path+'.tmp',path);fs.writeFileSync(metaPath+'.tmp',JSON.stringify(meta,null,2));fs.renameSync(metaPath+'.tmp',metaPath);console.log('Staged five count-only proposals; duration, u timeline, poses and tick untouched');