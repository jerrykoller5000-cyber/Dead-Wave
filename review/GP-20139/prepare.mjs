import fs from 'node:fs';import assert from 'node:assert/strict';const source=fs.readFileSync('world/training.js','utf8'),eol=source.includes('\r\n')?'\r\n':'\n';const patches=[
 ["    const inset = 0.035;   // a hair of bare floor between squares: the lattice still reads through the paint",`    const inset = 0.035;   // a hair of bare floor between squares: the lattice still reads through the paint
    const paintEdge = (gx, gz, dx, dz) => {
      const nx = gx + dx, nz = gz + dz;
      return nx >= minGX && nx <= maxGX && nz >= minGZ && nz <= maxGZ && !inZone.has(nx + ',' + nz);
    };`],
 ["      const x0=rect.x0-O.x,x1=rect.x1-O.x,z0=rect.z0-O.z,z1=rect.z1-O.z;",`      let x0=rect.x0-O.x,x1=rect.x1-O.x,z0=rect.z0-O.z,z1=rect.z1-O.z;
      // GP-20139: opaque yellow edging covers these strips. Do not leave a second,
      // coplanar striped face beneath it: different depth offsets still zip on WebGPU.
      // A 10-micrometre seam prevents Float32 bake rounding from recreating overlap.
      const trim = .10001;
      if (paintEdge(gx,gz,-1,0)) x0 += trim;
      if (paintEdge(gx,gz,1,0)) x1 -= trim;
      if (paintEdge(gx,gz,0,-1)) z0 += trim;
      if (paintEdge(gx,gz,0,1)) z1 -= trim;
      if (x1 <= x0 || z1 <= z0) continue;`],
 ["        if (inZone.has(ngx + ',' + ngz) || ngx < minGX || ngx > maxGX || ngz < minGZ || ngz > maxGZ) continue;","        if (!paintEdge(gx, gz, dx, dz)) continue;"]
].map(([a,b])=>[a.replaceAll('\n',eol),b.replaceAll('\n',eol)]);let next=source;for(const[a,b]of patches){assert.equal(next.split(a).length,2,a);next=next.replace(a,b);}fs.writeFileSync('review/GP-20139/training-candidate.js.txt',next);fs.writeFileSync('review/GP-20139/proposed-patches.json',JSON.stringify(patches,null,2));console.log('Prepared disjoint stripe/border geometry; production untouched');