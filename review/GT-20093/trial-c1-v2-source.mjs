import assert from 'node:assert/strict';
export function trialGuard(source){
 const original=`    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i), depth = (max.y - y) / height;
      const t = Math.max(0, Math.min(1, (depth - .34) / (.80 - .34)));
      vertices.setY(i, y - height * .12 * t * t * (3 - 2 * t));
    }`;
 const start=source.indexOf('export function makeUziModel'),end=source.indexOf('export function makeKnifeModel',start);
 assert(start>=0&&end>start);
 const block=source.slice(start,end);assert.equal(block.split(original).length,2);
 const replacement=`    const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
    const mapGuard = (y, z) => {
      const depth = (max.y - y) / height, low = smooth((depth - .34) / (.80 - .34));
      const rearFade = smooth((z - .055) / .020);
      let fittedY = y - height * (.12 + .18 * rearFade) * low;
      let fittedZ = z + .0355 * smooth((z - .052) / .048) * smooth((depth - .12) / .25);
      fittedZ -= .010 * smooth((-.043 - fittedY) / .012) * (1 - smooth((-.068 - fittedY) / .012)) * smooth((z - .052) / .048);
      // C1's cavity: room at the inner toe, original height beside the middle finger.
      fittedY -= .012 * smooth((z - .060) / .018) * smooth((depth - .50) / .15);
      // Thin the lower-front wall inward so its outer face stays behind the support palm.
      const lower = smooth((-fittedY - .066) / .008), front = smooth((fittedZ - .072) / .028);
      const compressed = .110 + (fittedZ - .100) * (.010 / .037);
      fittedZ += lower * front * (compressed - fittedZ);
      return [fittedY, fittedZ];
    };
    const normals = geometry.attributes.normal, epsilon = 1e-6;
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i), z = vertices.getZ(i), point = mapGuard(y, z);
      const yp = mapGuard(y + epsilon, z), ym = mapGuard(y - epsilon, z);
      const zp = mapGuard(y, z + epsilon), zm = mapGuard(y, z - epsilon);
      const a = (yp[0] - ym[0]) / (2 * epsilon), b = (zp[0] - zm[0]) / (2 * epsilon);
      const c = (yp[1] - ym[1]) / (2 * epsilon), d = (zp[1] - zm[1]) / (2 * epsilon), det = a * d - b * c;
      if (!(det > .01)) throw Error('Wasp guard deformation folds its surface');
      const nx = normals.getX(i), oldY = normals.getY(i), oldZ = normals.getZ(i);
      const ny = (d * oldY - c * oldZ) / det, nz = (-b * oldY + a * oldZ) / det;
      const length = Math.hypot(nx, ny, nz);
      normals.setXYZ(i, nx / length, ny / length, nz / length);
      vertices.setY(i, point[0]); vertices.setZ(i, point[1]);
    }`;
 return source.slice(0,start)+block.replace(original,replacement)+source.slice(end);
}
