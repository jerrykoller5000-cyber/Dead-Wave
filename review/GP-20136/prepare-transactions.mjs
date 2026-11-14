import fs from 'node:fs';
const dir='review/GP-20136/',base=fs.readFileSync(dir+'inventory-native.mjs','utf8');let s=base;
const extra=`
Object.assign(inventoryProbe,{
 capacity(w){return isMagazineWeapon(w)?magazineCap(w):reserveCap(caliberOf(w));},
 reserve(w,n){if(isMagazineWeapon(w)){const e=magazineStore[w];e.spare.length=0;e.spareRounds=n;syncMagazine(w);}else reserveAmmo[caliberOf(w)]=n;updateAmmoHud();},
 loaded(w,n){if(isMagazineWeapon(w)){setLoadedMagazineRounds(magazineStore,w,n,akimboOn());syncMagazine(w);}else ammoByWeapon[w]=n;updateAmmoHud();},
 cash(n){bank=n;},
 buy(w){const before=bank,ok=buyAmmo(w,true);return{ok,spent:before-bank,quote:ammoRestockPlan(w)};},
 pickup(w,n){return applyOneSupply('ammo:'+caliberOf(w),n);},
 twice(){startReload();startReload();return{started:reloading,drop:reloadDrop,duration:reloadAnimDuration};},
 transfer(w){const before=this.read(w);handInGun(w);const taken=takeOutGun(w);return{before,taken,after:this.read(w)};},
 ui(w){const type=w==='revolver'?'secondary':'primary';return{hidden:document.getElementById('ammoMags').hidden,hud:document.getElementById('ammo').innerText,wheel:buildWheelItems('weapon').find(x=>x.key===w)?.meta,tiles:[0,1].map(i=>document.querySelector('[data-slot="'+type+':'+i+'"]')?.innerText)};}
});`;
s=s.replace('const cut=source.lastIndexOf', 'const extra='+JSON.stringify(extra)+';\nconst cut=source.lastIndexOf').replace('source.slice(0,cut)+inject+source.slice(cut)','source.slice(0,cut)+inject+extra+source.slice(cut)');
const a=s.indexOf("for(const [weapon,pair]of [['revolver',false]"),b=s.indexOf('report.errors=page.errors;',a);if(a<0||b<0)throw Error('loop anchors');
const loop=`
for(const [weapon,pair]of [['revolver',false],['revolver',true],['launcher',false]]){
 const id=weapon+(pair?'-pair':'');await page.evaluate('inventoryProbe.setup('+JSON.stringify(weapon)+','+pair+')');
 const cap=await page.evaluate('inventoryProbe.capacity('+JSON.stringify(weapon)+')');await page.evaluate('inventoryProbe.cash(50000);inventoryProbe.reserve('+JSON.stringify(weapon)+','+(cap-1)+')');
 const loaded0=(await page.evaluate('inventoryProbe.read('+JSON.stringify(weapon)+')')).loaded;
 const near=await page.evaluate('inventoryProbe.buy('+JSON.stringify(weapon)+')'),nearState=await page.evaluate('inventoryProbe.read('+JSON.stringify(weapon)+')');assert(near.ok&&near.spent>0);assert.equal(nearState.reserve,cap);assert.equal(nearState.loaded,loaded0);assert.equal(near.quote.cost,0,'full quote must be zero');
 const full=await page.evaluate('inventoryProbe.buy('+JSON.stringify(weapon)+')');assert.equal(full.ok,false);assert.equal(full.spent,0,'full pool must never charge');
 await page.evaluate('inventoryProbe.reserve('+JSON.stringify(weapon)+','+(cap-2)+');inventoryProbe.cash(0)');const poor=await page.evaluate('inventoryProbe.buy('+JSON.stringify(weapon)+')');assert.equal(poor.ok,false);assert.equal(poor.spent,0);assert.equal((await page.evaluate('inventoryProbe.read('+JSON.stringify(weapon)+')')).reserve,cap-2);
 const pickup=await page.evaluate('inventoryProbe.pickup('+JSON.stringify(weapon)+',3)');assert.equal(pickup.accepted,2);assert.equal(pickup.remaining,1);assert.equal((await page.evaluate('inventoryProbe.read('+JSON.stringify(weapon)+')')).reserve,cap);
 const transfer=await page.evaluate('inventoryProbe.transfer('+JSON.stringify(weapon)+')');assert.equal(transfer.taken,true);assert.equal(transfer.after.loaded,transfer.before.loaded);assert.equal(transfer.after.reserve,transfer.before.reserve);
 await page.evaluate('inventoryProbe.setup('+JSON.stringify(weapon)+','+pair+')');const before=await page.evaluate('inventoryProbe.read('+JSON.stringify(weapon)+')'),twice=await page.evaluate('inventoryProbe.twice()');assert(twice.started);assert.equal(twice.drop,false,'cylinders do not discard live rounds');assert(await page.waitFor('!TT.isReloading()',{timeout:15000}));const after=await page.evaluate('inventoryProbe.read('+JSON.stringify(weapon)+')');assert.equal(after.loaded+after.reserve,before.loaded+before.reserve);assert.equal(after.loaded,weapon==='launcher'?6:pair?10:6);assert.equal(after.reserve,weapon==='launcher'?7:pair?0:2);
 await page.evaluate('inventoryProbe.armory('+JSON.stringify(weapon)+')');const ui=await page.evaluate('inventoryProbe.ui('+JSON.stringify(weapon)+')');assert(ui.hidden);assert(!/loaders| mags/.test(ui.hud));assert(/rounds/.test(ui.hud));assert(/rounds/.test(ui.wheel));assert(!/magazine/.test(ui.tiles.join(' ')));await page.screenshot(out+'/'+label+'-'+id+'-armory.png');await page.evaluate('inventoryProbe.close()');
 report.rows.push({weapon,pair,cap,near,full,poor,pickup,transferConserved:true,twice,before,after,ui});console.log(JSON.stringify({weapon,pair,cap,delivered:nearState.reserve-(cap-1),fullSpent:full.spent,pickup,loaded:after.loaded,reserve:after.reserve}));
}
for(const first of [false,true])for(const time of [.25,.75])for(const width of [1280,390]){await page.setViewport(width,width===390?844:720);await page.evaluate('inventoryProbe.setup("revolver",true);inventoryProbe.view('+first+');TT.setWorldTime('+time+')');await pause(200);const id=(first?'fp':'tp')+'-'+(time===.25?'day':'night')+'-'+width;await page.screenshot(out+'/'+label+'-'+id+'-hud.png');const layout=await page.evaluate('(()=>{const a=document.getElementById("ammo"),r=a.getBoundingClientRect();return{hidden:document.getElementById("ammoMags").hidden,hud:a.innerText,left:r.left,right:r.right,bottom:r.bottom,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};})()');assert(layout.hidden&&/rounds/.test(layout.hud));assert(!layout.overflow&&layout.left>=0&&layout.right<=layout.viewport);(report.layouts||=[]).push({id,...layout});}
`;
s=s.slice(0,a)+loop+s.slice(b);const p=dir+'inventory-transactions.mjs';if(fs.existsSync(p))throw Error('exists');fs.writeFileSync(p,s);console.log('Native purchase/full/poor/pickup/stow/doubleR +8HUD checks prepared');