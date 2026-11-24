import {text} from './strings.js';

// Fixed arithmetic wear: these decals consume no world RNG and repaint only for font loading.
export function drawHQDesignation(ctx) {
  ctx.clearRect(0, 0, 1024, 192);
  // Brushed gunmetal-olive enameled steel plate gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, '#2c3730');
  bg.addColorStop(0.48, '#232c27');
  bg.addColorStop(1, '#1a211d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 192);
  // Fine horizontal rolled-steel brush streaks
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.055)';
    ctx.fillRect((i * 107) % 1024, (i * 31) % 192, 24 + (i % 56), 1.5);
  }
  // Double embossed military border frame
  ctx.strokeStyle = '#9aa38c';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(12, 12, 1000, 168);
  ctx.strokeStyle = 'rgba(0,0,0,0.48)';
  ctx.lineWidth = 2;
  ctx.strokeRect(17, 17, 990, 158);
  // Ochre branch insignia badge with weathered highlight
  const badge = ctx.createLinearGradient(29, 30, 29, 162);
  badge.addColorStop(0, '#c2b079');
  badge.addColorStop(1, '#9e8c57');
  ctx.fillStyle = badge;
  ctx.fillRect(29, 30, 134, 132);
  ctx.strokeStyle = 'rgba(20,26,20,0.45)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(30.5, 31.5, 131, 129);
  ctx.fillStyle = '#202b22';
  ctx.font = '52px "Black Ops One", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text('hq.designation.branch'), 96, 119, 122);
  // Drop-shadowed embossed typography
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.font = '600 28px "Chakra Petch", Arial, sans-serif';
  ctx.fillText(text('hq.designation.kind'), 204, 55);
  ctx.fillStyle = '#c4cdb6';
  ctx.fillText(text('hq.designation.kind'), 202, 53);
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.font = '91px "Black Ops One", Impact, sans-serif';
  ctx.fillText(text('hq.designation.name'), 201, 151, 770);
  ctx.fillStyle = '#ebe4c8';
  ctx.fillText(text('hq.designation.name'), 198, 148, 770);
  // Corner mounting rivet sockets & subtle rainwater streaks
  for (const [rx, ry] of [[24, 24], [1000, 24], [24, 168], [1000, 168]]) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(rx + 1.5, ry + 1.5, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b9384';
    ctx.beginPath(); ctx.arc(rx, ry, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(rx - 1.5, ry - 1.5, 2, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 12; i++) {
    const sx = 64 + ((i * 89) % 900);
    const gr = ctx.createLinearGradient(0, 14, 0, 76 + (i % 5) * 18);
    gr.addColorStop(0, 'rgba(18,22,18,0.22)');
    gr.addColorStop(1, 'rgba(18,22,18,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(sx, 14, 4 + (i % 5), 62 + (i % 5) * 18);
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(10,16,12,0.24)' : 'rgba(210,208,180,0.16)';
    ctx.fillRect((i * 173 + 7) % 1024, (i * 67 + 11) % 192, 2 + (i % 12), 1 + (i % 2));
  }
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
