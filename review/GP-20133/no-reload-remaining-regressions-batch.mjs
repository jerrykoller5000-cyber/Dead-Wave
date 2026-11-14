import fs from 'node:fs';import {spawn} from 'node:child_process';
const rows=[];
for(const test of ['t187','tcb291','t218','t262']){
 const args=['crew/crew.mjs','slot','run','chatgpt','GP-20133','--checks','Unchanged native '+test+' original/candidate, fresh pages, shared frozen modules','--','node','review/GP-20133/matrix-no-reload-regressions.mjs','pistol','outdoor','matrix-no-reload-'+test,test];
 const exit=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});p.once('error',reject);p.once('exit',resolve);});
 const file='review/GP-20133/matrix-no-reload-'+test+'/pistol-game-clock-outdoor.json';let result=null;if(fs.existsSync(file)){const r=JSON.parse(fs.readFileSync(file));result={source:r.sourceSha256,end:r.endSourceSha256,sourceUnchanged:r.sourceSha256===r.endSourceSha256,rows:r.rows.map(x=>({sparse:x.sparse,completed:x.completed,pass:x.pass,fail:x.fail,errors:x.errors})),failure:r.failure||null};}
 rows.push({test,exit,result});fs.writeFileSync('review/GP-20133/no-reload-remaining-regressions-summary.json',JSON.stringify(rows,null,2));if(exit!==0){process.exitCode=1;break;}
}
console.log(JSON.stringify(rows,null,2));
