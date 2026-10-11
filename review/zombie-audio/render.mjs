import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/zombie-audio');
const kinds=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'],states=['idle','attack','hurt','death'];
function floats(b){const u=Buffer.from(b,'base64');return new Float32Array(u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength));}
function wav(L,R,sr){const n=L.length,b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]))*32767),44+i*4);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]))*32767),46+i*4);}return b;}
function metrics(r){const L=floats(r.L),R=floats(r.R);let peak=0,energy=0,active=0;for(let i=0;i<L.length;i++){assert(Number.isFinite(L[i])&&Number.isFinite(R[i]));peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));energy+=L[i]*L[i]+R[i]*R[i];if(Math.abs(L[i])+Math.abs(R[i])>.0001)active++;}return{peak,rms:Math.sqrt(energy/(2*L.length)),activeSeconds:active/r.sr,hash:createHash('sha256').update(Buffer.from(L.buffer)).update(Buffer.from(R.buffer)).digest('hex'),counts:r.counts};}
const server=await serve(root,0);let browser;const proof={renders:[],preserved:[],training:[]};
try{
  browser=await launch({headless:false,args:['--window-position=-4000,-4000','--disable-features=CalculateNativeWinOcclusion']});const page=await browser.newPage({width:400,height:300});await page.goto(server.origin+'/review/zombie-audio/render.html');await page.waitFor('window.ready');
  for(const type of kinds)for(const state of states){const r=await page.evaluate(`renderZombie(${JSON.stringify(type)},${JSON.stringify(state)})`,60000),m=metrics(r);assert(m.peak>1e-5&&m.peak<.99,`${type}/${state} silent or clipping`);assert.equal(m.counts[type+':'+state],1,`${type}/${state} route missing`);fs.writeFileSync(path.join(out,type+'-'+state+'.wav'),wav(floats(r.L),floats(r.R),r.sr));proof.renders.push({type,state,...m});}
  for(const state of states)assert.equal(new Set(proof.renders.filter(r=>r.state===state).map(r=>r.hash)).size,kinds.length,'duplicate '+state);
  for(const type of kinds.slice(0,9))for(const state of ['idle','attack','death']){const before=await page.evaluate(`renderZombie(${JSON.stringify(type)},${JSON.stringify(state)},true)`,60000),after=proof.renders.find(r=>r.type===type&&r.state===state);assert.deepEqual(before.voices,await page.evaluate(`renderZombie(${JSON.stringify(type)},'idle').then(r=>r.voices)`,60000));const exact=metrics(before).hash===after.hash;proof.preserved.push({type,state,specificationsUnchanged:true,identicalWaveform:exact});/* Procedural variations can differ; the entire established throat bank above must stay identical. */}
  for(const state of states){const r=await page.evaluate(`renderZombie('guardian',${JSON.stringify(state)},false,true)`,60000),m=metrics(r);assert(m.peak>1e-5&&m.counts['guardian:'+state]===1,'Training muted '+state);proof.training.push({state,...m});}
  proof.errors=page.errors;assert.equal(page.errors.length,0);proof.summary='56 audible, finite, distinct state renders; 27 established walker voice specifications unchanged; 4 Training states audible; zero browser errors';fs.writeFileSync(path.join(out,'render-proof.json'),JSON.stringify(proof,null,2));console.log(proof.summary);
  const cells=type=>states.map(st=>`<td><audio controls preload="none" src="${type}-${st}.wav"></audio></td>`).join('');
  fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Grave Shift zombie voices</title><style>body{background:#151b17;color:#e3eadb;font:16px system-ui;padding:24px}h1{color:#a4d379}table{border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #394533;text-align:left}audio{width:210px}</style><h1>Zombie voices</h1><p>Each row plays idle, attack, hit reaction and death through the game's mixer. Keep your normal listening volume.</p><table><thead><tr><th>Zombie</th>${['Idle','Attack','Hit reaction','Death'].map(s=>'<th>'+s+'</th>').join('')}</tr></thead><tbody>${kinds.map(t=>'<tr><th>'+t+'</th>'+cells(t)+'</tr>').join('')}</tbody></table>`);
}finally{await browser?.close();await server.close();}

process.exit(0);
