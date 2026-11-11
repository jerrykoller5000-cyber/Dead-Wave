import {Vector3} from '../../vendor/three/three.core.js';

// Identify the line where two surfaces meet. A pre-existing penetration witness
// inside a solid cannot say whether either of its faces is visible.
const epsilon = 1e-9;

function cut(points, normal, origin) {
  const distances = points.map(p => normal.dot(p) - normal.dot(origin));
  if (distances.every(d => d > epsilon) || distances.every(d => d < -epsilon)) return [];
  const hits = [];
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3, a = distances[i], b = distances[j];
    if (Math.abs(a) <= epsilon) hits.push(points[i]);
    if ((a > epsilon && b < -epsilon) || (a < -epsilon && b > epsilon)) {
      hits.push(points[i].clone().lerp(points[j], a / (a - b)));
    }
  }
  return hits;
}

export function crossingSegment(a, b) {
  if (!a.box.intersectsBox(b.box)) return;
  const na = a.tri.getNormal(new Vector3()), nb = b.tri.getNormal(new Vector3());
  const direction = new Vector3().crossVectors(na, nb);
  if (direction.lengthSq() < 1e-16) return;
  direction.normalize();
  const ca = cut(a.p, nb, b.p[0]), cb = cut(b.p, na, a.p[0]);
  if (ca.length !== 2 || cb.length !== 2) return;
  const ia = ca.map(p => direction.dot(p)), ib = cb.map(p => direction.dot(p));
  const lo = Math.max(Math.min(...ia), Math.min(...ib));
  const hi = Math.min(Math.max(...ia), Math.max(...ib));
  if (hi - lo <= epsilon) return;
  return [lo, hi].map(t => ca[0].clone().addScaledVector(direction, t - ia[0]));
}

export function surfaceCrossings(a, b) {
  const segments = [];
  function visit(x, y) {
    if (!x.box.intersectsBox(y.box)) return;
    if (x.faces && y.faces) {
      for (const f of x.faces) for (const g of y.faces) {
        const segment = crossingSegment(f, g);
        if (segment) segments.push(segment);
      }
    } else if (!x.faces && (y.faces || x.box.getSize(new Vector3()).lengthSq() >= y.box.getSize(new Vector3()).lengthSq())) {
      visit(x.left, y);
      visit(x.right, y);
    } else {
      visit(x, y.left);
      visit(x, y.right);
    }
  }
  visit(a.tree, b.tree);
  return segments;
}
