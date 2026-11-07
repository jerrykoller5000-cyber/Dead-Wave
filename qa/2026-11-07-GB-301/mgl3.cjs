const fs=require("fs");
const t=fs.readFileSync("index.html","utf8");
const i=t.indexOf("The MGL must first close");
// continue further into tryFire looking for reloading check before actual fire
let slice=t.slice(i, i+8000);
const lines=slice.replace(/\r\n/g,"\n").split("\n");
for (let n=0;n<lines.length;n++) {
  if (/reload|launcher|fireCooldown|return|ammo <|!ammo|flashNoAmmo/.test(lines[n])) {
    console.log(String(n).padStart(4), lines[n]);
  }
}
