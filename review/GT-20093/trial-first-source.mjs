import assert from 'node:assert/strict';
export function trialGuard(source){
 const original='vertices.setY(i, y - height * .12 * t * t * (3 - 2 * t));';
 assert.equal(source.split(original).length,2);
 return source.replace(original,`vertices.setY(i, y - height * .30 * t * t * (3 - 2 * t));
      const front = Math.max(0, Math.min(1, (vertices.getZ(i) - .052) / .048));
      const drop = Math.max(0, Math.min(1, (depth - .12) / .25));
      vertices.setZ(i, vertices.getZ(i) + .0355 * front * front * (3 - 2 * front) * drop * drop * (3 - 2 * drop));
      const a = 1 + .30 * 6 * t * (1 - t) / (.80 - .34);
      const b = -.0355 * front * front * (3 - 2 * front) * 6 * drop * (1 - drop) / (.25 * height);
      const c = 1 + .0355 * 6 * front * (1 - front) / .048 * drop * drop * (3 - 2 * drop);
      const normals = geometry.attributes.normal;
      const nx = normals.getX(i), nz = normals.getZ(i) / c;
      const ny = (normals.getY(i) - b * nz) / a;
      const length = Math.hypot(nx, ny, nz);
      normals.setXYZ(i, nx / length, ny / length, nz / length);`);
}
