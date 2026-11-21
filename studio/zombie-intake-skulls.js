// Mounted samples read through their skeletal outline and recessed facial openings.
const FACE = [
  [0,.008,.113], [.039,.012,.109], [.070,.027,.089], [.079,.055,.067],
  [.086,.089,.054], [.118,.120,.055], [.123,.158,.035], [.112,.199,.029],
  [.084,.235,.025], [.046,.253,.021], [0,.256,.022], [-.046,.253,.021],
  [-.084,.235,.025], [-.112,.199,.029], [-.123,.158,.035], [-.118,.120,.055],
  [-.086,.089,.054], [-.079,.055,.067], [-.070,.027,.089], [-.039,.012,.109],
];
const RIGHT_ORBIT = [
  [.016,.132,.119], [.024,.155,.117], [.043,.170,.110], [.072,.164,.108],
  [.092,.147,.096], [.090,.121,.105], [.067,.107,.119], [.036,.110,.124],
];
const LEFT_ORBIT = RIGHT_ORBIT.map(([x,y,z]) => [-x,y,z]).reverse();
const NASAL = [[0,.132,.125],[.012,.112,.133],[.016,.085,.136],[0,.089,.142],[-.016,.085,.136],[-.012,.112,.133]];
const MOUTH = [[-.060,.050,.104],[-.039,.040,.133],[0,.035,.145],[.039,.040,.133],[.060,.050,.104],
  [.049,.069,.126],[0,.078,.152],[-.049,.069,.126]];
const OPENINGS = [RIGHT_ORBIT, LEFT_ORBIT, NASAL, MOUTH];

export function makeIntakeSpecimen(T, kind) {
  const horned = kind === 'demon';
  const bone = new T.Color(horned ? 0xa79c85 : 0xc5baa0);
  const tone = new T.Color();
  const positions = [];
  const colors = [];
  const emissive = [];
  const eyeHex = horned ? 0xffb020 : 0x88ff44;
  const eyeColor = new T.Color(eyeHex);
  const emit = (point, value, tint = bone, glow = 0) => {
    positions.push(...point);
    tone.copy(tint).multiplyScalar(value);
    colors.push(tone.r, tone.g, tone.b);
    emissive.push(glow);
  };
  const faceShade = ([x,y]) => .82 + .16 * (y / .256) + .08 * (1 - Math.abs(x) / .123);
  const triangulate = (outer, holes = []) => T.ShapeUtils.triangulateShape(
    outer.map(([x,y]) => new T.Vector2(x,y)),
    holes.map(hole => hole.map(([x,y]) => new T.Vector2(x,y))),
  );
  const front = [...FACE, ...OPENINGS.flat()];
  for (const ids of triangulate(FACE, OPENINGS)) {
    for (const id of ids) emit(front[id], faceShade(front[id]));
  }
  const join = (outer, inner, low, high, tint = bone, reverse = false) => {
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      const points = [outer[i], inner[i], inner[j], outer[i], inner[j], outer[j]];
      const values = [low, high, high, low, high, low];
      for (const n of reverse ? [2,1,0,5,4,3] : [0,1,2,3,4,5]) emit(points[n], values[n], tint);
    }
  };
  // A rounded cranial vault narrows to the flat contact face on the specimen plate.
  const vaultShoulder = FACE.map(([x,y]) => [x * (y > .09 ? .99 : .81), .147 + (y-.147)*.96, y > .09 ? -.050 : -.005]);
  const vaultRear = FACE.map(([x,y]) => [x * .71, .154 + (y-.154)*.73, -.100]);
  join(FACE, vaultShoulder, .90, .85);
  join(vaultShoulder, vaultRear, .85, .69);
  for (const ids of triangulate(vaultRear)) for (const id of ids.slice().reverse()) emit(vaultRear[id], .69);

  const shellComponents = positions.length;

  // The cavity walls are attached to the rim and darken towards their recessed bases.
  for (const [i, rim] of OPENINGS.entries()) {
    const [x,y] = rim.reduce(([sx,sy],[px,py]) => [sx+px/rim.length,sy+py/rim.length], [0,0]);
    const inner = rim.map(([px,py]) => [x+(px-x)*.59, y+(py-y)*.60, i === 3 ? .088 : .054]);
    join(rim, inner, .78, .13, bone, i === 3);
    for (const ids of triangulate(inner)) for (const id of ids) emit(inner[id], .085);
  }

  // The same identifying light as a picked-up skull, recessed in the orbit.
  const iris = new T.SphereGeometry(.013,6,4);
  const irisPoints = iris.attributes.position;
  for (const side of [-1,1]) {
    for (let i=0; i<iris.index.count; i++) {
      const id=iris.index.getX(i);
      emit([side*.055+irisPoints.getX(id),.139+irisPoints.getY(id),.060+.62*irisPoints.getZ(id)],1,eyeColor,1.6);
    }
  }
  iris.dispose();

  const tooth = new T.BoxGeometry(.012,1,.026);
  const toothPoints = tooth.attributes.position;
  for (const [row,height,count] of [[.070,.023,6],[.042,.016,4]]) {
    for (let i = 0; i < count; i++) {
      const x = (i - (count-1)/2)*.017;
      for (let j = 0; j < tooth.index.count; j++) {
        const id = tooth.index.getX(j);
        const y = toothPoints.getY(id) * height;
        const z = toothPoints.getZ(id);
        emit([x+toothPoints.getX(id),row+y,.139+z-.20*Math.abs(x)], z > 0 ? 1.21 : .90);
      }
    }
  }
  tooth.dispose();
  if (horned) {
    const horn = new T.Color(0x534333);
    for (const side of [-1,1]) {
      const ring = (x,y,z,r) => Array.from({length:6}, (_,n) => {
        const a = n * Math.PI / 3;
        return [side * x+r*Math.cos(a),y,z+r*Math.sin(a)];
      });
      const root = ring(.074,.211,-.014,.030);
      const bend = ring(.100,.271,-.028,.018);
      const tip = [side*.133,.326,-.040];
      join(root,bend,.72,.94,horn);
      for (let i = 0; i < bend.length; i++) {
        emit(bend[i], .94, horn);
        emit(tip, .80, horn);
        emit(bend[(i+1)%bend.length], .94, horn);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('intakeEmission', new T.Float32BufferAttribute(emissive,1));
  geometry.computeVertexNormals();
  // Smooth skin-free bone across the shell. Keep the cavity rims, teeth and horns defined.
  const normals = geometry.getAttribute('normal');
  const averaged = new Map();
  const pointKey = at => positions.slice(at,at+3).join(',');
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3();
  for (let at = 0; at < shellComponents; at += 9) {
    a.fromArray(positions,at);
    b.fromArray(positions,at+3).sub(a);
    c.fromArray(positions,at+6).sub(a);
    n.crossVectors(b,c);
    for (let k = at; k < at+9; k += 3) {
      const key = pointKey(k);
      if (!averaged.has(key)) averaged.set(key,new T.Vector3());
      averaged.get(key).add(n);
    }
  }
  for (const sum of averaged.values()) sum.normalize();
  for (let at = 0; at < shellComponents; at += 3) {
    const normal = averaged.get(pointKey(at));
    normals.setXYZ(at/3,normal.x,normal.y,normal.z);
  }
  const material = new T.MeshStandardNodeMaterial({ vertexColors:true, roughness:.92 });
  material.emissiveNode = T.TSL.attribute('intakeEmission','float').mul(T.TSL.color(eyeHex));
  const specimen = new T.Mesh(geometry, material);
  specimen.name = horned ? 'intake-specimen-02' : 'intake-specimen-01';
  specimen.castShadow = true;
  return specimen;
}
