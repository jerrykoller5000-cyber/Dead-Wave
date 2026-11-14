import fs from 'node:fs';import crypto from 'node:crypto';
const source=fs.readFileSync('index.html','utf8'),nl=source.includes('\r\n')?'\r\n':'\n';let s=source;const edits=[];const norm=x=>x.replace(/\r?\n/g,nl);
function edit(a,b,count=1){a=norm(a);b=norm(b);if(s.split(a).length!==count+1)throw Error('anchor/count '+a.slice(0,100));s=s.split(a).join(b);edits.push({a,b,count});}
edit('createMagazineStore, isMagazineWeapon, issueMagazines','createMagazineStore, isMagazineWeapon, isLooseRoundWeapon, issueMagazines');
edit('    function armoryMagazines(w) {\n      const entry',"    function armoryMagazines(w) {\n      if (isLooseRoundWeapon(w)) return [];\n      const entry");
edit('      const loaded = Number.isFinite(ammoByWeapon[w]) ? Math.max(0, ammoByWeapon[w] | 0) : 0;\n      const magazines = armoryMagazines(w);\n      if (runArmory.has(w)) runArmory.revise(w, { loaded, magazines });\n      else runArmory.buy({ id: w, kind: w, loaded, magazines, rounds: 0, upgrades: {} }, { store: true });',`      const loaded = w === 'revolver' && magazineStore[w] ? magazineStore[w].loaded[0].rounds : Number.isFinite(ammoByWeapon[w]) ? Math.max(0, ammoByWeapon[w] | 0) : 0;
      const magazines = armoryMagazines(w), rounds = isLooseRoundWeapon(w) ? reserveOf(w) : 0;
      if (runArmory.has(w)) runArmory.revise(w, { loaded, magazines, rounds });
      else runArmory.buy({ id: w, kind: w, loaded, magazines, rounds, upgrades: {} }, { store: true });`);
edit('      if (!entry) return 0;\n      entry.spare = Array.from',`      if (!entry) return 0;
      if (isLooseRoundWeapon(w)) { entry.spare.length = 0; entry.spareRounds = Math.max(0, n | 0) * entry.size; syncMagazine(w); return Math.max(0, n | 0); }
      entry.spare = Array.from`);
edit('        entry.spare.length = 0;\n        entry.maxSpare',"        entry.spare.length = 0;\n        if (isLooseRoundWeapon(w)) entry.spareRounds = 0;\n        entry.maxSpare");
edit('    function buyAmmo(key, quiet) {\n',"    function buyAmmo(key, quiet) {\n      if (isLooseRoundWeapon(key)) key = caliberOf(key);\n");
edit('        if ((reserveAmmo[c] | 0) >= cap || !spend(pk.cost)) return false;\n        reserveAmmo[c] = Math.min(cap, (reserveAmmo[c] | 0) + pk.n);',`        const target = magazineSupplyTarget(c), loose = isLooseRoundWeapon(target) && magazineStore[target];
        const have = loose ? spareMagazineRounds(magazineStore, target) : reserveAmmo[c] | 0;
        if (have >= cap || !spend(pk.cost)) return false;
        if (loose) addWeaponMagazineRounds(target, pk.n, true);
        else reserveAmmo[c] = Math.min(cap, have + pk.n);`);
edit('weaponOwned[w] && !isMagazineWeapon(w) && caliberOf(w) === c','weaponOwned[w] && (!isMagazineWeapon(w) || isLooseRoundWeapon(w)) && caliberOf(w) === c');
edit('const magKeys = w == null ? MAGAZINE_WEAPONS.filter(k => weaponOwned[k]) : isMagazineWeapon(w) && weaponOwned[w] ? [w] : [];','const magKeys = w == null ? MAGAZINE_WEAPONS.filter(k => weaponOwned[k] && !isLooseRoundWeapon(k)) : isMagazineWeapon(w) && !isLooseRoundWeapon(w) && weaponOwned[w] ? [w] : [];');
edit("weaponOwned[w] && !isMagazineWeapon(w) ? [w === 'chainsaw' ? w : caliberOf(w)] : [];","weaponOwned[w] && (!isMagazineWeapon(w) || isLooseRoundWeapon(w)) ? [w === 'chainsaw' ? w : caliberOf(w)] : [];");
edit('    function buildWheelItems(kind) {',`    function wheelAmmoMeta(key) {
      const loaded = Number.isFinite(ammoByWeapon[key]) ? Math.ceil(ammoByWeapon[key]) : '∞';
      return isLooseRoundWeapon(key) ? dwText('weapon.wheel.loose', { loaded, count: reserveOf(key) }) : loaded + ' + ' + reserveOf(key);
    }
    function buildWheelItems(kind) {`);
edit(": (Number.isFinite(ammoByWeapon[key]) ? Math.ceil(ammoByWeapon[key]) : '∞') + ' + ' + reserveOf(key);",': wheelAmmoMeta(key);');
edit("else meta = (Number.isFinite(ammoByWeapon[key]) ? Math.ceil(ammoByWeapon[key]) : '∞') + ' + ' + reserveOf(key);",'else meta = wheelAmmoMeta(key);');
edit("(currentWeapon === 'launcher' ? 'grenades' : currentWeapon === 'flamer' ? 'fuel' : 'bullets')","(isLooseRoundWeapon(currentWeapon) ? 'rounds' : currentWeapon === 'flamer' ? 'fuel' : 'bullets')");
edit("        if (st.melee) return Math.max(0, Math.ceil(sawFuel)) + 's of gas';\n        return", "        if (st.melee) return Math.max(0, Math.ceil(sawFuel)) + 's of gas';\n        if (isLooseRoundWeapon(kind)) return dwText('armory.looseSummary', { loaded: Math.ceil(ammoByWeapon[kind]), count: reserveOf(kind) });\n        return");
edit('          id: w, kind: w, loaded: Number.isSafeInteger(ammoByWeapon[w]) ? ammoByWeapon[w] : 0\n        }));',`          id: w, kind: w, loaded: w === 'revolver' && magazineStore[w] ? magazineStore[w].loaded[0].rounds : Number.isSafeInteger(ammoByWeapon[w]) ? ammoByWeapon[w] : 0,
          ...(isLooseRoundWeapon(w) ? { magazines: [], rounds: reserveOf(w) } : {})
        }));`);
edit('kind: w, loaded: null\n        });',`kind: w, loaded: w === 'revolver' && magazineStore[w]?.loaded[1] ? magazineStore[w].loaded[1].rounds : null,
          ...(isLooseRoundWeapon(w) ? { magazines: [], rounds: 0 } : {})
        });`);
edit('e.spare = spare.slice(0, e.maxSpare).map((r) => ({ rounds: Math.min(e.size, r | 0), size: e.size })); syncMagazine(w);',"if (isLooseRoundWeapon(w)) e.spareRounds = 0; e.spare = spare.slice(0, e.maxSpare).map((r) => ({ rounds: Math.min(e.size, r | 0), size: e.size })); syncMagazine(w);");
const dir='review/GP-20136/';if(fs.existsSync(dir+'index-candidate.html'))throw Error('candidate exists');fs.writeFileSync(dir+'index-candidate.html',s);fs.writeFileSync(dir+'index-candidate-patches.json',JSON.stringify({scope:'Review-only C2-approved adapters; production unchanged; reload count changes not included pending Director loan',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),edits},null,2));console.log('Prepared',edits.length,'bounded adapter proposals, production unchanged');