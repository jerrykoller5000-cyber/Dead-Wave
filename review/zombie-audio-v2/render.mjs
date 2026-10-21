import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/zombie-audio-v2');
const kinds=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];
const states=['idle','chase','attack','hurt','death'],revised=kinds.filter(t=>t!=='caveguard');
const snapshots=['core/audio.js','ui/zombie-audio.js'];
const sourceHash=()=>Object.fromEntries(snapshots.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
function floats(b){const u=Buffer.from(b,'base64');return new Float32Array(u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength));}
function wav(L,R,sr){const n=L.length,b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]))*32767),44+i*4);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]))*32767),46+i*4);}return b;}
function spectrum(L,R,sr){
  const n=8192,re=new Float64Array(n),im=new Float64Array(n),bins=new Float64Array(n/2);
  for(let offset=0;offset+n<=L.length;offset+=n/2){
    for(let i=0;i<n;i++){re[i]=(L[offset+i]+R[offset+i])*.5*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));im[i]=0;}
    for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
    for(let len=2;len<=n;len<<=1){const angle=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let k=0;k<len/2;k++){const a=i+k,b=a+len/2,wr=Math.cos(angle*k),wi=Math.sin(angle*k),xr=re[b]*wr-im[b]*wi,xi=re[b]*wi+im[b]*wr;re[b]=re[a]-xr;im[b]=im[a]-xi;re[a]+=xr;im[a]+=xi;}}
    for(let i=1;i<n/2;i++)bins[i]+=re[i]*re[i]+im[i]*im[i];
  }
  let power=0,weighted=0,low=0,chest=0,sub=0;for(let i=1;i<bins.length;i++){const hz=i*sr/n;if(hz>10000)break;const p=bins[i];power+=p;weighted+=p*hz;if(hz<250)low+=p;if(hz<500)chest+=p;if(hz<80)sub+=p;}
  return{centroidHz:weighted/power,lowBandFraction:low/power,chestBandFraction:chest/power,subBassFraction:sub/power};
}
function metrics(r){const L=floats(r.L),R=floats(r.R);let peak=0,energy=0,active=0,sumL=0,sumR=0;for(let i=0;i<L.length;i++){assert(Number.isFinite(L[i])&&Number.isFinite(R[i]),'non-finite audio');peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));energy+=L[i]*L[i]+R[i]*R[i];sumL+=L[i];sumR+=R[i];if(Math.abs(L[i])+Math.abs(R[i])>.0001)active++;}return{peak,rms:Math.sqrt(energy/(2*L.length)),dc:Math.max(Math.abs(sumL/L.length),Math.abs(sumR/R.length)),activeSeconds:active/r.sr,...spectrum(L,R,r.sr),hash:createHash('sha256').update(Buffer.from(L.buffer)).update(Buffer.from(R.buffer)).digest('hex'),counts:r.counts};}
function validate(m,label){assert(m.peak>1e-5&&m.peak<.99,label+' silent or clipping ('+m.peak+')');assert(m.dc<.01&&m.dc<Math.max(.0005,m.rms*.08),label+' excessive DC ('+m.dc+')');}
const server=await serve(root,0);let browser;const proof={startedAt:new Date().toISOString(),sourceHashes:sourceHash(),renders:[],before:[],comparisons:[],extras:[],mixes:[],training:[],limitations:'Waveform checks confirm signal health and measured pitch-band changes. They cannot prove subjective realism or scariness; listen to the gallery.'};
try{
  browser=await launch({headless:false,args:['--window-position=-4000,-4000','--disable-features=CalculateNativeWinOcclusion']});
  const page=await browser.newPage({width:400,height:300});await page.goto(server.origin+'/review/zombie-audio-v2/render.html');await page.waitFor('window.ready');
  for(const type of revised)for(const state of ['idle','attack']){
    const r=await page.evaluate(`renderZombie(${JSON.stringify(type)},${JSON.stringify(state)},true)`,60000),m=metrics(r);validate(m,'before '+type+'/'+state);
    fs.writeFileSync(path.join(out,'before-'+type+'-'+state+'.wav'),wav(floats(r.L),floats(r.R),r.sr));proof.before.push({type,state,...m});
  }
  console.log('26 baseline voice samples rendered.');
  for(const type of kinds)for(const state of states){
    const r=await page.evaluate(`renderZombie(${JSON.stringify(type)},${JSON.stringify(state)})`,60000),m=metrics(r);validate(m,type+'/'+state);assert.equal(m.counts[type+':'+state],1,type+'/'+state+' route missing');
    fs.writeFileSync(path.join(out,type+'-'+state+'.wav'),wav(floats(r.L),floats(r.R),r.sr));proof.renders.push({type,state,...m});
  }
  for(const state of states)assert.equal(new Set(proof.renders.filter(r=>r.state===state).map(r=>r.hash)).size,kinds.length,'duplicate '+state);
  console.log('70 revised voice samples audible, finite, distinct and unclipped.');
  for(const [type,state] of [['demon','charge'],['leaper','move'],['colossus','step']]){
    const r=await page.evaluate(`renderZombie(${JSON.stringify(type)},${JSON.stringify(state)})`,60000),m=metrics(r);validate(m,type+'/'+state);assert.equal(m.counts[type+':'+state],1,type+'/'+state+' route missing');
    fs.writeFileSync(path.join(out,type+'-'+state+'.wav'),wav(floats(r.L),floats(r.R),r.sr));proof.extras.push({type,state,...m});
  }
  for(const state of ['attack','death']){
    const r=await page.evaluate(`renderZombie(${JSON.stringify(kinds)},${JSON.stringify(state)},false,false,true)`,60000),m=metrics(r);validate(m,'mixed '+state);for(const type of kinds)assert.equal(m.counts[type+':'+state],1,'mixed '+type+'/'+state+' route missing');
    fs.writeFileSync(path.join(out,'mixed-'+state+'.wav'),wav(floats(r.L),floats(r.R),r.sr));proof.mixes.push({state,...m,scheduled:r.scheduled});
  }
  for(const state of ['idle','attack','hurt','death']){
    const r=await page.evaluate(`renderZombie('guardian',${JSON.stringify(state)},false,true)`,60000),m=metrics(r);validate(m,'training '+state);assert.equal(m.counts['guardian:'+state],1,'Training muted '+state);proof.training.push({state,...m});
  }
  for(const type of ['shambler','feral','brute','colossus'])for(const state of ['idle','attack']){
    const b=proof.before.find(r=>r.type===type&&r.state===state),a=proof.renders.find(r=>r.type===type&&r.state===state);
    proof.comparisons.push({type,state,beforeCentroidHz:b.centroidHz,afterCentroidHz:a.centroidHz,beforeLowBand:b.lowBandFraction,afterLowBand:a.lowBandFraction,beforeSubBass:b.subBassFraction,afterSubBass:a.subBassFraction,centroidDropped:a.centroidHz<b.centroidHz,subBassIncreased:a.subBassFraction>b.subBassFraction});
  }
  for(const type of ['shambler','feral','brute','colossus']){const c=proof.comparisons.find(r=>r.type===type&&r.state==='idle');assert(c.centroidDropped||c.subBassIncreased,type+' idle has neither lower centroid nor increased subbass');}
  const b=proof.before.find(r=>r.type==='screamer'&&r.state==='attack'),a=proof.renders.find(r=>r.type==='screamer'&&r.state==='attack');
  proof.screamer={beforeRms:b.rms,afterRms:a.rms,gainDb:20*Math.log10(a.rms/b.rms)};assert(a.rms>b.rms,'screamer attack is not louder');
  const {ZOMBIE_AUDIO_ADDITIONS}=await import('../../ui/zombie-audio.js?review='+Date.now());
  proof.spiderNoiseOnly=Object.values(ZOMBIE_AUDIO_ADDITIONS.spider).every(recipe=>recipe.every(action=>action.kind==='texture'));
  assert(proof.spiderNoiseOnly,'spider still has pitched oscillator voice');
  proof.errors=page.errors;assert.equal(page.errors.length,0);assert.deepEqual(sourceHash(),proof.sourceHashes,'production audio changed during renders; rerun against final profiles');
  proof.summary='26 before samples, 70 revised state samples, 3 special cues, 2 staggered horde mixes and 4 Training routes passed. All samples finite, audible and unclipped; zombie pitches/bass and screamer loudness measured.';
  const labels={shambler:'Shambler',feral:'Feral',leaper:'Leaper',drowned:'Drowned',military:'Military',brute:'Brute',spitter:'Spitter',screamer:'Screamer',bomber:'Bomber',spider:'Spider',demon:'Demon',colossus:'Colossus',guardian:'Guardian',caveguard:'Cave guardian'};
  const moods={shambler:'Low chest growl',feral:'Lower, angry snarls',leaper:'Restless shrieks and tissue clicks',drowned:'Wet throat with subtle gurgles',military:'Gruff, hostile bickering',brute:'Deep chest snarls',spitter:'Boiling acid and putrid hiss',screamer:'Ragged death-whistle scream',bomber:'Low throat hum',spider:'Organic hiss',demon:'Rising charge roar',colossus:'Bass, impacts and labored breath',guardian:'Primal hoots and tearing shrieks',caveguard:'Previous cave predator voice'};
  const player=(type,state,before=false)=>`<button data-src="${before?'before-':''}${type}-${state}.wav">${before?'Before ':' '}${state==='hurt'?'Hit reaction':state[0].toUpperCase()+state.slice(1)}</button>`;
  fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grave Shift · Zombie voice revision</title><style>body{margin:0;background:#101714;color:#e2e9df;font:16px system-ui}main{max-width:1100px;margin:auto;padding:28px}h1{color:#b4d98c;margin-bottom:8px}p{color:#aebda9;line-height:1.5}section{background:#19231e;border:1px solid #354632;border-radius:8px;margin:15px 0;padding:18px}h2{margin:0 0 4px;font-size:21px}section p{margin:0 0 12px}.controls{display:flex;flex-wrap:wrap;gap:7px}button{color:#e4ecdc;background:#2c3c2a;border:1px solid #647358;border-radius:4px;padding:8px 12px;cursor:pointer}button:hover,button[aria-pressed=true]{background:#b4d98c;color:#152212}.before button{background:#202a24;border-color:#42553d;color:#b8c8b0}small{display:block;margin:10px 0;color:#9dad95}.player{position:sticky;top:0;z-index:1;background:#111b16;border-bottom:1px solid #48623c;padding:12px 28px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}audio{max-width:100%}#now{color:#b4d98c}a{color:#b4d98c}</style><div class="player"><audio id="player" controls></audio><span id="now">Choose a sound</span><button id="stop">Stop</button></div><main><h1>Zombie voices · second pass</h1><p>Listen to every state through the game's mixer. The first two buttons in each comparison row play the previous voice; the next row plays the revised voice. Keep your usual game listening volume.</p>${kinds.map(t=>`<section><h2>${labels[t]}</h2><p>${moods[t]}</p>${revised.includes(t)?`<div class="controls before">${['idle','attack'].map(st=>player(t,st,true)).join('')}</div><small>Revised voice</small>`:''}<div class="controls">${states.map(st=>player(t,st)).join('')}${t==='demon'?player(t,'charge'):t==='leaper'?player(t,'move'):t==='colossus'?player(t,'step'):''}</div></section>`).join('')}<section><h2>A crowded fight</h2><p>All 14 kinds: staggered attacks and rapid consecutive deaths, including the shared body impacts.</p><div class="controls"><button data-src="mixed-attack.wav">Mixed attacks</button><button data-src="mixed-death.wav">Rapid deaths</button></div></section><p><a href="render-proof.json">Recorded verification results</a></p></main><script>const audio=document.getElementById('player'),now=document.getElementById('now');document.querySelectorAll('[data-src]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[aria-pressed]').forEach(b=>b.removeAttribute('aria-pressed'));button.setAttribute('aria-pressed','true');audio.src=button.dataset.src;now.textContent=(button.closest('section').querySelector('h2').textContent)+' · '+button.textContent.trim();audio.play();});document.getElementById('stop').onclick=()=>{audio.pause();audio.currentTime=0;};</script></html>`);
  console.log(proof.summary);console.log('Maximum peak: '+Math.max(...proof.renders.map(r=>r.peak),...proof.mixes.map(r=>r.peak)).toFixed(6));console.log('Screamer attack RMS gain: '+proof.screamer.gainDb.toFixed(2)+' dB');
}catch(e){proof.failure=String(e.stack||e);throw e;}
finally{proof.completedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'render-proof.json'),JSON.stringify(proof,null,2));await browser?.close();await server.close();}
process.exit(0);
