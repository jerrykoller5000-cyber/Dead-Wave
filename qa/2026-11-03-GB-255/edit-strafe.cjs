const fs = require('fs'); const f = 'index.html'; let t = fs.readFileSync(f, 'utf8'); const before = t.length;
const NL = '\r\n'; const L = (s) => s.split('\n').join(NL);
const rep = (a, b) => { a = L(a); b = L(b); const i = t.indexOf(a); if (i < 0 || t.indexOf(a, i + 1) >= 0) throw new Error('anchor not unique/missing: ' + a.slice(0, 70)); t = t.slice(0, i) + b + t.slice(i + a.length); };
fs.copyFileSync(f, 'qa/2026-11-03-GB-255/index.before-strafe.html');
rep("if (z.spider && !z.lineSawBlock) { z.strafeT = (z.strafeT || 0) - dt; if (z.strafeT <= 0) { z.strafeT = 1.2 + Math.random(); z.strafeDir = Math.random() < 0.5 ? -1 : 1; } const d0 = z.strafeDir || 1;",
    "if (z.spider && !z.lineSawBlock) {\n" +
    "              z.strafeT = (z.strafeT || 0) - dt;\n" +
    "              if (z.strafeT <= 0) {\n" +
    "                z.strafeT = 1.2 + Math.random(); z.strafeDir = Math.random() < 0.5 ? -1 : 1;\n" +
    "                // GB-255 (t80's corner-graze check, red about one run in three): the side was a coin flip, and a spider that had its line\n" +
    "                // near the house corner strafed straight back behind it half the time, lost the line, turned round, flipped again\n" +
    "                // (up to 38% of the time inside 0.45 m of the corner). A side whose strafe would lose the line is not taken.\n" +
    "                const sl = z.baseSpeed * 0.6 * z.strafeT, sfy = z.mesh.position.y + (z.hitH || 1) * 0.5;\n" +
    "                const sgy = (zHyp(tx - zTarget(z).position.x, tz - zTarget(z).position.z) < 3 ? zTarget(z).position.y : sampleHeight(tx, tz)) + 1.3;\n" +
    "                const sOpen = (d) => spiderLineOpenFrom(zx - nz * d * sl * 0.5, zz + nx * d * sl * 0.5, sfy, tx, tz, sgy) && spiderLineOpenFrom(zx - nz * d * sl, zz + nx * d * sl, sfy, tx, tz, sgy);\n" +
    "                if (!sOpen(z.strafeDir) && sOpen(-z.strafeDir)) z.strafeDir = -z.strafeDir;\n" +
    "              }\n" +
    "              const d0 = z.strafeDir || 1;");
rep("    function zombieLateStep(z, dt, kind, spiderTouch,",
    "    // GB-255: the two lines the spit hold reads (0.45 m either side, from the spider's body to his gun height), from a point it may strafe to.\n" +
    "    function spiderLineOpenFrom(ex, ez, ey, tx, tz, gy) {\n" +
    "      const lx = -(tz - ez), lz = tx - ex, ll = zHyp(lx, lz) || 1, ox = lx / ll * 0.45, oz = lz / ll * 0.45;\n" +
    "      return !shotBlocked({ x: ex + ox, y: ey, z: ez + oz }, { x: tx + ox, y: gy, z: tz + oz }) &&\n" +
    "        !shotBlocked({ x: ex - ox, y: ey, z: ez - oz }, { x: tx - ox, y: gy, z: tz - oz });\n" +
    "    }\n" +
    "    function zombieLateStep(z, dt, kind, spiderTouch,");
fs.writeFileSync(f, t); console.log('ok', before, t.length);
