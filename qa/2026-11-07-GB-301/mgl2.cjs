const fs=require("fs");
const t=fs.readFileSync("index.html","utf8");
// After shotgun interrupt, does launcher stay blocked by generic reloading return?
const i=t.indexOf("The MGL must first close");
console.log(t.slice(i, i+1200).replace(/\r\n/g,"\n"));
// Also search startReload / fire path for launcher-specific block
const j=t.indexOf("if (reloading) {\n        if (reloadWeapon === currentWeapon");
console.log("==== early reload abort ====");
console.log(t.slice(j, j+600).replace(/\r\n/g,"\n"));
