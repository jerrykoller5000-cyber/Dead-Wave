import fs from 'node:fs';import {spawn} from 'node:child_process';
const rows=[];const identity=s=>s.replace(/ \([^()]*\)\s*$/,'');
for(let run=1;run<=3;run++){
 const dir='matrix-t229-interleave-'+run;
 const args=['crew/crew.mjs','slot','run','chatgpt','GP-20133','--checks','Director unchanged t229 interleave '+run+'/3: original then V1, fresh pages','--','node','review/GP-20133/matrix-regressions-native.mjs','pistol','outdoor',dir,'t229'];
 const exit=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});p.once('error',reject);p.once('exit',resolve);});
 const file='review/GP-20133/'+dir+'/pistol-game-clock-outdoor.json';let result=null;
 if(fs.existsSync(file)){const r=JSON.parse(fs.readFileSync(file));result={source:r.sourceSha256,end:r.endSourceSha256,testHash:r.testHash,sourceUnchanged:r.sourceSha256===r.endSourceSha256,moduleHashes:r.moduleHashes,endModuleHashes:r.endModuleHashes,rows:r.rows.map(x=>({sparse:x.sparse,completed:x.completed,evaluatorFailure:x.failure||null,pass:x.pass,fail:x.fail,errors:x.errors})),failure:r.failure||null};}
 rows.push({run,exit,result});fs.writeFileSync('review/GP-20133/t229-three-interleaves.json',JSON.stringify({rows},null,2));if(exit!==0){process.exitCode=1;break;}
}
const original=new Set(),candidate=new Set();for(const r of rows)for(const row of r.result?.rows||[])for(const line of row.fail)(row.sparse?candidate:original).add(identity(line));
const novel=[...candidate].filter(x=>!original.has(x)),missing=[...original].filter(x=>!candidate.has(x));
const report={scope:'Three fresh-page unchanged original/V1 pairs interleaved in order A/B A/B A/B, separate queued leases, every literal failure retained. Identity removes terminal measured-value parentheses only; thresholds and official test source untouched.',rows,originalFailingRows:[...original],candidateFailingRows:[...candidate],novelCandidateRows:novel,missingCandidateRows:missing,sameFailingRowIdentities:novel.length===0&&missing.length===0,complete:rows.length===3&&rows.every(x=>x.exit===0&&x.result?.rows.length===2&&x.result.rows.every(y=>y.completed&&!y.evaluatorFailure&&typeof y.pass==='number'&&y.pass>0))};
fs.writeFileSync('review/GP-20133/t229-three-interleaves.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));