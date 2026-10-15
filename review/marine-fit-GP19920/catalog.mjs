import fs from 'node:fs';import{Engine}from'../../tools/camera.mjs';
const E=new Engine({inspect:true,warm:'none',size:'1200x900'});
try{await E.open();const result=await E.run({cmd:'check',only:'marine',out:'review/marine-fit-GP19920/catalog'});fs.writeFileSync('review/marine-fit-GP19920/catalog-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await E.close();}
