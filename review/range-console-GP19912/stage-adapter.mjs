import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='review/range-console-GP19912',file='index.html',old=fs.readFileSync(file,'utf8'),nl=old.includes('\r\n')?'\r\n':'\n',patches=[];
const add=(a,b)=>{a=a.replace(/\r?\n/g,nl);b=b.replace(/\r?\n/g,nl);if(old.split(a).length!==2)throw Error('index anchor '+a.slice(0,80));patches.push({oldText:a,newText:b});};
const refill=old.match(/    function rangeRefill\(w\)\{[\s\S]*?\n    \}/)?.[0];if(!refill)throw Error('refill block');
add(refill,`    function rangeRefill(w,d=null){
      if(!w)return;
      fireCooldown=0;
      for(const key of [...new Set(d?.weaponCycle||[w])]){
        if(isMagazineWeapon(key)){const size=singleMagSize(key),maxSpare=magazineMaxSpare(key);issueMagazines(magazineStore,key,{size,loaded:size,spareRounds:size*maxSpare,maxSpare});syncMagazine(key);}
        else if(key!=='chainsaw'){ammoByWeapon[key]=singleMagSize(key);reserveAmmo[caliberOf(key)]=RESERVE_CAP[caliberOf(key)]||60;}
        else {sawFuel=sawFuelMax();sawHeat=0;sawOverheat=false;}
      }
      if(d?.initialRounds!=null){if(isMagazineWeapon(w)){magazineStore[w].loaded[0].rounds=Math.min(singleMagSize(w),d.initialRounds);syncMagazine(w);}else ammoByWeapon[w]=d.initialRounds;}
      updateAmmoHud();
    }`);
add('        owned:w=>!!weaponOwned[w],signature:rangeSignature,','        owned:w=>!!weaponOwned[w],signature:rangeSignature,drillReady:true,');
add('context:()=>({position:localPlayer.position,camera:camera.position,pairChanged:dualActive,','context:()=>({position:localPlayer.position,camera:camera.position,weapon:currentWeapon,holstered:unarmed,reloading,loaded:ammoByWeapon[currentWeapon]||0,pairChanged:dualActive,');
add('        equip:w=>{\n          if(vault||!weaponOwned[w])return null;',`        equip:(w,d=null)=>{
          const weapons=[...new Set(d?.weaponCycle||[w])];
          if(vault||weapons.some(key=>!weaponOwned[key]))return null;`);
add('ammo:ammoByWeapon[w],reserve:{...reserveAmmo},fuel:sawFuel,heat:sawHeat,overheat:sawOverheat};','ammo:ammoByWeapon[w],pack:Object.fromEntries(weapons.map(key=>[key,{mag:magazineStore[key]?JSON.parse(JSON.stringify(magazineStore[key])):null,ammo:ammoByWeapon[key]}])),reserve:{...reserveAmmo},fuel:sawFuel,heat:sawHeat,overheat:sawOverheat};');
add('          syncOffhandVisibility();rangeRefill(w);return saved;','          syncOffhandVisibility();rangeRefill(w,d);if(d?.startHolstered){holsteredKey=w;unarmed=true;}return saved;');
add('if(s.mag)magazineStore[s.w]=s.mag;ammoByWeapon[s.w]=s.ammo;Object.assign(reserveAmmo,s.reserve);','if(s.pack)for(const[key,copy]of Object.entries(s.pack)){if(copy.mag){magazineStore[key]=copy.mag;syncMagazine(key);}ammoByWeapon[key]=copy.ammo;}if(s.mag)magazineStore[s.w]=s.mag;ammoByWeapon[s.w]=s.ammo;Object.assign(reserveAmmo,s.reserve);');
let next=old;for(const p of patches)next=next.replace(p.oldText,p.newText);
fs.writeFileSync(dir+'/index.before.txt',old);fs.writeFileSync(dir+'/adapter-patch.json',JSON.stringify({file,before:crypto.createHash('sha256').update(old).digest('hex'),patches},null,2));
fs.writeFileSync(dir+'/index.html',next.replace('<head>','<head><base href="/">'));
fs.writeFileSync(dir+'/camera.mjs',fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('/index.html?debug=1&raf=timer','/'+dir+'/index.html?debug=1&raf=timer'));
console.log('STAGED '+patches.length+' focused training adapter edits; live index unchanged.');
