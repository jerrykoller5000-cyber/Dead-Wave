import {text} from './strings.js';

// Fixed arithmetic wear: these decals consume no world RNG and repaint only for font loading.
export function drawHQDesignation(ctx) {
  ctx.clearRect(0,0,1024,192);
  ctx.fillStyle='#252e29';ctx.fillRect(0,0,1024,192);
  ctx.strokeStyle='#8e9681';ctx.lineWidth=3;ctx.strokeRect(14,14,996,164);
  ctx.fillStyle='#b5a36e';ctx.fillRect(29,30,134,132);
  ctx.fillStyle='#253127';ctx.font='52px "Black Ops One", Impact, sans-serif';ctx.textAlign='center';ctx.fillText(text('hq.designation.branch'),96,119,122);
  ctx.textAlign='left';ctx.fillStyle='#b8c1aa';ctx.font='600 28px "Chakra Petch", Arial, sans-serif';ctx.fillText(text('hq.designation.kind'),202,53);
  ctx.fillStyle='#e5dec2';ctx.font='91px "Black Ops One", Impact, sans-serif';ctx.fillText(text('hq.designation.name'),198,148,770);
  for(let i=0;i<95;i++){ctx.fillStyle=i%3?'#09100c38':'#c2c3a224';ctx.fillRect((i*173+7)%1024,(i*67+11)%192,2+i%11,1+i%2);}
}

export function drawHQLegacyMarking(ctx) {
  ctx.clearRect(0,0,768,512);ctx.fillStyle='#565b49';ctx.fillRect(0,0,768,512);
  // The old issue mark was painted directly onto this reusable cabinet.
  ctx.strokeStyle='#b5a97866';ctx.lineWidth=4;ctx.strokeRect(27,29,714,451);
  ctx.fillStyle='#c6bb8d9e';ctx.textAlign='center';ctx.font='600 28px "Chakra Petch", Arial, sans-serif';ctx.fillText(text('hq.legacy.program'),384,338);
  ctx.font='69px "Black Ops One", Impact, sans-serif';ctx.fillText(text('hq.legacy.name'),384,423,670);
  // A later hand-painted olive patch covers most of the former designation.
  ctx.fillStyle='#293c30';ctx.beginPath();ctx.moveTo(63,54);ctx.lineTo(698,43);ctx.lineTo(712,373);
  for(let i=59;i>=0;i--)ctx.lineTo(61+i*11,366+((i*i*13)%19));
  ctx.closePath();ctx.fill();
  for(let i=0;i<48;i++){ctx.fillStyle=i%2?'#5b6a4733':'#15291e33';ctx.fillRect(70,61+i*6,623-(i*17)%45,2);}
  ctx.fillStyle='#e0d9b7';ctx.font='124px "Black Ops One", Impact, sans-serif';ctx.fillText(text('hq.designation.branch'),384,215);
  ctx.font='600 33px "Chakra Petch", Arial, sans-serif';ctx.fillStyle='#c2c6a8';ctx.fillText(text('hq.legacy.current'),384,275);
  // Scraped edges and empty older mounting holes expose the previous coat.
  for(let i=0;i<150;i++){const x=(i*137+13)%768,y=(i*71+29)%512;ctx.fillStyle=i%3?'#17251a3d':'#c5b58a44';ctx.fillRect(x,y,3+i%17,1+i%4);}
  for(const [x,y] of [[43,43],[724,463]]){ctx.fillStyle='#775039';ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#151b16';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
}
