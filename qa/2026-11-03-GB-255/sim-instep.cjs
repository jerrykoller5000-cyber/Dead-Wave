const N=200000; function sim(g){let bad=0;for(let k=0;k<N;k++){const gs=[];for(let i=0;i<g;i++){gs.push({t:Math.random()*100,sw:0.6+Math.random()*0.7,ph:Math.random()*6.283});}
let min=9;for(let a=0;a<g;a++)for(let b=a+1;b<g;b++){let d=0,n=0;for(let T=0;T<4;T+=0.04){const wa=Math.sin((gs[a].t+T)*gs[a].sw+gs[a].ph)*0.06,wb=Math.sin((gs[b].t+T)*gs[b].sw+gs[b].ph)*0.06;d+=Math.abs(wa-wb);n++;}min=Math.min(min,d/n);}
if(min<=0.01)bad++;}return bad/N;}
console.log('2 guards',sim(2),'3 guards',sim(3));