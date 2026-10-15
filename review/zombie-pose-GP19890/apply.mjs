import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/zombie-pose-GP19890',hash=t=>crypto.createHash('sha256').update(t).digest('hex'),proof=[];
function edit(file,changes){const raw=fs.readFileSync(file,'utf8'),before=hash(raw);fs.writeFileSync(dir+'/'+file.replaceAll('/','-')+'.before.txt',raw);let s=raw;for(const [a,b]of changes){if(s.split(a).length!==2)throw Error('Expected exactly one '+a);s=s.replace(a,b);}if(hash(fs.readFileSync(file,'utf8'))!==before)throw Error('Changed underneath: '+file);fs.writeFileSync(file,s);proof.push({file,before,after:hash(s)});}
edit('game/screamer-behavior.js',[
 ["const glide=z.partsLost?.head?0:1-e,flow=s.clock*1.4,wave=Math.sin(flow),twitch=", "const glide=z.partsLost?.head?0:1-e,flow=s.clock*1.4,wave=Math.sin(flow),breath=(.5+.5*Math.sin(s.clock*2.1-.8))*glide,twitch="],
 ["set(u.torso.rotation,'x',(rest.torsoRX||0)-.055*glide", "// GP-19890: breathing stays visible while hovering or waiting, and restores before reactions.\n set(u.torso.scale,'x',u.torso.scale.x*(1+.018*breath));set(u.torso.scale,'y',u.torso.scale.y*(1+.028*breath));set(u.torso.scale,'z',u.torso.scale.z*(1+.055*breath));\n set(u.torso.position,'y',u.torso.position.y+.012*scale*breath);\n set(u.torso.rotation,'x',(rest.torsoRX||0)-.055*glide-.025*breath"],
 ["(-.08+.07*Math.sin(flow+i*Math.PI-1))*glide", "(-.10+.14*Math.sin(flow+i*Math.PI-1))*glide"],
 ["(.13+.055*Math.sin(flow+i*.18))*glide", "(.15+.075*Math.sin(flow+i*Math.PI-.5))*glide"],
 ["(-.22+.10*ribbon)*glide", "(-.30+.24*ribbon)*glide"],
 ["(.50+.12*Math.sin(flow+i*.8))*glide", "(.56+.20*Math.sin(flow+i*.8))*glide"],
 [".12+.10*glide*Math.sin(flow+i*.8)", ".12+.18*glide*Math.sin(flow+i*.8)"],
 ["(-.35+.09*Math.sin(flow+i*.9-1.7))*glide", "(-.48+.20*Math.sin(flow+i*.9-1.7))*glide"],
 [".12*Math.sin(flow+i*.8-2)*glide", ".18*Math.sin(flow+i*.8-2)*glide"]
]);
edit('game/bomber-behavior.js',[
 ["export function applyBomberPose(z,dt){", "export function applyBomberPose(z,dt,target=null){"],
 ["time:0,saved:[],n:0", "time:0,flapPhase:0,flapNear:0,saved:[],n:0"],
 ["const belly=u.bomberBelly;if(belly){", "// GP-19890: a smoothed player-distance response speeds the flaps up continuously.\n const distance=target&&Number.isFinite(target.x+target.y+target.z)&&Math.abs(target.y-p.y)<1.6?Math.hypot(target.x-p.x,target.z-p.z):Infinity;\n const near=clamp((10-distance)/7.2,0,1);q.flapNear+=(near-q.flapNear)*(1-Math.exp(-4*h));q.flapPhase=(q.flapPhase+h*(2.0+7*q.flapNear))%(2*Math.PI);\n const jiggle=Math.sin(ph*2-.7)*.012*scale*w,flapAmp=.045+.17*q.flapNear,flap=Math.sin(q.flapPhase);\n const belly=u.bomberBelly;if(belly){"],
 ["belly.position.y+Math.sin(ph*2-.7)*.012*scale*w", "belly.position.y+jiggle"],
 ["const arm=i?u.armRG:u.armLG,side=i?1:-1;if(!z.partsLost?.[i?'armR':'armL']){set(arm.rotation,'x',-.18+Math.sin(ph+i*Math.PI-.4)*.16*w);set(arm.rotation,'z',-side*(.25+.045*Math.sin(ph+i*Math.PI)*w));set(arm.rotation,'y',side*.03*w);set(arm.userData.elbowG.rotation,'x',-.46+.09*Math.sin(ph+i*Math.PI-.5)*w);}",
 "const arm=i?u.armRG:u.armLG,side=i?1:-1;if(arm&&!z.partsLost?.[i?'armR':'armL']){\n   // Elbows out, forearms cupping the belly sides; hands ride its delayed wobble.\n   set(arm.position,'y',arm.position.y+jiggle);set(arm.position,'x',arm.position.x+side*.018*scale*Math.sin(ph-.65)*w);\n   set(arm.rotation,'x',-.24+.045*Math.sin(ph-.4)*w-.055*flap*q.flapNear);set(arm.rotation,'z',-side*(.62+flapAmp*flap));set(arm.rotation,'y',-side*.10);\n   const elbow=arm.userData.elbowG;set(elbow?.rotation,'x',-1.05+.07*Math.sin(ph*2-1)*w-.12*Math.sin(q.flapPhase-.55)*q.flapNear);set(elbow?.rotation,'z',side*.30);\n  }"]
]);
edit('index.html',[["applyBomberPose(z, dt); // GP-19884: low planted waddle, hip lag and belly weight", "applyBomberPose(z, dt, z.typeKey === 'bomber' ? zTarget(z).position : null); // GP-19890: belly-side arms flap faster near the player"]]);
fs.writeFileSync(dir+'/source-proof.json',JSON.stringify(proof,null,2));console.log('Applied three freshly guarded files');
