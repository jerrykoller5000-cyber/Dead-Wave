import fs from 'fs'; import path from 'path';
const keys='roleArmorAdd roleFireAdd _tickAcc paceMul paceNight paceU hzRecoilT hzRecoilCd hzRecoilSide hzStaggerCd stuckT _hzReach _rim unstickSide fogKeepT ringHeld lineGo guardianProgressT _shotN buffT'.split(' ');
const files=['index.html',...fs.readdirSync('game').filter(f=>f.endsWith('.js')).map(f=>'game/'+f)];
const txt=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8').split(/\r?\n/)]));
for(const k of keys){console.log('=== '+k);const re=new RegExp('.{0,60}\\.'+k.replace('$','\\$')+'\\b.{0,60}','g');
for(const f of files)txt[f].forEach((l,i)=>{const m=l.match(re);if(m)console.log(' '+f+':'+(i+1)+' | '+m.join(' ## '))});}
