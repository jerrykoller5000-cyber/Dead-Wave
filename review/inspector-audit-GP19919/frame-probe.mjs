import fs from 'node:fs';import path from 'node:path';
const heart=JSON.parse(fs.readFileSync('review/camera/jobs/_camera.json','utf8'));
const post=async(body)=>(await fetch('http://127.0.0.1:'+heart.port+'/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)})).json();
const out=path.resolve('review/inspector-audit-GP19919/automation');
const r=await post({cmd:'eval',code:`await DWInspect.show('marine');DWInspect.view('three',{instant:true}); await wait(1000); const ix=DWInspect._ix;const data=await DWInspect.shot();return {data,subject:DWInspect.current(),showMarine:ix.showMarine,playerVisible:TT.player.visible,loop:ix._still,renderer:ix.host.renderer.constructor.name,hostCam:DWInspect.camera(),errors:DWInspect.errors()};`});
if(!r.ok)throw Error(JSON.stringify(r));const {data,...value}=r.value;
fs.writeFileSync(path.join(out,'frame-direct.png'),Buffer.from(data.split(',')[1],'base64'));
const shot=await post({cmd:'shot',target:'marine',view:'three',ui:true,out:path.join(out,'frame-cdp.png')});
fs.writeFileSync(path.join(out,'frame-probe.json'),JSON.stringify({value,shot},null,2)+'\n');console.log(JSON.stringify({value,shot}));
