import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
const start=s.indexOf('    function fitDiveCup('),end=s.indexOf('    function raiseDiveHold(',start);if(start<0||end<0)throw Error('cup helper');s=s.slice(0,start)+s.slice(end);
edit('        for(let i=0;i<2;i++){fitDiveCup(anchor,gun,H,armL);aimGun();}\n','');
edit('      if(!left)diveSideHoldR=sideClear;','      const singleSidearm=!akimboOn()&&diveFlatW>.5&&(currentWeapon===\'pistol\'||currentWeapon===\'revolver\');\n      if(!left)diveSideHoldR=sideClear||singleSidearm;');
edit('const side=sideClear||akimboOn()?(left?-1:1):0;','const side=sideClear||akimboOn()||singleSidearm?(left?-1:1):0;');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Single sidearms use one-hand dive presentation; dual and long-gun holds retained');
const p='review/dive-clearance-GP19918/extra.mjs',source=fs.readFileSync(p,'utf8');let test=source;
test=test.replace("sideHold:new V(0,0,1).transformDirection(T.getMarine().userData.torsoG.matrixWorld).y<-.5", "sideHold:(!dual&&T.diveDbg().flat>.5&&['pistol','revolver'].includes(w))||new V(0,0,1).transformDirection(T.getMarine().userData.torsoG.matrixWorld).y<-.5");
if(fs.readFileSync(p,'utf8')!==source)throw Error('test changed');fs.writeFileSync(p,test);console.log('Runtime checks require free-arm clearance for the single-sidearm pose; dual grips still checked');
