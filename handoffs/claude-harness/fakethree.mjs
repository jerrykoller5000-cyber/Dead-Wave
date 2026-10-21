// Minimal stand-in for three.js so the game's CPU-side logic can run headless.
// Math + scene graph are real enough; everything else is a permissive stub.
const STUB_CACHE = Symbol('stubcache');
function makeStub(name = 'stub') {
  const fn = function () {};
  const store = {};
  const p = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return (hint) => (hint === 'string' ? '' : 0);
      if (k === 'then') return undefined;
      if (k === Symbol.iterator) return function* () {};
      if (k === 'toString' || k === 'valueOf') return () => 0;
      if (k === 'length') return 0;
      if (k in store) return store[k];
      const s = makeStub(name + '.' + String(k));
      store[k] = s;
      return s;
    },
    set(t, k, v) { store[k] = v; return true; },
    has() { return true; },
    apply() { return makeStub(name + '()'); },
    construct() { return makeStub('new ' + name); }
  });
  return p;
}
const NOT_FN = new Set(['geometry', 'material', 'morphTargetInfluences', 'morphTargetDictionary', 'skeleton', 'instanceColor', 'map', 'normalMap', 'colorNode', 'positionNode', 'emissiveNode', 'opacityNode', 'onBeforeShadow', 'count', 'image', 'target', 'shadow', 'intensity', 'fog', 'background', 'envMap', 'alphaMap', 'aoMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'lightMap', 'emissiveMap', 'displacementMap', 'specularMap', 'gradientMap', 'clippingPlanes', 'defines', 'uniforms', 'vertexColors', 'flatShading', 'wireframe', 'alphaTest', 'polygonOffset', 'blending', 'toneMapped', 'dithering', 'sizeAttenuation', 'linewidth', 'fragmentNode', 'vertexNode', 'outputNode', 'maskNode', 'backdropNode', 'castShadowNode', 'receivedShadowNode', 'normalNode', 'lights', 'forceSinglePass', 'premultipliedAlpha']);
// Real objects whose unknown members fall back to chainable stubs.
function permissive(obj) {
  return new Proxy(obj, {
    get(t, k, r) {
      if (k in t) return t[k];
      if (typeof k === 'symbol' || k === 'then' || k === 'toJSON') return undefined;
      if (/^(is|has)[A-Z]/.test(k) || NOT_FN.has(k)) return undefined;
      const s = function () { return r; };
      return s;
    }
  });
}

export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; this.isVector2 = true; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vector2(this.x, this.y); }
  length() { return Math.hypot(this.x, this.y); }
  multiplyScalar(s) { this.x *= s; this.y *= s; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; return this; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; return this; }
  setScalar(s) { this.x = this.y = s; return this; }
  fromBufferAttribute(at, i) { this.x = at.getX(i); this.y = at.getY(i); return this; }
}
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; this.isVector3 = true;  return permissive(this); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { this.x = this.y = this.z = s; return this; }
  setX(v) { this.x = v; return this; } setY(v) { this.y = v; return this; } setZ(v) { this.z = v; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScalar(s) { this.x += s; this.y += s; this.z += s; return this; }
  addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  multiply(v) { this.x *= v.x; this.y *= v.y; this.z *= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  divideScalar(s) { return this.multiplyScalar(1 / s); }
  negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v) { return this.crossVectors(this, v); }
  crossVectors(a, b) { const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x; return this.set(x, y, z); }
  lengthSq() { return this.dot(this); }
  length() { return Math.sqrt(this.lengthSq()); }
  setLength(l) { return this.normalize().multiplyScalar(l); }
  normalize() { const l = this.length() || 1; return this.divideScalar(l); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  distanceToSquared(v) { const d = this.distanceTo(v); return d * d; }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
  lerpVectors(a, b, t) { return this.copy(a).lerp(b, t); }
  equals(v) { return v.x === this.x && v.y === this.y && v.z === this.z; }
  min(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); this.z = Math.min(this.z, v.z); return this; }
  max(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); this.z = Math.max(this.z, v.z); return this; }
  fromArray(a, o = 0) { this.x = a[o]; this.y = a[o + 1]; this.z = a[o + 2]; return this; }
  fromBufferAttribute(at, i) { this.x = at.getX(i); this.y = at.getY(i); this.z = at.getZ(i); return this; }
  toArray(a = [], o = 0) { a[o] = this.x; a[o + 1] = this.y; a[o + 2] = this.z; return a; }
  applyQuaternion(q) {
    const vx = this.x, vy = this.y, vz = this.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
    this.x = vx + qw * tx + qy * tz - qz * ty; this.y = vy + qw * ty + qz * tx - qx * tz; this.z = vz + qw * tz + qx * ty - qy * tx;
    return this;
  }
  applyEuler(e) { return this.applyQuaternion(new Quaternion().setFromEuler(e)); }
  applyAxisAngle(ax, a) { return this.applyQuaternion(new Quaternion().setFromAxisAngle(ax, a)); }
  applyMatrix4(m) {
    const e = m.elements, x = this.x, y = this.y, z = this.z;
    const w = 1 / ((e[3] * x + e[7] * y + e[11] * z + e[15]) || 1);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }
  applyMatrix3() { return this; }
  transformDirection(m) { const e = m.elements, x = this.x, y = this.y, z = this.z; this.x = e[0] * x + e[4] * y + e[8] * z; this.y = e[1] * x + e[5] * y + e[9] * z; this.z = e[2] * x + e[6] * y + e[10] * z; return this.normalize(); }
  setFromMatrixPosition(m) { const e = m.elements; return this.set(e[12], e[13], e[14]); }
  setFromMatrixColumn(m, i) { return this.fromArray(m.elements, i * 4); }
  project() { return this; }
  unproject() { return this; }
  angleTo(v) { const d = Math.sqrt(this.lengthSq() * v.lengthSq()) || 1; return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / d))); }
  projectOnPlane(n) { const d = this.dot(n); return this.addScaledVector(n, -d); }
  clamp(a, b) { return this.max(a).min(b); }
  floor() { this.x = Math.floor(this.x); this.y = Math.floor(this.y); this.z = Math.floor(this.z); return this; }
  setFromSpherical() { return this; }
}
export class Vector4 { constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; } set(x, y, z, w) { Object.assign(this, { x, y, z, w }); return this; } }
export class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') { this._x = x; this._y = y; this._z = z; this.order = order; this._cb = null; this.isEuler = true; }
  get x() { return this._x; } set x(v) { this._x = v; this._cb && this._cb(); }
  get y() { return this._y; } set y(v) { this._y = v; this._cb && this._cb(); }
  get z() { return this._z; } set z(v) { this._z = v; this._cb && this._cb(); }
  set(x, y, z, o) { this._x = x; this._y = y; this._z = z; if (o) this.order = o; this._cb && this._cb(); return this; }
  copy(e) { return this.set(e.x, e.y, e.z, e.order); }
  clone() { return new Euler(this._x, this._y, this._z, this.order); }
  setFromQuaternion(q, order) {
    // XYZ / YXZ approximations good enough for yaw-dominant use
    const o = order || this.order;
    const x = q.x, y = q.y, z = q.z, w = q.w;
    if (o === 'YXZ') {
      const m23 = 2 * (y * z - w * x);
      this._x = Math.asin(-Math.max(-1, Math.min(1, m23)));
      this._y = Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y));
      this._z = Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z));
    } else {
      const m13 = 2 * (x * z + w * y);
      this._y = Math.asin(Math.max(-1, Math.min(1, m13)));
      this._x = Math.atan2(-2 * (y * z - w * x), 1 - 2 * (x * x + y * y));
      this._z = Math.atan2(-2 * (x * y - w * z), 1 - 2 * (y * y + z * z));
    }
    this.order = o; this._cb && this._cb(); return this;
  }
  _onChange(cb) { this._cb = cb; return this; }
}
export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; this.isQuaternion = true;  return permissive(this); }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  copy(q) { return this.set(q.x, q.y, q.z, q.w); }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
  identity() { return this.set(0, 0, 0, 1); }
  setFromAxisAngle(a, ang) { const s = Math.sin(ang / 2); return this.set(a.x * s, a.y * s, a.z * s, Math.cos(ang / 2)); }
  setFromEuler(e) {
    const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);
    if (e.order === 'YXZ') return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3);
    return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3);
  }
  multiply(q) { return this.multiplyQuaternions(this, q); }
  premultiply(q) { return this.multiplyQuaternions(q, this); }
  multiplyQuaternions(a, b) {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w, bx = b.x, by = b.y, bz = b.z, bw = b.w;
    return this.set(ax * bw + aw * bx + ay * bz - az * by, ay * bw + aw * by + az * bx - ax * bz, az * bw + aw * bz + ax * by - ay * bx, aw * bw - ax * bx - ay * by - az * bz);
  }
  slerp(q, t) { this.x += (q.x - this.x) * t; this.y += (q.y - this.y) * t; this.z += (q.z - this.z) * t; this.w += (q.w - this.w) * t; return this.normalize(); }
  normalize() { const l = Math.hypot(this.x, this.y, this.z, this.w) || 1; this.x /= l; this.y /= l; this.z /= l; this.w /= l; return this; }
  invert() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  setFromUnitVectors(a, b) {
    let r = a.x * b.x + a.y * b.y + a.z * b.z + 1, x, y, z;
    if (r < 1e-8) { r = 0; if (Math.abs(a.x) > Math.abs(a.z)) { x = -a.y; y = a.x; z = 0; } else { x = 0; y = -a.z; z = a.y; } }
    else { x = a.y * b.z - a.z * b.y; y = a.z * b.x - a.x * b.z; z = a.x * b.y - a.y * b.x; }
    return this.set(x, y, z, r).normalize();
  }
  setFromRotationMatrix(m) {
    const te = m.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], tr = m11 + m22 + m33;
    if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1.0); return this.set((m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25 / s); }
    if (m11 > m22 && m11 > m33) { const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33); return this.set(0.25 * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s); }
    if (m22 > m33) { const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33); return this.set((m12 + m21) / s, 0.25 * s, (m23 + m32) / s, (m13 - m31) / s); }
    const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22); return this.set((m13 + m31) / s, (m23 + m32) / s, 0.25 * s, (m21 - m12) / s);
  }
  angleTo() { return 0; }
  rotateTowards(q, s) { return this.slerp(q, Math.min(1, s)); }
}
export class Matrix4 {
  constructor() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; this.isMatrix4 = true;  return permissive(this); }
  identity() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; return this; }
  copy(m) { this.elements = m.elements.slice(); return this; }
  clone() { return new Matrix4().copy(this); }
  compose(p, q, s) {
    const te = this.elements, x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    te[0] = (1 - (yy + zz)) * s.x; te[1] = (xy + wz) * s.x; te[2] = (xz - wy) * s.x; te[3] = 0;
    te[4] = (xy - wz) * s.y; te[5] = (1 - (xx + zz)) * s.y; te[6] = (yz + wx) * s.y; te[7] = 0;
    te[8] = (xz + wy) * s.z; te[9] = (yz - wx) * s.z; te[10] = (1 - (xx + yy)) * s.z; te[11] = 0;
    te[12] = p.x; te[13] = p.y; te[14] = p.z; te[15] = 1;
    return this;
  }
  decompose(p, q, s) {
    const te = this.elements;
    let sx = Math.hypot(te[0], te[1], te[2]); const sy = Math.hypot(te[4], te[5], te[6]), sz = Math.hypot(te[8], te[9], te[10]);
    if (this.determinant() < 0) sx = -sx;
    p.set(te[12], te[13], te[14]);
    const m = new Matrix4().copy(this), me = m.elements;
    me[0] /= sx; me[1] /= sx; me[2] /= sx; me[4] /= sy; me[5] /= sy; me[6] /= sy; me[8] /= sz; me[9] /= sz; me[10] /= sz;
    if (q) q.setFromRotationMatrix(m);
    if (s) s.set(sx, sy, sz);
    return this;
  }
  determinant() {
    const te = this.elements, n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12], n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13], n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14], n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
    return n41 * (+n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) + n42 * (+n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31) + n43 * (+n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) + n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31);
  }
  multiply(m) { return this.multiplyMatrices(this, m); }
  premultiply(m) { return this.multiplyMatrices(m, this); }
  multiplyMatrices(a, b) {
    const ae = a.elements, be = b.elements, te = new Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += ae[k * 4 + i] * be[j * 4 + k]; te[j * 4 + i] = s; }
    this.elements = te; return this;
  }
  makeTranslation(x, y, z) { this.identity(); if (x && x.isVector3) { y = x.y; z = x.z; x = x.x; } this.elements[12] = x; this.elements[13] = y; this.elements[14] = z; return this; }
  makeRotationY(t) { const c = Math.cos(t), s = Math.sin(t); this.identity(); const e = this.elements; e[0] = c; e[8] = s; e[2] = -s; e[10] = c; return this; }
  makeRotationX(t) { const c = Math.cos(t), s = Math.sin(t); this.identity(); const e = this.elements; e[5] = c; e[9] = -s; e[6] = s; e[10] = c; return this; }
  makeRotationZ(t) { const c = Math.cos(t), s = Math.sin(t); this.identity(); const e = this.elements; e[0] = c; e[4] = -s; e[1] = s; e[5] = c; return this; }
  makeRotationFromQuaternion(q) { return this.compose(new Vector3(), q, new Vector3(1, 1, 1)); }
  makeScale(x, y, z) { this.identity(); const e = this.elements; e[0] = x; e[5] = y; e[10] = z; return this; }
  makeBasis() { return this; }
  scale(v) { const e = this.elements; for (let i = 0; i < 4; i++) { e[i] *= v.x; e[4 + i] *= v.y; e[8 + i] *= v.z; } return this; }
  setPosition(x, y, z) { if (x && x.isVector3) { y = x.y; z = x.z; x = x.x; } this.elements[12] = x; this.elements[13] = y; this.elements[14] = z; return this; }
  invert() {
    const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];
    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44, t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44, t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44, t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const d = 1 / det;
    te[0] = t11 * d; te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * d; te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * d; te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * d;
    te[4] = t12 * d; te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * d; te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * d; te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * d;
    te[8] = t13 * d; te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * d; te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * d; te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * d;
    te[12] = t14 * d; te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * d; te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * d; te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * d;
    return this;
  }
  transpose() { return this; }
  lookAt() { return this; }
  extractRotation() { return this; }
  fromArray(a, o = 0) { this.elements = Array.from(a).slice(o, o + 16); return this; }
  toArray(a = [], o = 0) { for (let i = 0; i < 16; i++) a[o + i] = this.elements[i]; return a; }
  set(...v) { const e = this.elements; e[0] = v[0]; e[4] = v[1]; e[8] = v[2]; e[12] = v[3]; e[1] = v[4]; e[5] = v[5]; e[9] = v[6]; e[13] = v[7]; e[2] = v[8]; e[6] = v[9]; e[10] = v[10]; e[14] = v[11]; e[3] = v[12]; e[7] = v[13]; e[11] = v[14]; e[15] = v[15]; return this; }
}
export class Matrix3 { constructor() { this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1];  return permissive(this); } getNormalMatrix() { return this; } setFromMatrix4() { return this; } }
export class Color {
  constructor(r, g, b) { this.r = 1; this.g = 1; this.b = 1; this.isColor = true; if (g === undefined && r !== undefined) this.set(r); else if (r !== undefined) this.setRGB(r, g, b); }
  set(v) { if (v && v.isColor) return this.copy(v); if (typeof v === 'number') return this.setHex(v); if (typeof v === 'string' && v[0] === '#') return this.setHex(parseInt(v.slice(1), 16)); return this; }
  setHex(h) { h = Math.floor(h); this.r = (h >> 16 & 255) / 255; this.g = (h >> 8 & 255) / 255; this.b = (h & 255) / 255; return this; }
  getHex() { return (Math.round(this.r * 255) << 16) ^ (Math.round(this.g * 255) << 8) ^ Math.round(this.b * 255); }
  getHexString() { return this.getHex().toString(16).padStart(6, '0'); }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  setHSL(h, s, l) { this.r = this.g = this.b = l; return this; }
  getHSL(t) { t.h = 0; t.s = 0; t.l = (this.r + this.g + this.b) / 3; return t; }
  offsetHSL() { return this; }
  setScalar(s) { this.r = this.g = this.b = s; return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color().copy(this); }
  lerp(c, a) { this.r += (c.r - this.r) * a; this.g += (c.g - this.g) * a; this.b += (c.b - this.b) * a; return this; }
  lerpColors(a, b, t) { return this.copy(a).lerp(b, t); }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
  addScalar(s) { this.r += s; this.g += s; this.b += s; return this; }
  multiply(c) { this.r *= c.r; this.g *= c.g; this.b *= c.b; return this; }
  add(c) { this.r += c.r; this.g += c.g; this.b += c.b; return this; }
  convertSRGBToLinear() { return this; } convertLinearToSRGB() { return this; }
  toArray(a = [], o = 0) { a[o] = this.r; a[o + 1] = this.g; a[o + 2] = this.b; return a; }
  fromArray(a, o = 0) { this.r = a[o]; this.g = a[o + 1]; this.b = a[o + 2]; return this; }
  equals(c) { return c.r === this.r && c.g === this.g && c.b === this.b; }
}
let _id = 0;
export class Object3D {
  constructor() {
    this.id = ++_id; this.uuid = 'u' + this.id; this.name = ''; this.type = 'Object3D';
    this.parent = null; this.children = [];
    this.position = new Vector3(); this.rotation = new Euler(); this.quaternion = new Quaternion(); this.scale = new Vector3(1, 1, 1);
    this.rotation._onChange(() => this.quaternion.setFromEuler(this.rotation));
    this.matrix = new Matrix4(); this.matrixWorld = new Matrix4();
    this.visible = true; this.castShadow = false; this.receiveShadow = false; this.frustumCulled = true;
    this.renderOrder = 0; this.userData = {}; this.matrixAutoUpdate = true; this.matrixWorldNeedsUpdate = false;
    this.layers = { set() {}, enable() {}, disable() {}, test() { return true; } };
    this.up = new Vector3(0, 1, 0);
    this.isObject3D = true;
    return permissive(this);
  }
  getWorldScale(v) { return v.copy(this.scale); }
  add(...objs) { for (const o of objs) { if (!o || o === this) continue; if (o.parent) o.parent.remove(o); o.parent = this; this.children.push(o); } return this; }
  remove(...objs) { for (const o of objs) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } } return this; }
  removeFromParent() { if (this.parent) this.parent.remove(this); return this; }
  clear() { while (this.children.length) this.remove(this.children[0]); return this; }
  attach(o) {
    this.updateWorldMatrix(true, false);
    const m = new Matrix4().copy(this.matrixWorld).invert();
    if (o.parent) { o.parent.updateWorldMatrix(true, false); m.multiply(o.parent.matrixWorld); }
    o.updateMatrix();
    const lm = new Matrix4().multiplyMatrices(m, o.matrix);
    const q = new Quaternion();
    lm.decompose(o.position, q, o.scale);
    o.quaternion.copy(q);
    o._quatOverride = true;
    this.add(o);
    return this;
  }
  traverse(cb) { cb(this); for (const c of this.children.slice()) c.traverse(cb); }
  traverseVisible(cb) { if (!this.visible) return; cb(this); for (const c of this.children.slice()) c.traverseVisible(cb); }
  traverseAncestors(cb) { if (this.parent) { cb(this.parent); this.parent.traverseAncestors(cb); } }
  updateMatrix() { this.matrix.compose(this.position, this.quaternion, this.scale); }
  getWorldQuaternionReal(q) { this.updateWorldMatrix(true, false); const p = new Vector3(), s = new Vector3(); this.matrixWorld.decompose(p, q, s); return q; }
  updateMatrixWorld() {
    this.updateMatrix();
    if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix);
    for (const c of this.children) c.updateMatrixWorld(true);
  }
  updateWorldMatrix(p, c) {
    if (p && this.parent) this.parent.updateWorldMatrix(true, false);
    this.updateMatrix();
    if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix);
    if (c) for (const ch of this.children) ch.updateWorldMatrix(false, true);
  }
  getWorldPosition(v) { this.updateWorldMatrix(true, false); return v.setFromMatrixPosition(this.matrixWorld); }
  getWorldQuaternion(q) { return q.copy(this.quaternion); }
  getWorldDirection(v) { return v.set(0, 0, 1).applyQuaternion(this.quaternion); }
  localToWorld(v) { this.updateWorldMatrix(true, false); return v.applyMatrix4(this.matrixWorld); }
  worldToLocal(v) { this.updateMatrixWorld(true); const m = this.matrixWorld.clone().invert(); return v.applyMatrix4(m); }
  lookAt(x, y, z) {
    const t = (x && x.isVector3) ? x : new Vector3(x, y, z);
    const dx = t.x - this.position.x, dz = t.z - this.position.z;
    this.rotation.set(0, Math.atan2(dx, dz), 0);
  }
  rotateX(a) { this.rotation.x += a; return this; } rotateY(a) { this.rotation.y += a; return this; } rotateZ(a) { this.rotation.z += a; return this; }
  translateZ(d) { this.position.z += d; return this; } translateX(d) { this.position.x += d; return this; } translateY(d) { this.position.y += d; return this; }
  getObjectByName(n) { let r = null; this.traverse(o => { if (!r && o.name === n) r = o; }); return r; }
  clone(recursive = true) {
    const o = new this.constructor(this.geometry, this.material);
    o.position.copy(this.position); o.rotation.copy(this.rotation); o.scale.copy(this.scale);
    o.visible = this.visible; o.userData = Object.assign({}, this.userData); o.name = this.name;
    if (recursive) for (const c of this.children) o.add(c.clone());
    return o;
  }
  copy(src) { this.position.copy(src.position); this.rotation.copy(src.rotation); this.scale.copy(src.scale); return this; }
  dispatchEvent() {} addEventListener() {} removeEventListener() {}
  onBeforeRender() {}
}
export class Group extends Object3D { constructor() { super(); this.isGroup = true; this.type = 'Group'; } }
export class Scene extends Object3D { constructor() { super(); this.isScene = true; this.background = null; this.fog = null; this.environment = null; } }
export class Mesh extends Object3D {
  constructor(geometry, material) { super(); this.isMesh = true; this.type = 'Mesh'; this.geometry = geometry || new BufferGeometry(); this.material = material || new MeshBasicMaterial(); }
  raycast() {}
}
export class InstancedMesh extends Mesh {
  constructor(g, m, count) { super(g, m); this.isInstancedMesh = true; this.count = count; this.instanceMatrix = new InstancedBufferAttribute(new Float32Array(count * 16), 16); this.instanceColor = null; this._mats = []; }
  setMatrixAt(i, m) { this._mats[i] = m.clone(); }
  getMatrixAt(i, m) { if (this._mats[i]) m.copy(this._mats[i]); return m; }
  setColorAt(i, c) { if (!this.instanceColor) this.instanceColor = new InstancedBufferAttribute(new Float32Array(this.count * 3), 3); c.toArray(this.instanceColor.array, i * 3); }
  getColorAt(i, c) { if (this.instanceColor) c.fromArray(this.instanceColor.array, i * 3); return c; }
  computeBoundingSphere() {} computeBoundingBox() {} dispose() {}
}
export class LineSegments extends Mesh { constructor(g, m) { super(g, m); this.isLineSegments = true; } }
export class Line extends Mesh {}
export class Points extends Mesh {}
export class Sprite extends Mesh { constructor(m) { super(new BufferGeometry(), m); this.isSprite = true; this.type = "Sprite"; this.center = new Vector2(0.5, 0.5); } }
class LightBase extends Object3D {
  constructor(color, intensity = 1, distance = 0) {
    super(); this.isLight = true; this.color = new Color(color === undefined ? 0xffffff : color); this.intensity = intensity; this.distance = distance;
    this.decay = 2; this.angle = 0.5; this.penumbra = 0; this.target = new Object3D(); this.groundColor = new Color();
    this.shadow = { mapSize: { width: 512, height: 512, set() {} }, camera: permissive({ left: 0, right: 0, top: 0, bottom: 0, near: 0, far: 0, updateProjectionMatrix() {} }), bias: 0, normalBias: 0, radius: 1, needsUpdate: false, map: null };
  }
}
export class PointLight extends LightBase {}
export class SpotLight extends LightBase {}
export class DirectionalLight extends LightBase {}
export class HemisphereLight extends LightBase { constructor(a, b, i) { super(a, i); this.groundColor = new Color(b); } }
export class AmbientLight extends LightBase {}
export class PerspectiveCamera extends Object3D {
  constructor(fov = 50, aspect = 1, near = 0.1, far = 1000) { super(); this.isCamera = true; this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; this.zoom = 1; this.projectionMatrix = new Matrix4(); this.projectionMatrixInverse = new Matrix4(); this.matrixWorldInverse = new Matrix4(); }
  updateProjectionMatrix() {}
  lookAt(x, y, z) {
    const t = (x && x.isVector3) ? x : new Vector3(x, y, z);
    this._look = t.clone();
    const dx = t.x - this.position.x, dy = t.y - this.position.y, dz = t.z - this.position.z;
    // camera looks down -Z: yaw so that -Z points at target
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    this.rotation.set(pitch, yaw, 0, 'YXZ');
  }
  getWorldDirection(v) { if (this._look) return v.copy(this._look).sub(this.position).normalize(); return v.set(0, 0, -1); }
}
export class OrthographicCamera extends PerspectiveCamera {}
export class BufferAttribute {
  constructor(array, itemSize, normalized) { this.array = array; this.itemSize = itemSize; this.count = array ? array.length / itemSize : 0; this.needsUpdate = false; this.normalized = !!normalized; this.isBufferAttribute = true; this.usage = 0; this.updateRanges = []; }
  getX(i) { return this.array[i * this.itemSize]; } getY(i) { return this.array[i * this.itemSize + 1]; } getZ(i) { return this.array[i * this.itemSize + 2]; } getW(i) { return this.array[i * this.itemSize + 3]; }
  setX(i, v) { this.array[i * this.itemSize] = v; return this; } setY(i, v) { this.array[i * this.itemSize + 1] = v; return this; } setZ(i, v) { this.array[i * this.itemSize + 2] = v; return this; } setW(i, v) { this.array[i * this.itemSize + 3] = v; return this; }
  setXY(i, x, y) { this.setX(i, x); this.setY(i, y); return this; }
  setXYZ(i, x, y, z) { this.setX(i, x); this.setY(i, y); this.setZ(i, z); return this; }
  setXYZW(i, x, y, z, w) { this.setXYZ(i, x, y, z); this.setW(i, w); return this; }
  setUsage(u) { this.usage = u; return this; }
  clone() { return new this.constructor(this.array.slice(), this.itemSize); }
  copyArray(a) { this.array.set(a); return this; }
  set(a, o) { this.array.set(a, o); return this; }
  addUpdateRange() {} clearUpdateRanges() {}
}
export class Float32BufferAttribute extends BufferAttribute { constructor(a, s, n) { super(a instanceof Float32Array ? a : new Float32Array(a), s, n); } }
export class Uint16BufferAttribute extends BufferAttribute { constructor(a, s) { super(new Uint16Array(a), s); } }
export class Uint32BufferAttribute extends BufferAttribute { constructor(a, s) { super(new Uint32Array(a), s); } }
export class InstancedBufferAttribute extends BufferAttribute { constructor(a, s, n, m) { super(a, s, n); this.meshPerAttribute = m || 1; } }
export class BufferGeometry {
  constructor() { this.attributes = {}; this.index = null; this.groups = []; this.userData = {}; this.boundingBox = null; this.boundingSphere = null; this.isBufferGeometry = true; this.drawRange = { start: 0, count: Infinity }; }
  setAttribute(n, a) { this.attributes[n] = a; return this; }
  getAttribute(n) { return this.attributes[n]; }
  deleteAttribute(n) { delete this.attributes[n]; return this; }
  hasAttribute(n) { return n in this.attributes; }
  setIndex(i) { this.index = Array.isArray(i) ? new BufferAttribute(new Uint32Array(i), 1) : i; return this; }
  getIndex() { return this.index; }
  _xf(fn) { const p = this.attributes.position; if (!p) return this; const v = new Vector3(); for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); fn(v); p.setXYZ(i, v.x, v.y, v.z); } return this; }
  translate(x, y, z) { return this._xf(v => v.set(v.x + x, v.y + y, v.z + z)); }
  rotateX(a) { const c = Math.cos(a), s = Math.sin(a); return this._xf(v => v.set(v.x, v.y * c - v.z * s, v.y * s + v.z * c)); }
  rotateY(a) { const c = Math.cos(a), s = Math.sin(a); return this._xf(v => v.set(v.x * c + v.z * s, v.y, -v.x * s + v.z * c)); }
  rotateZ(a) { const c = Math.cos(a), s = Math.sin(a); return this._xf(v => v.set(v.x * c - v.y * s, v.x * s + v.y * c, v.z)); }
  scale(x, y, z) { return this._xf(v => v.set(v.x * x, v.y * y, v.z * z)); }
  applyMatrix4(m) { return this._xf(v => v.applyMatrix4(m)); }
  applyQuaternion(q) { return this._xf(v => v.applyQuaternion(q)); }
  center() { return this; }
  computeVertexNormals() { const p = this.attributes.position; if (p && !this.attributes.normal) this.attributes.normal = new Float32BufferAttribute(new Float32Array(p.count * 3), 3); }
  computeBoundingBox() { this.boundingBox = new Box3(); const p = this.attributes.position; if (p) for (let i = 0; i < p.count; i++) this.boundingBox.expandByPoint(new Vector3(p.getX(i), p.getY(i), p.getZ(i))); }
  computeBoundingSphere() { this.boundingSphere = { center: new Vector3(), radius: 1 }; }
  computeTangents() {}
  setDrawRange(s, c) { this.drawRange.start = s; this.drawRange.count = c; }
  addGroup(s, c, m) { this.groups.push({ start: s, count: c, materialIndex: m }); }
  clearGroups() { this.groups = []; }
  clone() { const g = new BufferGeometry(); for (const k in this.attributes) g.attributes[k] = this.attributes[k].clone(); g.index = this.index; return g; }
  copy(g) { for (const k in g.attributes) this.attributes[k] = g.attributes[k].clone(); return this; }
  toNonIndexed() {
    if (!this.index) return this.clone();
    const g = new BufferGeometry(), idx = this.index;
    for (const k in this.attributes) {
      const a = this.attributes[k], s = a.itemSize, out = new Float32Array(idx.count * s);
      for (let i = 0; i < idx.count; i++) { const j = idx.getX(i); for (let c = 0; c < s; c++) out[i * s + c] = a.array[j * s + c]; }
      g.attributes[k] = new Float32BufferAttribute(out, s);
    }
    return g;
  }
  dispose() {}
  setFromPoints(pts) { const a = new Float32Array(pts.length * 3); pts.forEach((p, i) => { a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z || 0; }); this.setAttribute('position', new Float32BufferAttribute(a, 3)); return this; }
}
function gridGeo(wSeg, hSeg, fn) {
  const g = new BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= hSeg; j++) for (let i = 0; i <= wSeg; i++) { const u = i / wSeg, v = j / hSeg; const p = fn(u, v); pos.push(p[0], p[1], p[2]); uv.push(u, 1 - v); }
  for (let j = 0; j < hSeg; j++) for (let i = 0; i < wSeg; i++) { const a = j * (wSeg + 1) + i, b = a + wSeg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(new Float32Array(pos.length), 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function geoClass(fnBuilder) {
  return class extends BufferGeometry {
    constructor(...args) { super(); const g = fnBuilder(...args); this.attributes = g.attributes; this.index = g.index; this.parameters = args; }
  };
}
export const PlaneGeometry = geoClass((w = 1, h = 1, ws = 1, hs = 1) => gridGeo(Math.max(1, ws | 0), Math.max(1, hs | 0), (u, v) => [(u - 0.5) * w, (0.5 - v) * h, 0]));
export const BoxGeometry = geoClass((w = 1, h = 1, d = 1, ws = 1, hs = 1, ds = 1) => {
  ws = Math.max(1, ws | 0); hs = Math.max(1, hs | 0); ds = Math.max(1, ds | 0);
  const pos = [], nrm = [], uv = [], idx = [];
  const plane = (u, v, wv, udir, vdir, width, height, depth, gx, gy) => {
    const start = pos.length / 3;
    for (let iy = 0; iy <= gy; iy++) for (let ix = 0; ix <= gx; ix++) {
      const vec = [0, 0, 0];
      vec[u] = (ix / gx - 0.5) * width * udir; vec[v] = (iy / gy - 0.5) * height * vdir; vec[wv] = depth / 2;
      pos.push(vec[0], vec[1], vec[2]);
      const n = [0, 0, 0]; n[wv] = depth > 0 ? 1 : -1; nrm.push(n[0], n[1], n[2]);
      uv.push(ix / gx, 1 - iy / gy);
    }
    for (let iy = 0; iy < gy; iy++) for (let ix = 0; ix < gx; ix++) {
      const a = start + ix + (gx + 1) * iy, b = start + ix + (gx + 1) * (iy + 1), c = start + (ix + 1) + (gx + 1) * (iy + 1), d2 = start + (ix + 1) + (gx + 1) * iy;
      idx.push(a, b, d2, b, c, d2);
    }
  };
  plane(2, 1, 0, -1, -1, d, h, w, ds, hs); plane(2, 1, 0, 1, -1, d, h, -w, ds, hs);
  plane(0, 2, 1, 1, 1, w, d, h, ws, ds); plane(0, 2, 1, 1, -1, w, d, -h, ws, ds);
  plane(0, 1, 2, 1, -1, w, h, d, ws, hs); plane(0, 1, 2, -1, -1, w, h, -d, ws, hs);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
});
function cylGeo(rt, rb, h, rs = 8, hsg = 1, open = false, t0 = 0, tl = Math.PI * 2) {
  rs = Math.max(3, rs | 0); hsg = Math.max(1, hsg | 0);
  const pos = [], uv = [], idx = [];
  for (let y = 0; y <= hsg; y++) { const v = y / hsg, r = v * (rb - rt) + rt; for (let x = 0; x <= rs; x++) { const u = x / rs, th = u * tl + t0; pos.push(r * Math.sin(th), -v * h + h / 2, r * Math.cos(th)); uv.push(u, 1 - v); } }
  for (let x = 0; x < rs; x++) for (let y = 0; y < hsg; y++) { const a = y * (rs + 1) + x, b = (y + 1) * (rs + 1) + x, c = (y + 1) * (rs + 1) + x + 1, d = y * (rs + 1) + x + 1; idx.push(a, b, d, b, c, d); }
  if (!open) for (const top of [true, false]) {
    const r = top ? rt : rb; if (r <= 0) continue; const yv = top ? h / 2 : -h / 2; const ci = pos.length / 3; pos.push(0, yv, 0); uv.push(0.5, 0.5);
    const s0 = pos.length / 3; for (let x = 0; x <= rs; x++) { const th = x / rs * tl + t0; pos.push(r * Math.sin(th), yv, r * Math.cos(th)); uv.push(0.5 + Math.sin(th) * 0.5, 0.5 + Math.cos(th) * 0.5); }
    for (let x = 0; x < rs; x++) idx.push(ci, s0 + x, s0 + x + 1);
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new Float32BufferAttribute(new Float32Array(pos.length), 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
export const CylinderGeometry = geoClass((rt = 1, rb = 1, h = 1, rs = 8, hs = 1, open = false, t0 = 0, tl = Math.PI * 2) => cylGeo(rt, rb, h, rs, hs, open, t0, tl));
export const ConeGeometry = geoClass((r = 1, h = 1, rs = 8, hs = 1, open = false, t0 = 0, tl = Math.PI * 2) => cylGeo(0, r, h, rs, hs, open, t0, tl));
export const CapsuleGeometry = geoClass((r = 1, l = 1, cs = 4, rs = 8) => gridGeo(Math.max(3, rs | 0), 8, (u, v) => { const ph = u * Math.PI * 2; let y, rr; if (v < 0.25) { const t = (1 - v / 0.25) * Math.PI / 2; y = l / 2 + Math.sin(t) * r; rr = Math.cos(t) * r; } else if (v > 0.75) { const t = ((v - 0.75) / 0.25) * Math.PI / 2; y = -l / 2 - Math.sin(t) * r; rr = Math.cos(t) * r; } else { y = l / 2 - (v - 0.25) / 0.5 * l; rr = r; } return [Math.sin(ph) * rr, y, Math.cos(ph) * rr]; }));
export const SphereGeometry = geoClass((r = 1, ws = 8, hs = 6, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => gridGeo(Math.max(3, ws | 0), Math.max(2, hs | 0), (u, v) => { const th = ts + v * tl, ph = ps + u * pl; return [-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th)]; }));
export const IcosahedronGeometry = geoClass((r = 1, d = 0) => gridGeo(5, 3, (u, v) => { const th = v * Math.PI, ph = u * Math.PI * 2; return [-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th)]; }));
export const DodecahedronGeometry = IcosahedronGeometry;
export const TetrahedronGeometry = IcosahedronGeometry;
export const CircleGeometry = geoClass((r = 1, s = 8) => gridGeo(Math.max(3, s | 0), 1, (u, v) => { const a = u * Math.PI * 2; return [Math.cos(a) * r * (1 - v), Math.sin(a) * r * (1 - v), 0]; }));
export const RingGeometry = geoClass((ri = 0.5, ro = 1, s = 8) => gridGeo(Math.max(3, s | 0), 1, (u, v) => { const a = u * Math.PI * 2, r = ri + (ro - ri) * v; return [Math.cos(a) * r, Math.sin(a) * r, 0]; }));
export const TorusGeometry = geoClass((r = 1, t = 0.4, rs = 8, ts = 6) => gridGeo(Math.max(3, ts | 0), Math.max(3, rs | 0), (u, v) => { const a = u * Math.PI * 2, b = v * Math.PI * 2; return [(r + t * Math.cos(b)) * Math.cos(a), (r + t * Math.cos(b)) * Math.sin(a), t * Math.sin(b)]; }));

class MaterialBase {
  constructor(p = {}) {
    this.isMaterial = true; this.color = new Color(0xffffff); this.emissive = new Color(0); this.opacity = 1; this.transparent = false; this.visible = true;
    this.side = 0; this.depthWrite = true; this.depthTest = true; this.userData = {}; this.needsUpdate = false; this.emissiveIntensity = 1; this.roughness = 1; this.metalness = 0;
    this.setValues(p);
    return permissive(this);
  }
  setValues(p) { for (const k in p) { const v = p[k]; if ((k === 'color' || k === 'emissive') && v !== undefined && !(v && v.isNode)) this[k] = new Color(v); else this[k] = v; } }
  clone() { const m = new this.constructor(); for (const k of Object.keys(this)) { const v = this[k]; m[k] = (v && v.isColor) ? v.clone() : v; } return m; }
  copy(o) { for (const k of Object.keys(o)) this[k] = o[k]; return this; }
  dispose() {}
  onBeforeCompile() {}
  customProgramCacheKey() { return ''; }
}
export class MeshStandardMaterial extends MaterialBase {}
export class MeshBasicMaterial extends MaterialBase {}
export class MeshStandardNodeMaterial extends MaterialBase {}
export class MeshBasicNodeMaterial extends MaterialBase {}
export class LineBasicMaterial extends MaterialBase {}
export class MeshLambertMaterial extends MaterialBase {}
export class MeshPhongMaterial extends MaterialBase {}
export class SpriteMaterial extends MaterialBase {}
export class PointsMaterial extends MaterialBase {}

export class Box3 {
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) { this.min = min; this.max = max; }
  setFromObject(o) {
    this.makeEmpty(); o.updateWorldMatrix(true, true);
    o.traverse(c => { if (c.geometry && c.geometry.attributes && c.geometry.attributes.position) { const p = c.geometry.attributes.position; for (let i = 0; i < p.count; i++) this.expandByPoint(new Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(c.matrixWorld)); } });
    return this;
  }
  makeEmpty() { this.min.set(Infinity, Infinity, Infinity); this.max.set(-Infinity, -Infinity, -Infinity); return this; }
  expandByPoint(p) { this.min.min(p); this.max.max(p); return this; }
  getSize(v) { return v.subVectors(this.max, this.min); }
  getCenter(v) { return v.addVectors(this.min, this.max).multiplyScalar(0.5); }
  containsPoint(p) { return p.x >= this.min.x && p.x <= this.max.x && p.y >= this.min.y && p.y <= this.max.y && p.z >= this.min.z && p.z <= this.max.z; }
  isEmpty() { return this.max.x < this.min.x; }
  union(b) { this.min.min(b.min); this.max.max(b.max); return this; }
  clone() { return new Box3(this.min.clone(), this.max.clone()); }
  copy(b) { this.min.copy(b.min); this.max.copy(b.max); return this; }
  intersectsBox(b) { return !(b.max.x < this.min.x || b.min.x > this.max.x || b.max.y < this.min.y || b.min.y > this.max.y || b.max.z < this.min.z || b.min.z > this.max.z); }
  expandByScalar(s) { this.min.addScalar(-s); this.max.addScalar(s); return this; }
}
export class Sphere { constructor(c = new Vector3(), r = -1) { this.center = c; this.radius = r; } }
export class Ray {
  constructor(o = new Vector3(), d = new Vector3(0, 0, -1)) { this.origin = o; this.direction = d; }
  at(t, v) { return v.copy(this.origin).addScaledVector(this.direction, t); }
  intersectPlane() { return null; } intersectBox() { return null; } intersectSphere() { return null; }
  set(o, d) { this.origin.copy(o); this.direction.copy(d); return this; }
}
export class Plane { constructor(n = new Vector3(0, 1, 0), c = 0) { this.normal = n; this.constant = c; } setFromNormalAndCoplanarPoint(n, p) { this.normal.copy(n); this.constant = -p.dot(n); return this; } }
export class Raycaster {
  constructor() { this.ray = new Ray(); this.near = 0; this.far = Infinity; this.params = {}; this.camera = null; }
  setFromCamera(ndc, camera) {
    this.camera = camera;
    this.ray.origin.copy(camera.position);
    const f = new Vector3(); camera.getWorldDirection(f);
    // crude: offset direction by ndc using camera fov
    const up = new Vector3(0, 1, 0), right = new Vector3().crossVectors(f, up).normalize(), u2 = new Vector3().crossVectors(right, f).normalize();
    const t = Math.tan((camera.fov || 50) * Math.PI / 360);
    this.ray.direction.copy(f).addScaledVector(right, ndc.x * t * (camera.aspect || 1)).addScaledVector(u2, ndc.y * t).normalize();
  }
  set(o, d) { this.ray.set(o, d); }
  intersectObject() { return []; }
  intersectObjects() { return []; }
}
export class Clock { constructor() { this.t = performance.now(); this.elapsedTime = 0; } getDelta() { const n = performance.now(); const d = (n - this.t) / 1000; this.t = n; this.elapsedTime += d; return d; } getElapsedTime() { this.getDelta(); return this.elapsedTime; } start() {} stop() {} }
export class Fog { constructor(c, n, f) { this.color = new Color(c); this.near = n; this.far = f; } }
export class FogExp2 { constructor(c, d) { this.color = new Color(c); this.density = d; } }
export class CanvasTexture { constructor(c) { this.image = c; this.needsUpdate = false; this.repeat = new Vector2(1, 1); this.offset = new Vector2(); this.wrapS = 0; this.wrapT = 0; this.colorSpace = ''; return permissive(this); } dispose() {} clone() { return this; } }
export class Texture extends CanvasTexture {}
export class DataTexture extends CanvasTexture {}

export class WebGPURenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.domElement.width = 1280; this.domElement.height = 720;
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true, needsUpdate: false };
    this.info = { render: { drawCalls: 0, triangles: 0 }, memory: {}, autoReset: true, reset() {} };
    this.backend = { isWebGPUBackend: false, isWebGLBackend: true };
    this.toneMapping = 0; this.outputColorSpace = ''; this.toneMappingExposure = 1;
    this._pr = 1; this._timer = null; this._loop = null;
    return permissive(this);
  }
  async init() { return this; }
  setPixelRatio(p) { this._pr = p; } getPixelRatio() { return this._pr; }
  setSize(w, h) { this.domElement.width = w; this.domElement.height = h; }
  getSize(v) { return v.set(this.domElement.width, this.domElement.height); }
  getDrawingBufferSize(v) { return v.set(this.domElement.width, this.domElement.height); }
  render() {} async renderAsync() {} compile() {} async compileAsync() { if (globalThis.__fakeParallelCompile) await new Promise((r) => { let n = 0; const c = () => (++n >= 3 ? r() : requestAnimationFrame(c)); c(); }); }
  setAnimationLoop(cb) { const raf = (f) => (globalThis.requestAnimationFrame ? globalThis.requestAnimationFrame(f) : setTimeout(f, 1000 / 60)); this._loop = cb; if (cb && !this._timer) { const step = () => { if (!this._loop) { this._timer = null; return; } try { this._loop(performance.now()); } catch (e) { setTimeout(() => { throw e; }); } this._timer = raf(step); }; this._timer = raf(step); } if (!cb) this._loop = null; } dispose() {} setClearColor() {} clear() {}
  hasFeature() { return false; }
}
export class PostProcessing { constructor() { this.outputNode = null; this.needsUpdate = false; return permissive(this); } render() {} async renderAsync() {} }

export const MathUtils = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  degToRad: (d) => d * Math.PI / 180,
  radToDeg: (r) => r * 180 / Math.PI,
  smoothstep: (x, a, b) => { if (x <= a) return 0; if (x >= b) return 1; x = (x - a) / (b - a); return x * x * (3 - 2 * x); },
  randFloat: (a, b) => a + Math.random() * (b - a),
  randFloatSpread: (r) => r * (0.5 - Math.random()),
  randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  euclideanModulo: (n, m) => ((n % m) + m) % m,
  damp: (x, y, l, dt) => x + (y - x) * (1 - Math.exp(-l * dt)),
  mapLinear: (x, a1, a2, b1, b2) => b1 + (x - a1) * (b2 - b1) / (a2 - a1),
  generateUUID: () => 'uuid' + Math.random(),
  inverseLerp: (a, b, v) => (a !== b ? (v - a) / (b - a) : 0)
};
export const DoubleSide = 2, BackSide = 1, FrontSide = 0, SRGBColorSpace = 'srgb', LinearSRGBColorSpace = 'srgb-linear', PCFSoftShadowMap = 2, PCFShadowMap = 1, NormalBlending = 1, AdditiveBlending = 2, NoToneMapping = 0, ACESFilmicToneMapping = 4, RepeatWrapping = 1000, ClampToEdgeWrapping = 1001, LinearFilter = 1006, NearestFilter = 1003, DynamicDrawUsage = 35048, StaticDrawUsage = 35044, LinearMipmapLinearFilter = 1008;
export const Node = makeStub('Node');
export default {};
export const LatheGeometry = geoClass((points = [], segs = 12, phiStart = 0, phiLen = Math.PI * 2) => { const pts = points.length ? points : [{ x: 0, y: 0 }, { x: 1, y: 1 }]; return gridGeo(Math.max(3, segs | 0), Math.max(1, pts.length - 1), (u, v) => { const k = Math.min(pts.length - 1, Math.round(v * (pts.length - 1))); const p = pts[k]; const ph = phiStart + u * phiLen; return [p.x * Math.sin(ph), p.y, p.x * Math.cos(ph)]; }); });
