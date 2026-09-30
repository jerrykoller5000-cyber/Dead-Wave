import { text, hasText, STRINGS } from './strings.js';
import { COUNTER } from '../game/weaknesses.js';

const CAVE_KEYS = Object.keys(STRINGS).filter(key => key.startsWith('world.cave.'));

// Read only the director's named night. The warning and advice travel together
// so the HQ board cannot announce a special night with stale generic tactics.
export function scoutingSpecialNight(night) {
  if (night?.mod === 'fog') return { warning: text('scouting.warning.fog'), line: text('scouting.trick.fogNight') };
  if (night?.trick === 'siege') return { warning: text('scouting.warning.siege'), line: text('scouting.trick.siege') };
  return null;
}

// Read only the director's current prep snapshot; never generate or reroll a plan.
export function scoutingCaveIndices({ preview, day, phase, alarmActive = false } = {}) {
  if (phase !== 'prep' || alarmActive || !Number.isSafeInteger(day) || day < 1 ||
      preview?.day !== day || !preview.night || !Array.isArray(preview.caveIndices)) return [];
  return [...new Set(preview.caveIndices.filter(i => Number.isSafeInteger(i) && i >= 0))];
}

export function buildScoutingReport(data = {}) {
  const { preview, day, phase, alarmActive = false } = data;
  const night = preview?.night;
  if (phase !== 'prep' || alarmActive || !Number.isSafeInteger(day) || day < 1 || preview?.day !== day ||
      !night || !Array.isArray(night.pushes) || !night.pushes.length ||
      night.pushes.some(n => !Number.isSafeInteger(n) || n <= 0) ||
      night.pushes.reduce((a,b) => a+b,0) !== preview.total || !Array.isArray(preview.byTypeAndCave)) return null;
  const names = scoutingCaveIndices(data).map(index => {
    const row = preview.byTypeAndCave.find(row => row.caveIndex === index);
    const key = CAVE_KEYS.find(key => STRINGS[key] === row?.caveName);
    return text(key || 'wavePreview.unknownSource');
  });
  const trickId = typeof night.trick === 'string' ? night.trick.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) : '';
  const trickKey = `scouting.trick.${trickId}`;
  const special = scoutingSpecialNight(night);
  // The plan is already frozen by the director. Show which kinds to prepare
  // for, but leave their exact counts and source groups to Field Intel.
  const planned = new Map();
  for (const row of preview.byTypeAndCave) {
    if (Object.hasOwn(COUNTER, row?.typeKey) && Number.isSafeInteger(row.count) && row.count > 0) {
      planned.set(row.typeKey, (planned.get(row.typeKey) || 0) + row.count);
    }
  }
  const counters = [...planned].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([kind]) => ({
    kind, name: text(`enemy.${kind}.name`), line: text(`counter.${kind}`)
  }));
  return {
    title: text('scouting.title', { day }),
    caves: text('scouting.caves', { names: names.length ? names.join(' · ') : text('scouting.noCaves') }),
    pushes: text('scouting.pushes', { count: night.pushes.length }),
    trick: special?.line || text(hasText(trickKey) ? trickKey : 'scouting.unconfirmed'),
    counters,
    rest: night.rest === true ? text('scouting.rest') : null,
    legend: text('scouting.mapLegend')
  };
}

// The normal map projection clips beyond 50 m. Scouting bearings stay at the rim,
// using the same handedness and camera yaw, so they are useful from the HQ too.
export function projectScoutCave(cave, { x, z, yaw, center, scale, rim }) {
  if (![cave?.x,cave?.z,x,z,yaw,center,scale,rim].every(Number.isFinite) || scale <= 0 || rim <= 0) return null;
  const dx=cave.x-x, dz=cave.z-z;
  const sx=(-dx*Math.cos(yaw)+dz*Math.sin(yaw))*scale;
  const sy=-(dx*Math.sin(yaw)+dz*Math.cos(yaw))*scale;
  const distance=Math.hypot(sx,sy), ratio=distance>rim?rim/distance:1;
  return { x:center+sx*ratio, y:center+sy*ratio, edge:distance>rim, angle:Math.atan2(sy,sx) };
}

export function drawScoutingMarks(ctx, data, caves, projection) {
  for (const index of scoutingCaveIndices(data)) {
    const point=projectScoutCave(caves[index],projection); if(!point)continue;
    ctx.save(); ctx.translate(point.x,point.y);
    ctx.strokeStyle='#ead399'; ctx.fillStyle='#11180f'; ctx.lineWidth=2;
    ctx.beginPath();
    if(point.edge) {
      ctx.fillStyle='#ead399';ctx.rotate(point.angle);ctx.moveTo(7,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);
    } else {
      ctx.moveTo(0,-6);ctx.lineTo(6,0);ctx.lineTo(0,6);ctx.lineTo(-6,0);
    }
    ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
}
