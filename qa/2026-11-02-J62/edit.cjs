const fs=require('fs');const f='studio/weapon-heavy.js';let s=fs.readFileSync(f,'utf8');
if(s.charCodeAt(0)===0xFEFF)throw 'bom';const crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');
const a="  // Collapsible stock on its tube, with a pad; pistol grip, trigger guard, trigger.\n  K.lathe([[0, -0.46], [0.024, -0.46], [0.024, -0.25], [0, -0.25]], gunDark, { y: 0.04, seg: 12 });\n";
const a2="  // Collapsible stock on its tube, with a pad; pistol grip, trigger guard, trigger.\n  // J62 (GP-20016): the stock tube, olive body, rubber pad and stock-side slabs (with their bolts) are one group,\n  // gun.userData.fpStock ('fp-stock'), for the view gun to leave out of the eye; third person and the shadow keep it.\n  // Every part is where it was (the group sits at the gun's origin).\n  const stock = K.group(0, 0, 0), stockStart = gun.children.length; stock.name = 'fp-stock';\n  K.lathe([[0, -0.46], [0.024, -0.46], [0.024, -0.25], [0, -0.25]], gunDark, { y: 0.04, seg: 12 });\n";
const b="    bolt(K, gunDark, gunMid, sx * 0.05, 0.036, -0.452, 0.006);\n  }\n";
const b2=b+"  for (const p of gun.children.slice(stockStart)) stock.add(p);\n  gun.userData.fpStock = stock;\n";
for(const x of [a,b]){const n=s.split(x).length-1;if(n!==1)throw 'count '+n+' for '+x.slice(0,40);}
s=s.replace(a,a2).replace(b,b2);if(crlf)s=s.replace(/\n/g,'\r\n');fs.writeFileSync(f,s);console.log('ok');
