const fs = require('fs'); const f = 'index.html'; let t = fs.readFileSync(f, 'utf8'); const before = t.length;
const NL = '\r\n';
const L = (s) => s.split('\n').join(NL);
const rep = (a, b) => { a = L(a); b = L(b); const i = t.indexOf(a); if (i < 0 || t.indexOf(a, i + 1) >= 0) throw new Error('anchor not unique/missing: ' + a.slice(0, 60)); t = t.slice(0, i) + b + t.slice(i + a.length); };
rep("      let made = 0;\n      for (let k = 0; k < n; k++) {\n        const a = a0 + (k / n) * Math.PI * 2, r = 2.5 + Math.random() * rMax;",
    "      let made = 0;\n      const guards = [];   // GB-255\n      for (let k = 0; k < n; k++) {\n        const a = a0 + (k / n) * Math.PI * 2, r = 2.5 + Math.random() * rMax;");
rep("        g.mesh.rotation.y = Math.atan2(p.x - post.x, p.z - post.z);   // facing out from the post\n        made++;",
    "        g.mesh.rotation.y = Math.atan2(p.x - post.x, p.z - post.z);   // facing out from the post\n        guards.push(g);\n        made++;");
rep("      post.n = made;\n      return made;",
    "      // GB-255 (t76 \"never in step\"): each guard rolled its own sway rate and phase at random, so about one group in ten had two\n      // guards swaying within 0.01 rad of each other for the four seconds the check watches (two guards 5%, three 14%).\n      // The sway is now one rate for the post with the guards' phases spread round the cycle (a third of a turn apart for\n      // three), so no two are ever in step; breathing, head turns and shuffles stay on each guard's own clock.\n      if (guards.length > 1) {\n        const sway = 0.6 + Math.random() * 0.7, ph0 = Math.random() * Math.PI * 2;\n        guards.forEach((g, k) => {\n          const s = zombieIdleState(g, 0);\n          s.sway = sway;\n          s.swayPh = (ph0 + ((k + (Math.random() - 0.5) * 0.3) / guards.length) * Math.PI * 2 - s.t * sway) % (Math.PI * 2);\n        });\n      }\n      post.n = made;\n      return made;");
const bak = 'qa/2026-11-03-GB-255/index.before.html'; fs.copyFileSync(f, bak);
fs.writeFileSync(f, t); console.log('ok', before, t.length);