const fs = require("fs");
const cur = fs.readFileSync("index.html","utf8");
const needles = [
  "The MGL must first close",
  "swung-out cylinder",
  "reloading && currentWeapon",
  "if (reloading)",
  "ammoBoxBase",
  "fuelCanBase",
  "emptiesBase",
  "speedloaderBase",
  "fuelCapBase",
  "baseFuelCanPos",
  "baseFuelCapPos",
  "baseSpeedloaderPos",
  "baseEmptiesPos",
  "baseReloadShellRot",
];
for (const n of needles) {
  let idx = 0, c = 0;
  while ((idx = cur.indexOf(n, idx)) >= 0 && c < 3) {
    console.log("====", n, "at", idx);
    console.log(cur.slice(idx, idx+500).replace(/\r\n/g,"\n"));
    console.log("---");
    idx += n.length; c++;
  }
  if (c===0) console.log("MISSING", n);
}
// Compare GB-302 cancel-restore block vs edit-wiring expected text presence
const expected = [
  "if (gun.userData.fuelCan && gun.userData.baseFuelCanPos)",
  "if (gun.userData.fuelCap && gun.userData.baseFuelCapPos)",
  "if (gun.userData.empties && gun.userData.baseEmptiesPos)",
  "if (gun.userData.speedloader && gun.userData.baseSpeedloaderPos)",
  "gun.ammoBoxBase",
  "gun.fuelCanBase",
  "gun.emptiesBase",
  "gun.speedloaderBase",
  "gun.fuelCapBase",
];
for (const e of expected) console.log(e, cur.includes(e) ? "OK" : "MISSING");
