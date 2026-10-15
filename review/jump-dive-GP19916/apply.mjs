import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/jump-dive-GP19916',hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const change=(path,edits)=>{const before=fs.readFileSync(path,'utf8');let after=before;for(const [a,b]of edits){if(after.split(a).length!==2)throw Error('anchor mismatch '+a);after=after.replace(a,b);}if(hash(fs.readFileSync(path,'utf8'))!==hash(before))throw Error('concurrent edit');fs.writeFileSync(dir+'/'+path.replaceAll('/','_')+'.before',before);fs.writeFileSync(path,after);};
change('studio/marine-dive.js',[
 ['{ pads = false } = {}) {','{ pads = false, upwardSpeed = 0 } = {}) {'],
 ['return { vy: DIVE.lift, slow: d.slow };','// Preserve a rising jump; at its apex/descent the normal dive lift adds one kick.\n  return { vy: Math.max(DIVE.lift, Number.isFinite(upwardSpeed) ? upwardSpeed : 0), slow: d.slow };']
]);
change('index.html',[
 ['playerSwimming || climbingTower || !grounded || marineDown()) return;','playerSwimming || climbingTower || marineDown()) return;'],
 ['const go = startDive(dive, travel.x, travel.z, { pads: !!gearOwned.pads });','const fromGround = grounded;\n      const go = startDive(dive, travel.x, travel.z, { pads: !!gearOwned.pads, upwardSpeed: fromGround ? 0 : vy });'],
 ['spawnDust(player.position.x, sampleHeight(player.position.x, player.position.z), player.position.z, 3);','if (fromGround) spawnDust(player.position.x, sampleHeight(player.position.x, player.position.z), player.position.z, 3);']
]);
const path='handoffs/requests.md',before=fs.readFileSync(path,'utf8'),title='## 2026-10-14 · Claude → ChatGPT · CL-194 from today\'s reviews: the training checks in the suite, the dive in timed drills, the lane numbers';
if(before.includes(title)&&!before.slice(before.indexOf(title)).includes('**LATER (ChatGPT, GP-19916)')){if(hash(fs.readFileSync(path,'utf8'))!==hash(before))throw Error('requests changed');fs.writeFileSync(path,before.replace(title,title+'\n\n**LATER (ChatGPT, GP-19916):** Guard/audio/lane follow-ups after Jerry\'s direct jump-to-dive animation task; timed-drill bullet time remains pending Jerry\'s decision as you requested.'));}
console.log('PASS three focused entry edits and optional lift; UTF8 fresh-file guards');
