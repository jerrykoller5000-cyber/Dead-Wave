import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const paths=['game/feral-motion.js','index.html'];
const files=paths.map(path=>({path,source:fs.readFileSync(path,'utf8')}));
for(const f of files)f.next=f.source;
function replace(f,a,b){if(f.next.split(a).length!==2)throw Error(`Missing/ambiguous anchor in ${f.path}: ${a.slice(0,65)}`);f.next=f.next.replace(a,b);}
const [motion,index]=files,nl=motion.source.includes('\r\n')?'\r\n':'\n';
replace(motion,'echoes:2, life:.115, interval:.04','echoes:3, life:.17, interval:.04');
replace(motion,`    armL:Math.sin(phase*2+.8)*.10*a+snap*.13,
    armR:Math.sin(phase*2+2.2)*.10*a-snap*.16, elbow:Math.abs(tic)*.19*a };`.replace(/\n/g,nl),`    // GP-19849: elbows fold/release independently; shoulders fling forward and out.
    armL:Math.sin(phase*2+.8)*.18*a+snap*.18,
    armR:Math.sin(phase*2+2.2)*.19*a-snap*.20,
    armXL:Math.sin(phase*1.5+.4)*.23*a+snap*.10,
    armXR:Math.sin(phase*1.5+2.1)*.25*a-snap*.12,
    elbowL:a*(.24+.32*(.5+.5*Math.sin(phase*1.5+.8)) + Math.abs(tic)*.16),
    elbowR:a*(.24+.34*(.5+.5*Math.sin(phase*1.5+2.4)) + Math.abs(tic)*.18) };`.replace(/\n/g,nl));
replace(index,'ud.armLG.rotation.z += f.armL; if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x -= f.elbow;','ud.armLG.rotation.x += f.armXL; ud.armLG.rotation.z += f.armL; if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x -= f.elbowL;');
replace(index,'ud.armRG.rotation.z += f.armR; if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x -= f.elbow;','ud.armRG.rotation.x += f.armXR; ud.armRG.rotation.z += f.armR; if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x -= f.elbowR;');
for(const f of files)if(hash(fs.readFileSync(f.path,'utf8'))!==hash(f.source))throw Error(`Concurrent edit: ${f.path}`);
for(const f of files)fs.writeFileSync(f.path,f.next,'utf8');
console.log('Applied stronger independent elbow bends, forward/outward flail and three170ms pose echoes.');
