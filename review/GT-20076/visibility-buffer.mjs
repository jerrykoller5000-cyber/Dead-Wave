// Projection is homogeneous (x, y, positive depth). Keep the clip before
// dividing by depth; some of the first-person surfaces straddle the lens.
function lerp(a, b, t) { return a.map((v, i) => v + t * (b[i] - v)); }
const planes = [p => p[2] - 0.001, p => p[2]+p[0], p => p[2]-p[0], p => p[2]+p[1], p => p[2]-p[1]];

function clipPolygon(polygon) {
  for (const plane of planes) {
    const input = polygon;
    polygon = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i+1) % input.length];
      const da = plane(a), db = plane(b);
      if (da >= 0) polygon.push(a);
      if ((da < 0) !== (db < 0)) polygon.push(lerp(a, b, da/(da-db)));
    }
    if (!polygon.length) break;
  }
  return polygon;
}

function clipLine(a, b) {
  let lo = 0, hi = 1;
  for (const plane of planes) {
    const da = plane(a), db = plane(b);
    if (da < 0 && db < 0) return;
    if (da < 0) lo = Math.max(lo, da/(da-db));
    if (db < 0) hi = Math.min(hi, da/(da-db));
    if (lo > hi) return;
  }
  return [lerp(a,b,lo),lerp(a,b,hi)];
}

export function visibilityBuffer(parts, project, width, height) {
  const labels = new Int32Array(width*height).fill(-1);
  const depths = new Float64Array(width*height);
  function screen([x,y,w]) { return [(1+x/w)*width/2,(1-y/w)*height/2,1/w]; }
  function raster(a,b,c,id) {
    const ax = a[0], ay = a[1], bx = b[0]-ax, by = b[1]-ay, cx = c[0]-ax, cy = c[1]-ay;
    const area = bx*cy-by*cx;
    if (Math.abs(area) < 1e-12) return;
    const x0 = Math.max(0,Math.ceil(Math.min(ax,b[0],c[0])-0.5));
    const x1 = Math.min(width-1,Math.floor(Math.max(ax,b[0],c[0])-0.5));
    const y0 = Math.max(0,Math.ceil(Math.min(ay,b[1],c[1])-0.5));
    const y1 = Math.min(height-1,Math.floor(Math.max(ay,b[1],c[1])-0.5));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px=x+.5-ax, py=y+.5-ay;
      const u=(px*cy-py*cx)/area, v=(bx*py-by*px)/area;
      if (u < 0 || v < 0 || u+v > 1) continue;
      const depth=a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]), at=y*width+x;
      if (depth > depths[at]) { depths[at]=depth; labels[at]=id; }
    }
  }
  for (const [id,part] of parts.entries()) {
    const shared = new Map(part.vertices.map(p => [p,project(p)]));
    for (const face of part.faces) {
      const polygon = clipPolygon(face.p.map(p => shared.get(p))).map(screen);
      for (let i=2; i<polygon.length; i++) raster(polygon[0],polygon[i-1],polygon[i],id);
    }
  }

  function witnessed(segments, ia, ib, mask, displayedDepth) {
    const pixels=new Set();
    for (const [a,b] of segments) {
      const clipped=clipLine(project(a),project(b));
      if (!clipped) continue;
      const [left,right]=clipped.map(screen);
      const steps=Math.max(1,Math.ceil(Math.hypot(left[0]-right[0],left[1]-right[1])));
      for (let i=0;i<=steps;i++) {
        const [px,py,d]=lerp(left,right,i/steps), x=Math.floor(px), y=Math.floor(py);
        if (x<0 || y<0 || x>=width || y>=height || !mask[y*width+x]) continue;
        let sawA=false, sawB=false;
        // At a resolved crossing, each surface must win a nearby pixel. The
        // depth test discards a projected line behind a nearer similar part.
        for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
          const nx=x+dx, ny=y+dy;
          if (nx<0 || nx>=width || ny<0 || ny>=height) continue;
          const at=ny*width+nx;
          if (!mask[at] || Math.abs(depths[at]-d) > d*.012) continue;
          if (displayedDepth && Math.abs(depths[at]-displayedDepth[at]) > depths[at]*.00035) continue;
          sawA ||= labels[at]===ia; sawB ||= labels[at]===ib;
        }
        if (sawA && sawB) pixels.add(y*width+x);
      }
    }
    return [...pixels];
  }
  return {labels,depths,witnessed};
}
