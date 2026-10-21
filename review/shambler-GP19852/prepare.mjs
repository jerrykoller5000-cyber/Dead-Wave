import fs from 'node:fs';
const dir='review/shambler-GP19852';fs.mkdirSync(dir,{recursive:true});
for(const name of ['before.html','before-audio.js','before-takes.js'])if(fs.existsSync(`${dir}/${name}`))throw Error('baseline exists');
const index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('core/audio.js','utf8'),takes=fs.readFileSync('core/takes.js','utf8');
fs.writeFileSync(`${dir}/before.html`,index.replace('<head>','<head><base href="/">').replace("'./core/audio.js'",`'/${dir}/before-audio.js'`));
fs.writeFileSync(`${dir}/before-audio.js`,audio.replaceAll("'../ui/","'/ui/").replaceAll("'./","'/core/").replace("'/core/takes.js'","'./before-takes.js'"));
fs.writeFileSync(`${dir}/before-takes.js`,takes.replaceAll("'./","'/core/"));
console.log('Current pre-change main/audio/take sources isolated for preview.');
