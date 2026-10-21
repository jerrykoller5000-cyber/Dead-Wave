import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/zombie-audio-v3');
const kinds=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];
const states=['idle','chase','attack','hurt','death'];
const snapshots=['core/audio.js','ui/zombie-audio.js','ui/zombie-vocal-phrases.js'];
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
function validateChoices(r,count){
  assert.equal(r.choices.length,count,'missing recorded voice event');
  for(const c of r.choices)assert.equal(c.phraseKeys.length,1,c.type+'/'+c.state+' must choose exactly one phrase');
}
function saveSample(r,file){fs.writeFileSync(path.join(out,file),wav(floats(r.L),floats(r.R),r.sr));}
const server=await serve(root,0);let browser;
const proof={startedAt:new Date().toISOString(),sourceHashes:sourceHash(),renders:[],reels:[],extras:[],mixes:[],training:[],limitations:'Signal checks prove audible, finite, unclipped output. Phrase counters prove structural variety, separately from waveform randomness. These checks do not establish subjective realism, fear or listening balance.'};
try{
  browser=await launch({headless:false,args:['--window-position=-4000,-4000','--disable-features=CalculateNativeWinOcclusion']});
  const page=await browser.newPage({width:400,height:300});await page.goto(server.origin+'/review/zombie-audio-v3/render.html');await page.waitFor('window.ready');
  const render=opts=>page.evaluate(`renderZombie(${JSON.stringify(opts)})`,60000);
  for(const type of kinds){
    for(const state of states){
      const r=await render({type,state}),m=metrics(r);validate(m,type+'/'+state);validateChoices(r,1);
      assert.equal(m.counts[type+':'+state],1,type+'/'+state+' route missing');
      saveSample(r,type+'-'+state+'.wav');proof.renders.push({type,state,...m,choices:r.choices});
    }
    for(const state of ['idle','attack']){
      const r=await render({type,state,reel:true}),m=metrics(r);validate(m,type+'/'+state+' reel');validateChoices(r,4);
      assert.equal(m.counts[type+':'+state],4,type+'/'+state+' reel dropped a call');
      const phrases=r.choices.map(c=>c.phraseKeys[0]);assert.equal(new Set(phrases).size,4,type+'/'+state+' reel repeated a structural phrase');
      const L=floats(r.L),R=floats(r.R),callMetrics=r.scheduled.map((event,i)=>{
        const start=Math.floor(event.time*r.sr),end=i<r.scheduled.length-1?Math.floor(r.scheduled[i+1].time*r.sr):L.length;
        const a=L.slice(start,end),b=R.slice(start,end);
        const cm=metrics({L:Buffer.from(a.buffer).toString('base64'),R:Buffer.from(b.buffer).toString('base64'),sr:r.sr});
        validate(cm,type+'/'+state+' reel call '+i);return{phrase:phrases[i],...cm};
      });
      saveSample(r,type+'-'+state+'-variations.wav');proof.reels.push({type,state,...m,choices:r.choices,callMetrics});
    }
    console.log(type+': five state samples and two four-phrase reels passed.');
  }
  for(const state of states)assert.equal(new Set(proof.renders.filter(r=>r.state===state).map(r=>r.hash)).size,kinds.length,'duplicate '+state+' PCM');
  for(const [type,state] of [['demon','charge'],['leaper','move'],['colossus','step']]){
    const r=await render({type,state}),m=metrics(r);validate(m,type+'/'+state);validateChoices(r,1);assert.equal(m.counts[type+':'+state],1,type+'/'+state+' route missing');
    saveSample(r,type+'-'+state+'.wav');proof.extras.push({type,state,...m,choices:r.choices});
  }
  for(const state of ['attack','death']){
    const r=await render({type:kinds,state,mixed:true}),m=metrics(r);validate(m,'mixed '+state);validateChoices(r,kinds.length);
    for(const type of kinds)assert.equal(m.counts[type+':'+state],1,'mixed '+type+'/'+state+' route missing');
    saveSample(r,'mixed-'+state+'.wav');proof.mixes.push({state,...m,choices:r.choices,scheduled:r.scheduled});
  }
  for(const state of ['idle','attack','hurt','death']){
    const r=await render({type:'guardian',state,training:true}),m=metrics(r);validate(m,'training '+state);validateChoices(r,1);
    assert.equal(m.counts['guardian:'+state],1,'Training muted '+state);proof.training.push({state,...m});
  }
  for(const type of kinds)for(const state of ['idle','attack'])assert(fs.existsSync(path.join(root,'review/zombie-audio-v2',type+'-'+state+'.wav')),'missing comparison WAV');
  proof.errors=page.errors;assert.equal(page.errors.length,0);assert.deepEqual(sourceHash(),proof.sourceHashes,'production audio changed during renders; rerun against final profiles');
  proof.summary='70 state samples, 28 four-call reels (112 structurally distinct calls), 3 special cues, 2 horde mixes and 4 Training routes passed. All clips finite, audible and unclipped; every reel covers all four phrases without repeating.';
  writeGallery();
  proof.gallery=validateGallery();
  console.log(proof.summary);
  console.log('Maximum peak: '+Math.max(...proof.renders.map(r=>r.peak),...proof.reels.map(r=>r.peak),...proof.extras.map(r=>r.peak),...proof.mixes.map(r=>r.peak)).toFixed(6));
}catch(e){proof.failure=String(e.stack||e);throw e;}
finally{proof.completedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'render-proof.json'),JSON.stringify(proof,null,2));await browser?.close();await server.close();}
process.exit(0);

function validateGallery(){
  const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
  const files=[...html.matchAll(/data-src="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(files.length,131,'gallery clip count');
  const newTails=[];
  for(const file of files){
    const data=fs.readFileSync(path.resolve(out,file));
    assert.equal(data.toString('ascii',0,4),'RIFF',file+' WAV header');assert.equal(data.toString('ascii',8,12),'WAVE',file+' WAV format');
    const sr=data.readUInt32LE(24),bytes=data.readUInt16LE(32),seconds=(data.length-44)/bytes/sr;
    let tailPeak=0;for(let i=Math.max(44,data.length-sr*bytes*.05);i<data.length;i+=2)tailPeak=Math.max(tailPeak,Math.abs(data.readInt16LE(i))/32767);
    if(!file.startsWith('../')){assert(tailPeak<.001,file+' ends before its tail fades');newTails.push({file,seconds,tailPeak});}
  }
  newTails.sort((a,b)=>b.tailPeak-a.tailPeak);
  assert(!html.includes('autoplay'),'gallery must not autoplay');
  return{playableLinks:files.length,distinctFiles:new Set(files).size,allWavHeadersValid:true,noAutoplay:true,highestFinal50msPeaks:newTails.slice(0,5)};
}

function writeGallery(){
  const labels={shambler:'Shambler',feral:'Feral',leaper:'Leaper',drowned:'Drowned',military:'Military',brute:'Brute',spitter:'Spitter',screamer:'Screamer',bomber:'Bomber',spider:'Spider',demon:'Demon',colossus:'Colossus',guardian:'Guardian',caveguard:'Cave guardian'};
  const moods={shambler:'A ruined human throat: dragging chest growls, broken breaths and exhausted groans.',feral:'Rabid and impatient: snapping barks, ragged snarls and breathless outbursts.',leaper:'Restless and erratic: rising squeals, twitchy clicks and sudden shrieks.',drowned:'Water in the lungs: submerged groans, choking bubbles and wet breaths.',military:'Hostile, gruff fragments: coarse barks and low, muttered arguments.',brute:'A massive chest under strain: bass snarls, forceful exhales and broken roars.',spitter:'Pressurized decay: rolling boils, acidic hisses and sputtering bursts.',screamer:'A tearing warning cry: breath intake, unstable shrieks and ragged collapse.',bomber:'An ominous throat drone: low overtones, pressured hums and strained breath.',spider:'Dry, territorial hissing: rushing air, short spits and scraping mouthparts.',demon:'Furnace breath and furious bellows, with a separate charge warning.',colossus:'Weight and effort: immense bass, labored breathing and heavy impacts.',guardian:'A prehistoric threat: guttural huffs, animal calls and piercing shrieks.',caveguard:'An enclosed-space predator: hollow calls, rasping breath and snarls.'};
  const stateLabel=state=>({hurt:'Hit reaction',move:'Movement',step:'Footstep',charge:'Charge'}[state]||state[0].toUpperCase()+state.slice(1));
  const button=(type,state,before=false)=>`<button data-src="${before?'../zombie-audio-v2/':''}${type}-${state}.wav">${before?'Previous ':''}${stateLabel(state)}</button>`;
  const card=(type,i)=>`<section id="${type}"><div class="card-title"><span class="number">${String(i+1).padStart(2,'0')}</span><h2>${labels[type]}</h2></div><p>${moods[type]}</p><div class="label">Hear the variation · four consecutive calls</div><div class="controls reels"><button data-src="${type}-idle-variations.wav">Varied idle calls <span>4 takes</span></button><button data-src="${type}-attack-variations.wav">Varied attacks <span>4 takes</span></button></div><div class="label">Individual states</div><div class="controls">${states.map(st=>button(type,st)).join('')}${type==='demon'?button(type,'charge'):type==='leaper'?button(type,'move'):type==='colossus'?button(type,'step'):''}</div><details><summary>Compare with the previous pass</summary><div class="controls before">${['idle','attack'].map(st=>button(type,st,true)).join('')}</div></details></section>`;
  fs.writeFileSync(path.join(out,'index.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grave Shift · Zombie character voices</title>
<style>
:root{color-scheme:dark;--bg:#101612;--surface:#19221b;--line:#344333;--text:#e4eadf;--muted:#a6b39f;--lime:#bada8a}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}main{max-width:1150px;margin:auto;padding:36px 28px 64px}.eyebrow,.label{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}h1{font-size:clamp(32px,5vw,48px);letter-spacing:-.04em;line-height:1.1;margin:8px 0 16px}header>p{max-width:720px;color:var(--muted);margin-bottom:26px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}section{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:22px;scroll-margin-top:104px}.card-title{display:flex;gap:12px;align-items:baseline}h2{margin:0;font-size:23px;letter-spacing:-.02em}.number{color:var(--lime);font:13px ui-monospace,monospace}section p{color:var(--muted);font-size:14px;min-height:44px;margin:10px 0 20px}.label{font-size:10px;letter-spacing:.08em;margin:16px 0 7px}.controls{display:flex;flex-wrap:wrap;gap:6px}button{color:var(--text);background:#253326;border:1px solid #4e6244;border-radius:5px;padding:8px 11px;font:inherit;font-size:13px;cursor:pointer}button:hover,button[aria-pressed=true]{background:var(--lime);color:#17200f;border-color:var(--lime)}button:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid var(--lime);outline-offset:3px}.reels button{flex:1;text-align:left;min-width:145px;font-weight:600;padding:11px}.reels span{display:block;opacity:.6;font-size:10px;letter-spacing:.05em;margin-top:3px;text-transform:uppercase}.before button{background:#1e2820;border-color:var(--line);color:var(--muted)}details{margin-top:17px;border-top:1px solid var(--line);padding-top:11px}summary{color:var(--muted);font-size:12px;cursor:pointer}details .controls{margin-top:10px}.player{position:sticky;top:0;z-index:10;background:#101912f5;border-bottom:1px solid #3b5332;padding:10px 28px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;backdrop-filter:blur(10px)}audio{height:36px;width:310px;max-width:100%}#now{color:var(--lime);font-size:13px;flex:1;min-width:180px}#stop{padding:7px 16px}.crowd{margin-top:22px}.crowd p{min-height:0}footer{font-size:12px;color:var(--muted);margin-top:28px}a{color:var(--lime)}nav{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 26px}nav a{text-decoration:none;font-size:11px;border:1px solid var(--line);border-radius:3px;padding:4px 8px;color:var(--muted)}nav a:hover{border-color:var(--lime);color:var(--lime)}@media(max-width:760px){.grid{grid-template-columns:1fr}main{padding:26px 16px}.player{padding:10px 16px;gap:8px}#now{flex-basis:100%;order:3}audio{flex:1}section{padding:18px}}
</style></head><body><div class="player"><audio id="player" controls preload="none"></audio><span id="now" role="status">Choose a voice to listen</span><button id="stop">Stop</button></div><main><header><div class="eyebrow">Grave Shift / sound workshop / pass 03</div><h1>Give the dead a voice.</h1><p>Different throats. Different rhythms. Start with a four-call reel to hear each creature change its phrasing while keeping its character, then compare individual states with the previous pass.</p></header><nav aria-label="Choose zombie type">${kinds.map(t=>`<a href="#${t}">${labels[t]}</a>`).join('')}</nav><div class="grid">${kinds.map(card).join('')}</div><section class="crowd"><h2>A crowded fight</h2><p>All 14 kinds together: staggered attacks and rapid deaths through the game's mixer.</p><div class="controls"><button data-src="mixed-attack.wav">Mixed attacks</button><button data-src="mixed-death.wav">Rapid deaths</button></div></section><footer>Use your usual game listening volume. No audio plays until you choose a clip. <a href="render-proof.json">Verification results</a></footer></main><script>
const audio=document.getElementById('player'),now=document.getElementById('now');let active;
document.querySelectorAll('[data-src]').forEach(button=>button.onclick=async()=>{if(active)active.removeAttribute('aria-pressed');active=button;button.setAttribute('aria-pressed','true');audio.src=button.dataset.src;now.textContent=button.closest('section').querySelector('h2').textContent+' · '+button.textContent.replace(/4 takes/g,'').trim();try{await audio.play();}catch(error){now.textContent='Unable to play this clip: '+error.message;button.removeAttribute('aria-pressed');}});
document.getElementById('stop').onclick=()=>{audio.pause();audio.currentTime=0;if(active)active.removeAttribute('aria-pressed');};audio.addEventListener('ended',()=>{if(active)active.removeAttribute('aria-pressed');});
</script></body></html>`,'utf8');
}
