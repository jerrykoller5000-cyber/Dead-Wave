// GP-178: lossless editing exports; no production source is modified.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const staging=path.join(root,'.tmp-zombie-audio-GP-178');
const labels={shambler:'Shambler',feral:'Feral',leaper:'Leaper',drowned:'Drowned',military:'Military',brute:'Brute',spitter:'Spitter',screamer:'Screamer',bomber:'Bomber',spider:'Spider',demon:'Demon',colossus:'Colossus',guardian:'Guardian',caveguard:'Cave Guardian'};
const actions={idle:'Idle',chase:'Chase',attack:'Attack',hurt:'Hit Reaction',death:'Death',charge:'Charge',move:'Movement',step:'Footstep'};
const production=['core/audio.js','ui/zombie-audio.js','ui/zombie-vocal-phrases.js'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceHashes=()=>Object.fromEntries(production.map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]));
const manifest={createdAt:new Date().toISOString(),sourceHashes:sourceHashes(),description:'Current procedural voice variants rendered through the game mixer, plus unmodified earlier listening files.',files:[]};
const floats=b=>{const u=Buffer.from(b,'base64');return new Float32Array(u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength));};
const relative=p=>p.split(path.sep).join('/');

function save(file,data,info){
  const destination=path.join(staging,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,data,{flag:'wx'});
  manifest.files.push({file:relative(file),...info,bytes:data.length,sha256:hash(data)});
}
function pcm24(L,R,sr){
  const size=L.length*6,b=Buffer.alloc(44+size);
  b.write('RIFF');b.writeUInt32LE(36+size,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*6,28);
  b.writeUInt16LE(6,32);b.writeUInt16LE(24,34);b.write('data',36);b.writeUInt32LE(size,40);
  for(let i=0;i<L.length;i++){
    b.writeIntLE(Math.round(L[i]*8388607),44+i*6,3);
    b.writeIntLE(Math.round(R[i]*8388607),47+i*6,3);
  }
  return b;
}
function splitBank(type,state,result){
  assert.equal(result.choices.length,4,type+'/'+state+' event count');
  assert(result.choices.every(c=>c.keys.length===1),'exactly one phrase per event');
  const variants=result.choices.map(c=>Number(c.keys[0].split(':').at(-1)));
  assert.deepEqual([...variants].sort(),[0,1,2,3],type+'/'+state+' complete variation coverage');
  const L=floats(result.L),R=floats(result.R),sr=result.sr;
  for(let v=0;v<4;v++){
    // Keep 20 ms of pre-roll. Five seconds between calls lets preceding reverb decay.
    const onset=Math.round(result.choices[v].time*sr),start=onset-Math.round(.02*sr);
    const end=v<3?Math.round(result.choices[v+1].time*sr)-Math.round(.02*sr):L.length;
    let peak=0,last=start,tailPeak=0,preRollPeak=0;
    for(let i=start;i<end;i++){
      assert(Number.isFinite(L[i])&&Number.isFinite(R[i]),'non-finite audio');
      const a=Math.max(Math.abs(L[i]),Math.abs(R[i]));peak=Math.max(peak,a);
      if(a>1e-7)last=i;
      if(i>=end-sr*.05)tailPeak=Math.max(tailPeak,a);
      if(i<onset)preRollPeak=Math.max(preRollPeak,a);
    }
    assert(peak>1e-5&&peak<.99,type+'/'+state+' silent or clipping');
    assert(tailPeak<1e-7,type+'/'+state+' unfinished tail');
    assert(preRollPeak<1e-7,type+'/'+state+' previous call leaked into pre-roll');
    const finish=Math.min(end,last+1+Math.round(sr*.15));
    const a=L.slice(start,finish),b=R.slice(start,finish);
    const filename=labels[type].replaceAll(' ','_')+'_'+actions[state].replaceAll(' ','_')+'_'+String(variants[v]+1).padStart(2,'0')+'.wav';
    save(path.join('01 - Current Voices',labels[type],actions[state],filename),pcm24(a,b,sr),{
      category:'current-individual',type,state,variant:variants[v]+1,sampleRate:sr,channels:2,bitDepth:24,
      seconds:a.length/sr,peak,tailPeak,preRollPeak,source:'Current procedural audio; game mixer; deterministic export seed 177'
    });
  }
}
function copyReferences(){
  const versions=[['zombie-audio','V1',56],['zombie-audio-v2','V2',101],['zombie-audio-v3','V3',103]];
  for(const [dir,version,count] of versions){
    const folder=path.join(root,'review',dir),files=fs.readdirSync(folder).filter(p=>p.endsWith('.wav')).sort();
    assert.equal(files.length,count,version+' inventory changed');
    for(const file of files){
      const before=file.startsWith('before-'),base=file.replace(/^before-/,''),type=base.split('-')[0];
      const kind=base.startsWith('mixed-')?'Crowd Mixes':base.includes('-variations.')?'Four-Call Reels':'Single Samples';
      const section=version==='V3'?path.join('02 - Listening References',kind):path.join('03 - Previous Versions',version,before?'Before Comparison':kind);
      const dest=path.join(section,labels[type]||'',file),source=path.join('review',dir,file);
      const data=fs.readFileSync(path.join(root,source));
      assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
      assert.equal(data.readUInt16LE(20),1);assert.equal(data.readUInt16LE(34),16);
      save(dest,data,{category:version==='V3'?'current-reference':'archive',version,source:relative(source),sampleRate:data.readUInt32LE(24),channels:data.readUInt16LE(22),bitDepth:16,seconds:(data.length-44)/data.readUInt16LE(32)/data.readUInt32LE(24)});
    }
  }
}

assert(!fs.existsSync(staging),'Staging already exists; do not overwrite an earlier export.');
fs.mkdirSync(staging);
const server=await serve(root,0);let browser;
try{
  browser=await launch({headless:false,args:['--window-position=-4000,-4000','--disable-features=CalculateNativeWinOcclusion']});
  const page=await browser.newPage({width:400,height:300});
  await page.goto(server.origin+'/review/zombie-audio-export/render.html');await page.waitFor('window.ready');
  for(const type of Object.keys(labels)){
    const states=['idle','chase','attack','hurt','death'];
    if(type==='demon')states.push('charge');if(type==='leaper')states.push('move');if(type==='colossus')states.push('step');
    for(const state of states)splitBank(type,state,await page.evaluate(`renderBank(${JSON.stringify(type)},${JSON.stringify(state)})`,60000));
    console.log(labels[type]+': '+states.length*4+' individual variants exported; peaks, tails and phrase coverage passed.');
  }
  assert.equal(page.errors.length,0,JSON.stringify(page.errors));
  assert.equal(manifest.files.length,292,'individual variant count');
  assert.deepEqual(sourceHashes(),manifest.sourceHashes,'Audio source changed during export.');
  copyReferences();assert.equal(manifest.files.length,552,'total WAV count');
  assert.equal(new Set(manifest.files.map(f=>f.sha256)).size,552,'unexpected duplicate audio');
  manifest.summary={individualClips:292,latestReferences:103,earlierClips:157,totalWavs:552,totalBytes:manifest.files.reduce((sum,f)=>sum+f.bytes,0)};
  fs.writeFileSync(path.join(staging,'clip-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(staging,'START HERE.txt'),`GRAVE SHIFT - ZOMBIE SOUND EDITING LIBRARY\n\nStart in: 01 - Current Voices\n\n292 individual clips, organized by zombie and action. Every action has four\nnumbered phrase variants. All 14 zombie types are included.\n\nACTIONS\nIdle, Chase, Attack, Hit Reaction, Death\nExtras: Demon Charge, Leaper Movement, Colossus Footstep\n\nFOLDERS\n01 - Current Voices: new 48 kHz stereo, 24-bit PCM WAV exports for editing.\n02 - Listening References: all 103 original v3 samples, four-call reels,\n     and crowd mixes, preserved unchanged as 48 kHz stereo, 16-bit WAV.\n03 - Previous Versions: 56 v1 and 101 v2 clips, including the earlier\n     before-comparison samples. These are also unchanged 16-bit WAV files.\n\nEDITING\nThe numbered files are separate phrases, not pieces that must be joined.\nThey keep the game's relative volumes; no extra normalization was applied.\nShort pre-roll and full audible tails are retained. Excess trailing silence\nwas trimmed on the new exports only. Hit Reaction and Death include the\nimpact/body-fall effects heard through the game mixer. Reverb is included;\nthese are complete mixed cues, not isolated dry vocal stems.\n\nKeep a copy of your originals and retain filenames when possible so your\nedits can be matched back to the correct creature and action.\nEditing these WAVs does not automatically update the game's procedural audio.\nWhen you're ready, the edited clips can be wired into the game separately.\n\nTOTAL: 552 WAV files. clip-manifest.json lists sources, formats and hashes.\nExport task: GP-178.\n`,'utf8');
  fs.writeFileSync(path.join(root,'review/zombie-audio-export/export-proof.json'),JSON.stringify({completedAt:new Date().toISOString(),staging,sourceHashes:manifest.sourceHashes,...manifest.summary,maximumIndividualPeak:Math.max(...manifest.files.filter(f=>f.category==='current-individual').map(f=>f.peak)),allVariantsCovered:true,allTailsComplete:true,allFilesDistinct:true,browserErrors:page.errors},null,2)+'\n');
  console.log('PASS: 292 individual clips + 103 current references + 157 older clips = 552 WAVs.');
  console.log('Staged at '+staging+' ('+(manifest.summary.totalBytes/1024/1024).toFixed(1)+' MiB).');
}finally{await browser?.close();await server.close();}
process.exit(0);
