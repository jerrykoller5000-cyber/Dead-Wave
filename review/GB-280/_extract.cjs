const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error("no module script"); process.exit(1); }
fs.writeFileSync("review/GB-280/_index-check.js", m[1]);
console.log("extracted", m[1].length, "chars");