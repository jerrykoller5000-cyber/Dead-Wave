const fs=require('fs');const [,,name,file,timeout]=process.argv;const code=fs.readFileSync(file,'utf8');
const dir='review/camera/jobs';fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify({cmd:'eval',code,timeout:+(timeout||120000)}));
const t0=Date.now();const iv=setInterval(()=>{const r=`${dir}/${name}.result.json`;if(fs.existsSync(r)){clearInterval(iv);console.log(fs.readFileSync(r,'utf8').slice(0,3000));}else if(Date.now()-t0>200000){clearInterval(iv);console.log('timeout');}},300);
