import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
edit('    function clearDiveAnchor(anchor,arm,left=false){',`    function raiseDiveHold(anchor,height){
      const rise=localPlayer.position.y+height*diveFlatW-anchor.y;
      if(rise<=0)return;
      // A rolled shoulder can lie below the hip pivot. Lift the body's support
      // height with it; raising just the palm drove that palm through the shirt.
      rollPivot.position.y+=rise;diveHipY+=rise;anchor.y+=rise;
      player.updateMatrixWorld(true);
    }
    function clearDiveAnchor(anchor,arm,left=false){`);
edit('      if(sideClear)anchor.y=Math.max(anchor.y,localPlayer.position.y+.27*diveFlatW);','      if(sideClear)raiseDiveHold(anchor,.27);');
edit('      K.anchor.y=Math.max(K.anchor.y,localPlayer.position.y+.20*diveFlatW);','      raiseDiveHold(K.anchor,.20);');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Floor support raises the body rather than pushing the hand through it');
