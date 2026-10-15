import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const dir=path.resolve('review/inspector-audit-GP19919/automation'), box=path.resolve('review/camera/jobs');
const heart=JSON.parse(fs.readFileSync(path.join(box,'_camera.json'),'utf8'));
if(!heart.up||heart.mode!=='inspect'||heart.root!==path.resolve('.'))throw Error('Expected this checkout inspector camera');
const post=async(body)=>(await fetch('http://127.0.0.1:'+heart.port+'/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)})).json();
const id='gp19919-inbox-'+Date.now(), job=path.join(box,id+'.json');
fs.writeFileSync(job+'.tmp',JSON.stringify({cmd:'shot',target:'weapon:m4:can',view:'side',out:path.join(dir,'inbox-m4.png')}));fs.renameSync(job+'.tmp',job);
const result=path.join(box,id+'.result.json'), start=Date.now();
while(!fs.existsSync(result)){if(Date.now()-start>60000)throw Error('Inbox did not answer');await new Promise(r=>setTimeout(r,250));}
const answer=JSON.parse(fs.readFileSync(result,'utf8'));
if(!answer.ok)throw Error('Inbox shot failed: '+JSON.stringify(answer));
const side=JSON.parse(fs.readFileSync(path.join(dir,'inbox-m4.json'),'utf8'));
if(side.schemaVersion!==2||!side.inspect?.model?.switches?.suppressor)throw Error('Inbox recipe lost suppressor or sidecar version');
const layouts=[];
for(const [w,h] of [[1000,800],[800,650]]){
 // The camera's shot size changes the actual browser viewport, not a CSS-only fixture.
 const shot=await post({cmd:'shot',target:'marine',size:[w,h],ui:true,out:path.join(dir,'ui-final-'+w+'.png')});
 if(!shot.ok)throw Error('Responsive shot failed: '+JSON.stringify(shot));
 const probe=await post({cmd:'eval',code:`const p=document.querySelector('.dwi-right'),r=p.getBoundingClientRect(),bar=document.querySelector('.dwi-bar').getBoundingClientRect();const overflow=[...p.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>r.right+2).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,50)}));return {width:innerWidth,height:innerHeight,overflow,barFits:bar.right<=innerWidth&&bar.bottom<=innerHeight};`});
 const value=probe.value;if(!probe.ok||!value.barFits||value.overflow.length)throw Error('Layout failed: '+JSON.stringify(probe));layouts.push(value);
}
const bad=spawnSync(process.execPath,['tools/camera.mjs','check','nothing-gp19919-matches','--out','review/inspector-audit-GP19919/automation/invalid-filter'],{encoding:'utf8',timeout:30000,windowsHide:true});
if(bad.status===0||bad.status==null)throw Error('Failed CLI job did not exit nonzero');
await post({cmd:'shot',target:'marine',size:[1440,1000],ui:true,out:path.join(dir,'after-agent-workflow.png')});
const out={ok:true,at:new Date().toISOString(),camera:heart,inbox:{id,answer,sidecarSchema:side.schemaVersion,suppressor:side.inspect.model.switches.suppressor},layouts,failedCli:{exit:bad.status,stdout:bad.stdout,stderr:bad.stderr}};
fs.writeFileSync(path.join(dir,'inbox-live.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:true,inbox:true,layouts,failedCliExit:bad.status}));
