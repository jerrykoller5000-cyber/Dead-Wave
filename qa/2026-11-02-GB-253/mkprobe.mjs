import fs from 'fs';
const t = fs.readFileSync('tools/tests/t80.js', 'utf8').split(/\r?\n/);
const i3 = t.findIndex(l => l.includes('// (3) A spider in the open, a clear line'));
const head = t.slice(0, i3);
head[0] = '// tgb253 - GB-253 probe (temporary, Grokbot 2026-11-02): t80 (1)-(2), then (3) the open-field spider traced. Not a suite check; delete after GB-253.';
const probe = `
    for (let run = 0; run < 3; run++) {
      const x = post.x - 11, z0 = post.z;
      p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
      const zz = T.spawnZombie(x, z0, 'spider', true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z0), z0);
      const t0 = T.getSimTime(); let minD = 1e9, last = '', ev = [], sawAt = null, frames = 0, prevSim = t0, maxStep = 0;
      while (T.getSimTime() - t0 < 6 && zz.alive) {
        await wait(50);
        p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
        const q = zz.mesh.position, d = Math.hypot(q.x - p.x, q.z - p.z), st = T.getSimTime();
        maxStep = Math.max(maxStep, st - prevSim); prevSim = st; frames++;
        minD = Math.min(minD, d);
        const key = 'lc=' + zz.lineClear + ' sb=' + zz.lineSawBlock + ' go=' + ((zz.lineGo || 0) > 0 ? 1 : 0);
        if (key !== last) { ev.push((st - t0).toFixed(2) + 's d' + d.toFixed(1) + ' @' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ' ' + key); last = key; }
        if (sawAt === null && zz.lineSawBlock) sawAt = (st - t0).toFixed(2);
      }
      out.push('PASS run' + run + ' minD ' + minD.toFixed(2) + ' sawBlockAt ' + sawAt + ' samples ' + frames + ' maxSimStep ' + maxStep.toFixed(3) + ' proto ' + Object.getPrototypeOf(zz).constructor.name + ' | ' + ev.join(' ; '));
      T.clearZombies(); await wait(200);
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\\n');
})()`;
fs.writeFileSync('tools/tests/tgb253.js', head.join('\n') + probe + '\n');
console.log('probe lines', head.length);
