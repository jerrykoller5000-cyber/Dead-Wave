import fs from 'node:fs';import {spawn} from 'node:child_process';
const rows=[];
for(const [weapon,environment] of [['minigun','training'],['minigun','outdoor'],['uzi','training']]){
 const args=['crew/crew.mjs','slot','run','chatgpt','GP-20133','--checks','Actual landed '+weapon+' '+environment+' first+two steady full magazines, profiler off','--exclusive','--','node','review/GP-20133/post-matrix-clock.mjs',weapon,environment,'post-matrix-current'];
 const exit=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});p.once('error',reject);p.once('exit',resolve);});
 const file='review/GP-20133/post-matrix-current/'+weapon+'-game-clock-'+environment+'.json';let summary=null;if(fs.existsSync(file)){const r=JSON.parse(fs.readFileSync(file));const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;const mags=[];for(const pass of [0,1,2]){const idle=r.rows.find(x=>x.pass===pass&&!x.fire),fire=r.rows.find(x=>x.pass===pass&&x.fire);if(idle&&fire){const a=mean(idle.frames),b=mean(fire.frames);mags.push({pass,idleMs:a,fireMs:b,firePercentOverIdle:100*(b/a-1),before:fire.beforeState,after:fire.afterState,builds:fire.prof.builds.made,pipes:fire.prof.pipes.made});}}summary={source:r.sourceSha256,end:r.endSourceSha256,sourceUnchanged:r.sourceSha256===r.endSourceSha256,modulesUnchanged:JSON.stringify(r.moduleHashes)===JSON.stringify(r.endModuleHashes),menuWallMs:r.menuWallMs,errors:r.errors,failure:r.failure||null,magazines:mags,allWithin10Percent:mags.length===3&&mags.every(x=>x.firePercentOverIdle<=10)};}
 rows.push({weapon,environment,exit,summary});fs.writeFileSync('review/GP-20133/post-matrix-current/remaining-summary.json',JSON.stringify(rows,null,2));if(exit!==0){process.exitCode=1;break;}
}
console.log(JSON.stringify(rows,null,2));
