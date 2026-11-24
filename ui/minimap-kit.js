// AG-414: Minimap & full-map cartographic bake, tactical bezel, smooth zoom,
// North-Up toggle, breadcrumb trail, distinct tactical icons, and underground
// Hollows warren sonar radar. Pure UI presentation — no game-state mutations.

export const MINIMAP_ZOOMS = Object.freeze([35, 50, 85]);
const PREFS_KEY = 'dw-minimap-prefs';

const THEME_FLOOR = Object.freeze({
  root:  { active: '#4e4739', dim: '#2b2720', wall: '#b8aa88', accent: '#7cffb0' },
  shale: { active: '#434b54', dim: '#252a30', wall: '#a8b8c8', accent: '#9ec8ff' },
  iron:  { active: '#534136', dim: '#2f251f', wall: '#cfa27e', accent: '#ffb45a' },
  wet:   { active: '#374c4c', dim: '#1f2c2d', wall: '#8ec2c2', accent: '#7fe0e0' },
  hill:  { active: '#4f4c43', dim: '#2d2b26', wall: '#c9c2ad', accent: '#ffd89a' },
});

const CARDINALS = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);

// Compass heading from camera yaw (facing = (sin yaw, cos yaw); North is +z, East is -x).
export function headingDisplay(yaw) {
  const safeYaw = Number.isFinite(yaw) ? yaw : 0;
  let deg = (-safeYaw * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  const rounded = Math.round(deg) % 360;
  const cardinal = CARDINALS[Math.round(deg / 45) % 8];
  const degrees = String(rounded).padStart(3, '0') + '°';
  return { cardinal, degrees, numeric: rounded, label: cardinal + ' ' + degrees };
}

// Project a world point onto minimap coordinates, clamping to the rim when beyond range.
export function projectMinimapBearing(target, { x, z, yaw = 0, center = 0, scale = 1, rim = Infinity }) {
  if (!target || ![target.x, target.z, x, z, yaw, center, scale, rim].every(Number.isFinite) || scale <= 0 || rim <= 0) {
    return null;
  }
  const dx = target.x - x;
  const dz = target.z - z;
  const sx = (-dx * Math.cos(yaw) + dz * Math.sin(yaw)) * scale;
  const sy = -(dx * Math.sin(yaw) + dz * Math.cos(yaw)) * scale;
  const distPx = Math.sqrt(sx * sx + sy * sy);
  const edge = distPx > rim;
  const ratio = edge ? rim / distPx : 1;
  return {
    x: center + sx * ratio,
    y: center + sy * ratio,
    edge,
    angle: Math.atan2(sy, sx),
    distance: Math.sqrt(dx * dx + dz * dz),
  };
}

export function createMinimapState({
  storage = (typeof localStorage !== 'undefined' ? localStorage : null),
  defaultZoomIndex = 1,
  maxTrail = 48,
  trailSpacing = 2.5,
  jumpReset = 25,
} = {}) {
  let zoomIdx = Math.max(0, Math.min(MINIMAP_ZOOMS.length - 1, defaultZoomIndex | 0));
  let northUp = false;

  if (storage && typeof storage.getItem === 'function') {
    try {
      const saved = JSON.parse(storage.getItem(PREFS_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (Number.isInteger(saved.zoomIdx) && saved.zoomIdx >= 0 && saved.zoomIdx < MINIMAP_ZOOMS.length) {
          zoomIdx = saved.zoomIdx;
        }
        if (typeof saved.northUp === 'boolean') northUp = saved.northUp;
      }
    } catch (_) {}
  }

  let currentRadius = MINIMAP_ZOOMS[zoomIdx];
  const trail = [];

  function persist() {
    if (!storage || typeof storage.setItem !== 'function') return;
    try {
      storage.setItem(PREFS_KEY, JSON.stringify({ zoomIdx, northUp }));
    } catch (_) {}
  }

  return {
    zoomIndex() { return zoomIdx; },
    targetRadius() { return MINIMAP_ZOOMS[zoomIdx]; },
    radius() { return currentRadius; },
    northUp() { return northUp; },
    setZoomIndex(i) {
      const next = Math.max(0, Math.min(MINIMAP_ZOOMS.length - 1, i | 0));
      if (next === zoomIdx) return zoomIdx;
      zoomIdx = next;
      persist();
      return zoomIdx;
    },
    zoomIn() { return this.setZoomIndex(zoomIdx - 1); },
    zoomOut() { return this.setZoomIndex(zoomIdx + 1); },
    cycleZoom() { return this.setZoomIndex((zoomIdx + 1) % MINIMAP_ZOOMS.length); },
    setNorthUp(on) {
      const next = !!on;
      if (next === northUp) return northUp;
      northUp = next;
      persist();
      return northUp;
    },
    toggleNorthUp() { return this.setNorthUp(!northUp); },
    isAnimating() { return Math.abs(currentRadius - MINIMAP_ZOOMS[zoomIdx]) > 0.05; },
    step(dt) {
      const target = MINIMAP_ZOOMS[zoomIdx];
      const diff = target - currentRadius;
      if (Math.abs(diff) <= 0.05) {
        currentRadius = target;
        return false;
      }
      const clampedDt = Math.min(Math.max(dt || 0, 0), 0.25);
      if (clampedDt <= 0) return false;
      currentRadius += diff * (1 - Math.exp(-clampedDt * 11));
      if (Math.abs(target - currentRadius) <= 0.05) currentRadius = target;
      return true;
    },
    pushTrail(x, z) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
      if (trail.length > 0) {
        const last = trail[trail.length - 1];
        const dx = x - last.x, dz = z - last.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > jumpReset * jumpReset) {
          trail.length = 0;
        } else if (d2 < trailSpacing * trailSpacing) {
          return false;
        }
      }
      trail.push({ x, z });
      if (trail.length > maxTrail) trail.shift();
      return true;
    },
    trail() { return trail; },
    resetTrail() { trail.length = 0; },
  };
}

// Single-pass topographic terrain bake: elevation palette, central-difference NW hillshade,
// 4 m / 16 m contour isolines, water bathymetry & shoreline banks, woodland canopy cover,
// and two-tone cartographic dirt roads/footpaths.
export function bakeTopographicMap(canvas, {
  mapR = 235,
  bakePx = 1024,
  sampleHeight,
  waterLevelAt,
  paths = [],
  trailHw = 1.6,
  trees = [],
} = {}) {
  const ctx = canvas.getContext('2d');
  const bakeScale = bakePx / (2 * mapR);
  const worldToBake = (x, z) => ({ x: (mapR - x) * bakeScale, y: (mapR - z) * bakeScale });
  const total = bakePx * bakePx;

  // 1. Single-pass height & water depth cache (1x sampleHeight per pixel vs 3x previously).
  const heights = new Float32Array(total);
  const depths = new Float32Array(total);
  depths.fill(-1);
  const padR2 = (mapR + 2) * (mapR + 2);
  const mapR2 = mapR * mapR;

  for (let py = 0; py < bakePx; py++) {
    const wz = mapR - (py + 0.5) / bakeScale;
    const wz2 = wz * wz;
    const row = py * bakePx;
    for (let px = 0; px < bakePx; px++) {
      const wx = mapR - (px + 0.5) / bakeScale;
      const d2 = wx * wx + wz2;
      if (d2 > padR2) continue;
      const idx = row + px;
      const h = sampleHeight(wx, wz);
      heights[idx] = h;
      const wl = waterLevelAt(wx, wz);
      if (wl !== null) depths[idx] = Math.max(0, wl - h);
    }
  }

  // 2. Shade pixels with hillshade, topographic contours, bathymetry, and shoreline banks.
  const img = ctx.createImageData(bakePx, bakePx);
  const d = img.data;
  const contourStep = 4;
  const indexStep = 16;

  for (let py = 0; py < bakePx; py++) {
    const wz = mapR - (py + 0.5) / bakeScale;
    const wz2 = wz * wz;
    const row = py * bakePx;
    const pyN = py > 0 ? py - 1 : py;
    const pyS = py + 1 < bakePx ? py + 1 : py;
    for (let px = 0; px < bakePx; px++) {
      const wx = mapR - (px + 0.5) / bakeScale;
      const d2 = wx * wx + wz2;
      const idx = row + px;
      const o = idx * 4;
      if (d2 > mapR2) { d[o + 3] = 0; continue; }

      const h = heights[idx];
      const depth = depths[idx];
      const pxW = px > 0 ? px - 1 : px;
      const pxE = px + 1 < bakePx ? px + 1 : px;

      if (depth >= 0) {
        // Bathymetric water depth ramp (shallow slate-teal -> deep cold navy)
        const dt = Math.min(1, depth / 4.2);
        let r = 50 - dt * 28;
        let g = 104 - dt * 52;
        let b = 136 - dt * 46;
        // Subtle shoreline highlight right where shallow water meets dry land
        const nearDry =
          depths[row + pxW] < 0 || depths[row + pxE] < 0 ||
          depths[pyN * bakePx + px] < 0 || depths[pyS * bakePx + px] < 0;
        if (nearDry) { r += 16; g += 22; b += 20; }
        d[o] = Math.min(255, r);
        d[o + 1] = Math.min(255, g);
        d[o + 2] = Math.min(255, b);
        d[o + 3] = 242;
        continue;
      }

      // Earthy military topographic elevation palette
      let r, g, b;
      if (h > 34) {
        const t = Math.min(1, (h - 34) / 36);
        r = 114 + t * 94;
        g = 116 + t * 96;
        b = 114 + t * 102;
      } else if (h > 18) {
        const t = (h - 18) / 16;
        r = 76 + t * 36;
        g = 112 + t * 2;
        b = 58 + t * 50;
      } else {
        const t = Math.max(0, Math.min(1, (h + 8) / 26));
        r = 50 + t * 26;
        g = 92 + t * 20;
        b = 46 + t * 12;
      }

      // Central-difference NW directional hillshade (light from upper-left on bake)
      const dhx = heights[row + pxE] - heights[row + pxW];
      const dhy = heights[pyS * bakePx + px] - heights[pyN * bakePx + px];
      const slopeShade = Math.max(0.74, Math.min(1.22, 1 - (dhx + dhy) * 0.14));

      // Topographic contour isolines (4 m minor, 16 m index)
      const band = Math.floor(h / contourStep);
      const bandE = depths[row + pxE] < 0 ? Math.floor(heights[row + pxE] / contourStep) : band;
      const bandS = depths[pyS * bakePx + px] < 0 ? Math.floor(heights[pyS * bakePx + px] / contourStep) : band;
      let contourMul = 1;
      if (band !== bandE || band !== bandS) {
        const major = Math.floor(h / indexStep);
        const majorE = depths[row + pxE] < 0 ? Math.floor(heights[row + pxE] / indexStep) : major;
        const majorS = depths[pyS * bakePx + px] < 0 ? Math.floor(heights[pyS * bakePx + px] / indexStep) : major;
        contourMul = (major !== majorE || major !== majorS) ? 0.78 : 0.89;
      }

      // Crisp dark wet-earth bank edge where dry ground touches water
      const nearWater =
        depths[row + pxW] >= 0 || depths[row + pxE] >= 0 ||
        depths[pyN * bakePx + px] >= 0 || depths[pyS * bakePx + px] >= 0;
      const bankMul = nearWater ? 0.72 : 1;

      const shade = slopeShade * contourMul * bankMul;
      d[o] = Math.max(0, Math.min(255, r * shade));
      d[o + 1] = Math.max(0, Math.min(255, g * shade));
      d[o + 2] = Math.max(0, Math.min(255, b * shade));
      d[o + 3] = 240;
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.arc(bakePx / 2, bakePx / 2, mapR * bakeScale, 0, Math.PI * 2);
  ctx.clip();

  // 3. Subtle woodland canopy texture from natural trees (clearings vs woods read immediately).
  if (trees && trees.length) {
    const canopyStyles = {
      pine: 'rgba(18, 42, 26, 0.25)',
      oak: 'rgba(26, 52, 22, 0.21)',
      birch: 'rgba(42, 68, 30, 0.18)',
      autumn: 'rgba(92, 54, 24, 0.22)',
    };
    const byKind = { pine: [], oak: [], birch: [], autumn: [] };
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.z)) continue;
      const bucket = byKind[t.kind] || byKind.oak;
      bucket.push(t);
    }
    for (const [kind, list] of Object.entries(byKind)) {
      if (!list.length) continue;
      ctx.fillStyle = canopyStyles[kind];
      ctx.beginPath();
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        const q = worldToBake(t.x, t.z);
        const cr = Math.max(1.8, (t.canopyRadius || 2.1) * 0.78 * bakeScale);
        ctx.moveTo(q.x + cr, q.y);
        ctx.arc(q.x, q.y, cr, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  // 4. Two-tone cartographic dirt roads & trails (dark shoulder casing + worn tan surface + center highlight).
  if (paths && paths.length) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const strokePaths = (widthAdd, widthMul, style) => {
      ctx.strokeStyle = style;
      for (const line of paths) {
        if (!line || line.length < 2) continue;
        const baseW = Math.max(3.6, (line.hw || trailHw) * 2.45) * bakeScale;
        ctx.lineWidth = Math.max(1.2, baseW * widthMul + widthAdd);
        ctx.beginPath();
        line.forEach((p, k) => {
          const q = worldToBake(p.x, p.z);
          if (k) ctx.lineTo(q.x, q.y);
          else ctx.moveTo(q.x, q.y);
        });
        ctx.stroke();
      }
    };
    strokePaths(2.6, 1.0, 'rgba(34, 30, 22, 0.62)');
    strokePaths(0, 1.0, 'rgb(164, 146, 112)');
    strokePaths(0, 0.36, 'rgba(206, 190, 154, 0.34)');
  }

  ctx.restore();
}

// Soft fading recent-footsteps breadcrumb trail on minimap / full map.
export function drawBreadcrumbTrail(ctx, trail, toMap, { scale = 1 } = {}) {
  if (!trail || trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  const dotR = Math.max(1.4, 1.8 * scale);
  const count = trail.length;
  for (let i = 0; i < count; i++) {
    const pt = trail[i];
    const p = toMap(pt.x, pt.z);
    if (!p) continue;
    const t = (i + 1) / count;
    const alpha = 0.06 + t * t * 0.38;
    ctx.fillStyle = `rgba(238, 226, 188, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR * (0.72 + t * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// AG-419: cache static minimap reticle (radial vignette + hairlines + dashed ring + range label)
// into an offscreen canvas in real browsers so drawMinimap doesn't rebuild RadialGradient + stroked text every frame.
const _reticleCache = new Map();
const _COMPASS_CARDINALS = Object.freeze([['N', 0, 1], ['E', -1, 0], ['S', 0, -1], ['W', 1, 0]]);

function renderMinimapReticle(ctx, C, radiusPx, worldRadius, scale) {
  const halfPx = radiusPx * 0.5;
  ctx.save();

  // Subtle dark inner glass vignette so rim letters and bearings stay sharp over bright terrain.
  const vig = ctx.createRadialGradient(C, C, radiusPx * 0.72, C, C, radiusPx);
  vig.addColorStop(0, 'rgba(4, 7, 10, 0)');
  vig.addColorStop(0.75, 'rgba(4, 7, 10, 0.16)');
  vig.addColorStop(1, 'rgba(4, 7, 10, 0.56)');
  ctx.fillStyle = vig;
  ctx.beginPath();
  ctx.arc(C, C, radiusPx, 0, Math.PI * 2);
  ctx.fill();

  // Ultra-faint cardinal reticle hairlines stopping cleanly outside center player arrow.
  ctx.strokeStyle = 'rgba(220, 232, 212, 0.085)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(C, C - radiusPx + 14); ctx.lineTo(C, C - 18);
  ctx.moveTo(C, C + 18); ctx.lineTo(C, C + radiusPx - 14);
  ctx.moveTo(C - radiusPx + 14, C); ctx.lineTo(C - 18, C);
  ctx.moveTo(C + 18, C); ctx.lineTo(C + radiusPx - 14, C);
  ctx.stroke();

  // Crisp dashed inner half-range ring.
  ctx.strokeStyle = 'rgba(225, 236, 215, 0.18)';
  ctx.lineWidth = 1.25 * scale;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(C, C, halfPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Subtle range scale label tucked neatly on the lower-right arc of the half-range ring.
  if (Number.isFinite(worldRadius) && worldRadius > 0) {
    const halfM = Math.round(worldRadius / 2);
    const lx = C + halfPx * 0.71;
    const ly = C + halfPx * 0.71;
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(6, 10, 8, 0.8)';
    ctx.fillStyle = 'rgba(218, 228, 206, 0.62)';
    const label = halfM + 'm';
    ctx.strokeText(label, lx, ly);
    ctx.fillText(label, lx, ly);
  }

  ctx.restore();
}

// Tactical range ring, hairline reticle, scale readout, and soft inner glass vignette.
export function drawMinimapReticle(ctx, { center, radiusPx, worldRadius, scale = 1 } = {}) {
  const C = center;
  if (typeof document !== 'undefined' && typeof ctx.drawImage === 'function') {
    const halfM = (Number.isFinite(worldRadius) && worldRadius > 0) ? Math.round(worldRadius / 2) : -1;
    const key = C + '|' + radiusPx + '|' + halfM + '|' + scale;
    let cached = _reticleCache.get(key);
    if (!cached) {
      if (_reticleCache.size >= 16) _reticleCache.clear();
      const dim = Math.ceil(C * 2);
      cached = document.createElement('canvas');
      cached.width = dim;
      cached.height = dim;
      const cctx = cached.getContext('2d');
      if (cctx) {
        renderMinimapReticle(cctx, C, radiusPx, worldRadius, scale);
        _reticleCache.set(key, cached);
      } else {
        renderMinimapReticle(ctx, C, radiusPx, worldRadius, scale);
        return;
      }
    }
    ctx.drawImage(cached, 0, 0);
    return;
  }
  renderMinimapReticle(ctx, C, radiusPx, worldRadius, scale);
}

// Graduated 360-degree tactical compass bezel, North caret notch, and cardinal labels.
export function drawCompassDial(ctx, { center, radiusPx, mapYaw = 0 } = {}) {
  const C = center;
  const R = radiusPx;
  const cy = Math.cos(mapYaw);
  const sy = Math.sin(mapYaw);
  const rimAngle = (wx, wz) => Math.atan2(-(wx * sy + wz * cy), -wx * cy + wz * sy);

  ctx.save();

  // Machined dark outer bezel + subtle tactical olive-brass inner edge.
  ctx.strokeStyle = 'rgba(8, 12, 8, 0.92)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(154, 168, 128, 0.36)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(C, C, R - 2, 0, Math.PI * 2);
  ctx.stroke();

  // Graduated degree ticks (every 15 deg; longer ticks every 45 deg), batched into 2 stroke() calls.
  const northAng = rimAngle(0, 1);
  const outer = R - 2.5;
  const stepA = Math.PI / 12;
  ctx.strokeStyle = 'rgba(224, 232, 210, 0.42)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 3; i < 24; i += 3) {
    const a = northAng + i * stepA;
    const ca = Math.cos(a), sa = Math.sin(a);
    const inner = outer - (i % 6 === 0 ? 6 : 6.5);
    ctx.moveTo(C + ca * inner, C + sa * inner);
    ctx.lineTo(C + ca * outer, C + sa * outer);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(200, 212, 190, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const minorInner = outer - 3.5;
  for (let i = 1; i < 24; i++) {
    if (i % 3 === 0) continue;
    const a = northAng + i * stepA;
    const ca = Math.cos(a), sa = Math.sin(a);
    ctx.moveTo(C + ca * minorInner, C + sa * minorInner);
    ctx.lineTo(C + ca * outer, C + sa * outer);
  }
  ctx.stroke();

  // Distinct amber North caret notch on the bezel (keeps crisp separation from the N label).
  ctx.save();
  ctx.translate(C + Math.cos(northAng) * (R - 2), C + Math.sin(northAng) * (R - 2));
  ctx.rotate(northAng);
  ctx.beginPath();
  ctx.moveTo(-5.5, 0);
  ctx.lineTo(1, -3.6);
  ctx.lineTo(1, 3.6);
  ctx.closePath();
  ctx.fillStyle = '#ffd24a';
  ctx.fill();
  ctx.restore();

  // Cardinal compass letters riding cleanly inside the graduated rim.
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(6, 9, 8, 0.88)';
  const inset = R - 18.5;
  for (let i = 0; i < 4; i++) {
    const card = _COMPASS_CARDINALS[i];
    const label = card[0];
    const a = rimAngle(card[1], card[2]);
    const x = C + Math.cos(a) * inset;
    const y = C + Math.sin(a) * inset;
    ctx.strokeText(label, x, y);
    ctx.fillStyle = label === 'N' ? '#ffd24a' : 'rgba(236, 240, 228, 0.88)';
    ctx.fillText(label, x, y);
  }

  ctx.restore();
}

// HQ (FOB Threshold): crisp green gabled-roof cabin icon in-range, or green home chevron on rim.
export function drawHqMarker(ctx, pos, toMap, projection, { scale = 1 } = {}) {
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return;
  const p = toMap(pos.x, pos.z);
  ctx.save();
  if (p) {
    const s = 5.5 * scale;
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.15);
    ctx.lineTo(s * 1.15, -s * 0.1);
    ctx.lineTo(s * 0.82, -s * 0.1);
    ctx.lineTo(s * 0.82, s * 0.95);
    ctx.lineTo(-s * 0.82, s * 0.95);
    ctx.lineTo(-s * 0.82, -s * 0.1);
    ctx.lineTo(-s * 1.15, -s * 0.1);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6 * scale;
    ctx.strokeStyle = 'rgba(8, 14, 10, 0.9)';
    ctx.stroke();
    ctx.fillStyle = '#7cdea0';
    ctx.fill();
  } else if (projection) {
    const b = projectMinimapBearing(pos, projection);
    if (b) {
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      const s = 5.5 * scale;
      ctx.beginPath();
      ctx.moveTo(s * 1.1, 0);
      ctx.lineTo(-s * 0.7, -s * 0.85);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.7, s * 0.85);
      ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2 * scale;
      ctx.strokeStyle = 'rgba(8, 14, 10, 0.9)';
      ctx.stroke();
      ctx.fillStyle = '#7cdea0';
      ctx.fill();
    }
  }
  ctx.restore();
}

// Supply Terminal (KIOSK): distinct amber terminal plate with dark inset pip.
export function drawKioskMarker(ctx, pos, toMap, { scale = 1 } = {}) {
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return;
  const p = toMap(pos.x, pos.z);
  if (!p) return;
  const h = 4.2 * scale;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(8, 12, 8, 0.88)';
  ctx.fillRect(-h - 1.3 * scale, -h - 1.3 * scale, (h + 1.3 * scale) * 2, (h + 1.3 * scale) * 2);
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(-h, -h, h * 2, h * 2);
  ctx.fillStyle = '#182016';
  ctx.fillRect(-h * 0.42, -h * 0.42, h * 0.84, h * 0.84);
  ctx.restore();
}

// Supply Drop: pulsing amber radar ripple + crate icon in-range, or golden rim arrow beyond range.
export function drawSupplyDropMarker(ctx, drop, toMap, projection, { scale = 1, timeMs = 0 } = {}) {
  if (!drop || drop.state === 'gone' || !Number.isFinite(drop.x) || !Number.isFinite(drop.z)) return;
  const p = toMap(drop.x, drop.z);
  const phase = ((timeMs % 1400) + 1400) % 1400 / 1400;
  const flash = 0.5 + 0.5 * Math.sin(timeMs * 0.008);
  const col = flash > 0.5 ? '#ffe375' : '#ffb536';
  ctx.save();
  if (p) {
    ctx.translate(p.x, p.y);
    // Soft expanding amber beacon pulse
    const ringR = (5 + phase * 11) * scale;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 214, 92, ${((1 - phase) * 0.65).toFixed(3)})`;
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();
    // Crisp rotated supply crate
    const s = 4.6 * scale;
    ctx.fillStyle = 'rgba(10, 12, 8, 0.85)';
    ctx.fillRect(-s - 1.2 * scale, -s - 1.2 * scale, (s + 1.2 * scale) * 2, (s + 1.2 * scale) * 2);
    ctx.fillStyle = col;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.strokeStyle = 'rgba(20, 16, 8, 0.85)';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, 0); ctx.lineTo(s * 0.7, 0);
    ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, s * 0.7);
    ctx.stroke();
  } else if (projection) {
    const b = projectMinimapBearing(drop, projection);
    if (b) {
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      const s = 5.5 * scale;
      ctx.beginPath();
      ctx.moveTo(s * 1.15, 0);
      ctx.lineTo(-s * 0.65, -s * 0.8);
      ctx.lineTo(-s * 0.65, s * 0.8);
      ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2 * scale;
      ctx.strokeStyle = 'rgba(10, 12, 8, 0.9)';
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fill();
    }
  }
  ctx.restore();
}

// High-clarity enemy threat blip with smooth continuous glow and brute/boss tier rings.
export function drawEnemyBlip(ctx, p, typeKey, { scale = 1, pulse = 0.5 } = {}) {
  const isBoss = typeKey === 'colossus' || typeKey === 'guardian';
  const isHeavy = typeKey === 'brute' || typeKey === 'demon';
  const big = isBoss ? 1.65 : (isHeavy ? 1.22 : 1);
  const r = 2.5 * big * scale;
  const core = `rgb(255, ${Math.round(36 + pulse * 48)}, ${Math.round(32 + pulse * 36)})`;
  const glow = `rgba(255, 38, 34, ${(0.14 + pulse * 0.28).toFixed(3)})`;

  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * (1.55 + pulse * 0.85), 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  if (isBoss) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * (1.75 + pulse * 0.45), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 110, 92, ${(0.55 + pulse * 0.4).toFixed(3)})`;
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();
  } else if (isHeavy) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 2.1 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 130, 108, 0.75)';
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(p.x, p.y, r + 1.2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
  ctx.restore();
}

// High-contrast tactical player chevron with soft drop halo and subtle amber tail pip.
export function drawPlayerArrow(ctx, p, rot, scale = 1) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Soft dark drop halo so the arrow reads cleanly over snow, trails, or fog.
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(4, 8, 10, 0.34)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -9.5);
  ctx.lineTo(6.4, 6.4);
  ctx.lineTo(0, 2.8);
  ctx.lineTo(-6.4, 6.4);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = 'rgba(6, 10, 8, 0.92)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Tiny Branch amber tail accent for instant orientation clarity.
  ctx.beginPath();
  ctx.moveTo(0, -1.5);
  ctx.lineTo(2.4, 3.6);
  ctx.lineTo(0, 2.0);
  ctx.lineTo(-2.4, 3.6);
  ctx.closePath();
  ctx.fillStyle = '#ffd24a';
  ctx.fill();

  ctx.restore();
}

// Subterranean Hollows / Warren sonar minimap mode when underground (hollow.below() === true).
// Renders explored warren chambers, corridors, walls, ramps, bolt-holes, nests, loot, and exit beacons cleanly in
// the warren's world coordinates instead of showing the surface forest map.
export function drawHollowMinimap(ctx, {
  warren,
  state,
  px,
  pz,
  mapYaw = 0,
  center = 164,
  scale = 3.2,
  radiusPx = 162,
  rim = 148,
  timeMs = 0,
  nests = null,
  claimed = null,
  stirPhase = 'calm',
} = {}) {
  const C = center;
  const palette = THEME_FLOOR[warren?.theme] || THEME_FLOOR.shale;
  const cellSize = warren?.cell || 7.5;
  const ox = warren?.nav?.ox || 0;
  const oz = warren?.nav?.oz || 0;
  const currentDepth = state?.depth || 1;
  const warnPulse = stirPhase === 'warning' || stirPhase === 'grab';

  const explored = new Set(state?.explored || []);
  const cy = Math.cos(mapYaw);
  const sy = Math.sin(mapYaw);
  const toScreen = (wx, wz) => {
    const dx = wx - px;
    const dz = wz - pz;
    const lx = -dx * cy + dz * sy;
    const ly = dx * sy + dz * cy;
    return { x: C + lx * scale, y: C - ly * scale };
  };
  const isExploredWorld = (wx, wz, ci = null, cj = null) => {
    const edx = wx - px, edz = wz - pz;
    if (edx * edx + edz * edz <= 400) return true;
    const gi = ci != null ? ci : Math.floor((wx - ox) / cellSize);
    const gj = cj != null ? cj : Math.floor((wz - oz) / cellSize);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (explored.has((gi + di) + ',' + (gj + dj))) return true;
      }
    }
    const ei = Math.floor((wx - ox) / 6);
    const ej = Math.floor((wz - oz) / 6);
    if (explored.has(ei + ',' + ej)) return true;
    return false;
  };

  ctx.save();
  ctx.fillStyle = '#080c0f';
  ctx.fillRect(0, 0, C * 2, C * 2);

  // Subtle concentric sonar pulses (turns amber-red during Stir warning!)
  const sonarPhase = ((timeMs % 2800) + 2800) % 2800 / 2800;
  ctx.strokeStyle = warnPulse
    ? `rgba(255, 118, 78, ${((1 - sonarPhase) * 0.28).toFixed(3)})`
    : `rgba(148, 200, 180, ${((1 - sonarPhase) * 0.16).toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(C, C, sonarPhase * radiusPx, 0, Math.PI * 2);
  ctx.stroke();

  if (warren && Array.isArray(warren.cells)) {
    for (let pass = 0; pass < 2; pass++) {
      const wantCurrent = pass === 1;
      for (const c of warren.cells) {
        const matchDepth = c.depth === currentDepth || (currentDepth === 1 && c.depth === 0);
        if (matchDepth !== wantCurrent) continue;
        const x0 = ox + c.i * cellSize;
        const z0 = oz + c.j * cellSize;
        const cx = x0 + cellSize * 0.5;
        const cz = z0 + cellSize * 0.5;
        if (!isExploredWorld(cx, cz, c.i, c.j)) continue;

        const p00 = toScreen(x0, z0);
        const p10 = toScreen(x0 + cellSize, z0);
        const p11 = toScreen(x0 + cellSize, z0 + cellSize);
        const p01 = toScreen(x0, z0 + cellSize);

        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fillStyle = wantCurrent ? palette.active : palette.dim;
        ctx.globalAlpha = wantCurrent ? (c.kind === 'deep' || c.kind === 'chamber' ? 0.96 : c.kind === 'ramp' ? 0.84 : 0.88) : 0.42;
        ctx.fill();

        // Crisp stone walls on closed sides: DIRS = [n(-z), e(+x), s(+z), w(-x)]
        ctx.globalAlpha = wantCurrent ? 0.94 : 0.36;
        ctx.strokeStyle = palette.wall;
        ctx.lineWidth = wantCurrent ? 2.2 : 1.2;
        const edges = [
          [p00, p10], // side 0: -z
          [p10, p11], // side 1: +x
          [p11, p01], // side 2: +z
          [p01, p00], // side 3: -x
        ];
        ctx.beginPath();
        for (let s = 0; s < 4; s++) {
          if (c.open && c.open[s]) continue;
          ctx.moveTo(edges[s][0].x, edges[s][0].y);
          ctx.lineTo(edges[s][1].x, edges[s][1].y);
        }
        ctx.stroke();

        // Mark ramps with subtle depth-transition dot/arrow
        if (wantCurrent && c.kind === 'ramp') {
          const pc = toScreen(cx, cz);
          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = 0.82;
          ctx.beginPath();
          ctx.arc(pc.x, pc.y, 2.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  const pulse = 0.5 + 0.5 * Math.sin(timeMs * 0.009);
  const proj = { x: px, z: pz, yaw: mapYaw, center: C, scale, rim };

  // Bolt-holes: cyan daylight dots once discovered (and pulsing rim beacon during Stir warning!)
  const bolts = warren?.exits?.boltHoles || [];
  let nearestBolt = null, nearestBoltD2 = Infinity;
  const rim4Sq = (rim + 4) * (rim + 4), rimSq = rim * rim;
  for (const bh of bolts) {
    if (!bh || !Number.isFinite(bh.x)) continue;
    const bdx = bh.x - px, bdz = bh.z - pz, d2 = bdx * bdx + bdz * bdz;
    if (d2 < nearestBoltD2) { nearestBoltD2 = d2; nearestBolt = bh; }
    if (!warnPulse && !isExploredWorld(bh.x, bh.z)) continue;
    const sp = toScreen(bh.x, bh.z);
    const sdx = sp.x - C, sdy = sp.y - C;
    if (sdx * sdx + sdy * sdy <= rim4Sq) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, warnPulse ? 4.8 + pulse * 2.2 : 4.0, 0, Math.PI * 2);
      ctx.fillStyle = warnPulse ? '#8cf6ff' : '#6ed6e8';
      ctx.strokeStyle = '#071418';
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  if (warnPulse && nearestBolt) {
    const bb = projectMinimapBearing(nearestBolt, proj);
    if (bb && bb.edge) {
      ctx.save();
      ctx.translate(bb.x, bb.y);
      ctx.rotate(bb.angle);
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(-5, -5.5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5.5);
      ctx.closePath();
      ctx.fillStyle = '#8cf6ff';
      ctx.strokeStyle = '#071418';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }

  // Active brood nests: pulsing crimson rings once discovered
  if (Array.isArray(nests)) {
    for (const n of nests) {
      if (!n || !n.alive || !isExploredWorld(n.x, n.z)) continue;
      const sp = toScreen(n.x, n.z);
      const sdx = sp.x - C, sdy = sp.y - C;
      if (sdx * sdx + sdy * sdy > rimSq) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4.4 + pulse * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232, 68, 56, 0.88)';
      ctx.strokeStyle = '#1a0605';
      ctx.lineWidth = 1.6;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Unclaimed loot markers once discovered: strongbox (gold square), crates (amber diamond), tags (pale star)
  const pts = warren?.points;
  if (pts) {
    if (pts.strongbox && (!claimed || !claimed.box) && isExploredWorld(pts.strongbox.x, pts.strongbox.z)) {
      const sp = toScreen(pts.strongbox.x, pts.strongbox.z);
      const sdx = sp.x - C, sdy = sp.y - C;
      if (sdx * sdx + sdy * sdy <= rimSq) {
        ctx.save();
        ctx.fillStyle = '#ffd862';
        ctx.strokeStyle = '#181204';
        ctx.lineWidth = 1.6;
        ctx.fillRect(sp.x - 4.5, sp.y - 4.5, 9, 9);
        ctx.strokeRect(sp.x - 4.5, sp.y - 4.5, 9, 9);
        ctx.restore();
      }
    }
    if (Array.isArray(pts.crates)) {
      for (let i = 0; i < pts.crates.length; i++) {
        if (claimed && claimed.crates && claimed.crates.has(i)) continue;
        const cr = pts.crates[i];
        if (!cr || !isExploredWorld(cr.x, cr.z)) continue;
        const sp = toScreen(cr.x, cr.z);
        const sdx = sp.x - C, sdy = sp.y - C;
        if (sdx * sdx + sdy * sdy > rimSq) continue;
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#f2b84b';
        ctx.strokeStyle = '#181204';
        ctx.lineWidth = 1.4;
        ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
        ctx.strokeRect(-3.2, -3.2, 6.4, 6.4);
        ctx.restore();
      }
    }
    if (Array.isArray(pts.tags)) {
      for (let i = 0; i < pts.tags.length; i++) {
        const tg = pts.tags[i];
        if (!tg || (claimed && claimed.tags && claimed.tags.has(i)) || !isExploredWorld(tg.x, tg.z)) continue;
        const sp = toScreen(tg.x, tg.z);
        const sdx = sp.x - C, sdy = sp.y - C;
        if (sdx * sdx + sdy * sdy > rimSq) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 3.0, 0, Math.PI * 2);
        ctx.fillStyle = '#f2ead2';
        ctx.strokeStyle = '#14120c';
        ctx.lineWidth = 1.3;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Open Deep passage (bright green diamond once cleared) & Rune door (cyan accent bar)
  const rune = warren?.doors?.rune;
  if (rune && Number.isFinite(rune.x) && isExploredWorld(rune.x, rune.z)) {
    const sp = toScreen(rune.x, rune.z);
    const sdx = sp.x - C, sdy = sp.y - C;
    if (sdx * sdx + sdy * sdy <= rimSq) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4.0, 0, Math.PI * 2);
      ctx.fillStyle = '#62e8ff';
      ctx.strokeStyle = '#06151c';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  const deepExit = warren?.exits?.deep;
  if (state?.cleared && deepExit && Number.isFinite(deepExit.x)) {
    const sp = toScreen(deepExit.x, deepExit.z);
    const sdx = sp.x - C, sdy = sp.y - C;
    if (sdx * sdx + sdy * sdy <= rimSq) {
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#70f29e';
      ctx.strokeStyle = '#06180c';
      ctx.lineWidth = 1.8;
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.strokeRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    }
  }

  // Exit beacon (mouth back to surface) in safe green + rim bearing when out of view.
  const mouth = warren?.exits?.mouth;
  if (mouth && Number.isFinite(mouth.x) && Number.isFinite(mouth.z)) {
    const b = projectMinimapBearing(mouth, proj);
    if (b) {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.edge) {
        ctx.rotate(b.angle);
        ctx.beginPath();
        ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fillStyle = '#7cdea0';
        ctx.strokeStyle = '#08120c';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#7cdea0';
        ctx.strokeStyle = '#08120c';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

// Full-screen subterranean warren map when pressing Tab underground (replaces topside forest map!).
export function drawHollowFullMap(ctx, {
  width = 760,
  height = 760,
  warren,
  state,
  px = 0,
  pz = 0,
  yaw = 0,
  timeMs = 0,
  nests = null,
  claimed = null,
  stirPhase = 'calm',
  legend = '',
  sub = '',
} = {}) {
  const palette = THEME_FLOOR[warren?.theme] || THEME_FLOOR.shale;
  const cellSize = warren?.cell || 7.5;
  const ox = warren?.nav?.ox || 0;
  const oz = warren?.nav?.oz || 0;
  const currentDepth = state?.depth || 1;
  const explored = new Set(state?.explored || []);
  const cells = Array.isArray(warren?.cells) ? warren.cells : [];

  ctx.save();
  ctx.fillStyle = '#070b0e';
  ctx.fillRect(0, 0, width, height);

  // Subtle tactical grid lines
  ctx.strokeStyle = 'rgba(130, 170, 165, 0.06)';
  ctx.lineWidth = 1;
  for (let gx = 40; gx < width; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
  }
  for (let gy = 40; gy < height; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
  }

  const isExploredWorld = (wx, wz, ci = null, cj = null) => {
    const edx = wx - px, edz = wz - pz;
    if (edx * edx + edz * edz <= 484) return true;
    const gi = ci != null ? ci : Math.floor((wx - ox) / cellSize);
    const gj = cj != null ? cj : Math.floor((wz - oz) / cellSize);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (explored.has((gi + di) + ',' + (gj + dj))) return true;
      }
    }
    return false;
  };

  if (cells.length) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const c of cells) {
      const x0 = ox + c.i * cellSize, z0 = oz + c.j * cellSize;
      if (x0 < minX) minX = x0;
      if (x0 + cellSize > maxX) maxX = x0 + cellSize;
      if (z0 < minZ) minZ = z0;
      if (z0 + cellSize > maxZ) maxZ = z0 + cellSize;
    }
    const spanX = Math.max(cellSize * 2, maxX - minX);
    const spanZ = Math.max(cellSize * 2, maxZ - minZ);
    const padX = 68, padTop = 74, padBot = 62;
    const sc = Math.min((width - padX * 2) / spanX, (height - padTop - padBot) / spanZ);
    const midX = (minX + maxX) * 0.5, midZ = (minZ + maxZ) * 0.5;
    // Grave Shift compass orientation: North (+z) is UP, East (-x) is RIGHT (matches topside map!)
    const toMap = (wx, wz) => ({
      x: width * 0.5 - (wx - midX) * sc,
      y: padTop + (height - padTop - padBot) * 0.5 - (wz - midZ) * sc,
    });

    for (let pass = 0; pass < 2; pass++) {
      const wantCurrent = pass === 1;
      for (const c of cells) {
        const matchDepth = c.depth === currentDepth || (currentDepth === 1 && c.depth === 0);
        if (matchDepth !== wantCurrent) continue;
        const x0 = ox + c.i * cellSize, z0 = oz + c.j * cellSize;
        const cx = x0 + cellSize * 0.5, cz = z0 + cellSize * 0.5;
        if (!isExploredWorld(cx, cz, c.i, c.j)) continue;

        const p00 = toMap(x0, z0);
        const p10 = toMap(x0 + cellSize, z0);
        const p11 = toMap(x0 + cellSize, z0 + cellSize);
        const p01 = toMap(x0, z0 + cellSize);

        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y); ctx.lineTo(p11.x, p11.y); ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fillStyle = wantCurrent ? palette.active : palette.dim;
        ctx.globalAlpha = wantCurrent ? (c.kind === 'deep' || c.kind === 'chamber' ? 0.96 : 0.84) : 0.44;
        ctx.fill();

        ctx.globalAlpha = wantCurrent ? 0.95 : 0.40;
        ctx.strokeStyle = palette.wall;
        ctx.lineWidth = wantCurrent ? 2.6 : 1.4;
        const edges = [[p00, p10], [p10, p11], [p11, p01], [p01, p00]];
        ctx.beginPath();
        for (let s = 0; s < 4; s++) {
          if (c.open && c.open[s]) continue;
          ctx.moveTo(edges[s][0].x, edges[s][0].y);
          ctx.lineTo(edges[s][1].x, edges[s][1].y);
        }
        ctx.stroke();

        if (c.kind === 'ramp') {
          const pc = toMap(cx, cz);
          ctx.globalAlpha = wantCurrent ? 0.9 : 0.5;
          ctx.fillStyle = palette.accent;
          ctx.beginPath();
          ctx.arc(pc.x, pc.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    const pulse = 0.5 + 0.5 * Math.sin(timeMs * 0.008);
    const warnPulse = stirPhase === 'warning' || stirPhase === 'grab';

    // Mouth exit
    const mouth = warren?.exits?.mouth;
    if (mouth && Number.isFinite(mouth.x)) {
      const sp = toMap(mouth.x, mouth.z);
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7cdea0'; ctx.strokeStyle = '#07140b'; ctx.lineWidth = 2.4;
      ctx.fill(); ctx.stroke();
    }

    // Bolt-holes
    for (const bh of warren?.exits?.boltHoles || []) {
      if (!bh || (!warnPulse && !isExploredWorld(bh.x, bh.z))) continue;
      const sp = toMap(bh.x, bh.z);
      ctx.beginPath(); ctx.arc(sp.x, sp.y, warnPulse ? 6.5 + pulse * 2.5 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7cf0ff'; ctx.strokeStyle = '#06151a'; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
    }

    // Active nests
    if (Array.isArray(nests)) {
      for (const n of nests) {
        if (!n || !n.alive || !isExploredWorld(n.x, n.z)) continue;
        const sp = toMap(n.x, n.z);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 6.2 + pulse * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#e8483c'; ctx.strokeStyle = '#1c0504'; ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
      }
    }

    // Loot markers
    const pts = warren?.points;
    if (pts) {
      if (pts.strongbox && (!claimed || !claimed.box) && isExploredWorld(pts.strongbox.x, pts.strongbox.z)) {
        const sp = toMap(pts.strongbox.x, pts.strongbox.z);
        ctx.fillStyle = '#ffd862'; ctx.strokeStyle = '#181204'; ctx.lineWidth = 2;
        ctx.fillRect(sp.x - 6, sp.y - 6, 12, 12);
        ctx.strokeRect(sp.x - 6, sp.y - 6, 12, 12);
      }
      for (let i = 0; i < (pts.crates?.length || 0); i++) {
        if (claimed && claimed.crates && claimed.crates.has(i)) continue;
        const cr = pts.crates[i];
        if (!cr || !isExploredWorld(cr.x, cr.z)) continue;
        const sp = toMap(cr.x, cr.z);
        ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#f2b84b'; ctx.strokeStyle = '#181204'; ctx.lineWidth = 1.8;
        ctx.fillRect(-4.5, -4.5, 9, 9); ctx.strokeRect(-4.5, -4.5, 9, 9);
        ctx.restore();
      }
      for (let i = 0; i < (pts.tags?.length || 0); i++) {
        if (claimed && claimed.tags && claimed.tags.has(i)) continue;
        const tg = pts.tags[i];
        if (!tg || !isExploredWorld(tg.x, tg.z)) continue;
        const sp = toMap(tg.x, tg.z);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = '#f2ead2'; ctx.strokeStyle = '#14120c'; ctx.lineWidth = 1.6;
        ctx.fill(); ctx.stroke();
      }
    }

    // Rune door & Deep passage
    const rune = warren?.doors?.rune;
    if (rune && Number.isFinite(rune.x) && isExploredWorld(rune.x, rune.z)) {
      const sp = toMap(rune.x, rune.z);
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#62e8ff'; ctx.strokeStyle = '#06151c'; ctx.lineWidth = 1.8;
      ctx.fill(); ctx.stroke();
    }
    const deepExit = warren?.exits?.deep;
    if (state?.cleared && deepExit && Number.isFinite(deepExit.x)) {
      const sp = toMap(deepExit.x, deepExit.z);
      ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#70f29e'; ctx.strokeStyle = '#06180c'; ctx.lineWidth = 2;
      ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }

    // Player arrow
    const pp = toMap(px, pz);
    drawPlayerArrow(ctx, pp, -yaw, 1.15);
  }

  // Header & legend text (passed from strings.js by caller)
  if (legend) {
    ctx.font = '700 14px monospace';
    ctx.fillStyle = '#e8d7a4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(legend, width * 0.5, 18);
  }
  if (sub) {
    ctx.font = '600 11px monospace';
    ctx.fillStyle = '#9bb2ae';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(sub, width * 0.5, height - 16);
  }

  ctx.restore();
}
